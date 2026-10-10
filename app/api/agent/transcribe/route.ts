/**
 * app/api/agent/transcribe/route.ts
 * POST /api/agent/transcribe
 *
 * Accepts audio from the browser (multipart/form-data), validates MIME + size,
 * forwards to the local Whisper STT service, and returns the transcript.
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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided. Send as "file" field in multipart/form-data.' },
        { status: 400 },
      );
    }

    // Validate MIME type
    const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
    if (!mimeOk && file.type !== '') {
      // Allow empty MIME (some browsers don't set it for MediaRecorder blobs)
      console.warn(`[transcribe] Unexpected MIME type: ${file.type} — allowing anyway`);
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
    whisperForm.append('file', file, file.name || 'recording.webm');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    let whisperRes: Response;
    try {
      whisperRes = await fetch(`${WHISPER_URL}/transcribe`, {
        method: 'POST',
        body: whisperForm,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: 'Whisper transcription timed out (30s)' }, { status: 504 });
      }
      console.error('[transcribe] Cannot reach Whisper service:', fetchErr.message);
      return NextResponse.json(
        { error: 'Whisper STT service unreachable. Is whisper_service.py running on port 5001?' },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text().catch(() => 'unknown error');
      console.error('[transcribe] Whisper returned error:', whisperRes.status, errBody);
      return NextResponse.json(
        { error: `Whisper error: ${errBody}` },
        { status: 502 },
      );
    }

    const result = await whisperRes.json();
    return NextResponse.json(result);
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
