
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

    const processingPayments = allRows
      .slice(1) // Skip header
      .filter(row => row[6] === 'Processing')
      .map((row, index) => ({
        id: `${row[0]}-${row[4]}`,
        flatNo: row[0],
        receiptDate: row[2],
        monthYear: row[4],
        amount: parseFloat(row[5]),
        transactionRef: row[7],
        rowIndex: index + 2, // For identifying the row in the sheet
      }))
      .sort((a, b) => {
          // Sort by receiptDate, oldest first
          const dateA = parse(a.receiptDate, 'dd/MM/yyyy', new Date());
          const dateB = parse(b.receiptDate, 'dd/MM/yyyy', new Date());
          return dateA.getTime() - dateB.getTime();
      });

    return NextResponse.json(processingPayments);

  } catch (error: any) {
    console.error('Error fetching processing payments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
