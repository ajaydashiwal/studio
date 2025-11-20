
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'monthCollection';
const RANGE = `${SHEET_NAME}!A:I`; // Flat No, tenant name, receipt date, receipt no, monthpaid, amount, mode of payment, transaction ref, entry by

export async function GET(request: Request) {
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

    const allRows = response.data.values;
    if (!allRows) {
      return NextResponse.json([]);
    }

    const unconfirmedPayments = allRows
      .slice(1) // Skip header
      .filter(row => !row[3] || row[3].trim() === '') // Filter for blank receipt number (column D)
      .map((row, index) => ({
        id: `${row[0]}-${row[4]}`, // flatNo-monthYear
        flatNo: row[0],
        receiptDate: row[2],
        monthYear: row[4],
        amount: parseFloat(row[5]),
        modeOfPayment: row[6],
        transactionRef: row[7],
        rowIndex: index + 2, // For identifying the row in the sheet
      }))
      .sort((a, b) => {
          // Sort by receiptDate, oldest first
          try {
            const dateA = parse(a.receiptDate, 'dd/MM/yyyy', new Date());
            const dateB = parse(b.receiptDate, 'dd/MM/yyyy', new Date());
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
      });

    return NextResponse.json(unconfirmedPayments);

  } catch (error: any) {
    console.error('Error fetching unconfirmed payments:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching payments.' }, { status: 500 });
  }
}
