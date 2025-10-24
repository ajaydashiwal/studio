
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const MASTER_MEMBERSHIP_SHEET_NAME = 'masterMembership';
const COLLECTION_SHEET_NAME = 'monthCollection';
const DEFAULT_MAINTENANCE_FEE = 300;

// Columns in masterMembership: C:flatNo, D:memberName, E:membershipNo, G:status
const USERS_RANGE = `${MASTER_MEMBERSHIP_SHEET_NAME}!C:G`;

const getMonthsInRange = (from: string, to: string): string[] => {
    const fromDate = parse(from, 'yyyy-MM', new Date());
    const toDate = parse(to, 'yyyy-MM', new Date());
    const months = [];
    let currentDate = fromDate;

    while (currentDate <= toDate) {
        // Format to "Month YYYY" to match the data in the sheet
        months.push(format(currentDate, 'MMMM yyyy'));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing "from" or "to" date range parameters' }, { status: 400 });
    }
    
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Fetch all potential users from masterMembership sheet
        const usersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: USERS_RANGE, // C:flatNo, D:memberName, E:membershipNo, F:?, G:status
        });
        
        // Filter for users where status (column G, index 4 in C:G range) is blank
        const users = usersResponse.data.values?.slice(1).filter(row => row[4] === '' || row[4] === undefined || row[4] === null)
            .map(row => ({ flatNo: row[0], ownerName: row[1] })) || [];
        
        if (!users.length) {
             return NextResponse.json({ error: 'No users with blank status found in masterMembership sheet.' }, { status: 404 });
        }

        // 2. Fetch all payment records
        // Columns: Flatno, name of tenant, receipt date, receipt number, monthpaid, amount paid...
        const collectionResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${COLLECTION_SHEET_NAME}!A:F`, // Fetch columns A through F
        });
        const payments = collectionResponse.data.values?.slice(1) || [];
        
        // 3. Generate the list of months for the period
        const periodMonths = getMonthsInRange(from, to);
        const totalMonthsInPeriod = periodMonths.length;

        // 4. Process data
        const summary = users.map(user => {
            if (!user.flatNo) return null; // Skip users without a flat number

            // Find all payments for the current user
            // Column A (index 0) is Flat No. Use == for type-insensitive comparison.
            const userPayments = payments.filter(p => p[0] == user.flatNo);
            
            // Filter those payments to be within the requested date range
            // Column E (index 4) is monthpaid
            const paidMonthsInPeriod = userPayments.filter(p => periodMonths.includes(p[4]));

            // Column F (index 5) is amount paid
            const totalPaid = paidMonthsInPeriod.reduce((acc, p) => {
                const amount = parseFloat(p[5]);
                return acc + (isNaN(amount) ? 0 : amount);
            }, 0);

            const dueMonthsCount = totalMonthsInPeriod - paidMonthsInPeriod.length;
            const totalDue = dueMonthsCount * DEFAULT_MAINTENANCE_FEE;
            
            return {
                flatNo: user.flatNo,
                ownerName: user.ownerName,
                totalPaid,
                totalDue: totalDue > 0 ? totalDue : 0, // Don't show negative dues
            };
        }).filter(Boolean); // Filter out any null entries

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for summary:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating summary.' }, { status: 500 });
    }
}
