
'use server';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, getYear, getMonth } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
// Columns: flatNo(A), ... receiptDate(C), ... amountPaid(F)
const RANGE = `${COLLECTION_SHEET}!A:F`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // Expected format: 'yyyy-MM'

    if (!period) {
        return NextResponse.json({ error: 'Missing "period" parameter' }, { status: 400 });
    }

    try {
        const targetDate = parse(period, 'yyyy-MM', new Date());
        const targetYear = getYear(targetDate);
        const targetMonth = getMonth(targetDate);

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

        const filteredRows = rows.filter(row => {
            const receiptDateStr = row[2]; // Column C is receiptDate
            if (!receiptDateStr) return false;
            try {
                const receiptDate = parse(receiptDateStr, 'dd/MM/yyyy', new Date());
                return getYear(receiptDate) === targetYear && getMonth(receiptDate) === targetMonth;
            } catch {
                return false;
            }
        });
        
        // Group by flatNo
        const groupedData = new Map<string, number>();

        filteredRows.forEach(row => {
            const flatNo = row[0];
            const amount = parseFloat(row[5]) || 0;

            if (groupedData.has(flatNo)) {
                groupedData.set(flatNo, groupedData.get(flatNo)! + amount);
            } else {
                groupedData.set(flatNo, amount);
            }
        });
        
        const reportData = Array.from(groupedData.entries())
          .map(([flatNo, totalAmount], index) => ({ 
              id: index,
              flatNo, 
              amount: totalAmount 
          }))
          .sort((a, b) => parseInt(a.flatNo, 10) - parseInt(b.flatNo, 10));


        return NextResponse.json(reportData);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for collection report:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating collection report.' }, { status: 500 });
    }
}
