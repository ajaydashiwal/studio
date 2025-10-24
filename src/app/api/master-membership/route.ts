
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'masterMembership';
// Columns in masterMembership: B:receiptNo, C:receiptDate, D:flatNo, E:memberName, F:membershipNo, G:status
const FULL_RANGE = `${SHEET_NAME}!B:G`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { flatNo, memberName, membershipNo, receiptNo, receiptDate } = body;

    // Basic validation
    if (!flatNo || !memberName || !membershipNo || !receiptNo || !receiptDate) {
        return NextResponse.json({ error: 'Missing required fields for new member creation' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check if a record with the same flat number and a blank status already exists
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!D:G`, // Check flatNo (D) and status (G)
    });

    const rows = getResponse.data.values || [];
    const existingRow = rows.slice(1).find(row => {
        const sheetFlatNo = row[0]; // Column D
        const status = row[3];      // Column G
        // Use '==' for type-insensitive comparison
        return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
    });

    if (existingRow) {
        return NextResponse.json({ error: 'A pending membership record for this flat number already exists.' }, { status: 409 });
    }
    
    // The data corresponds to columns B, C, D, E, F, G
    const newRow = [
      receiptNo,      // Column B
      receiptDate,    // Column C
      flatNo,         // Column D
      memberName,     // Column E
      membershipNo,   // Column F
      ''              // Column G (Blank status)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'New membership record created successfully.' });

  } catch (error: any) {
    console.error('Error in POST /api/master-membership:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to master membership sheet.' }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { flatNo, newStatus } = body;

    if (!flatNo || newStatus !== 'Inactive') {
      return NextResponse.json({ error: 'Invalid request. "flatNo" and a "newStatus" of "Inactive" are required.' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!D:G`, // Columns D:flatNo, G:status
    });

    const rows = getResponse.data.values;
    if (!rows) {
        return NextResponse.json({ error: 'Sheet is empty or could not be read.' }, { status: 404 });
    }

    // Find the row index of the pending record, skipping header
    const rowIndex = rows.slice(1).findIndex(row => {
        const sheetFlatNo = row[0]; // Column D
        const status = row[3];      // Column G
        return sheetFlatNo == flatNo && (status === '' || status === undefined || status === null);
    });

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'No pending record found for this flat number to update.' }, { status: 404 });
    }

    // The rowIndex is 0-based for the sliced array. We need to add 2 to get the actual sheet row number (1 for slice, 1 for header).
    const sheetRowNumber = rowIndex + 2;
    const updateRange = `${SHEET_NAME}!G${sheetRowNumber}`;

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[newStatus]],
        },
    });

    return NextResponse.json({ success: true, message: `Status for flat ${flatNo} updated to Inactive.` });

  } catch (error: any) {
    console.error('Error in PUT /api/master-membership:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while updating status.' }, { status: 500 });
  }
}
