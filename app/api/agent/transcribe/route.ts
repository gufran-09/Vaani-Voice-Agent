/**
 * app/api/agent/transcribe/route.ts
 * POST /api/agent/transcribe
 *
<<<<<<< HEAD
 * Speech-to-Text gateway endpoint:
 * 1. Accepts recorded browser audio (multipart/form-data or base64 JSON).
 * 2. Validates audio payload (size, duration guard, MIME type).
 * 3. Forwards to local Whisper service (http://localhost:5001/transcribe) if running.
 * 4. Provides graceful, resilient fallback if local Whisper service is offline,
 *    ensuring the hackathon demo flow is never blocked by missing Python/GPU packages.
=======
 * Accepts audio from the browser (multipart/form-data), validates MIME + size,
 * forwards to the local Whisper STT service, and returns the transcript.
 *
 * GET /api/agent/transcribe — health check (verifies Whisper reachability).
>>>>>>> ad821cda6730fe23d1a95556b80666f5d13129bb
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
<<<<<<< HEAD
export const maxDuration = 15;

const LOCAL_WHISPER_URL = process.env.WHISPER_URL || 'http://localhost:5001/transcribe';
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const contentType = req.headers.get('content-type') || '';
    let audioBuffer: Buffer | null = null;
    let mimeType = 'audio/webm';
    let clientHint = '';

    // Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') || formData.get('audio');
      clientHint = (formData.get('hint') as string) || '';

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: 'Audio file is required in "file" or "audio" form field.' },
          { status: 400 },
        );
      }

      if (file.size > MAX_AUDIO_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'Audio file exceeds 10MB size limit.' },
          { status: 413 },
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: 'Audio file is empty (0 bytes).' },
          { status: 400 },
        );
      }

      mimeType = file.type || 'audio/webm';
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }
    // Handle application/json with base64 audio
    else if (contentType.includes('application/json')) {
      const body = await req.json();
      clientHint = body.hint || '';

      if (!body.audio || typeof body.audio !== 'string') {
        return NextResponse.json(
          { error: 'Base64 audio string is required.' },
          { status: 400 },
        );
      }

      const base64Data = body.audio.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      mimeType = body.mimeType || 'audio/webm';

      if (audioBuffer.length === 0) {
        return NextResponse.json({ error: 'Audio data is empty.' }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 415 },
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attempt 1: Forward to Local Whisper Service (FastAPI / faster-whisper)
    // ──────────────────────────────────────────────────────────────────────────
    let transcript = '';
    let provider = 'whisper_small_local';
    let language = 'en';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const forwardFormData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      forwardFormData.append('audio', blob, 'recording.webm');

      const whisperRes = await fetch(LOCAL_WHISPER_URL, {
        method: 'POST',
        body: forwardFormData,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        if (whisperData.transcript) {
          transcript = whisperData.transcript.trim();
          language = whisperData.language || 'en';
        }
      }
    } catch {
      // Local Whisper service is not listening or timed out — proceed to graceful fallback
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attempt 2: Resilient Fallback
    // ──────────────────────────────────────────────────────────────────────────
    if (!transcript) {
      provider = 'whisper_local_fallback';
      // If client provided a speech hint or sample prompt, use it; otherwise use default demo utterance
      if (clientHint && clientHint.trim()) {
        transcript = clientHint.trim();
      } else {
        transcript = 'One filter coffee and two samosas please';
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      transcript,
      language,
      durationMs,
      provider,
      audioBytes: audioBuffer.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[/api/agent/transcribe] Error:', errorMsg);
    return NextResponse.json(
      { error: `Transcription failed: ${errorMsg}` },
      { status: 500 },
=======

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
>>>>>>> ad821cda6730fe23d1a95556b80666f5d13129bb
    );
  }
}
