
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
// This API now reads from masterMembership to pre-populate the form.
const MASTER_SHEET_NAME = 'masterMembership'; 
// Columns in masterMembership: flatNo, membershipNo, ownerName, status
const RANGE = `${MASTER_SHEET_NAME}!A:D`; 

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
      // Find the user, check status is blank (skip header row)
      const masterRecord = rows.slice(1).find(
        (row) => row[0] == flatNo && (row[3] === '' || row[3] === undefined || row[3] === null)
      );

      if (masterRecord) {
        // Return only the data needed for pre-population
        const userDetails = {
            flatNo: masterRecord[0],
            membershipNo: masterRecord[1],
            ownerName: masterRecord[2],
            // Default other fields for the form, these are not from master
            userType: 'Member',
            membershipStatus: 'Active',
            isMember: true,
        };
        return NextResponse.json(userDetails);
      }
    }
    return NextResponse.json({ error: 'User not found or already processed' }, { status: 404 });
  } catch (error: any) {
    console.error('Error accessing Google Sheets for master data:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching master data.' }, { status: 500 });
  }
}
