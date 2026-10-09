'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, ArrowRight, Sparkles, ChefHat, Heart, Shield, Terminal } from 'lucide-react';

interface CafeCtaProps {
  onOpenDemo: () => void;
}

export function CafeCta({ onOpenDemo }: CafeCtaProps) {
  return (
    <section className="relative py-28 overflow-hidden bg-cafe-cream">
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cafe-sand/50 to-cafe-cream pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Central Call-to-action Card */}
        <div className="bg-gradient-to-br from-cafe-espresso to-cafe-espresso-dark text-cafe-cream rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-16 shadow-warm-xl text-center max-w-5xl mx-auto relative overflow-hidden border border-cafe-espresso">
          {/* Subtle warm glow inside */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cafe-coral/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cafe-mango/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-cafe-mango text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intelligent Café Telephony & KDS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white leading-[1.1] mb-6 text-balance">
              Never Let Another Hungry Caller Ring Out Unanswered.
            </h2>

            <p className="text-base sm:text-lg text-cafe-cream/80 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
              Experience the end-to-end voice loop: test the live voice ordering experience, inspect real-time kitchen display tickets, and watch the queue dynamically balance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onOpenDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-cafe-coral hover:bg-cafe-coral-dark text-white font-bold text-base shadow-warm-lg transition-all hover:scale-105 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Test Voice Ordering</span>
              </button>

              <Link href="/app" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold px-8 py-4 h-auto"
                >
                  Enter Staff Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-cafe-espresso/10 text-cafe-espresso/70 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cafe-coral text-white flex items-center justify-center font-bold">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-bold text-base text-cafe-espresso">VAANI</span>
            <span className="text-cafe-espresso/40">|</span>
            <span>Specialty Café Voice Operations Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/app/live-operations" className="hover:text-cafe-coral font-medium transition-colors">
              Kitchen Display (KDS)
            </Link>
            <Link href="/app/orders" className="hover:text-cafe-coral font-medium transition-colors">
              Orders
            </Link>
            <Link href="/app/menus" className="hover:text-cafe-coral font-medium transition-colors">
              Menu & Stock
            </Link>
            <Link href="/app/analytics" className="hover:text-cafe-coral font-medium transition-colors">
              Analytics
            </Link>
          </div>

          <div className="text-cafe-espresso/50">
            Crafted for Independent Cafés & QSRs
          </div>
        </footer>
      </div>
    </section>
  );
}
