/**
 * app/api/agent/synthesize/route.ts
 * POST /api/agent/synthesize
 *
 * Text-to-Speech synthesis endpoint.
 * If a local TTS engine (Piper, IndicF5) is configured, this proxies to it.
 * Otherwise returns 503, and the client falls back to browser speechSynthesis.
 *
 * GET /api/agent/synthesize — returns TTS engine status.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LOCAL_TTS_URL = process.env.LOCAL_TTS_URL || ''; // e.g. http://localhost:5002

export async function POST(req: NextRequest) {
  // If a local TTS URL is configured, proxy the request
  if (LOCAL_TTS_URL) {
    try {
      const body = await req.json();
      const text = body.text as string;

      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      const ttsRes = await fetch(`${LOCAL_TTS_URL}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
        signal: AbortSignal.timeout(10_000),
      });

      if (ttsRes.ok) {
        const audioBuffer = await ttsRes.arrayBuffer();
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(audioBuffer.byteLength),
          },
        });
      }

      return NextResponse.json({ error: 'Local TTS engine error' }, { status: 502 });
    } catch (err: any) {
      console.error('[synthesize] Local TTS error:', err.message);
      return NextResponse.json({ error: 'Local TTS unreachable' }, { status: 502 });
    }
  }

  // No local TTS configured — client will use browser speechSynthesis
  return NextResponse.json(
    { error: 'Local TTS not configured. Client should use browser speechSynthesis fallback.' },
    { status: 503 },
  );
}

export async function GET() {
  if (LOCAL_TTS_URL) {
    try {
      const res = await fetch(`${LOCAL_TTS_URL}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ status: 'ok', engine: data });
      }
    } catch {
      return NextResponse.json({ status: 'tts_unreachable' }, { status: 503 });
    }
  }

  return NextResponse.json(
    { status: 'not_configured', fallback: 'browser-speechSynthesis' },
    { status: 503 },
  );
}
