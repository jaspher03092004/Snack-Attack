import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email ?? 'unknown';

    console.log('Account request received for:', email);

    // TODO: integrate a service such as Resend or Nodemailer here.
    // Send the notification to siloyjaspherlawrence@gmail.com.

    return NextResponse.json({ success: true, message: 'Account request received.' });
  } catch (error) {
    console.error('Error handling account request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process account request.' },
      { status: 500 }
    );
  }
}
