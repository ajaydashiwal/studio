
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'expTransaction';

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        paymentDate, 
        expenditureType,
        description, 
        amount, 
        modeOfPayment,
        transactionRef,
        chequeNo,
        chequeDate
    } = body;

    // Basic validation
    if (!paymentDate || !description || !amount || !modeOfPayment || !expenditureType) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const nowInIst = getIstDate();
    const expenditureId = format(nowInIst, "yyyyMMddHHmm");
    const submissionTimestamp = format(nowInIst, "dd/MM/yyyy HH:mm:ss");
    
    let transactionDetails = '';
    if (modeOfPayment === 'Transfer') {
        transactionDetails = `Ref: ${transactionRef}`;
    } else if (modeOfPayment === 'Cheque') {
        transactionDetails = `Cheque No: ${chequeNo}, Date: ${chequeDate}`;
    } else {
        transactionDetails = 'Cash';
    }
    
    // Columns: expenditureId, expenditureType, description, amount, transactionDetails, date, submissionTimestamp
    const newRow = [
      expenditureId,
      expenditureType,
      description,
      amount,
      transactionDetails,
      submissionTimestamp
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'Expenditure record added successfully.' });

  } catch (error: any) {
    console.error('Error writing to Google Sheets for expenditure:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to Google Sheets.' }, { status: 500 });
  }
}
