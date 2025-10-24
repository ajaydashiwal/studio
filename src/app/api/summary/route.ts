
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format, differenceInCalendarMonths } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const MASTER_MEMBERSHIP_SHEET_NAME = 'masterMembership';
const COLLECTION_SHEET_NAME = 'monthCollection';
const DEFAULT_MAINTENANCE_FEE = 300;

// Columns in masterMembership: D:flatNo, E:memberName, G:status
const MASTER_RANGE = `${MASTER_MEMBERSHIP_SHEET_NAME}!D:G`;
// Columns in monthCollection: A:Flatno, B:tenantName, E:monthpaid, F:amount paid
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

const getMemberSummary = async (sheets: any, periodMonths: string[], allPayments: any[][]) => {
    const masterResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: MASTER_RANGE });
    const masterMembers = masterResponse.data.values?.slice(1) || [];

    const filteredMasterMembers = masterMembers.filter(member => {
        const status = member[3]; // Column G is the 4th column (index 3)
        return status === null || status === undefined || status === '';
    });

    const summary = filteredMasterMembers.map(member => {
        const flatNo = String(member[0]).trim();
        const ownerName = member[1] || "NOT KNOWN";

        const paidMonthsInPeriod = allPayments.filter(p => String(p[0]).trim() === flatNo && periodMonths.includes(p[4]));

        const totalPaid = paidMonthsInPeriod.reduce((acc, p) => {
            const amount = parseFloat(p[5]);
            return acc + (isNaN(amount) ? 0 : amount);
        }, 0);

        const dueMonthsCount = periodMonths.length - paidMonthsInPeriod.length;
        const totalDue = dueMonthsCount * DEFAULT_MAINTENANCE_FEE;
        
        return {
            flatNo,
            ownerName,
            totalPaid,
            totalDue: totalDue > 0 ? totalDue : 0,
        };
    });

    return summary;
};

const getNonMemberSummary = async (sheets: any, periodMonths: string[], allPayments: any[][], from: string, to: string) => {
    const masterResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${MASTER_MEMBERSHIP_SHEET_NAME}!D:D` });
    const masterFlatNos = new Set((masterResponse.data.values?.slice(1) || []).map(row => String(row[0]).trim()));

    const paymentTenantMap = new Map<string, string>();
    for (const payment of [...allPayments].reverse()) {
        const flatNo = String(payment[0]).trim();
        const tenantName = payment[1] || '';
        if (!paymentTenantMap.has(flatNo) && tenantName) {
            paymentTenantMap.set(flatNo, tenantName);
        }
    }

    const fromDate = parse(from, 'yyyy-MM', new Date());
    const toDate = parse(to, 'yyyy-MM', new Date());
    const totalMonthsInPeriod = differenceInCalendarMonths(toDate, fromDate) + 1;

    const summary = [];
    for (let i = 1; i <= 1380; i++) {
        const flatNo = String(i);
        if (masterFlatNos.has(flatNo)) {
            continue; // Skip members
        }

        const paymentsInPeriod = allPayments.filter(p => String(p[0]).trim() === flatNo && periodMonths.includes(p[4]));
        
        const ownerName = paymentTenantMap.get(flatNo) || "NOT KNOWN";

        const totalPaid = paymentsInPeriod.reduce((acc, p) => {
            const amount = parseFloat(p[5]);
            return acc + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        const totalPeriodExpected = totalMonthsInPeriod * DEFAULT_MAINTENANCE_FEE;
        const totalDue = totalPeriodExpected - totalPaid;

        summary.push({
            flatNo,
            ownerName,
            totalPaid,
            totalDue: totalDue > 0 ? totalDue : 0,
        });
    }

    return summary;
};


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type'); // 'non-member' or null

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing "from" or "to" date range parameters' }, { status: 400 });
    }
    
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: COLLECTION_RANGE });
        const allPayments = collectionResponse.data.values?.slice(1) || [];
        
        const periodMonths = getMonthsInRange(from, to);
        
        let summary;
        if (type === 'non-member') {
            summary = await getNonMemberSummary(sheets, periodMonths, allPayments, from, to);
        } else {
            summary = await getMemberSummary(sheets, periodMonths, allPayments);
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
