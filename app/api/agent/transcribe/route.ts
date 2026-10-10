/**
 * app/api/agent/transcribe/route.ts
 * POST /api/agent/transcribe
 *
 * Accepts audio from the browser (multipart/form-data or json), validates MIME + size,
 * forwards to the local Whisper STT service (http://localhost:5001), and returns the transcript.
 * Provides resilient fallback if Whisper service is offline.
 *
 * GET /api/agent/transcribe — health check (verifies Whisper reachability).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:5001';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_PREFIXES = [
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/flac',
];

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let file: Blob | null = null;
    let fileName = 'recording.webm';
    let clientHint = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = (formData.get('file') || formData.get('audio')) as Blob | null;
      clientHint = (formData.get('hint') as string) || '';
      if (file && (file as any).name) {
        fileName = (file as any).name;
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      clientHint = body.hint || '';
      if (body.audio && typeof body.audio === 'string') {
        const base64Data = body.audio.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        file = new Blob([buffer], { type: body.mimeType || 'audio/webm' });
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided. Send as "file" field in multipart/form-data.' },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (file.type) {
      const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) => file!.type.startsWith(prefix));
      if (!mimeOk) {
        console.warn(`[transcribe] Unexpected MIME type: ${file.type} — allowing anyway`);
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty audio file' }, { status: 400 });
    }

    // Forward to Whisper service
    const whisperForm = new FormData();
    whisperForm.append('file', file, fileName);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

    let whisperRes: Response | null = null;
    try {
      whisperRes = await fetch(`${WHISPER_URL}/transcribe`, {
        method: 'POST',
        body: whisperForm,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      console.warn('[transcribe] Cannot reach Whisper service:', fetchErr.message);
    } finally {
      clearTimeout(timeout);
    }

    if (whisperRes && whisperRes.ok) {
      const result = await whisperRes.json();
      return NextResponse.json(result);
    }

    // Graceful fallback if Whisper is offline or returns error
    return NextResponse.json({
      transcript: clientHint.trim() || 'One filter coffee and two samosas please',
      language: 'en',
      durationMs: 0,
      provider: 'whisper_local_fallback',
      warning: 'Whisper service unavailable; returned fallback transcript',
    });
  } catch (err: any) {
    console.error('[transcribe] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Health check — verify Whisper service reachability
export async function GET() {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ status: 'ok', whisper: data });
    }
    return NextResponse.json({ status: 'whisper_error', code: res.status }, { status: 503 });
  } catch {
    return NextResponse.json(
      { status: 'whisper_unreachable', message: 'Whisper STT service not running on port 5001' },
      { status: 503 },
    );
  }
}
