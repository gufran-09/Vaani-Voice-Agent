/**
 * app/api/agent/chat/route.ts
 * POST /api/agent/chat
 *
 * The single integration point between:
 *   - Member 1 (voice modal → sends transcript here)
 *   - Member 2 (this file — runs the AI agent loop)
 *   - Member 3 (reads orderCreated to trigger SMS + show on KDS)
 *
 * Request body:
 *   { callId: string, transcript: string, sessionId: string, callerPhone?: string }
 *
 * Response:
 *   { reply: string, orderCreated?: { orderId, orderNumber, totalAmount, etaMinutes, items } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTurn } from '@/lib/agent/orchestrator';

export const runtime = 'nodejs'; // Required — uses AWS SDK (no edge runtime)
export const maxDuration = 30;   // 30s timeout for Bedrock round-trips

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      callId?: string;
      transcript?: string;
      sessionId?: string;
      callerPhone?: string;
    };

    const { transcript, sessionId, callerPhone } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const result = await runTurn(sessionId, transcript.trim(), callerPhone);

    return NextResponse.json({
      reply: result.reply,
      ...(result.orderCreated ? { orderCreated: result.orderCreated } : {}),
    });

  } catch (err) {
    console.error('[/api/agent/chat] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Health-check — GET /api/agent/chat
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    model: process.env.BEDROCK_MODEL_ID,
    property: process.env.VAANI_PROPERTY_ID,
  });
}
