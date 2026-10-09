'use client';

import React from 'react';
import {
  Mic,
  Package,
  Flame,
  PhoneOff,
  Languages,
  Zap,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  BellRing
} from 'lucide-react';

export function CafeFeaturesGrid() {
  const features = [
    {
      icon: Languages,
      tag: 'Indian Linguistics',
      title: 'Code-Mixed Voice Understanding',
      description:
        'Fluent in colloquial Telugu, Hindi, and Indian English. Recognizes mixed sentences like “Rendu samosalu and ek filter kaapi parcel”, phonetic variants, and local slang without awkward robotic interruptions.',
      color: 'bg-cafe-coral/10 text-cafe-coral',
    },
    {
      icon: Flame,
      tag: 'Kitchen Efficiency',
      title: 'Live Queue-Aware Kitchen Display (KDS)',
      description:
        'Calculates real ETAs dynamically: current backlog at the drinks station + fryer load + base prep time. Orders land in real-time on staff tablets with one-click status advancement: Received ➔ Preparing ➔ Ready.',
      color: 'bg-cafe-mango/20 text-cafe-espresso',
    },
    {
      icon: RefreshCw,
      tag: 'Agentic Behavior',
      title: 'Stock-Out Replanner & Self-Correction',
      description:
        'If bun maska runs out at 10 AM, staff toggle one switch. Vaani immediately stops accepting it on phone calls, alerts customers gracefully with alternative items, and replans existing open tickets.',
      color: 'bg-cafe-leaf/15 text-cafe-leaf',
    },
    {
      icon: PhoneOff,
      tag: 'Revenue Recapture',
      title: 'Zero Missed Calls During Peak Shifts',
      description:
        'Independent cafés lose up to 30% of takeaway revenue to unanswered ringing phones during morning rushes. Vaani answers on the first ring, handling multiple parallel lines simultaneously.',
      color: 'bg-cafe-coral/10 text-cafe-coral',
    },
    {
      icon: BellRing,
      tag: 'Customer Delight',
      title: 'Instant SMS & WhatsApp Delivery',
      description:
        'No paper slips lost in pockets. Customers receive SMS tickets with order numbers, breakdown of charges, and countdown timers, giving them confidence their order is hot and ready upon arrival.',
      color: 'bg-cafe-espresso/10 text-cafe-espresso',
    },
    {
      icon: ShieldCheck,
      tag: 'Strict Safeguards',
      title: 'Hallucination-Proof Tool Architecture',
      description:
        'The underlying LLM is forbidden from inventing prices or guessing menu availability. All pricing, item IDs, allergens, and kitchen queue times come from transactional backend tools.',
      color: 'bg-cafe-mango/20 text-cafe-espresso',
    },
  ];

  return (
    <section id="features" className="py-24 bg-cafe-sand/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white text-cafe-espresso text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-cafe-coral" />
            <span>Built Specifically for Café Rush Hours</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-cafe-espresso leading-tight mb-4">
            Engineered for Hot Griddles, Loud Steam Wands & Busy Counters.
          </h2>
          <p className="text-base sm:text-lg text-cafe-espresso/70 leading-relaxed font-normal">
            Generic SaaS dashboards and robotic IVRs fail in fast-paced cafés. Vaani combines voice AI with real restaurant operational physics.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-8 shadow-warm border border-cafe-espresso/5 hover:shadow-warm-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${f.color}`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-cafe-espresso/60 px-2.5 py-1 rounded-full bg-cafe-sand">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-cafe-espresso mb-3 leading-snug">
                  {f.title}
                </h3>
                <p className="text-sm text-cafe-espresso/70 leading-relaxed font-normal">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
