
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'masterMembership';
// Columns: B:receiptNo, C:receiptDate, D:flatNo, E:memberName, F:membershipNo, G:status
const FULL_RANGE = `${SHEET_NAME}!B:G`;

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
        range: FULL_RANGE,
    });

    const rows = getResponse.data.values || [];
    const activeMemberRow = rows.slice(1).find(row => {
        const sheetFlatNo = row[2]; // Column D
        const status = row[5];      // Column G
        return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
    });

    if (activeMemberRow) {
        return NextResponse.json({
            exists: true,
            receiptNo: activeMemberRow[0],
            receiptDate: activeMemberRow[1],
            flatNo: activeMemberRow[2],
            memberName: activeMemberRow[3],
            membershipNo: activeMemberRow[4],
        });
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


export async function PUT(request: Request, { params }: { params: { flatNo: string } }) {
    const { flatNo } = params;
    const body = await request.json();
    const { status } = body;

    if (!flatNo || !status) {
        return NextResponse.json({ error: 'Missing flat number or status' }, { status: 400 });
    }
    
    if (status !== 'Inactive') {
        return NextResponse.json({ error: 'Only "Inactive" status is allowed for update.' }, { status: 400 });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!D:G`, // flatNo is D, status is G
        });

        const rows = getResponse.data.values || [];
        // +2 because sheets are 1-indexed and we slice(1) to skip the header
        const rowIndex = rows.slice(1).findIndex(row => row[0] == flatNo && (row[3] === '' || row[3] === undefined || row[3] === null)) + 2;

        if (rowIndex < 2) {
            return NextResponse.json({ error: 'Active member for this flat not found.' }, { status: 404 });
        }

        const updateRange = `${SHEET_NAME}!G${rowIndex}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[status]],
            },
        });
        
        return NextResponse.json({ success: true, message: `Status for flat ${flatNo} updated to Inactive.` });

    } catch (error: any) {
        console.error('Error updating status in master-membership:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while updating status.' }, { status: 500 });
    }
}
