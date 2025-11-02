
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format, addMonths, startOfMonth, parse, isBefore, isEqual } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';
const COLLECTION_RANGE = `${COLLECTION_SHEET_NAME}!A:E`; // Flatno, ..., monthpaid

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

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
    const paidMonths = new Set(userPayments.map(row => {
        try {
            const sheetMonthDate = parse(row[4], row[4].length > 8 ? 'MMMM yyyy' : 'MMM yyyy', new Date());
            return format(sheetMonthDate, 'MMM yyyy');
        } catch {
            return null;
        }
    }).filter(Boolean));

    const now = getIstDate();
    const today = startOfMonth(now);
    
    // Find the latest paid month to calculate future months from
    const paidMonthDates = Array.from(paidMonths).map(m => m ? parse(m, 'MMM yyyy', new Date()) : new Date(0));
    const latestPaidDate = paidMonthDates.length > 0 ? new Date(Math.max.apply(null, paidMonthDates.map(d => d.getTime()))) : addMonths(today, -1);
    
    const allPossibleMonths = new Set<string>();

    // Add last 6 historic months (including current month)
    for (let i = 5; i >= 0; i--) {
      const monthDate = addMonths(today, -i);
      allPossibleMonths.add(format(monthDate, 'MMM yyyy'));
    }

    // Add next 12 available future months
    for (let i = 1; i <= 12; i++) {
        const monthDate = addMonths(latestPaidDate, i);
        allPossibleMonths.add(format(monthDate, 'MMM yyyy'));
    }
    
    const historicMonthsDue: string[] = [];
    const futureMonthsAvailable: string[] = [];
    
    allPossibleMonths.forEach(monthYear => {
        if (!paidMonths.has(monthYear)) {
            const monthDate = parse(monthYear, 'MMM yyyy', new Date());
            if (isBefore(monthDate, today) || isEqual(monthDate, today)) {
                historicMonthsDue.push(monthYear);
            } else {
                futureMonthsAvailable.push(monthYear);
            }
        }
    });

    // Sort historic months ascending
    historicMonthsDue.sort((a, b) => parse(a, 'MMM yyyy', new Date()).getTime() - parse(b, 'MMM yyyy', new Date()).getTime());

    return NextResponse.json({
        historic: historicMonthsDue,
        future: futureMonthsAvailable,
    });

  } catch (error: any) {
    console.error('Error fetching unpaid months:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching unpaid months.' }, { status: 500 });
  }
}
