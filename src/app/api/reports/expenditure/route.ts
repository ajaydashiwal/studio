
'use server';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const EXPENDITURE_SHEET = 'expTransaction';
// Columns: expenditureId(A), expenditureType(B), description(C), amount(D), transactionDetails(E), submissionTimestamp(F)
const RANGE = `${EXPENDITURE_SHEET}!A:F`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
        return NextResponse.json({ error: 'Missing "from" or "to" date range parameters' }, { status: 400 });
    }

    try {
        const fromDate = startOfMonth(parse(from, 'yyyy-MM', new Date()));
        const toDate = endOfMonth(parse(to, 'yyyy-MM', new Date()));
        const dateInterval = { start: fromDate, end: toDate };
        
        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values?.slice(1) || [];

        const monthlyData: { [type: string]: { [month: string]: number } } = {};
        
        for (const row of rows) {
            const expenditureType = row[1];
            const amountStr = row[3];
            const timestampStr = row[5];

            if (!expenditureType || !amountStr || !timestampStr) continue;

            try {
                const expenditureDate = parse(timestampStr, 'dd/MM/yyyy HH:mm:ss', new Date());
                if (isWithinInterval(expenditureDate, dateInterval)) {
                    const amount = parseFloat(amountStr);
                    if (isNaN(amount)) continue;

                    const monthYear = format(expenditureDate, 'MMM yyyy');

                    if (!monthlyData[expenditureType]) {
                        monthlyData[expenditureType] = {};
                    }
                    monthlyData[expenditureType][monthYear] = (monthlyData[expenditureType][monthYear] || 0) + amount;
                }
            } catch (e) {
                // Ignore rows with invalid dates
            }
        }
        
        const reportData = Object.keys(monthlyData).map(type => {
            const months = Object.keys(monthlyData[type]).map(month => ({
                month,
                amount: monthlyData[type][month]
            })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

            const total = months.reduce((acc, item) => acc + item.amount, 0);

            return {
                type,
                months,
                total
            };
        }).sort((a, b) => a.type.localeCompare(b.type));


        return NextResponse.json(reportData);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for expenditure report:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating expenditure report.' }, { status: 500 });
    }
}
