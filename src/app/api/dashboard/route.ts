
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { startOfToday, subMonths, format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
const EXPENDITURE_SHEET = 'expenditure';
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
    const userRows = (collectionResponse.data.values || []).slice(1).filter((row: any[]) => row[0] == flatNo);
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
    const userFeedback = (complaintsResponse.data.values || []).slice(1).filter((row: any[]) => row[0] == flatNo);

    const feedbackSummary = userFeedback.reduce((acc: any, row: any[]) => {
        const status = row[4] || 'Open';
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
    const today = startOfToday();
    const oneYearAgo = subMonths(today, 12);

    // Collections
    const collectionRange = `${COLLECTION_SHEET}!C:F`; // receipt date, receipt no, monthpaid, amount
    const collectionResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: collectionRange });
    const totalCollections = (collectionResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        const amount = parseFloat(row[3]);
        return acc + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Expenditures
    const expenditureRange = `${EXPENDITURE_SHEET}!A:C`; // payment date, description, amount
    const expenditureResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: expenditureRange });
    const totalExpenditure = (expenditureResponse.data.values || []).slice(1).reduce((acc: number, row: any[]) => {
        const amount = parseFloat(row[2]);
        return acc + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Feedback from complaintTrans sheet
    const complaintsRange = `${COMPLAINT_TRANS_SHEET}!G:H`; // Status, Remarks
    const complaintsResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: complaintsRange });
    const complaintsRows = (complaintsResponse.data.values || []).slice(1);
    
    const openFeedbackCount = complaintsRows.filter((row: any[]) => {
        const status = row[0] || 'Open';
        return status === 'Open';
    }).length;
    
    const feedbackSummary = complaintsRows.reduce((acc: any, row: any[]) => {
        const status = row[0] || 'Open';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return {
        collections: totalCollections,
        expenditure: totalExpenditure,
        openFeedback: openFeedbackCount,
        feedback: Object.keys(feedbackSummary).map(key => ({ name: key, value: feedbackSummary[key] })),
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
