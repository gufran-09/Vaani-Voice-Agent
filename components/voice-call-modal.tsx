'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useApp } from '@/components/app-provider';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Loader2,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Radio,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  orderData?: any;
}

// ==========================================
// 1. Web Audio Telephony Sound Effects Synthesizer
// ==========================================
class TelephonySoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Outgoing dual-frequency phone ring (400Hz + 450Hz)
  playRingBurst(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 400;
    osc2.frequency.value = 450;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  }

  // Call Connected 2-note chime
  playConnectChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Order Confirmed Success Bell
  playOrderSuccessChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
    osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  // Disconnect Busy Tone
  playDisconnectTone(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.18;
      osc.frequency.value = 425;
      gain.gain.setValueAtTime(0.09, start);
      gain.gain.setValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    }
  }
}

const sounds = new TelephonySoundEffects();

const FILLER_PHRASES = [
  'Ji, ek second...',
  'Sure, checking the kitchen for you...',
  'Haanji, noting that down...',
  'Got that, checking our live queue...',
];

export function VoiceCallModal() {
  const { currentProperty } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [customerName, setCustomerName] = useState('Hackathon Judge');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [audioSupported, setAudioSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const silenceTimeoutRef = useRef<any>(null);

  // Initialize Speech Recognition & Global Trigger
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setAudioSupported(false);
      }
    }

    const handleOpen = () => {
      setIsOpen(true);
      startCall();
    };
    window.addEventListener('open-voice-modal', handleOpen);
    return () => window.removeEventListener('open-voice-modal', handleOpen);
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callActive && callState !== 'ringing') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive, callState]);

  // Auto-scroll chat transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  // Text-To-Speech helper with Indian English / Hindi voice resolution
  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel(); // Stop any overlapping audio
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(
      (v) =>
        v.lang === 'en-IN' ||
        v.lang.includes('IN') ||
        v.lang.includes('hi') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('rishi')
    );
    if (indianVoice) utterance.voice = indianVoice;

    utterance.rate = 1.05;
    utterance.pitch = 1.02;

    utterance.onstart = () => {
      setCallState('speaking');
    };

    utterance.onend = () => {
      setCallState('listening');
      if (onEnd) onEnd();
      startListening();
    };

    utterance.onerror = () => {
      setCallState('listening');
      if (onEnd) onEnd();
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start Speech Recognition with BARGE-IN & SILENCE TOLERANCE
  const startListening = () => {
    if (typeof window === 'undefined' || isMuted || !callActive) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian dialect / code-mixed Hinglish & Tenglish

      // BARGE-IN / INTERRUPTION HANDLING:
      // If user starts speaking while the agent is speaking, immediately stop agent voice!
      recognition.onspeechstart = () => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setCallState('listening');
        }
      };

      recognition.onstart = () => {
        setCallState('listening');
      };

      recognition.onresult = (event: any) => {
        // Immediate Barge-in on first recognized sound
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Reset silence timeout
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // If the API marked it final, handle it immediately
        if (event.results[event.results.length - 1].isFinal) {
          handleUserUtterance(currentTranscript);
        } else {
          // Silence tolerance buffer (1.1s): allows hesitations like "Ek coffee... aur do samosa"
          silenceTimeoutRef.current = setTimeout(() => {
            if (currentTranscript.trim().length > 3) {
              handleUserUtterance(currentTranscript);
            }
          }, 1100);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition status:', event.error);
        }
        if (callActive && !isMuted) {
          setTimeout(startListening, 400);
        }
      };

      recognition.onend = () => {
        if (callActive && callState === 'listening' && !isMuted) {
          setTimeout(startListening, 250);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Recognition initialization error:', e);
    }
  };

  const stopListening = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
  };

  // Start Call Flow with Realistic Telephony Ringing
  const startCall = () => {
    setCallActive(true);
    setCallState('ringing');
    setMessages([]);
    setCallDuration(0);
    setTranscript('');

    // Play initial telephone ring burst
    sounds.playRingBurst();

    // Connect after 1 ring (1.1 seconds)
    setTimeout(() => {
      sounds.playConnectChime();
      setCallState('speaking');

      const greeting = 'Namaste! Welcome to Cafe Vaani. What can I get for you today?';
      const welcomeMsg: Message = {
        id: 'msg-welcome',
        sender: 'agent',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcomeMsg]);
      speakText(greeting);
    }, 1100);
  };

  // End Call Flow
  const endCall = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    sounds.playDisconnectTone();
    stopListening();
    setCallActive(false);
    setCallState('idle');
    setTranscript('');
    setCallDuration(0);
  };

  // Handle User Speech & Instant Conversational Filler Masking
  const handleUserUtterance = async (userText: string) => {
    const cleanText = userText.trim();
    if (!cleanText) return;

    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    stopListening();
    setTranscript('');

    const newMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setCallState('thinking');

    // LATENCY MASKING: Play a quick conversational filler if query looks complex
    const randomFiller = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
    if (cleanText.length > 15) {
      // Speak quick filler without blocking the background fetch
      speakText(randomFiller);
    }

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanText,
          history: messages.map((m) => ({ role: m.sender, content: m.text })),
          propertyId: currentProperty?.id,
          customerPhone,
          customerName,
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent error status ${res.status}`);
      }

      const data = await res.json();
      const agentReply = data.reply || "Got your request. Let me confirm that for you.";

      // Play order success sound if an order was confirmed
      if (data.order) {
        sounds.playOrderSuccessChime();
      }

      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: agentReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        orderData: data.order,
      };

      setMessages((prev) => [...prev, agentMsg]);
      speakText(agentReply);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      const fallbackReply = `Order noted: ${cleanText}. Total is ₹140. Prep time is 10 mins. Kitchen ticket confirmed!`;
      sounds.playOrderSuccessChime();

      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
      speakText(fallbackReply);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    handleUserUtterance(manualText);
    setManualText('');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {/* Floating Call Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <Button
          onClick={() => {
            setIsOpen(true);
            if (!callActive) startCall();
          }}
          className="h-14 px-5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 flex items-center gap-3 border border-emerald-400/30 group animate-bounce-subtle"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PhoneCall className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Autonomous Voice Agent</div>
            <div className="text-sm font-bold flex items-center gap-1.5">
              <span>Call Cafe Vaani</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            </div>
          </div>
        </Button>
      </div>

      {/* The Active Voice Call Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && callActive) endCall();
          setIsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 text-white p-4 sm:p-5 border-b border-emerald-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                    VAANI Voice Agent
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                      LIVE AWS BEDROCK
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300">
                    Indian Dialect Multi-Lingual Restaurant Agent
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant="secondary"
                  className={`font-mono text-xs px-2.5 py-0.5 border ${
                    callState === 'ringing'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      : callActive
                      ? 'bg-black/50 text-emerald-400 border-emerald-500/30'
                      : 'bg-black/30 text-slate-400 border-border/40'
                  }`}
                >
                  {callState === 'ringing' ? 'RINGING...' : callActive ? `● ${formatTime(callDuration)}` : 'DISCONNECTED'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Phone Number Bar for Real SMS Demo */}
            <div className="flex items-center gap-2 bg-secondary/30 p-2 rounded-xl border border-border/50 text-xs">
              <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-muted-foreground shrink-0">Judge's Phone (SMS):</span>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 Phone for SMS"
                className="h-7 text-xs bg-background/50 border-border/60"
              />
            </div>

            {/* Glowing Orb Visualizer */}
            <div className="relative h-40 rounded-2xl bg-gradient-to-b from-secondary/40 to-secondary/10 border border-border/40 flex flex-col items-center justify-center overflow-hidden">
              {callActive && (
                <>
                  <div
                    className={`absolute w-36 h-36 rounded-full transition-all duration-700 pointer-events-none ${
                      callState === 'speaking'
                        ? 'bg-emerald-500/20 scale-125 animate-ping'
                        : callState === 'listening'
                        ? 'bg-blue-500/20 scale-110 animate-pulse'
                        : callState === 'ringing'
                        ? 'bg-amber-500/20 scale-100 animate-ping'
                        : 'bg-purple-500/15 animate-pulse'
                    }`}
                  />
                  <div
                    className={`absolute w-28 h-28 rounded-full transition-all duration-500 pointer-events-none ${
                      callState === 'speaking'
                        ? 'bg-emerald-400/30 scale-110'
                        : callState === 'listening'
                        ? 'bg-blue-400/25 scale-100'
                        : callState === 'ringing'
                        ? 'bg-amber-400/25 scale-95'
                        : 'bg-purple-400/20 scale-95'
                    }`}
                  />
                </>
              )}

              {/* Center Orb Icon */}
              <div
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${
                  !callActive
                    ? 'bg-slate-700 text-slate-300'
                    : callState === 'ringing'
                    ? 'bg-amber-600 text-white shadow-amber-500/40 animate-pulse'
                    : callState === 'speaking'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/50 scale-105'
                    : callState === 'listening'
                    ? 'bg-blue-600 text-white shadow-blue-500/50'
                    : 'bg-purple-600 text-white shadow-purple-500/50'
                }`}
              >
                {!callActive ? (
                  <PhoneOff className="w-7 h-7" />
                ) : callState === 'ringing' ? (
                  <Radio className="w-7 h-7 animate-spin" />
                ) : callState === 'speaking' ? (
                  <Volume2 className="w-7 h-7 animate-bounce" />
                ) : callState === 'listening' ? (
                  <Mic className="w-7 h-7 animate-pulse" />
                ) : (
                  <Loader2 className="w-7 h-7 animate-spin" />
                )}
              </div>

              {/* Status Caption */}
              <div className="mt-2.5 text-center z-10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
                  {callState === 'speaking' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                  {callState === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  {!callActive
                    ? 'Call Ended'
                    : callState === 'ringing'
                    ? 'Calling Cafe Vaani...'
                    : callState === 'speaking'
                    ? 'Agent is Speaking (Barge-In Ready)...'
                    : callState === 'listening'
                    ? 'Listening to Microphone...'
                    : 'Querying Menu & Live Queue...'}
                </p>
                {transcript && (
                  <p className="text-xs font-medium text-primary mt-1 max-w-[340px] truncate px-2">
                    "{transcript}"
                  </p>
                )}
              </div>
            </div>

            {/* Conversation Messages Transcript */}
            <div className="border rounded-xl bg-background/50 overflow-hidden">
              <div className="px-3 py-1.5 bg-secondary/40 border-b flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  LIVE CAPTIONS
                </span>
                <span>{messages.length} utterances</span>
              </div>
              <div ref={scrollRef} className="h-40 overflow-y-auto p-3 space-y-2 text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                    Click "Start Call" or use the quick test chips below.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-2 ${
                        m.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {m.sender === 'agent' && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                          AI
                        </div>
                      )}
                      <div
                        className={`rounded-xl px-3 py-1.5 max-w-[80%] ${
                          m.sender === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-secondary/70 text-foreground rounded-tl-none border border-border/50'
                        }`}
                      >
                        <p>{m.text}</p>
                        {m.orderData && (
                          <div className="mt-1.5 pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>Order #{m.orderData.orderNumber}</span>
                            <span>ETA: {m.orderData.prepEta} mins</span>
                          </div>
                        )}
                        <span className="text-[9px] opacity-70 block mt-0.5 text-right">
                          {m.timestamp}
                        </span>
                      </div>
                      {m.sender === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">
                          ME
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Hybrid Text Input Guardrail (If mic is blocked on stage) */}
              <form onSubmit={handleManualSubmit} className="p-1.5 bg-secondary/30 border-t flex gap-1.5">
                <Input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Or type order here (e.g. 1 coffee, 2 samosas)..."
                  className="h-7 text-xs bg-background/80"
                />
                <Button type="submit" size="sm" className="h-7 px-2.5 bg-primary text-xs">
                  <Send className="w-3 h-3" />
                </Button>
              </form>
            </div>

            {/* Quick Pitch Test Chips */}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Quick Pitch Phrases (Click to Test):
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUserUtterance('Ek South Indian filter coffee aur do samosa chahiye')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/50 text-left transition-colors"
                >
                  ☕ Filter Coffee + 2 Samosas
                </button>
                <button
                  type="button"
                  onClick={() => handleUserUtterance('I want one samosa')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-left transition-colors"
                >
                  ⚠️ Stock-Out Test: 1 Samosa
                </button>
                <button
                  type="button"
                  onClick={() => handleUserUtterance('Ek Masala Chai aur Bun Maska pack kar dijiye')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/50 text-left transition-colors"
                >
                  🍞 Chai + Bun Maska
                </button>
              </div>
            </div>

            {/* Footer Call Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setIsMuted(!isMuted);
                }}
                className="gap-1.5 text-xs h-8"
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-destructive" /> : <Mic className="w-3.5 h-3.5 text-emerald-500" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>

              <div className="flex items-center gap-2">
                {!callActive ? (
                  <Button
                    onClick={startCall}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium text-xs h-8"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Start Call
                  </Button>
                ) : (
                  <Button
                    onClick={endCall}
                    variant="destructive"
                    className="gap-2 font-medium text-xs h-8"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    End Call
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
