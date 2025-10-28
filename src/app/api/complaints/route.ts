
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'complaintTrans';
// Columns: complaintId, submissionDate, flatNo, formType, issueCategory, description, status, remarks, actionDate
const RANGE = `${SHEET_NAME}!A:I`;

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
    const complaints = rows.slice(1).map((row) => ({
      id: row[0], // complaintId
      submissionDate: row[1],
      flatNo: row[2],
      formType: row[3],
      issueCategory: row[4],
      description: row[5],
      status: row[6] || 'Open',
      remarks: row[7] || '',     
    })).reverse(); // Show most recent first

    return NextResponse.json(complaints);

  } catch (error: any) {
    console.error('Error reading from Google Sheets for complaints:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while reading from Google Sheets.' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        flatNo,
        formType,
        issueCategory,
        description,
    } = body;

    // Basic validation
    if (!flatNo || !formType || !description) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (formType === 'Complaint' && !issueCategory) {
        return NextResponse.json({ error: 'Issue category is required for complaints' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const nowInIst = getIstDate();
    const complaintId = format(nowInIst, "yyyyMMddHHmmss");
    const submissionDate = format(nowInIst, "dd/MM/yyyy HH:mm:ss");

    // Columns: complaintId, submissionDate, flatNo, formType, issueCategory, description, status
    const newRow = [
      complaintId,
      submissionDate,
      flatNo,
      formType,
      issueCategory || '',
      description,
      'Open' // Default status
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ success: true, message: 'Your feedback has been submitted successfully.' });

  } catch (error: any) {
    console.error('Error writing to Google Sheets for complaints:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to Google Sheets.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { complaintId, status, remarks } = body;

        if (!complaintId || !status) {
            return NextResponse.json({ error: 'Missing required fields for update (complaintId, status)' }, { status: 400 });
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:A`, // Check only complaintId column
        });

        const rows = getResponse.data.values || [];
        // +2 because sheets are 1-indexed and we skip the header row with slice(1)
        const rowIndex = rows.slice(1).findIndex(row => row[0] === complaintId) + 2;

        if (rowIndex < 2) {
            return NextResponse.json({ error: 'Complaint record not found.' }, { status: 404 });
        }

        const actionDate = format(getIstDate(), "dd/MM/yyyy HH:mm:ss");

        // Columns G (Status), H (Remarks), I (ActionDate)
        const updateRange = `${SHEET_NAME}!G${rowIndex}:I${rowIndex}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[status, remarks || '', actionDate]],
            },
        });

        return NextResponse.json({ success: true, message: 'Record updated successfully.' });

    } catch (error: any) {
        console.error('Error updating Google Sheets for complaints:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while updating Google Sheets.' }, { status: 500 });
    }
}
