
'use server';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
// Columns: flatNo, tenantName, receiptDate, receiptNo, monthPaid, amountPaid, modeOfPayment, transactionRef
const RANGE = `${COLLECTION_SHEET}!A:H`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // Expected format: 'yyyy-MM'

    if (!period) {
        return NextResponse.json({ error: 'Missing "period" parameter' }, { status: 400 });
    }
    const targetMonth = format(parse(period, 'yyyy-MM', new Date()), 'MMMM yyyy');

    try {
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

        const reportData = rows
            .map((row, index) => {
                const monthPaid = row[4];
                let formattedMonthPaid = '';
                try {
                    // Handle both 'MMM yyyy' and 'MMMM yyyy'
                    formattedMonthPaid = format(parse(monthPaid, monthPaid.length > 8 ? 'MMMM yyyy' : 'MMM yyyy', new Date()), 'MMMM yyyy');
                } catch {
                    return null; // Skip malformed rows
                }

                if (formattedMonthPaid === targetMonth) {
                    return {
                        id: index,
                        flatNo: row[0],
                        tenantName: row[1] || '-',
                        receiptDate: row[2],
                        receiptNo: row[3],
                        amount: parseFloat(row[5]) || 0,
                        modeOfPayment: row[6],
                        transactionRef: row[7] || '-',
                    };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => parseInt(a!.flatNo, 10) - parseInt(b!.flatNo, 10));


        return NextResponse.json(reportData);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for collection report:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating collection report.' }, { status: 500 });
    }
}
