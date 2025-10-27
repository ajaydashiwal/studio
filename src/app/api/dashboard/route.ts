
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { startOfToday, subMonths, format, parse } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
const EXPENDITURE_SHEET = 'expTransaction';
const COMPLAINT_TRANS_SHEET = 'complaintTrans';

const getAuth = () => new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
});

const getSheetsClient = () => {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
};

const getMemberDashboardData = async (sheets: any, flatNo: string) => {
    // Maintenance Data
    const collectionRange = `${COLLECTION_SHEET}!A:F`; // Flat No, ..., monthpaid, amount
    const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: collectionRange });
    const userRows = (collectionResponse.data.values || []).slice(1).filter((row: any[]) => row && row[0] == flatNo);
    const paidMonths = userRows.map((row: any[]) => row[4]);

    const today = startOfToday();
    let paidCount = 0;
    for (let i = 0; i < 24; i++) {
        const monthToCheck = format(subMonths(today, i), 'MMMM yyyy');
        if (paidMonths.includes(monthToCheck)) {
            paidCount++;
        }
    }
    const dueCount = 24 - paidCount;

    // Feedback Data from complaintTrans sheet
    const complaintsRange = `${COMPLAINT_TRANS_SHEET}!C:G`; // flatNo, formType, issueCategory, description, status
    const complaintsResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: complaintsRange });
    const userFeedback = (complaintsResponse.data.values || []).slice(1).filter((row: any[]) => row && row[0] == flatNo);

    const feedbackSummary = userFeedback.reduce((acc: any, row: any[]) => {
        if (!row || !row[4]) return acc;
        const status = row[4] || 'Open'; // Status is at index 4 (column G)
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    return {
        maintenance: [
            { name: 'Paid', value: paidCount, fill: 'var(--color-paid)' },
            { name: 'Due', value: dueCount, fill: 'var(--color-due)' },
        ],
        feedback: Object.keys(feedbackSummary).map(key => ({ name: key, value: feedbackSummary[key] })),
    };
};

const getOfficeBearerDashboardData = async (sheets: any) => {
    const twentyFourMonthsAgo = subMonths(new Date(), 24);

    // Collections in the last 24 months
    const collectionRange = `${COLLECTION_SHEET}!C:F`; // receipt date, ..., amount
    const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: collectionRange });
    const totalCollections = (collectionResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        if (!row || !row[0] || !row[3]) return acc;
        try {
            const paymentDate = parse(row[0], 'dd/MM/yyyy', new Date());
            if (paymentDate >= twentyFourMonthsAgo) {
                const amount = parseFloat(row[3]);
                return acc + (isNaN(amount) ? 0 : amount);
            }
        } catch (e) { /* ignore parse errors */ }
        return acc;
    }, 0);

    // Expenditures in the last 24 months
    const expenditureRange = `${EXPENDITURE_SHEET}!A:C`; // paymentDate, ..., amount
    const expenditureResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: expenditureRange });
    const totalExpenditure = (expenditureResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        if (!row || !row[0] || !row[2]) return acc;
        try {
            const paymentDate = parse(row[0], 'dd/MM/yyyy', new Date());
            if (paymentDate >= twentyFourMonthsAgo) {
                const amount = parseFloat(row[2]);
                return acc + (isNaN(amount) ? 0 : amount);
            }
        } catch (e) { /* ignore parse errors */ }
        return acc;
    }, 0);
    
    // Feedback summary (Complaints vs Suggestions)
    const complaintsRange = `${COMPLAINT_TRANS_SHEET}!D:D`; // formType
    const complaintsResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: complaintsRange });
    const feedbackSummary = (complaintsResponse.data.values || []).slice(1).reduce((acc: any, row: any[]) => {
        if (!row || !row[0]) return acc;
        const formType = row[0]; // 'Complaint' or 'Suggestion'
        if (formType === 'Complaint' || formType === 'Suggestion') {
             acc[formType] = (acc[formType] || 0) + 1;
        }
        return acc;
    }, {});

    return {
       financials: [
            { name: 'Collections', value: totalCollections, fill: 'hsl(var(--chart-2))' },
            { name: 'Expenditure', value: totalExpenditure, fill: 'hsl(var(--chart-5))'  },
        ],
       feedbackSummary: [
           { name: 'Complaints', value: feedbackSummary['Complaint'] || 0, fill: 'hsl(var(--chart-1))' },
           { name: 'Suggestions', value: feedbackSummary['Suggestion'] || 0, fill: 'hsl(var(--chart-4))'  },
       ]
    };
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType');
    const flatNo = searchParams.get('flatNo');

    if (!userType || (userType === 'Member' && !flatNo)) {
        return NextResponse.json({ error: 'Missing userType or flatNo for Member' }, { status: 400 });
    }

    try {
        const sheets = getSheetsClient();
        let data;

        if (userType === 'Member') {
            data = await getMemberDashboardData(sheets, flatNo!);
        } else {
            data = await getOfficeBearerDashboardData(sheets);
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
