
'use server';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { parse, format } from 'date-fns';

const SPREADSHEET_ID = '1qbU0Wb-iosYEUu34nXMPczUpwVrnRsUT6E7XZr1vnH0';
const COLLECTION_SHEET = 'monthCollection';
const MASTER_MEMBERSHIP_SHEET = 'masterMembership';

// Range for all active members in master list
// Columns: D:flatNo, E:memberName, G:status
const MASTER_RANGE = `${MASTER_MEMBERSHIP_SHEET}!D:G`;

// Range for payments
// Columns: A:Flatno, E:monthpaid
const COLLECTION_RANGE = `${COLLECTION_SHEET}!A:E`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // Expected format: 'yyyy-MM'

    if (!period) {
        return NextResponse.json({ error: 'Missing "period" parameter' }, { status: 400 });
    }

    try {
        const targetMonth = format(parse(period, 'yyyy-MM', new Date()), 'MMMM yyyy');

        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const [masterResponse, collectionResponse] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: MASTER_RANGE }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: COLLECTION_RANGE })
        ]);

        // 1. Get a list of all active member flats
        const allMembers = masterResponse.data.values?.slice(1) || [];
        const activeMembers = allMembers
            .filter(member => {
                const status = member[3]; // Column G (status)
                // Active members have a blank status
                return status === null || status === undefined || status === '';
            })
            .map(member => ({
                flatNo: member[0], // Column D
                ownerName: member[1] // Column E
            }));

        // 2. Get a set of flats that have paid for the target month
        const allPayments = collectionResponse.data.values?.slice(1) || [];
        const paidFlats = new Set();
        for (const payment of allPayments) {
            const flatNo = payment[0];
            const monthPaid = payment[4];
            if (!monthPaid || !flatNo) continue;

            try {
                // Normalize sheet month to 'MMMM yyyy' for comparison
                const normalizedMonthPaid = format(parse(monthPaid, monthPaid.length > 8 ? 'MMMM yyyy' : 'MMM yyyy', new Date()), 'MMMM yyyy');
                if (normalizedMonthPaid === targetMonth) {
                    paidFlats.add(flatNo);
                }
            } catch (e) {
                // Ignore rows with malformed dates
            }
        }

        // 3. Find which active members have NOT paid
        const defaulters = activeMembers
            .filter(member => !paidFlats.has(member.flatNo))
            .map((member, index) => ({
                id: index,
                flatNo: member.flatNo,
                ownerName: member.ownerName,
            }))
            .sort((a, b) => parseInt(a.flatNo, 10) - parseInt(b.flatNo, 10));

        return NextResponse.json(defaulters);

    } catch (error: any) {
        console.error('Error accessing Google Sheets for defaulters report:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Server configuration error: `google-credentials.json` not found.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal Server Error while generating defaulters report.' }, { status: 500 });
    }
}
