
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'memberUsers';
const RANGE = `${SHEET_NAME}!A:G`; // flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember

const DEFAULT_PASSWORD_HASH = '96b33694c4bb7dbd07391e0be54745fb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        flatNo,
        membershipNo,
        ownerName,
        userType,
        membershipStatus,
        isOfficeBearer,
    } = body;

    if (!flatNo || !membershipNo || !ownerName || !userType || !membershipStatus || !isOfficeBearer) {
        return NextResponse.json({ error: 'Missing required fields for creation' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:A`,
    });
    const rows = getResponse.data.values || [];
    const existingRowIndex = rows.findIndex(row => row[0] == flatNo);

    if (existingRowIndex > -1) {
        return NextResponse.json({ error: 'User with this flat number already exists.' }, { status: 409 });
    }

    const newRow = [
        flatNo,
        membershipNo,
        ownerName,
        userType,
        DEFAULT_PASSWORD_HASH,
        membershipStatus,
        isOfficeBearer // Save "Yes" or "No" to the 'IsMember' column
    ];
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [newRow],
        },
    });

    return NextResponse.json({ success: true, message: 'New user created successfully.' });

  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
