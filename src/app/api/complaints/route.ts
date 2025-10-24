
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'complaints';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        flatNo,
        ownerName,
        formType, // "Complaint" or "Suggestion"
        issueCategory, // e.g., "Water Overflow", "Others", or "" for suggestions
        description,
    } = body;

    // Basic validation
    if (!flatNo || !ownerName || !formType || !description) {
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
    
    const submissionDate = format(new Date(), "dd/MM/yyyy HH:mm:ss");

    // Columns: Submission Date, Flat No, Owner Name, Form Type, Issue Category, Description
    const newRow = [
      submissionDate,
      flatNo,
      ownerName,
      formType,
      issueCategory || '',
      description,
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
