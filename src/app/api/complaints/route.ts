
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'complaints';
// Columns: Submission Date, Flat No, Owner Name, Form Type, Issue Category, Description, Status, Remarks, Action Date
const RANGE = `${SHEET_NAME}!A:I`;

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
    const complaints = rows.slice(1).map((row, index) => ({
      // Add a unique ID based on row index, +2 because sheets are 1-indexed and we skip the header
      id: index + 2, 
      submissionDate: row[0],
      flatNo: row[1],
      ownerName: row[2],
      formType: row[3],
      issueCategory: row[4],
      description: row[5],
      status: row[6] || 'New', // Default status to 'New' if not set
      remarks: row[7] || '',
      actionDate: row[8] || '',
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

    // Columns: Submission Date, Flat No, Owner Name, Form Type, Issue Category, Description, Status (default to New)
    const newRow = [
      submissionDate,
      flatNo,
      ownerName,
      formType,
      issueCategory || '',
      description,
      'New' // Default status
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
        const { rowId, status, remarks } = body;

        if (!rowId || !status) {
            return NextResponse.json({ error: 'Missing required fields for update (rowId, status)' }, { status: 400 });
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const actionDate = format(new Date(), "dd/MM/yyyy HH:mm:ss");

        // Columns G (Status), H (Remarks), I (Action Date)
        const updateRange = `${SHEET_NAME}!G${rowId}:I${rowId}`;

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
