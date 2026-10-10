/**
 * app/api/telephony/inbound/route.ts
 * POST /api/telephony/inbound
 *
 * Inbound telephony entrypoint for real cellular phone calls (Twilio / SIP compatible).
 * When a judge or customer dials the Cafe Vaani phone number:
 * 1. Twilio calls this webhook with caller phone number (From) and CallSid.
 * 2. Returns TwiML with warm bilingual greeting and opens live speech gather turn.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callerNumber = (formData.get('From') as string) || '+919876543210';
    const callSid = (formData.get('CallSid') as string) || `call-${Date.now()}`;

    console.log(`[telephony:inbound] Incoming call from ${callerNumber} (CallSid: ${callSid})`);

    const greeting = 'Namaste! Welcome to Cafe Vaani. What would you like to order today?';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${greeting}</Say>
  <Gather input="speech" action="/api/telephony/turn?sessionId=${encodeURIComponent(callSid)}&amp;callerPhone=${encodeURIComponent(callerNumber)}" method="POST" speechTimeout="auto" timeout="4" language="en-IN">
    <Say voice="Polly.Aditi" language="en-IN">I am listening.</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">We did not hear anything. Please call back anytime. Dhanyavaad!</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err: any) {
    console.error('[telephony:inbound] Error:', err);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Namaste from Cafe Vaani. Please hold while we connect you.</Say>
</Response>`;
    return new NextResponse(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Cafe Vaani Telephony Inbound Gateway',
    protocol: 'TwiML / SIP Voice Webhook',
  });
}
