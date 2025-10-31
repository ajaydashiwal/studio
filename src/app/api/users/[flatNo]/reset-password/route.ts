
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'memberUsers';
// Columns: flatNo, membershipNo, ownerName, userType, password, membershipStatus, IsMember
const RANGE = `${SHEET_NAME}!A:G`; 

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
        range: RANGE,
    });

    const rows = getResponse.data.values;
    if (!rows) {
        return NextResponse.json({ error: 'User sheet is empty or not found.' }, { status: 404 });
    }

    // Find the row index and the full row data of the user, skipping the header
    let userRow: string[] | undefined;
    const rowIndex = rows.slice(1).findIndex(row => {
        if (row[0] == flatNo) {
            userRow = row;
            return true;
        }
        return false;
    }) + 2; // +2 for 1-based index and header
    
    if (rowIndex < 2 || !userRow) {
        return NextResponse.json({ error: 'User not found for this flat number.' }, { status: 404 });
    }

    const membershipNo = userRow[1]; // membershipNo is in column B (index 1)
    if (!membershipNo) {
        return NextResponse.json({ error: 'Membership number not found for this user, cannot reset password.' }, { status: 400 });
    }

    // Construct the new dynamic password and hash it
    const newPasswordString = `UAarwa${membershipNo}${flatNo}@`;
    const newPasswordHash = crypto.createHash('md5').update(newPasswordString).digest('hex');

    // Update the password in Column E for the found row
    const updateRange = `${SHEET_NAME}!E${rowIndex}`; 
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[newPasswordHash]],
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
