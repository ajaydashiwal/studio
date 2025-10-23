
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
        range: `${SHEET_NAME}!A:A`, // Only check flatNo column for existence
    });

    const rows = getResponse.data.values || [];
    const existingRow = rows.find(row => row[0] == flatNo);

    if (existingRow) { // User exists, so return an error
        return NextResponse.json({ error: 'User with this flat number already exists in memberUsers.' }, { status: 409 }); // 409 Conflict
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

        // Here you might want to update the status in the 'masterMembership' sheet
        // This part is not implemented yet but would require an additional sheet.values.update call
        
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
