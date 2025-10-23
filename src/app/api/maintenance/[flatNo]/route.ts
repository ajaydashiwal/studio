
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'monthCollection';
const RANGE = `${SHEET_NAME}!B:E`; // Flat No, Month-Year, Amount, Date of Receipt

// This function generates a list of the last 24 months for checking against
const getLast24Months = () => {
    const months = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        // Format to "Month YYYY" e.g., "May 2024" to match the sheet
        months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    return months.reverse(); // most recent first
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
    const allMonths = getLast24Months();
    const records = [];

    if (allRows) {
        // Filter rows for the specific flat
        const userRows = allRows.slice(1).filter(row => row[0]?.toLowerCase() === flatNo.toLowerCase());
        
        let idCounter = 0;
        for (const month of allMonths) {
            const paidRecord = userRows.find(row => row[1] === month);

            records.push({
                id: ++idCounter,
                month: month,
                amount: paidRecord ? paidRecord[2] : '2000', // Use record amount or default
                status: paidRecord ? 'Paid' : 'Due',
            });
        }

    } else {
        // If no data in sheet, create 'Due' records for all 24 months
        records.push(...allMonths.map((month, index) => ({
            id: index + 1,
            month: month,
            amount: '2000',
            status: 'Due',
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
