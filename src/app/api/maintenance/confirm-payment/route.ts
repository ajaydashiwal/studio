
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';

export async function POST(request: Request) {
  const { flatNo, transactionRef, receiptNo, entryByFlatNo } = await request.json();

  if (!flatNo || !transactionRef || !receiptNo || !entryByFlatNo) {
    return NextResponse.json({ error: 'Missing required fields for confirmation.' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch all rows to find the correct one to update
    // Columns: A (flatNo), D (receiptNo), H (transactionRef), I (entryByFlatNo)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COLLECTION_SHEET_NAME}!A:I`,
    });
    
    const allRows = response.data.values;
    if (!allRows) {
        return NextResponse.json({ error: 'No data found in the sheet.' }, { status: 404 });
    }

    // Find the index of the row that matches flatNo and transactionRef, and has a blank receiptNo.
    const rowIndex = allRows.findIndex(row => 
        row[0] == flatNo && // Column A: flatNo
        row[7] === transactionRef && // Column H: transactionRef
        (!row[3] || row[3].trim() === '') // Column D: receiptNo is blank
    );

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'No matching unconfirmed payment record found for the specified details.' }, { status: 404 });
    }

    // Sheet row index is 1-based, array index is 0-based
    const sheetRowIndex = rowIndex + 1;

    // We are updating columns D (receiptNo) and I (entryByFlatNo)
    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
                {
                    range: `${COLLECTION_SHEET_NAME}!D${sheetRowIndex}`,
                    values: [[receiptNo]]
                },
                {
                    range: `${COLLECTION_SHEET_NAME}!I${sheetRowIndex}`,
                    values: [[entryByFlatNo]]
                }
            ]
        }
    });

    return NextResponse.json({ success: true, message: 'Payment confirmed and finalized successfully.' });

  } catch (error: any) {
    console.error('Error updating Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while updating Google Sheets.' }, { status: 500 });
  }
}
