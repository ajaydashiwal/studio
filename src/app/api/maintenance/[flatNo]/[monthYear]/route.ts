
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { differenceInCalendarMonths, parse, startOfMonth, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET_NAME = 'monthCollection';
const MASTER_SHEET_NAME = 'masterMembership';

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

export async function GET(request: Request, { params }: { params: { flatNo: string, monthYear: string } }) {
  const { flatNo, monthYear } = params;

  if (!flatNo || !monthYear) {
    return NextResponse.json({ error: 'Missing flat number or month/year' }, { status: 400 });
  }
  
  const decodedMonthYear = decodeURIComponent(monthYear);

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Try parsing with short month format first, then long format
    let selectedMonthDate;
    try {
        selectedMonthDate = startOfMonth(parse(decodedMonthYear, 'MMM yyyy', new Date()));
    } catch (e) {
        selectedMonthDate = startOfMonth(parse(decodedMonthYear, 'MMMM yyyy', new Date()));
    }

    if (isNaN(selectedMonthDate.getTime())) {
        return NextResponse.json({ error: 'Invalid month/year format.' }, { status: 400 });
    }

    // Validate month for historic payments
    const today = startOfMonth(getIstDate());
    if (selectedMonthDate < today) { // It's a historic month
        const monthDiff = differenceInCalendarMonths(today, selectedMonthDate);
        if (monthDiff > 6) { // More than 6 months ago (e.g., 7) is not allowed
            return NextResponse.json({ 
                error: 'Historic payments are restricted to the last 6 months only.' 
            }, { status: 400 });
        }
    }


    const [collectionResponse, masterResponse] = await Promise.all([
        sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${COLLECTION_SHEET_NAME}!A:E`, // Flatno, ..., monthpaid
        }),
        sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${MASTER_SHEET_NAME}!D:D`, // flatNo
        })
    ]);

    // Check for duplicate in monthCollection
    const collectionRows = collectionResponse.data.values || [];
    const isDuplicate = collectionRows.slice(1).some(
      (row) => {
          if (row[0] == flatNo && row[4]) {
              try {
                  // Normalize both sheet data and input to 'MMM yyyy' for comparison
                  const sheetMonthDate = parse(row[4], row[4].length > 8 ? 'MMMM yyyy' : 'MMM yyyy', new Date());
                  const formattedSheetMonth = format(sheetMonthDate, 'MMM yyyy');
                  const formattedDecodedMonth = format(selectedMonthDate, 'MMM yyyy');
                  return formattedSheetMonth === formattedDecodedMonth;
              } catch {
                  return false; // ignore malformed dates
              }
          }
          return false;
      }
    );

    // Check if flat exists in masterMembership
    const masterRows = masterResponse.data.values || [];
    const isMember = masterRows.slice(1).some((row) => row[0] == flatNo);

    return NextResponse.json({ isDuplicate, isMember });

  } catch (error: any) {
    console.error('Error validating maintenance record:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while validating record.' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { flatNo: string, monthYear: string } }) {
  const { flatNo, monthYear } = params;
  const { receiptNo, entryByFlatNo } = await request.json();

  if (!flatNo || !monthYear || !receiptNo || !entryByFlatNo) {
    return NextResponse.json({ error: 'Missing required fields for update.' }, { status: 400 });
  }
  
  const decodedMonthYear = decodeURIComponent(monthYear);

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${COLLECTION_SHEET_NAME}!A:I`,
    });
    
    const allRows = response.data.values;
    if (!allRows) {
        return NextResponse.json({ error: 'No data found in the sheet.' }, { status: 404 });
    }

    // Find the specific row for the flat and month, which has a blank receipt number
    const rowIndex = allRows.findIndex(row => 
        row[0] == flatNo && 
        row[4] === decodedMonthYear && 
        (!row[3] || row[3].trim() === '')
    );

    if (rowIndex === -1) {
        return NextResponse.json({ error: 'No matching unconfirmed payment record found for the specified flat and month.' }, { status: 404 });
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
