'use client';

import React, { useState, useEffect } from 'react';
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
  Volume2,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface CafeCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CafeCallModal({ open, onOpenChange }: CafeCallModalProps) {
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'completed'>('idle');
  const [activeUtterance, setActiveUtterance] = useState<number>(0);
  const [transcript, setTranscript] = useState<Array<{ sender: 'agent' | 'caller'; text: string; time: string }>>([]);
  const [ticketCreated, setTicketCreated] = useState<any | null>(null);

  const testScenarios = [
    {
      title: 'Hindi Rush-Hour Order (Samosa + Coffee)',
      callerAudio: '“Bhaiya, do plate garam samosa aur ek filter coffee pack kar do! Jaldi dena, train pakadni hai.”',
      agentReply: '“Namaste ji! 2 plate garam samosa aur 1 filter coffee parcel mark kar diya hai. Total ₹140 hua. Abhi kitchen mein sirf 10 minute lagenge. Aapka SMS receipt bhej diya hai!”',
      ticket: {
        id: 'ORD-104',
        items: ['2x Golden Samosa (₹100)', '1x Filter Coffee (₹40)'],
        total: '₹140',
        eta: '10 mins',
        station: 'Fryer + Drinks',
      },
    },
    {
      title: 'Telugu Code-Mixed Order (Bun Maska + Kaapi)',
      callerAudio: '“Namaskaram andi! Rendu Bun Maska and two degree filter kaapi parcel cheyyandi.”',
      agentReply: '“Namaskaram andi! Rendu Bun Maska mariyu rendu degree filter kaapi confirm chesamu. Total ₹200. Kitchen prep time 8 minutes andi. SMS ticket mee number ki vachesindi!”',
      ticket: {
        id: 'ORD-105',
        items: ['2x Bun Maska (₹120)', '2x Filter Kaapi (₹80)'],
        total: '₹200',
        eta: '8 mins',
        station: 'Bakery + Drinks',
      },
    },
    {
      title: 'Indian English (Crispy Dosa + Chutney)',
      callerAudio: '“Hi there! Can I order one Masala Dosa with extra coconut chutney for pickup?”',
      agentReply: '“Namaste! 1 Crispy Masala Dosa with extra coconut chutney added. Total is ₹90. Fresh off the tawa in 12 minutes. We’ve sent your pickup ticket via SMS!”',
      ticket: {
        id: 'ORD-106',
        items: ['1x Masala Dosa (₹90)', 'Extra Coconut Chutney (₹0)'],
        total: '₹90',
        eta: '12 mins',
        station: 'Griddle Station',
      },
    },
    {
      title: 'Out of Stock Self-Correction Replanning',
      callerAudio: '“Bhaiya, do plate veg puff pack kar do.”',
      agentReply: '“Kshama kijiye, aaj sham ka Veg Puff abhi out of stock ho gaya hai. Kya aap hamara taza Crispy Samosa ya Bun Maska lena pasand karenge?”',
      ticket: {
        id: 'STOCK-ALERT',
        items: ['Veg Puff marked UNAVAILABLE', 'Alternative suggested: Samosa'],
        total: 'Replanned',
        eta: 'Stock Protected',
        station: 'Agent Replanner Tool',
      },
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

  const startScenario = (index: number) => {
    setActiveUtterance(index);
    setCallState('calling');
    setTranscript([]);
    setTicketCreated(null);
    playChime();

    setTimeout(() => {
      setCallState('connected');
      playChime();
      setTranscript([
        {
          sender: 'caller',
          text: testScenarios[index].callerAudio,
          time: '0:03',
        },
      ]);

      setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: testScenarios[index].agentReply,
            time: '0:07',
          },
        ]);
        setTicketCreated(testScenarios[index].ticket);
        setCallState('completed');
      }, 1800);
    }, 1200);
  };

  const resetCall = () => {
    setCallState('idle');
    setTranscript([]);
    setTicketCreated(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-cafe-cream border-cafe-coral/20 p-6 sm:p-8 rounded-3xl shadow-warm-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cafe-coral animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cafe-coral">
              Live Voice Simulation Interface
            </span>
          </div>
          <DialogTitle className="text-2xl font-display font-extrabold text-cafe-espresso">
            Test Vaani’s Multilingual Call Handling
          </DialogTitle>
          <DialogDescription className="text-sm text-cafe-espresso/70">
            Pick a realistic customer scenario to experience the audio transcript, neural responses, and live kitchen ticket injection.
          </DialogDescription>
        </DialogHeader>

        {/* Scenario Selection Chips */}
        <div className="space-y-2 my-4">
          <div className="text-xs font-bold text-cafe-espresso uppercase tracking-wider">
            Select Test Utterance:
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {testScenarios.map((sc, idx) => (
              <button
                key={idx}
                onClick={() => startScenario(idx)}
                className={`text-left p-3 rounded-2xl text-xs font-semibold transition-all border ${
                  activeUtterance === idx && callState !== 'idle'
                    ? 'bg-cafe-coral text-white border-cafe-coral shadow-sm'
                    : 'bg-white hover:bg-cafe-sand text-cafe-espresso border-cafe-espresso/10'
                }`}
              >
                <div className="font-bold mb-0.5">{sc.title}</div>
                <div className="text-[11px] opacity-80 truncate">{sc.callerAudio}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Conversation Stream */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-cafe-sand min-h-[220px] max-h-[300px] overflow-y-auto space-y-3.5 shadow-inner">
          {callState === 'idle' && (
            <div className="h-44 flex flex-col items-center justify-center text-center text-cafe-espresso/60 space-y-3">
              <PhoneCall className="w-10 h-10 text-cafe-coral/40 animate-pulse" />
              <p className="text-sm font-medium">
                Click any scenario above to trigger an incoming customer call simulation.
              </p>
            </div>
          )}

          {callState === 'calling' && (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cafe-coral/10 text-cafe-coral flex items-center justify-center animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-cafe-espresso">
                Ringing Café Line... Answering on 1st ring
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
        </div>

        {/* Ticket Confirmation Footer */}
        {ticketCreated && (
          <div className="bg-cafe-leaf/10 border border-cafe-leaf/30 rounded-2xl p-4 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cafe-leaf" />
                <span className="font-bold text-xs text-cafe-espresso">
                  Ticket Generated: {ticketCreated.id}
                </span>
              </div>
              <Badge variant="outline" className="text-xs bg-white text-cafe-leaf border-cafe-leaf">
                ETA: {ticketCreated.eta}
              </Badge>
            </div>
            <div className="text-xs text-cafe-espresso/80 flex items-center justify-between flex-wrap gap-2">
              <span>{ticketCreated.items.join(', ')}</span>
              <span className="font-mono font-bold text-cafe-espresso">{ticketCreated.total}</span>
            </div>
            <div className="pt-2 border-t border-cafe-leaf/20 flex justify-end">
              <Link
                href="/app/live-operations"
                onClick={() => onOpenChange(false)}
                className="text-xs font-bold text-cafe-coral hover:underline flex items-center gap-1"
              >
                <span>Track Ticket on Live Kitchen KDS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
