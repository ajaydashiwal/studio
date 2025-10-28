
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { subMonths, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'monthCollection';
const RANGE = `${SHEET_NAME}!A:F`; // Flat No, tenant name, receipt date, receipt no, monthpaid, amount

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

// This function generates a list of months for checking against
const getMonthRange = (paidMonths: string[]) => {
    const months = new Set<string>();
    const now = getIstDate();

    // Add the last 24 months from today
    for (let i = 23; i >= 0; i--) {
        const d = subMonths(now, i);
        months.add(format(d, 'MMMM yyyy'));
    }

    // Add any future paid months that are outside the 24-month window
    for (const paidMonth of paidMonths) {
        // Attempt to parse the month string to a date to check if it's in the future
        try {
            const paidDate = new Date(paidMonth);
            if (!isNaN(paidDate.getTime()) && paidDate > now) {
                months.add(paidMonth);
            }
        } catch (e) {
            // Ignore if the paidMonth string is not a valid date
        }
    }
    
    // Sort the months chronologically
    const sortedMonths = Array.from(months).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return sortedMonths.reverse(); // most recent first
};

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

    const allRows = response.data.values;
    const records = [];
    const defaultMaintenanceAmount = '300'; // Standard monthly fee

    if (allRows) {
        // Filter rows for the specific flat, skipping header
        const userRows = allRows.slice(1).filter(row => row[0] == flatNo);
        const paidMonths = userRows.map(row => row[4]); // Column E is monthpaid

        const allMonthsToDisplay = getMonthRange(paidMonths);
        
        let idCounter = 0;
        for (const month of allMonthsToDisplay) {
            const paidRecord = userRows.find(row => row[4] === month);

            records.push({
                id: ++idCounter,
                month: month,
                amount: paidRecord ? paidRecord[5] : defaultMaintenanceAmount, // Column F is amount
                status: paidRecord ? 'Paid' : 'Due',
                receiptNo: paidRecord ? paidRecord[3] : '-',
                receiptDate: paidRecord ? paidRecord[2] : '-',
            });
        }

    } else {
        // Fallback if sheet is empty: show last 24 months as due
        const last24Months = getMonthRange([]);
        records.push(...last24Months.map((month, index) => ({
            id: index + 1,
            month: month,
            amount: defaultMaintenanceAmount,
            status: 'Due',
            receiptNo: '-',
            receiptDate: '-',
        })));
    }

    return NextResponse.json(records);

  } catch (error: any) {
    console.error('Error accessing Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while accessing Google Sheets.' }, { status: 500 });
  }
}
