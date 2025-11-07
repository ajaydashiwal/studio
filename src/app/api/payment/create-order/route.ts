
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

export async function POST(request: Request) {
  const { amount, flatNo, monthYear } = await request.json();

  if (!amount || !flatNo || !monthYear) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const options = {
      amount: amount * 100, // Amount in the smallest currency unit
      currency: "INR",
      receipt: `receipt_flat_${flatNo}_${monthYear.replace(' ','_')}_${crypto.randomBytes(4).toString('hex')}`,
      notes: {
          flatNo,
          monthYear
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal Server Error while creating order.' }, { status: 500 });
  }
}
