
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/data'; // For userType mapping
import * as crypto from 'crypto';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const RANGE = 'memberUsers!A:G'; // Columns: flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember

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
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
      console.log(`Attempting login for flat: ${flatNo}`);
      console.log(`Generated MD5 Hash: ${hashedPassword}`);

      // Find the user (skip header row)
      const userRow = rows.slice(1).find(
        (row) => {
          const sheetFlatNo = row[0]?.toLowerCase();
          const sheetPassword = row[3];
          console.log(`Checking row: Flat No: ${sheetFlatNo}, Stored Hash: ${sheetPassword}`);
          return sheetFlatNo === flatNo.toLowerCase() && sheetPassword === hashedPassword;
        }
      );

      if (userRow) {
        console.log("Login successful: Found matching user.");
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
    console.log("Login failed: No matching user found in spreadsheet.");
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    // Check for specific error indicating file not found
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: The `google-credentials.json` file was not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while accessing Google Sheets.' }, { status: 500 });
  }
}
