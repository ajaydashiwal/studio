
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'masterMembership';
// Columns in masterMembership: flatNo, memberName, membershipNo, status (D, E, F, G)
const RANGE_TO_CHECK = `${SHEET_NAME}!D:D`; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { flatNo, memberName, membershipNo } = body;

    // Basic validation
    if (!flatNo || !memberName || !membershipNo) {
        return NextResponse.json({ error: 'Missing required fields for new member creation' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check if flat number already exists to prevent duplicates
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE_TO_CHECK,
    });
    const rows = getResponse.data.values || [];
    const existingRow = rows.find(row => row[0] == flatNo);

    if (existingRow) {
        return NextResponse.json({ error: 'A member with this flat number already exists in the master list.' }, { status: 409 });
    }
    
    // Append the new member data. Note the empty string for the status column.
    // The columns are B, C, D, E, F, G but we are writing from D.
    // So the data corresponds to columns D, E, F, G
    const newRow = [
      flatNo,
      memberName,
      membershipNo,
      '' // Blank status
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!D:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'New membership record created successfully.' });

  } catch (error: any) {
    console.error('Error in POST /api/master-membership:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to master membership sheet.' }, { status: 500 });
  }
}
