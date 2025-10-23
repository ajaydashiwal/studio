
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/data'; // For userType mapping

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const RANGE = 'memberUsers!A:D'; // Columns: flatNo, ownerName, membershipId, password

export async function POST(request: Request) {
  const { flatNo, password } = await request.json();

  if (!flatNo || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (rows) {
      // Find the user (skip header row)
      const userRow = rows.slice(1).find(
        (row) => row[0]?.toLowerCase() === flatNo.toLowerCase() && row[3] === password
      );

      if (userRow) {
        // Find userType from mock data as it's not in the sheet
        const mockUser = mockUsers.find(u => u.flatNo.toLowerCase() === userRow[0]?.toLowerCase());
        
        const user = {
            flatNo: userRow[0],
            ownerName: userRow[1],
            membershipId: userRow[2],
            userType: mockUser ? mockUser.userType : 'Member', // Default to 'Member'
        };
        return NextResponse.json(user);
      }
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    // Check for specific error indicating file not found
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: Credentials file not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
