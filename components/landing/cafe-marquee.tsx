'use client';

import React from 'react';
import Image from 'next/image';
import { Coffee, Flame, Sparkles, Utensils, Heart } from 'lucide-react';

export function CafeMarquee() {
  const words = [
    { text: 'FRESH FILTER COFFEE', icon: Coffee },
    { text: 'CODE-MIXED TELUGU & HINDI', icon: Sparkles },
    { text: 'ZERO MISSED PHONE ORDERS', icon: Flame },
    { text: 'GOLDEN CRISP SAMOSAS', icon: Utensils },
    { text: 'QUEUE-AWARE PREP ETAS', icon: Coffee },
    { text: 'AUTOMATIC STOCK-OUT REPLANNER', icon: Sparkles },
    { text: 'REAL-TIME KITCHEN TICKETS', icon: Flame },
    { text: 'SMS & WHATSAPP CONFIRMATIONS', icon: Heart },
  ];

  return (
    <div className="py-8 bg-cafe-espresso text-cafe-cream overflow-hidden relative shadow-warm">
      <div className="absolute inset-0 bg-gradient-to-r from-cafe-espresso via-transparent to-cafe-espresso z-10 pointer-events-none w-24 sm:w-48 left-0" />
      <div className="absolute inset-0 bg-gradient-to-l from-cafe-espresso via-transparent to-cafe-espresso z-10 pointer-events-none w-24 sm:w-48 right-0" />

      <div className="animate-marquee flex items-center gap-10 whitespace-nowrap">
        {words.concat(words).map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 text-sm sm:text-base font-extrabold tracking-widest uppercase">
            <span className="text-cafe-mango">{item.text}</span>
            <div className="w-2 h-2 rounded-full bg-cafe-coral" />
          </div>
        ))}
      </div>
    </div>
  );
}
