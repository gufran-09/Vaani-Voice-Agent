/**
 * app/api/telephony/turn/route.ts
 * POST /api/telephony/turn
 *
 * Real-time telephony turn handler for live phone calls.
 * 1. Receives caller spoken transcript (SpeechResult) from telephony carrier.
 * 2. Runs the multi-turn AI pipeline (Ollama local LLM + PostgreSQL safe tools).
 * 3. Returns audio speech response (TwiML <Say>) and continues dialogue with next <Gather>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTurn } from '@/lib/agent/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROPERTY_ID = process.env.VAANI_PROPERTY_ID || '';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId') || `call-${Date.now()}`;
    const callerPhone = url.searchParams.get('callerPhone') || '+919876543210';

    const formData = await req.formData();
    const speechResult = (formData.get('SpeechResult') as string) || '';
    const confidence = formData.get('Confidence');

    console.log(`[telephony:turn] Caller (${callerPhone}): "${speechResult}" (Confidence: ${confidence})`);

    if (!speechResult || speechResult.trim().length === 0) {
      const retryTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Sorry, I did not catch that. Could you repeat your order?</Say>
  <Gather input="speech" action="/api/telephony/turn?sessionId=${encodeURIComponent(sessionId)}&amp;callerPhone=${encodeURIComponent(callerPhone)}" method="POST" speechTimeout="auto" timeout="4" language="en-IN">
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for calling Cafe Vaani. Have a wonderful day!</Say>
  <Hangup/>
</Response>`;
      return new NextResponse(retryTwiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }

    // Run the primary agent chat turn with Ollama & safe menu tools
    const chatRes = await fetch(`http://localhost:3000/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: speechResult.trim(),
        sessionId,
        callerPhone,
        customerName: 'Phone Caller',
        propertyId: PROPERTY_ID,
      }),
    });

    const result = await chatRes.json();
    const agentReply = result.reply || 'Noted, checking that for you.';
    const cleanReply = escapeXml(agentReply.replace(/[*_#`~]/g, '').trim());

    // Check if call should conclude (order confirmed or user said goodbye)
    const isGoodbye = /\b(bye|thank you|dhanyavaad|shukriya|that is all|nothing else)\b/i.test(speechResult);
    const orderConfirmed = Boolean(result.orderCreated);

    let twiml: string;

    if (orderConfirmed) {
      // Order is confirmed: announce order details, ETA, and SMS notification
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${cleanReply}</Say>
  <Say voice="Polly.Aditi" language="en-IN">We look forward to serving you at Cafe Vaani. Have a great day!</Say>
  <Hangup/>
</Response>`;
    } else if (isGoodbye) {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${cleanReply}</Say>
  <Hangup/>
</Response>`;
    } else {
      // Continue multi-turn conversation
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">${cleanReply}</Say>
  <Gather input="speech" action="/api/telephony/turn?sessionId=${encodeURIComponent(sessionId)}&amp;callerPhone=${encodeURIComponent(callerPhone)}" method="POST" speechTimeout="auto" timeout="4" language="en-IN">
  </Gather>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for calling Cafe Vaani. Please call again soon!</Say>
  <Hangup/>
</Response>`;
    }

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err: any) {
    console.error('[telephony:turn] Error:', err);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">We are processing your request. Please wait one moment.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(errorTwiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
