'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  Volume2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Coffee,
  MessageSquare,
  Play,
  RotateCcw
} from 'lucide-react';

interface CafeHeroProps {
  onOpenCallDemo: () => void;
}

export function CafeHero({ onOpenCallDemo }: CafeHeroProps) {
  const [activeVoiceDemo, setActiveVoiceDemo] = useState<'hindi' | 'telugu' | 'english'>('hindi');
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);

  const voiceDemos = {
    hindi: {
      language: 'Hindi + English (Code-mixed)',
      caller: '“Bhaiya, 2 plate samosa aur 1 filter coffee pack kar do. Kitna time lagega?”',
      agent: '“Namaste! Bilkul, 2 plate samosa aur 1 hot filter coffee add kar diya hai. Total ₹140 hua. Kitchen mein abhi 12 minutes lagenge. Aapka SMS ticket bhej diya hai!”',
      ticket: 'ORD-104 • 2x Samosa, 1x Filter Coffee • ₹140 • 12m ETA',
    },
    telugu: {
      language: 'Telugu + English (Code-mixed)',
      caller: '“Namaskaram andi! Rendu Bun Maska and one cold coffee parcel kavali.”',
      agent: '“Namaskaram! Rendu Bun Maska mariyu okati cold coffee confirm chesamu. Total ₹180. Kitchen prep time 10 minutes. Mee mobile ki SMS vachesindi andi!”',
      ticket: 'ORD-105 • 2x Bun Maska, 1x Cold Coffee • ₹180 • 10m ETA',
    },
    english: {
      language: 'Indian English',
      caller: '“Hi! Can I get one crispy masala dosa and an extra filter kaapi for pickup?”',
      agent: '“Namaste! That’s 1 Masala Dosa with coconut chutney and 1 Filter Coffee. That comes to ₹160. Fresh off the tawa in 14 minutes. We’ve texted your ticket!”',
      ticket: 'ORD-106 • 1x Masala Dosa, 1x Filter Coffee • ₹160 • 14m ETA',
    },
  };

  const currentSnippet = voiceDemos[activeVoiceDemo];

  const handlePlayVoice = () => {
    setIsPlayingSnippet(true);
    setTimeout(() => {
      setIsPlayingSnippet(false);
    }, 4000);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cafe-coral/15 via-cafe-mango/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-cafe-mango/15 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cafe-coral/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-cafe-coral/20 shadow-warm mb-8">
            <span className="flex h-2 w-2 rounded-full bg-cafe-coral animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cafe-espresso">
              Live Hackathon Operational System
            </span>
            <span className="text-xs font-semibold text-cafe-coral">• Telugu • Hindi • English</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-cafe-espresso tracking-tight leading-[1.08] mb-8 text-balance">
            The Voice Agent That Answers{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cafe-coral via-cafe-coral-dark to-cafe-espresso italic font-serif">
              Every Call
            </span>{' '}
            Your Café Misses.
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-cafe-espresso/80 leading-relaxed max-w-2xl mx-auto mb-10 font-normal">
            While baristas froth filter coffee and fry crisp samosas, <span className="font-semibold text-cafe-espresso">VAANI</span> answers every incoming customer call. She takes takeaway orders, calculates live queue-aware prep times, writes tickets straight to your kitchen screen, and sends instant SMS confirmations.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onOpenCallDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-cafe-coral hover:bg-cafe-coral-dark text-white font-bold text-base shadow-warm-lg transition-all hover:scale-105 hover:shadow-warm-xl flex items-center justify-center gap-3 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <PhoneCall className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span>Simulate Customer Call</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <Link href="/app/live-operations" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full border-cafe-espresso/20 text-cafe-espresso hover:bg-white/80 font-bold px-8 py-4 h-auto shadow-warm"
              >
                <Flame className="w-4 h-4 mr-2 text-cafe-coral" />
                Live Kitchen Display (KDS)
              </Button>
            </Link>
          </div>

          {/* Central Interactive Voice Call Card */}
          <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border border-cafe-coral/15 rounded-3xl p-6 sm:p-8 shadow-warm-xl text-left relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-cafe-sand mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cafe-coral/10 text-cafe-coral flex items-center justify-center font-bold">
                  <Volume2 className="w-5 h-5 text-cafe-coral" />
                </div>
                <div>
                  <div className="text-sm font-bold text-cafe-espresso flex items-center gap-2">
                    <span>Live Call Audio & Kitchen Sync</span>
                    <span className="w-2 h-2 rounded-full bg-cafe-leaf animate-pulse" />
                  </div>
                  <div className="text-xs text-cafe-espresso/60">
                    Real-time code-mixed speech understanding
                  </div>
                </div>
              </div>

              {/* Language Selector Pills */}
              <div className="flex bg-cafe-cream p-1 rounded-xl border border-cafe-sand text-xs font-semibold">
                {(['hindi', 'telugu', 'english'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveVoiceDemo(lang)}
                    className={`px-3 py-1 rounded-lg transition-all capitalize ${
                      activeVoiceDemo === lang
                        ? 'bg-cafe-coral text-white shadow-sm'
                        : 'text-cafe-espresso/70 hover:text-cafe-espresso'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Preview */}
            <div className="space-y-4 mb-6">
              {/* Customer Bubble */}
              <div className="bg-cafe-sand/50 rounded-2xl p-4 border border-cafe-sand/80">
                <div className="flex items-center justify-between text-xs text-cafe-espresso/60 mb-1.5">
                  <span className="font-semibold text-cafe-espresso">📞 Customer Caller</span>
                  <span className="text-[11px] font-mono">0:04</span>
                </div>
                <p className="text-sm font-medium text-cafe-espresso italic">
                  {currentSnippet.caller}
                </p>
              </div>

              {/* Vaani Agent Bubble */}
              <div className="bg-cafe-coral/5 rounded-2xl p-4 border border-cafe-coral/20 relative">
                <div className="flex items-center justify-between text-xs text-cafe-coral mb-1.5 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>VAANI Café Agent</span>
                  </div>
                  <span className="text-[11px] font-mono text-cafe-espresso/60">
                    {isPlayingSnippet ? 'Speaking...' : 'Completed (1.4s)'}
                  </span>
                </div>
                <p className="text-sm font-medium text-cafe-espresso">
                  {currentSnippet.agent}
                </p>

                {/* Animated Audio Waveform */}
                <div className="mt-3 pt-3 border-t border-cafe-coral/10 flex items-center gap-2">
                  <button
                    onClick={handlePlayVoice}
                    className="p-1.5 rounded-full bg-cafe-coral text-white hover:scale-105 transition-transform"
                    title="Play voice audio"
                  >
                    {isPlayingSnippet ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-white" />}
                  </button>
                  <div className="flex items-center gap-1 flex-1">
                    {[12, 24, 18, 30, 22, 14, 28, 32, 16, 20, 26, 12, 28, 22, 15, 30, 18].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isPlayingSnippet
                            ? 'bg-cafe-coral animate-pulse'
                            : 'bg-cafe-coral/40'
                        }`}
                        style={{
                          height: isPlayingSnippet ? `${Math.max(8, (h + (i % 3) * 6))}px` : `${h * 0.6}px`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-cafe-espresso/60">Neural Indian Voice</span>
                </div>
              </div>
            </div>

            {/* Direct Ticket Output Pill */}
            <div className="bg-cafe-leaf/10 border border-cafe-leaf/20 rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cafe-leaf flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-cafe-espresso">Auto-Created KDS Ticket: </span>
                  <span className="font-mono text-cafe-leaf font-bold">{currentSnippet.ticket}</span>
                </div>
              </div>
              <Link href="/app/live-operations" className="text-xs font-bold text-cafe-coral hover:underline flex items-center gap-1">
                View on Kitchen Screen &rarr;
              </Link>
            </div>
          </div>

          {/* Social Proof & Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto pt-8 border-t border-cafe-espresso/10">
            <div>
              <div className="text-3xl font-display font-extrabold text-cafe-coral mb-0.5">0</div>
              <div className="text-xs font-semibold text-cafe-espresso/70">Missed Phone Calls</div>
            </div>
            <div>
              <div className="text-3xl font-display font-extrabold text-cafe-espresso mb-0.5">&lt; 2s</div>
              <div className="text-xs font-semibold text-cafe-espresso/70">Kitchen Ticket Latency</div>
            </div>
            <div>
              <div className="text-3xl font-display font-extrabold text-cafe-leaf mb-0.5">3</div>
              <div className="text-xs font-semibold text-cafe-espresso/70">Languages Co-Spoken</div>
            </div>
            <div>
              <div className="text-3xl font-display font-extrabold text-cafe-mango mb-0.5">100%</div>
              <div className="text-xs font-semibold text-cafe-espresso/70">Stock-Out Replanned</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
