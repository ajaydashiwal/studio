
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const USERS_SHEET_NAME = 'memberUsers';
const COLLECTION_SHEET_NAME = 'monthCollection';
const DEFAULT_MAINTENANCE_FEE = 300;

const getMonthsInRange = (from: string, to: string): string[] => {
    const fromDate = parse(from, 'yyyy-MM', new Date());
    const toDate = parse(to, 'yyyy-MM', new Date());
    const months = [];
    let currentDate = fromDate;

    while (currentDate <= toDate) {
        months.push(currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));
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

        // 1. Fetch all users
        const usersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${USERS_SHEET_NAME}!A:C`, // flatNo, membershipNo, ownerName
        });
        const users = usersResponse.data.values?.slice(1).map(row => ({ flatNo: row[0], ownerName: row[2] })) || [];
        if (!users.length) {
             return NextResponse.json({ error: 'No users found in memberUsers sheet.' }, { status: 404 });
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
            // Find all payments for the current user
            // Column A (index 0) is Flat No
            const userPayments = payments.filter(p => p[0]?.toLowerCase() === user.flatNo?.toLowerCase());
            
            // Filter those payments to be within the requested date range
            // Column E (index 4) is monthpaid
            const paidMonthsInPeriod = userPayments.filter(p => periodMonths.includes(p[4]));

            // Column F (index 5) is amount paid
            const totalPaid = paidMonthsInPeriod.reduce((acc, p) => acc + (parseFloat(p[5]) || 0), 0);
            const dueMonthsCount = totalMonthsInPeriod - paidMonthsInPeriod.length;
            const totalDue = dueMonthsCount * DEFAULT_MAINTENANCE_FEE;
            
            return {
                flatNo: user.flatNo,
                ownerName: user.ownerName,
                totalPaid,
                totalDue: totalDue > 0 ? totalDue : 0, // Don't show negative dues
            };
        });

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for summary:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating summary.' }, { status: 500 });
    }
}
