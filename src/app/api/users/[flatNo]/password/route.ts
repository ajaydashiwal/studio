
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'memberUsers';
const RANGE = `${SHEET_NAME}!A:G`; // flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember

export async function PUT(request: Request, { params }: { params: { flatNo: string } }) {
  const { flatNo } = params;
  const { oldPassword, newPassword } = await request.json();

  if (!flatNo || !oldPassword || !newPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldPasswordHash = crypto.createHash('md5').update(oldPassword).digest('hex');

    // Find the row index of the user, skipping the header
    const rowIndex = rows.slice(1).findIndex(row => row[0] == flatNo) + 1; // +1 to account for slice
    
    if (rowIndex === 0) { // findIndex returns -1 if not found, so -1 + 1 = 0
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRow = rows[rowIndex];
    const storedPasswordHash = userRow[4]; // Password is in column E

    if (storedPasswordHash !== oldPasswordHash) {
        return NextResponse.json({ error: 'Incorrect old password' }, { status: 401 });
    }

    const newPasswordHash = crypto.createHash('md5').update(newPassword).digest('hex');

    // Update the password in the specific cell (Column E)
    // Row index needs to be rowIndex + 1 because Sheets are 1-based, and we have a header
    const updateRange = `${SHEET_NAME}!E${rowIndex + 1}`; 
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[newPasswordHash]],
        },
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });

  } catch (error: any) {
    console.error('Error updating password in Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while updating password.' }, { status: 500 });
  }
}
