
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'rwaNotifications';
// Columns: notificationId, message, createdBy, timestamps
const RANGE = `${SHEET_NAME}!A:D`;

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

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

    const rows = response.data.values || [];
    const notifications = rows.slice(1).map((row) => ({
      id: row[0],
      message: row[1],
      createdBy: row[2],
      timestamp: row[3],
    })).reverse(); // Show most recent first

    return NextResponse.json(notifications);

  } catch (error: any) {
    console.error('Error reading data for notifications:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while reading from Google Sheets.' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { message, createdBy } = body;

    // Basic validation
    if (!message || !createdBy) {
        return NextResponse.json({ error: 'Missing required fields (message, createdBy)' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const nowInIst = getIstDate();
    const notificationId = format(nowInIst, "yyyyMMddHHmmss");
    const timestamp = format(nowInIst, "dd/MM/yyyy HH:mm:ss");

    const newRow = [
      notificationId,
      message,
      createdBy,
      timestamp
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME, // Corrected: Use SHEET_NAME for append, not the full RANGE
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'Notification posted successfully.' });

  } catch (error: any) {
    console.error('Error Saving data for notifications:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to Google Sheets.' }, { status: 500 });
  }
}
