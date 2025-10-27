
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const MASTER_SHEET_NAME = 'masterMembership';
// Columns: D:flatNo, G:status
const RANGE = `${MASTER_SHEET_NAME}!D:G`; 

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
      // Find if an active member exists (status is blank)
      // D is flatNo (index 0), G is status (index 3)
      const memberRow = rows.slice(1).find(
        (row) => {
            const sheetFlatNo = row[0]; 
            const status = row[3];
            // An active member has a blank/undefined status.
            return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
        }
      );
      if (memberRow) {
        isMember = true;
      }
    }
    
    // Returns true if an active member is found, otherwise false.
    return NextResponse.json({ isMember });

  } catch (error: any) {
    console.error('Error accessing Google Sheets for member status:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching member status.' }, { status: 500 });
  }
}
