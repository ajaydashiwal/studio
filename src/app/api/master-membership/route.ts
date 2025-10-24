
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'masterMembership';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { flatNo, memberName, membershipNo, receiptNo, receiptDate } = body;

    // Basic validation
    if (!flatNo || !memberName || !membershipNo || !receiptNo || !receiptDate) {
        return NextResponse.json({ error: 'Missing required fields for new member creation' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check if an active record (blank status) for this flat number already exists
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!D:G`, // Check flatNo (D) and status (G)
    });

    const rows = getResponse.data.values || [];
    const existingActiveMember = rows.slice(1).find(row => {
        const sheetFlatNo = row[0]; // Column D
        const status = row[3];      // Column G
        // Use '==' for type-insensitive comparison and check for blank status
        return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
    });

    if (existingActiveMember) {
        return NextResponse.json({ error: `An active membership record for flat number ${flatNo} already exists.` }, { status: 409 });
    }
    
    // The data corresponds to columns B, C, D, E, F, G
    const newRow = [
      receiptNo,      // Column B
      receiptDate,    // Column C
      flatNo,         // Column D
      memberName,     // Column E
      membershipNo,   // Column F
      ''              // Column G (Blank status for Active)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:G`,
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
