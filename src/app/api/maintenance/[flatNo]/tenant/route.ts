
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';
// Columns: A:Flatno, B:tenantName
const COLLECTION_RANGE = `${COLLECTION_SHEET_NAME}!A:B`;

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

    const collectionResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: COLLECTION_RANGE,
    });

    const rows = collectionResponse.data.values?.slice(1) || [];
    
    // Find the last entry for this flat that has a tenant name
    const latestEntryWithTenant = rows.reverse().find(row => {
        const sheetFlatNo = row[0];
        const tenantName = row[1];
        return sheetFlatNo == flatNo && tenantName && tenantName.trim() !== '';
    });

    if (latestEntryWithTenant) {
        return NextResponse.json({ tenantName: latestEntryWithTenant[1] });
    } else {
        return NextResponse.json({ tenantName: '' });
    }

  } catch (error: any) {
    console.error('Error fetching tenant name:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching tenant name.' }, { status: 500 });
  }
}
