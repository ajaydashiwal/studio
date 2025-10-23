
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'monthCollection';

async function getNextSerialNumber() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${SHEET_NAME}!A:A`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = response.data.values;
  if (rows && rows.length > 1) {
    const lastRow = rows[rows.length - 1];
    const lastId = parseInt(lastRow[0], 10);
    if (!isNaN(lastId)) {
        return lastId + 1;
    }
  }
  return 1; // Start from 1 if sheet is empty or has no valid numbers
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        flatNo, 
        monthYear, 
        amount, 
        receiptDate, 
        receiptNo, 
        tenantName, 
        modeOfPayment, 
        transactionRef 
    } = body;

    // Basic validation
    if (!flatNo || !monthYear || !amount || !receiptDate || !receiptNo || !modeOfPayment) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const serialNumber = await getNextSerialNumber();
    
    // Schema: Sl No, Flat No, Month-Year, Amount, Date of Receipt, Receipt No, Paid by Tenant, Mode of Payment, Transaction Ref
    const newRow = [
      serialNumber,
      flatNo,
      monthYear,
      amount,
      receiptDate,
      receiptNo,
      tenantName || '', // Paid by Tenant
      modeOfPayment,
      transactionRef || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'Record added successfully.' });

  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: Credentials file not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
