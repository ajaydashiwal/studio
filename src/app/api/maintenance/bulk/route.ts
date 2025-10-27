
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format, addMonths } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';

const getAuth = () => new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json',
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

const getSheetsClient = (auth: any) => google.sheets({ version: 'v4', auth });

const getUnpaidMonths = async (sheets: any, flatNo: string) => {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${COLLECTION_SHEET_NAME}!A:E`, // Flatno, ..., monthpaid
    });

    const rows = (response.data.values || []).slice(1);
    const paidMonths = new Set(rows.filter(row => row[0] == flatNo).map(row => row[4]));
    
    const now = new Date();
    const historicDue = [];
    
    // Find historic dues from the last 6 months (including current month)
    for (let i = 5; i >= 0; i--) {
        const monthDate = addMonths(now, -i);
        const monthYear = format(monthDate, 'MMMM yyyy');
        if (!paidMonths.has(monthYear)) {
            historicDue.push(monthYear);
        }
    }

    // Find latest paid date to start calculating future months
    const paidMonthDates = Array.from(paidMonths).map(m => new Date(m));
    const latestPaidDate = paidMonthDates.length > 0 ? new Date(Math.max.apply(null, paidMonthDates.map(d => d.getTime()))) : new Date(now.getFullYear(), now.getMonth() -1, 1);

    const futureAvailable = [];
    for (let i = 1; i <= 24; i++) { // Check up to 24 months in future
        const monthDate = addMonths(latestPaidDate, i);
        const monthYear = format(monthDate, 'MMMM yyyy');
        if (!paidMonths.has(monthYear)) {
            futureAvailable.push(monthYear);
        }
    }
    
    return { historicDue, futureAvailable };
};


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        flatNo, 
        amount, 
        receiptDate, 
        receiptNo, 
        tenantName, 
        modeOfPayment, 
        transactionRef,
        bulkPaymentType,
    } = body;

    // Validation
    if (!flatNo || !amount || !receiptDate || !receiptNo || !modeOfPayment || !bulkPaymentType) {
        return NextResponse.json({ error: 'Missing required fields for bulk payment' }, { status: 400 });
    }
    if (amount <= 300 || amount % 300 !== 0) {
        return NextResponse.json({ error: 'Invalid bulk payment amount.' }, { status: 400 });
    }

    const auth = getAuth();
    const sheets = getSheetsClient(auth);

    const { historicDue, futureAvailable } = await getUnpaidMonths(sheets, flatNo);
    
    const numberOfMonths = amount / 300;
    let monthsToPay: string[] = [];

    if (bulkPaymentType === 'historic') {
        monthsToPay = historicDue.slice(0, Math.min(numberOfMonths, 6)); // Limit to 6
    } else { // future
        monthsToPay = futureAvailable.slice(0, Math.min(numberOfMonths, 12)); // Limit to 12
    }
    
    if (monthsToPay.length === 0) {
        return NextResponse.json({ error: `No ${bulkPaymentType} months available to pay.` }, { status: 400 });
    }

    const newRows = monthsToPay.map(monthYear => ([
      flatNo,
      tenantName || '',
      receiptDate,
      receiptNo,
      monthYear,
      300, // Amount per month
      modeOfPayment,
      transactionRef || '',
    ]));

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: COLLECTION_SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRows,
      },
    });

    return NextResponse.json({ success: true, message: `${monthsToPay.length} maintenance record(s) added successfully.` });

  } catch (error: any) {
    console.error('Error in bulk maintenance API:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error during bulk payment processing.' }, { status: 500 });
  }
}
