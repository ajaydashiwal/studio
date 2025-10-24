
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const USERS_SHEET_NAME = 'memberUsers';
const MASTER_SHEET_NAME = 'masterMembership'; 
// Columns in memberUsers: flatNo,membershipNo,ownerName,userType,password,membershipStatus,IsMember (A-G)
const USERS_RANGE = `${USERS_SHEET_NAME}!A:F`; 
// Columns in masterMembership: flatNo, memberName,membershipNo,status (C-G) -> flatNo is C, name D, no E, status G
const MASTER_RANGE = `${MASTER_SHEET_NAME}!D:G`; 


export async function GET(request: Request, { params }: { params: { flatNo: string } }) {
  const { flatNo } = params;

  if (!flatNo) {
    return NextResponse.json({ error: 'Missing flat number' }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Check if user exists in `memberUsers` sheet first
    const usersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: USERS_RANGE,
    });

    const usersRows = usersResponse.data.values;
    if (usersRows) {
        const existingUserRow = usersRows.slice(1).find(row => row[0] == flatNo);
        if (existingUserRow) {
            const userDetails = {
                flatNo: existingUserRow[0],
                membershipNo: existingUserRow[1],
                ownerName: existingUserRow[2],
                userType: existingUserRow[3],
                membershipStatus: existingUserRow[5],
                isExistingUser: true,
            };
            return NextResponse.json(userDetails);
        }
    }

    // 2. If not in `memberUsers`, check `masterMembership` for a new record
    const masterResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: MASTER_RANGE,
    });

    const masterRows = masterResponse.data.values;
    if (masterRows) {
      // flatNo=C(0), memberName=D(1), membershipNo=E(2), status=G(4)
      const masterRecord = masterRows.slice(1).find(
        (row) => row[0] == flatNo && (row[4] === '' || row[4] === undefined || row[4] === null)
      );

      if (masterRecord) {
        const userDetails = {
            flatNo: masterRecord[0],
            membershipNo: masterRecord[2],
            ownerName: masterRecord[1],
            // Default other fields for the form, these are not from master
            userType: 'Member',
            membershipStatus: 'Active',
            isExistingUser: false,
        };
        return NextResponse.json(userDetails);
      }
    }

    // 3. If not found in either sheet
    return NextResponse.json({ error: 'User not found in memberUsers or no unprocessed record found in masterMembership' }, { status: 404 });

  } catch (error: any) {
    console.error('Error accessing Google Sheets:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching data.' }, { status: 500 });
  }
}
