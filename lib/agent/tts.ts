/**
 * lib/agent/tts.ts
 * Text-to-Speech interface for VAANI voice console.
 * 
 * Strategy:
 *   1. Try local TTS engine (Piper / IndicF5) via /api/agent/synthesize
 *   2. Fall back to browser window.speechSynthesis (always available)
 * 
 * IMPORTANT: This module is client-side only. Do not import in server components.
 */

export type TTSMode = 'local' | 'browser-fallback';

let currentMode: TTSMode = 'browser-fallback';

/**
 * Detect whether a local TTS engine is running.
 * Call once on page load; result is cached in `currentMode`.
 */
export async function detectTTSMode(): Promise<TTSMode> {
  try {
    const res = await fetch('/api/agent/synthesize', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.local_tts === true) {
        currentMode = 'local';
        return 'local';
      }
    }
  } catch {
    // Local TTS not available — use browser fallback
  }
  currentMode = 'browser-fallback';
  return 'browser-fallback';
}

/** Get the current TTS mode (local or browser-fallback). */
export function getTTSMode(): TTSMode {
  return currentMode;
}

/**
 * Speak the given text aloud.
 * Tries local TTS first (if detected), otherwise uses browser speechSynthesis.
 * Returns a promise that resolves when speech finishes.
 */
export async function speakText(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;

  // Clean text for TTS — remove markdown artifacts that break speech
  const cleanText = text
    .replace(/[*_#`~]/g, '')        // Remove markdown formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [link](url) -> link
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .trim();

  if (cleanText.length === 0) return;

  // Try local TTS if available
  if (currentMode === 'local') {
    try {
      const res = await fetch('/api/agent/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const audioBlob = await res.blob();
        if (audioBlob.size > 0) {
          const url = URL.createObjectURL(audioBlob);
          const audio = new Audio(url);
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error('Audio playback failed'));
            };
            audio.play().catch(reject);
          });
          return;
        }
      }
    } catch {
      // Fall through to browser speech
      console.warn('[tts] Local TTS failed, falling back to browser speech');
    }
  }

  // Browser Speech Synthesis fallback
  return browserSpeak(cleanText);
}

/**
 * Browser speechSynthesis — works everywhere, no server needed.
 */
function browserSpeak(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[tts] speechSynthesis not available');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to pick an Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang === 'en-IN') ||
      voices.find((v) => v.lang.includes('IN')) ||
      voices.find((v) => v.lang === 'hi-IN') ||
      voices.find((v) => v.name.toLowerCase().includes('india')) ||
      voices.find((v) => v.name.toLowerCase().includes('heera')) ||
      voices.find((v) => v.name.toLowerCase().includes('ravi')) ||
      voices.find((v) => v.name.toLowerCase().includes('rishi')) ||
      voices.find((v) => v.name.toLowerCase().includes('veena')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // Don't block on TTS errors

    // Chrome bug: speechSynthesis can get stuck. Add a safety timeout.
    const safetyTimeout = setTimeout(() => {
      window.speechSynthesis.cancel();
      resolve();
    }, 30_000);

    utterance.onend = () => {
      clearTimeout(safetyTimeout);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/** Stop any currently playing speech. */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
