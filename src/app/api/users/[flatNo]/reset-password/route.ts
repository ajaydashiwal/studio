
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'memberUsers';
// Columns: flatNo, ..., password
const RANGE = `${SHEET_NAME}!A:E`; 
const DEFAULT_PASSWORD_HASH = '96b33694c4bb7dbd07391e0be54745fb'; // MD5 for "password"

export async function PUT(request: Request, { params }: { params: { flatNo: string } }) {
  const { flatNo } = params;

  if (!flatNo) {
    return NextResponse.json({ error: 'Missing flat number' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:A`, // Only need flatNo to find the row
    });

    const rows = getResponse.data.values;
    if (!rows) {
        return NextResponse.json({ error: 'User sheet is empty or not found.' }, { status: 404 });
    }

    // Find the row index of the user, skipping the header
    const rowIndex = rows.slice(1).findIndex(row => row[0] == flatNo) + 2; // +2 for 1-based index and header
    
    if (rowIndex < 2) {
        return NextResponse.json({ error: 'User not found for this flat number.' }, { status: 404 });
    }

    // Update the password in Column E for the found row
    const updateRange = `${SHEET_NAME}!E${rowIndex}`; 
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[DEFAULT_PASSWORD_HASH]],
        },
    });

    return NextResponse.json({ success: true, message: `Password for flat ${flatNo} has been reset.` });

  } catch (error: any) {
    console.error('Error resetting password in Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while resetting password.' }, { status: 500 });
  }
}
