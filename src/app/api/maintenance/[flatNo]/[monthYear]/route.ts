
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { differenceInCalendarMonths, parse, startOfMonth } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';
const MASTER_SHEET_NAME = 'masterMembership';

export async function GET(request: Request, { params }: { params: { flatNo: string, monthYear: string } }) {
  const { flatNo, monthYear } = params;

  if (!flatNo || !monthYear) {
    return NextResponse.json({ error: 'Missing flat number or month/year' }, { status: 400 });
  }
  
  const decodedMonthYear = decodeURIComponent(monthYear);

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Validate month for historic payments
    const today = startOfMonth(new Date());
    const selectedMonthDate = startOfMonth(parse(decodedMonthYear, 'MMMM yyyy', new Date()));

    if (selectedMonthDate < today) { // It's a historic month
        const monthDiff = differenceInCalendarMonths(today, selectedMonthDate);
        if (monthDiff > 5) { // More than 5 months ago (0-5 is 6 months total)
            return NextResponse.json({ 
                error: 'Historic payments are restricted to the last 6 months only.' 
            }, { status: 400 });
        }
    }


    const [collectionResponse, masterResponse] = await Promise.all([
        sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${COLLECTION_SHEET_NAME}!A:E`, // Flatno, ..., monthpaid
        }),
        sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MASTER_SHEET_NAME}!D:D`, // flatNo
        })
    ]);

    // Check for duplicate in monthCollection
    const collectionRows = collectionResponse.data.values || [];
    const isDuplicate = collectionRows.slice(1).some(
      (row) => row[0] == flatNo && row[4] === decodedMonthYear
    );

    // Check if flat exists in masterMembership
    const masterRows = masterResponse.data.values || [];
    const isMember = masterRows.slice(1).some((row) => row[0] == flatNo);

    return NextResponse.json({ isDuplicate, isMember });

  } catch (error: any) {
    console.error('Error validating maintenance record:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while validating record.' }, { status: 500 });
  }
}
