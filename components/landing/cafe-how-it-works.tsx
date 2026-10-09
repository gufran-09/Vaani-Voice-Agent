'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Brain,
  Flame,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export function CafeHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: '01',
      title: 'Customer Calls in Their Natural Tongue',
      subtitle: 'Telugu, Hindi, or Indian English',
      icon: PhoneCall,
      color: 'bg-cafe-coral text-white',
      accentColor: 'border-cafe-coral text-cafe-coral',
      description:
        'A customer calls during peak breakfast or evening tea rush. Vaani answers instantly with zero wait time, greeting them warmly and handling code-mixed conversational orders naturally.',
      mockContent: {
        type: 'call',
        audioText: '“Namaste! Cafe Vaani mein aapka swagat hai. Kya lena pasand karenge?”',
        detail: 'Caller: “Bhaiya, do plate samosa aur ek filter coffee parcel karo.”',
        pill: 'Streaming Audio • Sarvam / Transcribe ASR',
      },
    },
    {
      step: '02',
      title: 'Strict Tool-Calling Dialogue Brain',
      subtitle: 'No price or stock hallucination',
      icon: Brain,
      color: 'bg-cafe-mango text-cafe-espresso',
      accentColor: 'border-cafe-mango text-cafe-mango',
      description:
        'The conversational orchestrator invokes strict backend tools: searching items, verifying stock in real-time, calculating queue-aware prep times, and obtaining explicit confirmation before placing the order.',
      mockContent: {
        type: 'tool',
        audioText: 'Tools: check_availability([“samosa”, “filter_coffee”]) ➔ Available',
        detail: 'Tools: calculate_eta(stations: [“fryer”, “drinks”]) ➔ 12 minutes',
        pill: 'AWS Bedrock / Claude 3.5 Sonnet / Gemini',
      },
    },
    {
      step: '03',
      title: 'Ticket Appears Instantly on Kitchen KDS',
      subtitle: 'Routed by station: Fryer & Drinks',
      icon: Flame,
      color: 'bg-cafe-leaf text-white',
      accentColor: 'border-cafe-leaf text-cafe-leaf',
      description:
        'The order is immediately written to the PostgreSQL database and appears on the Kitchen Display System in under 2 seconds. Kitchen staff see quantities, notes, and pickup countdown timer.',
      mockContent: {
        type: 'ticket',
        audioText: 'Ticket #ORD-104: 2x Samosa (Fryer) + 1x Kaapi (Drinks)',
        detail: 'Status: Received ➔ Staff click “Preparing” with 1 touch',
        pill: 'Live KDS Sync • Real-Time Order Stream',
      },
    },
    {
      step: '04',
      title: 'Real SMS & WhatsApp Confirmation',
      subtitle: 'Customer notified with live ETA',
      icon: MessageSquare,
      color: 'bg-cafe-espresso text-white',
      accentColor: 'border-cafe-espresso text-cafe-espresso',
      description:
        'The customer instantly receives an SMS confirmation on their mobile phone with the order summary, total amount, and estimated pickup time, eliminating confusion and counter crowds.',
      mockContent: {
        type: 'sms',
        audioText: '“Namaste! Order #ORD-104 is confirmed at Cafe Vaani. Prep time: 12 mins. Total: ₹140.”',
        detail: 'Delivered to caller phone via Twilio / AWS SNS / WhatsApp',
        pill: 'Verified SMS Delivery',
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cafe-sand text-cafe-espresso text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cafe-coral" />
            <span>The End-to-End Operational Pipeline</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-cafe-espresso leading-tight mb-6">
            From the Caller’s “Namaste” to the Sizzling Kitchen Griddle.
          </h2>
          <p className="text-base sm:text-lg text-cafe-espresso/70 leading-relaxed font-normal">
            No simulated mockups. Built as a closed-loop system connecting the phone line, the agentic brain, the kitchen staff screen, and the customer’s phone.
          </p>
        </div>

        {/* 4 Steps Interactive Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left step selectors */}
          <div className="lg:col-span-5 space-y-4">
            {steps.map((s, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-cafe-cream border-cafe-coral/30 shadow-warm -translate-x-1'
                      : 'bg-white hover:bg-cafe-sand/40 border-cafe-espresso/5'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm ${s.color}`}
                    >
                      {s.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-cafe-espresso">
                          {s.title}
                        </h3>
                      </div>
                      <p className="text-xs text-cafe-espresso/60 mt-0.5">{s.subtitle}</p>
                      {isActive && (
                        <p className="text-xs text-cafe-espresso/80 mt-2.5 leading-relaxed font-normal animate-fade-in">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Live Stage Visualizer */}
          <div className="lg:col-span-7">
            <div className="bg-cafe-espresso text-cafe-cream rounded-3xl p-6 sm:p-10 shadow-warm-xl relative overflow-hidden border border-cafe-espresso">
              {/* Top pill bar */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cafe-coral" />
                  <div className="w-3 h-3 rounded-full bg-cafe-mango" />
                  <div className="w-3 h-3 rounded-full bg-cafe-leaf" />
                  <span className="text-xs text-white/50 ml-2 font-mono">
                    pipeline_step_{steps[activeStep].step}.sh
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-cafe-mango">
                  {steps[activeStep].mockContent.pill}
                </span>
              </div>

              {/* Stage content */}
              <div className="space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-cafe-coral font-bold mb-1">
                    Current Event:
                  </div>
                  <h4 className="text-xl sm:text-2xl font-display font-bold text-white">
                    {steps[activeStep].title}
                  </h4>
                </div>

                {/* Code / Visual Box */}
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3 font-mono text-xs text-white/90">
                  <div className="text-cafe-mango font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cafe-leaf" />
                    <span>{steps[activeStep].mockContent.audioText}</span>
                  </div>
                  <div className="text-white/70 pl-6 text-[11px]">
                    {steps[activeStep].mockContent.detail}
                  </div>
                </div>

                {/* Interactive Action within step */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="w-4 h-4 text-cafe-mango" />
                    <span>Average step duration: &lt; 350ms</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href="/app/live-operations">
                      <button className="px-4 py-2 rounded-xl text-xs font-bold bg-cafe-coral hover:bg-cafe-coral-dark text-white shadow-warm transition-transform hover:scale-105 flex items-center gap-1.5 cursor-pointer">
                        <span>Inspect in Kitchen KDS</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
