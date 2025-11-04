
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
const EXPENDITURE_SHEET = 'expTransaction';
const COMPLAINT_TRANS_SHEET = 'complaintTrans';

const getIstDate = () => toZonedTime(new Date(), 'Asia/Kolkata');

const getAuth = () => new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
});

const getSheetsClient = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

const getExpenditureSummary = async (sheets: any, fromDate: Date, toDate: Date) => {
    const expenditureRange = `${EXPENDITURE_SHEET}!B:D`; // expenditureType, description, amount
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: expenditureRange });
    const rows = response.data.values?.slice(1) || [];

    const categoryTotals: { [key: string]: number } = {};

    for (const row of rows) {
        const expenditureType = row[0];
        const amountStr = row[2];
        const paymentDateStr = row[3]; // Assuming paymentDate is in column D

        if (!expenditureType || !amountStr || !paymentDateStr) continue;

        try {
            // Adjust date parsing if the format is different
            const paymentDate = parse(paymentDateStr, 'dd/MM/yyyy', new Date());
            if (isWithinInterval(paymentDate, { start: fromDate, end: toDate })) {
                const amount = parseFloat(amountStr);
                if (!isNaN(amount)) {
                    categoryTotals[expenditureType] = (categoryTotals[expenditureType] || 0) + amount;
                }
            }
        } catch (e) {
            // Ignore rows with invalid dates
        }
    }
    
    // Fetch all expenditure categories to ensure all are present in the final report
    const expReportResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${EXPENDITURE_SHEET}!B:F`, // B is type, F is timestamp
    });
    const expenditureRows = expReportResponse.data.values?.slice(1) || [];
    
    const monthlyData: { [type: string]: { [month: string]: number } } = {};
    const dateInterval = { start: fromDate, end: toDate };
    
    for (const row of expenditureRows) {
        const expenditureType = row[0];
        const amountStr = row[2];
        const timestampStr = row[4];

        if (!expenditureType || !amountStr || !timestampStr) continue;

        try {
            const expenditureDate = parse(timestampStr, 'dd/MM/yyyy HH:mm:ss', new Date());
            if (isWithinInterval(expenditureDate, dateInterval)) {
                const amount = parseFloat(amountStr);
                if (isNaN(amount)) continue;

                if (!monthlyData[expenditureType]) {
                    monthlyData[expenditureType] = {};
                }
                const monthYear = format(expenditureDate, 'MMM yyyy');
                monthlyData[expenditureType][monthYear] = (monthlyData[expenditureType][monthYear] || 0) + amount;
            }
        } catch (e) {
            // Ignore rows with invalid dates
        }
    }

    const reportData = Object.keys(monthlyData).map(type => {
        const total = Object.values(monthlyData[type]).reduce((acc, amount) => acc + amount, 0);
        return {
            type,
            total
        };
    }).sort((a, b) => a.type.localeCompare(b.type));


    return reportData;
};


const getMemberDashboardData = async (sheets: any, flatNo: string, from?: string, to?: string) => {
    const toDate = to ? endOfMonth(parse(to, 'yyyy-MM', new Date())) : getIstDate();
    const fromDate = from ? startOfMonth(parse(from, 'yyyy-MM', new Date())) : subMonths(toDate, 11);

    // Maintenance Data from monthCollection
    const collectionRange = `${COLLECTION_SHEET}!A:E`; // Flat No, ..., monthpaid
    const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: collectionRange });
    const userRows = (collectionResponse.data.values || []).slice(1).filter((row: any[]) => row && row[0] == flatNo);
    const paidMonths = userRows.map((row: any[]) => row[4]);

    const now = getIstDate();
    let paidCount = 0;
    for (let i = 0; i < 24; i++) {
        const d = subMonths(now, i);
        const monthToCheck = format(d, 'MMMM yyyy');
        if (paidMonths.includes(monthToCheck)) {
            paidCount++;
        }
    }
    const dueCount = 24 - paidCount;

    // Feedback Data from complaintTrans sheet
    const complaintsRange = `${COMPLAINT_TRANS_SHEET}!C:G`; // flatNo, formType, ..., status
    const complaintsResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: complaintsRange });
    const userFeedback = (complaintsResponse.data.values || []).slice(1).filter((row: any[]) => row && row[0] == flatNo);

    const feedbackSummary = userFeedback.reduce((acc: any, row: any[]) => {
        if (!row || !row[4]) return acc; // Ensure row and status column exist
        const status = row[4] || 'Open'; // Status is at index 4 (column G)
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    // Expenditure data for member
    const expenditureData = await getExpenditureSummary(sheets, fromDate, toDate);

    return {
        maintenance: [
            { name: 'Paid', value: paidCount, fill: 'var(--color-paid)' },
            { name: 'Due', value: dueCount, fill: 'var(--color-due)' },
        ],
        feedback: Object.keys(feedbackSummary).map(key => ({ name: key, value: feedbackSummary[key] })),
        expenditure: expenditureData,
    };
};

const getOfficeBearerDashboardData = async (sheets: any, from?: string, to?: string) => {
    // Determine the date range, defaulting to the last 12 months if not provided.
    const toDate = to ? endOfMonth(parse(to, 'yyyy-MM', new Date())) : getIstDate();
    const fromDate = from ? startOfMonth(parse(from, 'yyyy-MM', new Date())) : subMonths(toDate, 11);
    const dateInterval = { start: fromDate, end: toDate };

    // Total Collections within the specified period from monthCollection sheet
    // Columns: E (monthpaid), F (amount paid)
    const collectionRange = `${COLLECTION_SHEET}!E:F`;
    const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: collectionRange });
    const totalCollections = (collectionResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        if (!row || !row[0] || !row[1]) return acc;
        try {
            // row[0] is monthpaid (e.g., "June 2024")
            const monthDate = startOfMonth(parse(row[0], 'MMMM yyyy', new Date()));
            if (isWithinInterval(monthDate, dateInterval)) {
                const amount = parseFloat(row[1]); // row[1] is amount paid
                return acc + (isNaN(amount) ? 0 : amount);
            }
        } catch (e) { /* Ignore rows with invalid dates */ }
        return acc;
    }, 0);

    // Total Expenditure within the specified period from expTransaction sheet
    // Columns: D (amount), F (submissionTimestamp)
    const expenditureRange = `${EXPENDITURE_SHEET}!D:F`;
    const expenditureResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: expenditureRange });
    const totalExpenditure = (expenditureResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        if (!row || !row[0] || !row[2]) return acc; // amount is D (index 0), submissionTimestamp is F (index 2)
        try {
            // row[2] is submissionTimestamp (e.g., "dd/MM/yyyy HH:mm:ss")
            const expenditureDate = parse(row[2], 'dd/MM/yyyy HH:mm:ss', new Date());
             if (isWithinInterval(expenditureDate, dateInterval)) {
                const amount = parseFloat(row[0]); // row[0] is amount
                return acc + (isNaN(amount) ? 0 : amount);
            }
        } catch (e) { /* Ignore rows with invalid dates */ }
        return acc;
    }, 0);

    // Feedback Breakdown within the specified period
    const complaintsRange = `${COMPLAINT_TRANS_SHEET}!B:D`; // submissionDate, flatNo, formType
    const complaintsResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: complaintsRange });
    const complaintsRows = complaintsResponse.data.values || [];
    
    const feedbackSummary = complaintsRows.slice(1).reduce((acc: any, row: any[]) => {
        if (!row || !row[0] || !row[2]) return acc; // Ensure submissionDate and formType exist
        try {
             // Date format is "dd/MM/yyyy HH:mm:ss"
            const submissionDate = parse(row[0], 'dd/MM/yyyy HH:mm:ss', new Date());
            if (isWithinInterval(submissionDate, dateInterval)) {
                const formType = row[2]; // 'Complaint' or 'Suggestion'
                if (formType === 'Complaint' || formType === 'Suggestion') {
                    acc[formType] = (acc[formType] || 0) + 1;
                }
            }
        } catch (e) { /* Ignore rows with invalid dates */ }
        return acc;
    }, {});


    return {
       financialSummary: [
            { name: 'Collections', value: totalCollections, fill: 'hsl(var(--chart-2))' },
            { name: 'Expenditure', value: totalExpenditure, fill: 'hsl(var(--chart-5))'  },
       ],
       feedbackSummary: [
           { name: 'Complaints', value: feedbackSummary['Complaint'] || 0, fill: 'hsl(var(--chart-1))' },
           { name: 'Suggestions', value: feedbackSummary['Suggestion'] || 0, fill: 'hsl(var(--chart-4))' },
       ]
    };
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType');
    const flatNo = searchParams.get('flatNo');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!userType) {
        return NextResponse.json({ error: 'Missing userType' }, { status: 400 });
    }
    if (userType === 'Member' && !flatNo) {
        return NextResponse.json({ error: 'Missing flatNo for Member' }, { status: 400 });
    }

    try {
        const sheets = getSheetsClient();
        let data;

        if (userType === 'Member') {
            data = await getMemberDashboardData(sheets, flatNo!, from || undefined, to || undefined);
        } else {
            data = await getOfficeBearerDashboardData(sheets, from || undefined, to || undefined);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for dashboard:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating dashboard data.' }, { status: 500 });
    }
}
