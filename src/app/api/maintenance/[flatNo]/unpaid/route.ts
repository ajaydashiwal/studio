
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format, addMonths, startOfMonth } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';
const COLLECTION_RANGE = `${COLLECTION_SHEET_NAME}!A:E`; // Flatno, ..., monthpaid

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

    const collectionRows = (collectionResponse.data.values || []).slice(1);
    const userPayments = collectionRows.filter(row => row[0] == flatNo);
    const paidMonths = new Set(userPayments.map(row => row[4]));

    const now = new Date();
    const historicMonthsDue = [];
    const futureMonthsAvailable = [];

    // Check last 6 months for historic dues
    for (let i = 5; i >= 0; i--) {
      const monthDate = addMonths(startOfMonth(now), -i);
      const monthYear = format(monthDate, 'MMMM yyyy');
      if (!paidMonths.has(monthYear)) {
        historicMonthsDue.push(monthYear);
      }
    }

    // Find the latest paid month to calculate future months from
    const paidMonthDates = Array.from(paidMonths).map(m => new Date(m));
    const latestPaidDate = paidMonthDates.length > 0 ? new Date(Math.max.apply(null, paidMonthDates.map(d => d.getTime()))) : now;
    
    // Generate next 12 available future months
    for (let i = 1; i <= 12; i++) {
        const monthDate = addMonths(latestPaidDate, i);
        const monthYear = format(monthDate, 'MMMM yyyy');
        if (!paidMonths.has(monthYear)) {
            futureMonthsAvailable.push(monthYear);
        }
    }
    
    return NextResponse.json({
        historic: historicMonthsDue, // Full list of up to 6 historic months
        future: futureMonthsAvailable.slice(0, 12),   // Limit to 12
    });

  } catch (error: any) {
    console.error('Error fetching unpaid months:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching unpaid months.' }, { status: 500 });
  }
}
