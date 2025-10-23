
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const USERS_SHEET_NAME = 'memberUsers';
// Columns: flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember
const RANGE = `${USERS_SHEET_NAME}!A:G`; 

export async function GET(request: Request, { params }: { params: { flatNo: string } }) {
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (rows) {
      // Find the user (skip header row)
      const userRow = rows.slice(1).find(
        (row) => row[0] == flatNo
      );

      if (userRow) {
        const userDetails = {
            flatNo: userRow[0],
            membershipNo: userRow[1],
            ownerName: userRow[2],
            userType: userRow[3],
            membershipStatus: userRow[5],
            isMember: userRow[6] === 'Yes',
        };
        return NextResponse.json(userDetails);
      }
    }
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error accessing Google Sheets for user details:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching user details.' }, { status: 500 });
  }
}
