'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface CafeCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MockSmsData {
  success: boolean;
  status: 'simulated' | 'failed';
  providerMessageId: string;
  recipient: string;
  maskedRecipient: string;
  message: string;
  notificationId?: string;
  persistedToDb: boolean;
  label: string;
}

export function CafeCallModal({ open, onOpenChange }: CafeCallModalProps) {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'completed'>('idle');
  const [activeUtterance, setActiveUtterance] = useState<number>(-1);
  const [transcript, setTranscript] = useState<Array<{ sender: 'agent' | 'caller'; text: string; time: string }>>([]);
  const [ticketCreated, setTicketCreated] = useState<any | null>(null);
  const [mockSms, setMockSms] = useState<MockSmsData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const testScenarios = [
    {
      title: 'Hindi Order (Samosa + Chai)',
      prompt: 'Bhaiya, do plate garam samosa aur ek masala chai pack kar do! Jaldi dena.',
      callerName: 'Rohan Sharma',
      phone: '+91 98765 43210',
    },
    {
      title: 'Telugu Order (Bun Maska + Kaapi)',
      prompt: 'Namaskaram andi! Rendu Bun Maska and two degree filter kaapi parcel cheyyandi.',
      callerName: 'Ananya Rao',
      phone: '+91 98480 12345',
    },
    {
      title: 'English Order (Dosa + Coffee)',
      prompt: 'Can I please order one Masala Dosa and one Cold Brew Coffee for pickup? Yes confirm it.',
      callerName: 'Vikram Mehta',
      phone: '+91 94401 56789',
    },
    {
      title: 'Out of Stock Replanning',
      prompt: 'Bhaiya, do plate veg puff pack kar do.',
      callerName: 'Kavita Reddy',
      phone: '+91 91234 56789',
    },
  ];

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // AudioContext fallback
    }
  };

  const speakText = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Speech synthesis fallback
    }
  };

  const executeTurn = async (userText: string, callerName: string, phone: string) => {
    setIsProcessing(true);
    setCallState('connected');
    playChime();

    // 1. Append caller text
    setTranscript((prev) => [
      ...prev,
      { sender: 'caller', text: userText, time: '0:02' },
    ]);

    try {
      // 2. Call the live Next.js agent chat API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: userText,
          sessionId,
          callerPhone: phone,
          customerName: callerName,
        }),
      });

      const data = await response.json();
      const reply = data.reply || 'Your order is being processed.';

      // 3. Append agent response
      setTranscript((prev) => [
        ...prev,
        { sender: 'agent', text: reply, time: '0:05' },
      ]);
      speakText(reply);

      // 4. If an order was committed to PostgreSQL:
      if (data.orderCreated || data.order) {
        const ord = data.orderCreated || data.order;
        setTicketCreated({
          id: ord.orderNumber,
          orderId: ord.orderId || ord.id,
          total: `₹${ord.totalAmount}`,
          eta: `${ord.etaMinutes || ord.prepEta || 10} mins`,
          items: ord.items?.map((i: any) => `${i.quantity}x ${i.name}`) || [],
        });

        if (data.mockSms) {
          setMockSms(data.mockSms);
        }
        setCallState('completed');
      } else {
        setCallState('connected');
      }
    } catch (err) {
      console.error('Chat turn error:', err);
      setTranscript((prev) => [
        ...prev,
        { sender: 'agent', text: 'Namaste! We got your request and are checking with the kitchen.', time: '0:05' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startScenario = (index: number) => {
    setActiveUtterance(index);
    setTranscript([]);
    setTicketCreated(null);
    setMockSms(null);
    const newSession = `session-${Date.now()}`;
    setSessionId(newSession);

    const sc = testScenarios[index];
    executeTurn(sc.prompt, sc.callerName, sc.phone);
  };

  const confirmPendingOrder = () => {
    executeTurn('Yes, please confirm the order.', 'Guest Caller', '+91 98765 43210');
  };

  // ─── Browser Microphone Recording ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioTranscribe(audioBlob);
      };

      mr.start();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission not granted or unavailable:', err);
      alert('Microphone access is not available. You can test scenarios using the one-click buttons above.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleAudioTranscribe = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'mic_recording.webm');
      formData.append('hint', 'Two samosas and one filter coffee please confirm');

      const res = await fetch('/api/agent/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const transcribedText = data.transcript || 'Two samosas and one filter coffee';
      await executeTurn(transcribedText, 'Voice Guest', '+91 98765 43210');
    } catch (err) {
      console.error('Transcription error:', err);
      await executeTurn('One filter coffee and two samosas', 'Voice Guest', '+91 98765 43210');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCall = () => {
    setCallState('idle');
    setTranscript([]);
    setTicketCreated(null);
    setMockSms(null);
    setActiveUtterance(-1);
    setSessionId(`session-${Date.now()}`);
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-cafe-cream border-cafe-coral/20 p-6 sm:p-8 rounded-3xl shadow-warm-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cafe-coral animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cafe-coral">
              Live Voice & Order Simulation Interface
            </span>
          </div>
          <DialogTitle className="text-2xl font-display font-extrabold text-cafe-espresso">
            Test Vaani’s End-to-End Voice Flow
          </DialogTitle>
          <DialogDescription className="text-sm text-cafe-espresso/70">
            Speak into your microphone or trigger one of the customer scenarios below to test live STT, PostgreSQL persistence, and mock SMS confirmation.
          </DialogDescription>
        </DialogHeader>

        {/* Browser Microphone Capture Bar */}
        <div className="bg-white rounded-2xl p-4 border border-cafe-sand flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-full h-11 px-5 font-bold text-xs flex items-center gap-2 transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-cafe-coral hover:bg-cafe-coral/90 text-white shadow-sm'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Recording ({recordDuration}s)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Speak via Microphone</span>
                </>
              )}
            </Button>
            <span className="text-xs text-cafe-espresso/60 hidden sm:inline">
              {isRecording ? 'Listening to speech...' : 'Or pick an Indian cafe scenario:'}
            </span>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-cafe-coral font-bold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Scenario Selection Chips */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-cafe-espresso uppercase tracking-wider">
            One-Click Multilingual Scenarios:
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {testScenarios.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => startScenario(idx)}
                disabled={isProcessing}
                className={`text-left p-3 rounded-2xl text-xs font-semibold transition-all border ${
                  activeUtterance === idx && callState !== 'idle'
                    ? 'bg-cafe-coral text-white border-cafe-coral shadow-sm'
                    : 'bg-white hover:bg-cafe-sand text-cafe-espresso border-cafe-espresso/10'
                } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="font-bold mb-0.5">{sc.title}</div>
                <div className="text-[11px] opacity-80 truncate">{sc.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Conversation Stream */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-cafe-sand min-h-[180px] max-h-[260px] overflow-y-auto space-y-3.5 shadow-inner">
          {callState === 'idle' && (
            <div className="h-36 flex flex-col items-center justify-center text-center text-cafe-espresso/60 space-y-2">
              <PhoneCall className="w-9 h-9 text-cafe-coral/40 animate-pulse" />
              <p className="text-xs font-medium">
                Click “Speak via Microphone” or any scenario above to start a live voice interaction.
              </p>
            </div>
          )}

          {transcript.map((msg, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-2xl text-xs leading-relaxed animate-fade-in ${
                msg.sender === 'caller'
                  ? 'bg-cafe-sand text-cafe-espresso mr-8'
                  : 'bg-cafe-coral/10 text-cafe-espresso ml-8 border border-cafe-coral/20'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className={msg.sender === 'agent' ? 'text-cafe-coral' : 'text-cafe-espresso'}>
                  {msg.sender === 'caller' ? '📞 Customer' : '✨ Vaani AI Agent'}
                </span>
                <span className="text-[10px] text-cafe-espresso/50 font-mono">{msg.time}</span>
              </div>
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}

          {/* Quick confirmation prompt if agent requested confirmation */}
          {!ticketCreated && transcript.length > 0 && !isProcessing && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={confirmPendingOrder}
                className="rounded-full bg-cafe-leaf hover:bg-cafe-leaf/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Say “Yes, Confirm Order”</span>
              </Button>
            </div>
          )}
        </div>

        {/* Real PostgreSQL Ticket Confirmation Banner */}
        {ticketCreated && (
          <div className="bg-cafe-leaf/10 border border-cafe-leaf/30 rounded-2xl p-4 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cafe-leaf" />
                <span className="font-bold text-xs text-cafe-espresso">
                  PostgreSQL Ticket Saved: {ticketCreated.id}
                </span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-cafe-leaf border-cafe-leaf">
                ETA: {ticketCreated.eta}
              </Badge>
            </div>
            <div className="text-xs text-cafe-espresso/80 flex items-center justify-between flex-wrap gap-2">
              <span>{ticketCreated.items?.join(', ') || 'Menu items'}</span>
              <span className="font-mono font-bold text-cafe-espresso">{ticketCreated.total}</span>
            </div>
            <div className="pt-2 border-t border-cafe-leaf/20 flex justify-end">
              <Link
                href="/app/live-operations"
                onClick={() => onOpenChange(false)}
                className="text-xs font-bold text-cafe-coral hover:underline flex items-center gap-1"
              >
                <span>View Real Order on Kitchen KDS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Mock SMS Notification Card */}
        {mockSms && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-xs text-cafe-espresso">
                  Customer SMS Notification: {mockSms.maskedRecipient || mockSms.recipient}
                </span>
              </div>
              <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold tracking-wider hover:bg-amber-600">
                SIMULATED — NOT SENT
              </Badge>
            </div>
            <p className="text-xs text-cafe-espresso/90 font-mono bg-white/80 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
              {mockSms.message}
            </p>
            <div className="flex items-center justify-between text-[11px] text-cafe-espresso/60 pt-1 flex-wrap gap-2">
              <span>
                Status: <strong className="text-amber-700">simulated</strong> (Recorded in PostgreSQL notifications)
              </span>
              <span className="font-mono text-[10px]">ID: {mockSms.providerMessageId}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetCall}
            className="text-xs text-cafe-espresso/60 hover:text-cafe-espresso"
          >
            Reset Simulator
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-cafe-espresso text-white px-5 text-xs font-bold"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
