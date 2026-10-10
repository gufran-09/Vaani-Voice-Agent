'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Mic, MicOff, Square, Send, Bot, Volume2, Loader2,
  Building2, CheckCircle2, Clock, ShoppingBag, Sparkles, Utensils,
} from 'lucide-react';
import { ALL_FOOD_ITEMS, MENU_CATEGORIES } from '@/lib/menu-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsoleStatus = 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface OrderCard {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  etaMinutes: number;
  items: Array<{ name: string; quantity: number }>;
}

type STTMode = 'local-whisper' | 'browser-fallback' | 'checking';
type TTSMode = 'local' | 'browser-fallback' | 'checking';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_ID = '62e1b115-9382-40f8-853a-0a773735d034';

const STATUS_LABELS: Record<ConsoleStatus, string> = {
  idle: 'Ready — tap the mic to speak',
  recording: 'Listening...',
  transcribing: 'Transcribing your speech...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIReceptionistPage() {
  const { currentProperty } = useApp();
  const propertyName = currentProperty?.name || 'Cafe Vaani';

  // Core state
  const [status, setStatus] = useState<ConsoleStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [orderCard, setOrderCard] = useState<OrderCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Session
  const [sessionId] = useState(() => `session-${Date.now()}`);

  // Service detection
  const [sttMode, setSttMode] = useState<STTMode>('checking');
  const [ttsMode, setTtsMode] = useState<TTSMode>('checking');

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // ─── Service Detection on Mount ──────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;

    // Check Whisper STT availability
    fetch('/api/agent/transcribe', { signal: AbortSignal.timeout(3000) })
      .then((res) => {
        if (isMountedRef.current) {
          setSttMode(res.ok ? 'local-whisper' : 'browser-fallback');
        }
      })
      .catch(() => {
        if (isMountedRef.current) setSttMode('browser-fallback');
      });

    // Check local TTS availability
    fetch('/api/agent/synthesize', { signal: AbortSignal.timeout(2000) })
      .then((res) => {
        if (isMountedRef.current) {
          setTtsMode(res.ok ? 'local' : 'browser-fallback');
        }
      })
      .catch(() => {
        if (isMountedRef.current) setTtsMode('browser-fallback');
      });

    // Load voices for speechSynthesis (Chrome needs this)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Auto-scroll chat ────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Add greeting on first load ──────────────────────────────────────────

  const greetingAddedRef = useRef(false);
  useEffect(() => {
    if (!greetingAddedRef.current) {
      greetingAddedRef.current = true;
      addMessage('agent', `Namaste! Welcome to ${propertyName}. What would you like to order today?`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function addMessage(role: 'user' | 'agent', text: string) {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, timestamp: new Date() },
    ]);
  }

  // ─── TTS: Speak text aloud ──────────────────────────────────────────────

  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Browser Speech Synthesis
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === 'en-IN') ||
        voices.find((v) => v.lang === 'hi-IN') ||
        voices.find((v) => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;

      const safetyTimeout = setTimeout(() => {
        window.speechSynthesis.cancel();
        resolve();
      }, 30_000);

      utterance.onend = () => { clearTimeout(safetyTimeout); resolve(); };
      utterance.onerror = () => { clearTimeout(safetyTimeout); resolve(); };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // ─── Core Pipeline: transcript -> chat -> speak ──────────────────────────

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setError('Could not understand. Please try again.');
      setStatus('idle');
      return;
    }

    addMessage('user', transcript);
    setStatus('processing');
    setError(null);

    try {
      const chatRes = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          sessionId,
          propertyId: currentProperty?.id || PROPERTY_ID,
        }),
      });

      if (!chatRes.ok) {
        throw new Error(`Chat API error: ${chatRes.status}`);
      }

      const chatData = await chatRes.json();
      const reply = chatData.reply || 'Sorry, I could not process that.';

      addMessage('agent', reply);

      // Handle order creation
      if (chatData.orderCreated) {
        setOrderCard(chatData.orderCreated);
      }

      // Speak the reply
      setStatus('speaking');
      await speakText(reply);
    } catch (err: any) {
      console.error('[voice-console] Pipeline error:', err);
      setError(err.message || 'Something went wrong');
      addMessage('agent', 'Sorry, there was an error. Please try again.');
    }

    if (isMountedRef.current) {
      setStatus('idle');
    }
  }, [sessionId, speakText, currentProperty]);

  // ─── Recording ───────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length === 0) {
          setError('No audio captured');
          setStatus('idle');
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        if (audioBlob.size < 100) {
          setError('Recording too short');
          setStatus('idle');
          return;
        }

        // Transcribe
        setStatus('transcribing');

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

          const sttRes = await fetch('/api/agent/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!sttRes.ok) {
            throw new Error('Transcription failed');
          }

          const sttData = await sttRes.json();
          await processTranscript(sttData.transcript || '');
        } catch (sttErr: any) {
          console.error('[voice-console] STT error:', sttErr);
          setError('Transcription failed. Try typing instead.');
          setStatus('idle');
        }
      };

      recorder.start(250); // Collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setStatus('recording');
    } catch (micErr: any) {
      console.error('[voice-console] Mic access error:', micErr);
      setError('Microphone access denied. Please allow mic access in your browser.');
      setStatus('idle');
    }
  }, [processTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleMicClick = useCallback(() => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'idle') {
      startRecording();
    }
  }, [status, startRecording, stopRecording]);

  // ─── Text input fallback ─────────────────────────────────────────────────

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim() || status !== 'idle') return;
    const text = textInput.trim();
    setTextInput('');
    await processTranscript(text);
  }, [textInput, status, processTranscript]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [handleTextSubmit]);

  // ─── No property guard removed — voice console works with hardcoded PROPERTY_ID ──

  // ─── Render ──────────────────────────────────────────────────────────────

  const isActive = status !== 'idle';

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Mic className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Voice Console</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Speak or type to interact with your AI receptionist
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Badges ── */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={sttMode === 'local-whisper' ? 'default' : 'secondary'} className="text-xs gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${sttMode === 'local-whisper' ? 'bg-green-400 status-dot-pulse' :
              sttMode === 'checking' ? 'bg-yellow-400 status-dot-pulse' : 'bg-orange-400'
            }`} />
          🎙️ STT: {sttMode === 'local-whisper' ? 'Local Whisper' : sttMode === 'checking' ? 'Detecting...' : 'Browser Fallback'}
        </Badge>
        <Badge variant={ttsMode === 'local' ? 'default' : 'secondary'} className="text-xs gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${ttsMode === 'local' ? 'bg-green-400 status-dot-pulse' :
              ttsMode === 'checking' ? 'bg-yellow-400 status-dot-pulse' : 'bg-orange-400'
            }`} />
          🔊 TTS: {ttsMode === 'local' ? 'Local Piper' : ttsMode === 'checking' ? 'Detecting...' : 'Browser Speech Synthesis'}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1.5">
          🏪 {propertyName}
        </Badge>
      </div>

      {/* ── Main Console Card ── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Live Conversation
          </CardTitle>
          <CardDescription>
            {STATUS_LABELS[status]}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Chat Messages ── */}
          <ScrollArea className="h-[350px] px-4 pb-4" ref={scrollRef}>
            <div className="space-y-3 pt-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'agent' ? 'bg-primary' : 'bg-accent'
                      }`}
                  >
                    {msg.role === 'agent' ? (
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Mic className="w-4 h-4 text-accent-foreground" />
                    )}
                  </div>
                  <div
                    className={`rounded-xl p-3 max-w-[80%] ${msg.role === 'agent'
                        ? 'bg-secondary text-foreground'
                        : 'bg-primary text-primary-foreground'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className="text-[10px] opacity-50 mt-1">
                      {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {(status === 'transcribing' || status === 'processing') && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="rounded-xl p-3 bg-secondary">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {status === 'transcribing' ? 'Transcribing...' : 'Thinking...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* ── Controls ── */}
          <div className="p-4 space-y-3">
            {/* Error display */}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Mic Button — centered and prominent */}
            <div className="flex justify-center">
              <button
                onClick={handleMicClick}
                disabled={isActive && status !== 'recording'}
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                  ${status === 'recording'
                    ? 'bg-red-500 hover:bg-red-600 text-white recording-pulse'
                    : isActive
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95'
                  }
                `}
                aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                {status === 'recording' ? (
                  <Square className="w-6 h-6" />
                ) : status === 'speaking' ? (
                  <Volume2 className="w-6 h-6" />
                ) : isActive ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {status === 'recording' ? 'Tap to stop' : status === 'idle' ? 'Tap to speak' : STATUS_LABELS[status]}
            </p>

            {/* Text input fallback */}
            <div className="flex items-center gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or type your message here..."
                disabled={isActive}
                className="flex-1 text-sm"
              />
              <Button
                size="icon"
                onClick={handleTextSubmit}
                disabled={isActive || !textInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick database menu chips covering all 28 items */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-primary" />
                  All 28 Database Food Items (Click to Order / Speak):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {ALL_FOOD_ITEMS.length} items
                </span>
              </div>

              {/* Scrollable Food Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-secondary/20 rounded-lg border border-border/40 scrollbar-thin">
                {ALL_FOOD_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => processTranscript(`I want one ${item.name}`)}
                    disabled={isActive}
                    title={`${item.category_name} • ₹${item.price} • ${item.prep_time_minutes}m`}
                    className="text-[11px] bg-secondary/80 hover:bg-secondary hover:text-foreground text-secondary-foreground px-2.5 py-1 rounded-full transition-all border border-border/50 flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>{item.name}</span>
                    <span className="font-mono text-[10px] opacity-75 font-bold">₹{item.price}</span>
                  </button>
                ))}
                {/* Action & Combo Chips */}
                <button
                  type="button"
                  onClick={() => processTranscript('1 Filter Coffee & 2 Samosas')}
                  disabled={isActive}
                  className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50"
                >
                  ☕ Filter Coffee + 2 Samosas
                </button>
                <button
                  type="button"
                  onClick={() => processTranscript('1 Dal Makhani Bowl & 1 Mango Lassi')}
                  disabled={isActive}
                  className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50"
                >
                  🍛 Dal Makhani + Lassi
                </button>
                <button
                  type="button"
                  onClick={() => processTranscript('1 Creamy Mushroom Pasta & 1 Garlic Bread')}
                  disabled={isActive}
                  className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50"
                >
                  🍝 Pasta + Garlic Bread
                </button>
                <button
                  type="button"
                  onClick={() => processTranscript('Confirm order')}
                  disabled={isActive}
                  className="text-[11px] bg-green-500/15 hover:bg-green-500/25 text-green-700 dark:text-green-300 border border-green-500/40 px-2.5 py-1 rounded-full font-semibold transition-colors disabled:opacity-50"
                >
                  ✓ Confirm Order
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Order Confirmation Card ── */}
      {orderCard && (
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-600/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              Order {orderCard.orderNumber} Confirmed!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Items */}
              <div className="space-y-1">
                {orderCard.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{item.quantity}× {item.name}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Total & ETA */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">₹{orderCard.totalAmount}</span>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Ready in ~{orderCard.etaMinutes} min
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
