
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { google } from 'googleapis';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'monthCollection';

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

export async function POST(request: Request) {
  const body = await request.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    flatNo,
    monthYear,
    amount,
    ownerName
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !flatNo || !monthYear || !amount) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  // Signature is valid, now record the payment in Google Sheets
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const receiptDate = format(getIstDate(), "dd/MM/yyyy");
    
    const newRow = [
      flatNo,
      '', // name of tenant (blank for online payments by owner)
      receiptDate,
      razorpay_payment_id, // Use payment ID as receipt number
      monthYear, // monthpaid
      amount,
      'Online', // Mode of payment
      razorpay_order_id, // Transaction ref
      flatNo, // Entry by flat no
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: `Payment for ${monthYear} recorded successfully.` });

  } catch (error: any) {
    console.error('Error writing payment to Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to Google Sheets.' }, { status: 500 });
  }
}
