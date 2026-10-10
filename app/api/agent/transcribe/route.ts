/**
 * app/api/agent/transcribe/route.ts
 * POST /api/agent/transcribe
 *
 * Accepts audio from the browser (multipart/form-data or application/json), validates MIME + size,
 * forwards to the local Whisper STT service (http://localhost:5001/transcribe), and returns the transcript.
 * Provides resilient fallback for development/demo if Whisper service is unreachable.
 *
 * GET /api/agent/transcribe — health check (verifies Whisper reachability).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const WHISPER_URL = process.env.WHISPER_URL || 'http://127.0.0.1:5001';
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
  const startTime = Date.now();

  try {
    const contentType = req.headers.get('content-type') || '';
    let audioFile: File | Blob | null = null;
    let fileName = 'recording.webm';
    let clientHint = '';

    // Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const rawFile = formData.get('file') || formData.get('audio');
      clientHint = (formData.get('hint') as string) || '';

      if (rawFile && rawFile instanceof Blob) {
        audioFile = rawFile;
        if (rawFile instanceof File && rawFile.name) {
          fileName = rawFile.name;
        }
      }
    }
    // Handle application/json with base64 audio
    else if (contentType.includes('application/json')) {
      const body = await req.json();
      clientHint = body.hint || '';

      if (body.audio && typeof body.audio === 'string') {
        const base64Data = body.audio.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const mimeType = body.mimeType || 'audio/webm';
        audioFile = new Blob([buffer], { type: mimeType });
        fileName = 'recording.webm';
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 415 },
      );
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio provided. Send as "file" or "audio" in multipart/form-data, or base64 "audio" in JSON.' },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (audioFile.type) {
      const mimeOk = ALLOWED_MIME_PREFIXES.some((prefix) => audioFile!.type.startsWith(prefix));
      if (!mimeOk) {
        console.warn(`[transcribe] Unexpected MIME type: ${audioFile.type} — allowing anyway`);
      }
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(audioFile.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` },
        { status: 413 },
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Audio file is empty (0 bytes).' }, { status: 400 });
    }

    // Forward to local Whisper service
    const whisperForm = new FormData();
    whisperForm.append('file', audioFile, fileName);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

    let whisperRes: Response | null = null;
    let whisperError: string | null = null;

    try {
      whisperRes = await fetch(`${WHISPER_URL}/transcribe`, {
        method: 'POST',
        body: whisperForm,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        whisperError = 'Whisper transcription timed out (15s)';
      } else {
        whisperError = `Cannot reach Whisper service at ${WHISPER_URL}: ${fetchErr.message}`;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (whisperRes && whisperRes.ok) {
      const result = await whisperRes.json();
      return NextResponse.json({
        ...result,
        provider: result.model || 'whisper_turbo_local',
      });
    }

    // If Whisper failed or was unreachable:
    if (whisperRes && !whisperRes.ok) {
      const errBody = await whisperRes.text().catch(() => 'unknown error');
      console.error('[transcribe] Whisper service returned error:', whisperRes.status, errBody);
      whisperError = `Whisper service error (${whisperRes.status}): ${errBody}`;
    }

    // If a client hint was provided or fallback desired, provide graceful transcript
    if (clientHint && clientHint.trim()) {
      console.warn('[transcribe] Whisper unavailable; using client hint fallback.');
      return NextResponse.json({
        transcript: clientHint.trim(),
        language: 'en',
        durationMs: Date.now() - startTime,
        provider: 'whisper_local_fallback',
        warning: whisperError || 'Whisper offline',
      });
    }

    return NextResponse.json(
      {
        error: whisperError || 'Whisper STT service unreachable. Is python scripts/whisper_service.py running on port 5001?',
      },
      { status: 502 },
    );
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
      { status: 'whisper_unreachable', message: `Whisper STT service not running on ${WHISPER_URL}` },
      { status: 503 },
    );
  }
}
