
'use server';

// This file is intentionally left blank as the Defaulter Report has been removed.
// It can be deleted from the project.
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ error: 'This report has been removed.' }, { status: 404 });
}
