
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const MASTER_MEMBERSHIP_SHEET_NAME = 'masterMembership';
const COLLECTION_SHEET_NAME = 'monthCollection';
const DEFAULT_MAINTENANCE_FEE = 300;
const TOTAL_FLATS = 1380;

// Columns in masterMembership: C:flatNo, D:memberName
const MASTER_RANGE = `${MASTER_MEMBERSHIP_SHEET_NAME}!C:D`;
// Columns in monthCollection: A:Flatno, E:monthpaid, F:amount paid
const COLLECTION_RANGE = `${COLLECTION_SHEET_NAME}!A:F`;

const getMonthsInRange = (from: string, to: string): string[] => {
    const fromDate = parse(from, 'yyyy-MM', new Date());
    const toDate = parse(to, 'yyyy-MM', new Date());
    const months = [];
    let currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
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

        // 1. Fetch all data from both sheets at once
        const [masterResponse, collectionResponse] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: MASTER_RANGE }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: COLLECTION_RANGE })
        ]);

        const masterMembers = masterResponse.data.values?.slice(1) || []; // [[flatNo, memberName], ...]
        const payments = collectionResponse.data.values?.slice(1) || []; // [[flatNo, tenantName, ..., month, amount], ...]

        // Create a fast-lookup map for master members
        const masterNameMap = new Map(masterMembers.map(row => [String(row[0]).trim(), row[1]]));
        
        // 2. Generate the list of months for the period
        const periodMonths = getMonthsInRange(from, to);
        const totalMonthsInPeriod = periodMonths.length;

        // 3. Process data for all flats from 1 to 1380
        const summary = [];
        for (let i = 1; i <= TOTAL_FLATS; i++) {
            const flatNo = String(i);
            
            // Get owner name ONLY from master membership
            const ownerName = masterNameMap.get(flatNo) || "NOT KNOWN";
            
            // Find all payments for the current flat within the requested date range
            const paidMonthsInPeriod = payments.filter(p => String(p[0]).trim() === flatNo && periodMonths.includes(p[4]));

            const totalPaid = paidMonthsInPeriod.reduce((acc, p) => {
                const amount = parseFloat(p[5]);
                return acc + (isNaN(amount) ? 0 : amount);
            }, 0);

            const dueMonthsCount = totalMonthsInPeriod - paidMonthsInPeriod.length;
            const totalDue = dueMonthsCount * DEFAULT_MAINTENANCE_FEE;
            
            summary.push({
                flatNo,
                ownerName,
                totalPaid,
                totalDue: totalDue > 0 ? totalDue : 0, // Don't show negative dues
            });
        }

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for summary:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating summary.' }, { status: 500 });
    }
}
