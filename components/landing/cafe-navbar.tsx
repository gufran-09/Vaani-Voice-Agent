'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, Sparkles, Utensils, ArrowRight, Menu, X, Volume2 } from 'lucide-react';

interface CafeNavbarProps {
  onOpenDemo?: () => void;
}

export function CafeNavbar({ onOpenDemo }: CafeNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-3 bg-cafe-cream/90 backdrop-blur-md shadow-warm border-b border-cafe-espresso/10'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-cafe-coral text-white flex items-center justify-center shadow-warm transition-transform group-hover:scale-105 group-hover:rotate-3">
              <Phone className="w-5 h-5 transition-transform group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-2xl tracking-tight text-cafe-espresso">
                  VAANI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cafe-mango/30 text-cafe-espresso border border-cafe-mango/50">
                  Café AI
                </span>
              </div>
              <span className="text-[10px] text-cafe-espresso/60 tracking-wider uppercase font-medium -mt-1 hidden sm:block">
                Multilingual Voice Agent
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-cafe-espresso/80 hover:text-cafe-coral transition-colors"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-sm font-semibold text-cafe-espresso/80 hover:text-cafe-coral transition-colors"
            >
              Kitchen & Menu AI
            </a>
            <a
              href="#languages"
              className="text-sm font-semibold text-cafe-espresso/80 hover:text-cafe-coral transition-colors flex items-center gap-1.5"
            >
              <span>Languages</span>
              <span className="w-2 h-2 rounded-full bg-cafe-leaf animate-pulse" />
            </a>
            <Link
              href="/app/live-operations"
              className="text-sm font-semibold text-cafe-espresso/80 hover:text-cafe-coral transition-colors flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5 text-cafe-coral" />
              <span>Live Kitchen (KDS)</span>
            </Link>
          </nav>

          {/* CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenDemo}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-cafe-espresso bg-cafe-mango hover:bg-cafe-mango/90 shadow-warm transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Voice Call</span>
            </button>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                size="sm"
                className="text-cafe-espresso hover:bg-cafe-sand text-sm font-medium"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/app">
              <Button
                size="sm"
                className="bg-cafe-coral hover:bg-cafe-coral-dark text-white rounded-full px-5 text-sm font-bold shadow-warm transition-all hover:shadow-warm-lg hover:scale-[1.02]"
              >
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={onOpenDemo}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-cafe-mango text-cafe-espresso"
            >
              Demo Call
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-cafe-espresso bg-cafe-sand/80 hover:bg-cafe-sand"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-3 pb-6 bg-cafe-cream/95 backdrop-blur-lg border-b border-cafe-espresso/10 space-y-3 animate-fade-in">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-cafe-espresso hover:text-cafe-coral"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-cafe-espresso hover:text-cafe-coral"
          >
            Kitchen & Menu AI
          </a>
          <Link
            href="/app/live-operations"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-bold text-cafe-coral"
          >
            Live Kitchen Display (KDS)
          </Link>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/app">
              <Button className="w-full bg-cafe-coral text-white rounded-xl">
                Open Dashboard
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" className="w-full rounded-xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
