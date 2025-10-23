
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const SHEET_NAME = 'memberUsers';
const RANGE = `${SHEET_NAME}!A:G`; // flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember

const DEFAULT_PASSWORD_HASH = '96b33694c4bb7dbd07391e0be54745fb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
        flatNo,
        membershipNo,
        ownerName,
        userType,
        membershipStatus,
        isMember
    } = body;

    // Basic validation
    if (!flatNo || !membershipNo || !ownerName || !userType || !membershipStatus) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Check if user already exists
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
    });

    const rows = getResponse.data.values || [];
    const header = rows[0];
    const existingRowIndex = rows.findIndex(row => row[0] == flatNo);

    if (existingRowIndex > 0) { // User exists, so update
        const updatedRow = [
            flatNo,
            membershipNo,
            ownerName,
            userType,
            rows[existingRowIndex][4] || DEFAULT_PASSWORD_HASH, // Keep existing password or set default if empty
            membershipStatus,
            isMember ? 'Yes' : 'No'
        ];
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${existingRowIndex + 1}:G${existingRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [updatedRow],
            },
        });
        
        return NextResponse.json({ success: true, message: 'User record updated successfully.' });

    } else { // User does not exist, so append
        const newRow = [
            flatNo,
            membershipNo,
            ownerName,
            userType,
            DEFAULT_PASSWORD_HASH,
            membershipStatus,
            isMember ? 'Yes' : 'No'
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRow],
            },
        });

        return NextResponse.json({ success: true, message: 'New user record created successfully.' });
    }

  } catch (error: any) {
    console.error('Error writing to Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while writing to Google Sheets.' }, { status: 500 });
  }
}
