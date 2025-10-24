
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'masterMembership';

// This new GET function checks if an active member exists for a given flat number.
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

    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!D:G`, // Check flatNo (D) and status (G)
    });

    const rows = getResponse.data.values || [];
    const existingActiveMember = rows.slice(1).find(row => {
        const sheetFlatNo = row[0]; // Column D
        const status = row[3];      // Column G
        // An active member has a blank/undefined status
        return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
    });

    if (existingActiveMember) {
        return NextResponse.json({ exists: true });
    } else {
        return NextResponse.json({ exists: false });
    }

  } catch (error: any) {
    console.error('Error in GET /api/master-membership/[flatNo]:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while checking for member.' }, { status: 500 });
  }
}
