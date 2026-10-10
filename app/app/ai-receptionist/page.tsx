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
  Building2, CheckCircle2, Clock, ShoppingBag,
} from 'lucide-react';

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

  // Live conversation testing state
  const [testMessages, setTestMessages] = useState<Array<{ role: 'agent' | 'caller'; text: string }>>([
    { role: 'agent', text: 'Namaste! Welcome to Cafe Vaani. What would you like to order today?' },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testOrderCreated, setTestOrderCreated] = useState<any | null>(null);
  const [testMockSms, setTestMockSms] = useState<any | null>(null);
  const [testSessionId] = useState(() => `receptionist-${Date.now()}`);

  const handleSendTestMessage = async (msgToSend?: string) => {
    const text = (msgToSend || testInput).trim();
    if (!text || testLoading || !currentProperty) return;

    setTestInput('');
    setTestLoading(true);
    setTestMessages((prev) => [...prev, { role: 'caller', text }]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          sessionId: testSessionId,
          propertyId: currentProperty.id,
          callerPhone: escalationPhone || '+919876543210',
          customerName: 'Receptionist Test Guest',
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'Request received.';
      setTestMessages((prev) => [...prev, { role: 'agent', text: reply }]);

      if (data.orderCreated || data.order) {
        setTestOrderCreated(data.orderCreated || data.order);
        if (data.mockSms) {
          setTestMockSms(data.mockSms);
        }
      }
    } catch (err) {
      setTestMessages((prev) => [
        ...prev,
        { role: 'agent', text: 'Sorry, could not connect to agent service.' },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

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
          propertyId: PROPERTY_ID,
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
  }, [sessionId, speakText]);

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

<<<<<<< HEAD
          {/* Test Conversation (Interactive & Live) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    Live Test Conversation
                  </CardTitle>
                  <CardDescription>
                    Test your AI receptionist directly against real PostgreSQL menu & ordering pipeline with local Ollama or deterministic fallback.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                  Active Local Engine
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px] rounded-lg border p-4 bg-muted/20">
                <div className="space-y-3">
                  {testMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'agent' ? 'bg-primary' : 'bg-accent'
                      }`}>
                        {msg.role === 'agent' ? (
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <span className="text-xs font-medium text-accent-foreground">U</span>
                        )}
                      </div>
                      <div className={`rounded-xl p-3 max-w-[80%] ${
                        msg.role === 'agent' ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {testLoading && (
                    <div className="flex gap-3 flex-row items-center text-xs text-muted-foreground animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <p>VAANI is thinking...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Order Created confirmation badge & details */}
              {testOrderCreated && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Order Persisted to PostgreSQL: </span>
                    <span className="font-mono">{testOrderCreated.order_number || testOrderCreated.orderId || testOrderCreated.id}</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                    ₹{testOrderCreated.total_amount || testOrderCreated.totalAmount || 0}
                  </Badge>
                </div>
              )}

              {/* Mock SMS Card */}
              {testMockSms && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mock SMS Notification</span>
                      <Badge className="bg-amber-500 text-white font-mono text-[10px] uppercase tracking-wider">
                        SIMULATED — NOT SENT
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      Status: {testMockSms.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Recipient: </span>
                    <span className="font-mono text-foreground">{testMockSms.to}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border text-xs font-sans text-foreground">
                    &quot;{testMockSms.message}&quot;
                  </div>
                </div>
              )}

              {/* Input row */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type '2 cappuccinos' or 'confirm order'..."
                  className="flex-1"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendTestMessage();
                  }}
                  disabled={testLoading}
                />
                <Button
                  size="icon"
                  onClick={() => handleSendTestMessage()}
                  disabled={testLoading || !testInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick test suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'What is on the menu?',
                  'I want 2 Cappuccinos',
                  'Confirm order',
                  'What is the status of my order?',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendTestMessage(chip)}
                    disabled={testLoading}
                    className="text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1 rounded-full transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
=======
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
>>>>>>> ad821cda6730fe23d1a95556b80666f5d13129bb
      )}
    </div>
  );
}
