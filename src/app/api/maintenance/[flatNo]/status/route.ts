
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const USERS_SHEET_NAME = 'memberUsers';
const RANGE = `${USERS_SHEET_NAME}!A:F`; // flatNo is in column A, membershipStatus is in F

export async function GET(request: Request, { params }: { params: { flatNo: string } }) {
  const { flatNo } = params;

  if (!flatNo) {
    return NextResponse.json({ error: 'Missing flat number' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    let isMember = false;
    if (rows) {
      // Find if user exists and has 'Active' status (skip header row)
      const userRow = rows.slice(1).find(
        (row) => row[0] == flatNo && row[5] === 'Active'
      );
      if (userRow) {
        isMember = true;
      }
    }
    
    // Returns true if an active member is found, otherwise false.
    return NextResponse.json({ isMember });

  } catch (error: any) {
    console.error('Error accessing Google Sheets for user status:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching user status.' }, { status: 500 });
  }
}
