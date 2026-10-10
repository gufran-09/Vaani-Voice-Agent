'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Phone, ArrowRight, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CinematicCupExperienceProps {
  onOpenCallDemo: () => void;
}

const TOTAL_FRAMES = 24;

export function CinematicCupExperience({ onOpenCallDemo }: CinematicCupExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [framesLoaded, setFramesLoaded] = useState(false);

  // Track scroll progress through the 480vh container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Smooth physics spring for silky, jitter-free scrubbing on 60/120Hz displays
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  // Preload all 24 photorealistic frames
  useEffect(() => {
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new window.Image();
      const idxStr = i.toString().padStart(2, '0');
      img.src = `/images/cafe/frames/cup_${idxStr}.png`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= TOTAL_FRAMES) {
          setFramesLoaded(true);
          // Initial render of frame 0
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(imgs[0], 0, 0, canvas.width, canvas.height);
            }
          }
        }
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;
  }, []);

  // Update canvas frame dynamically based on scroll progress
  useEffect(() => {
    return smoothProgress.on('change', (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas || imagesRef.current.length < TOTAL_FRAMES) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let frameIdx = 0;
      if (p < 0.16) {
        frameIdx = 0; // Empty cup during entrance
      } else if (p <= 0.48) {
        const fillP = (p - 0.16) / 0.32; // 0.0 to 1.0
        frameIdx = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(fillP * (TOTAL_FRAMES - 1))));
      } else {
        frameIdx = TOTAL_FRAMES - 1; // 100% full, rich crema, steaming
      }

      const img = imagesRef.current[frameIdx];
      if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    });
  }, [smoothProgress]);

  // ================= SCENE 1: CUP ENTRANCE (0.00 -> 0.18) =================
  const cupScale = useTransform(smoothProgress, [0.0, 0.16, 0.52, 0.64], [0.72, 1.12, 1.12, 0.75]);
  const cupRotate = useTransform(smoothProgress, [0.0, 0.16, 0.52, 0.64], [-22, 0, 0, 16]);
  const cupX = useTransform(smoothProgress, [0.0, 0.16, 0.52, 0.64], ['160px', '0px', '0px', '460px']);
  const cupY = useTransform(smoothProgress, [0.0, 0.16, 0.52, 0.64], ['80px', '0px', '0px', '-120px']);
  const cupOpacity = useTransform(smoothProgress, [0.0, 0.08, 0.56, 0.64], [0.2, 1, 1, 0]);

  // Hero Opening Text Fades Out as Cup Takes Stage (0.00 -> 0.14)
  const heroTextOpacity = useTransform(smoothProgress, [0.0, 0.12], [1, 0]);
  const heroTextY = useTransform(smoothProgress, [0.0, 0.12], ['0px', '-60px']);
  const heroTextPointerEvents = useTransform(smoothProgress, (val: number) => (val > 0.1 ? 'none' : 'auto'));

  // ================= SINGLE CONTINUOUS POUR STREAM =================
  // Starts high above the viewport, streams straight down into the cup center (left: 43.46%, top: 32%)
  const streamOpacity = useTransform(smoothProgress, [0.15, 0.18, 0.46, 0.49], [0, 1, 1, 0]);
  const streamScaleY = useTransform(smoothProgress, [0.15, 0.19, 0.46, 0.49], [0.15, 1, 1, 0]);

  // ================= SCENE 3: EDITORIAL STORIES (0.22 -> 0.50) =================
  const leftStoryOpacity = useTransform(smoothProgress, [0.20, 0.26, 0.46, 0.50], [0, 1, 1, 0]);
  const leftStoryX = useTransform(smoothProgress, [0.20, 0.26, 0.46, 0.50], ['-50px', '0px', '0px', '-40px']);

  const rightStoryOpacity = useTransform(smoothProgress, [0.24, 0.30, 0.46, 0.50], [0, 1, 1, 0]);
  const rightStoryX = useTransform(smoothProgress, [0.24, 0.30, 0.46, 0.50], ['50px', '0px', '0px', '40px']);

  // ================= SCENE 4: REFINED CAFÉ MARQUEE (0.48 -> 0.62) =================
  const marqueeOpacity = useTransform(smoothProgress, [0.46, 0.50, 0.62, 0.66], [0, 1, 1, 0]);
  const marqueeY = useTransform(smoothProgress, [0.46, 0.50, 0.62, 0.66], ['40px', '0px', '0px', '-30px']);

  // ================= SCENE 6: COMPANION CAFÉ ASSETS (0.60 -> 0.88) =================
  const beansOpacity = useTransform(smoothProgress, [0.58, 0.64, 0.84, 0.88], [0, 1, 1, 0]);
  const beansX = useTransform(smoothProgress, [0.58, 0.66, 0.84], ['-120px', '0px', '40px']);
  const beansRotate = useTransform(smoothProgress, [0.58, 0.84], [-15, 20]);

  const croissantOpacity = useTransform(smoothProgress, [0.62, 0.68, 0.84, 0.88], [0, 1, 1, 0]);
  const croissantX = useTransform(smoothProgress, [0.62, 0.70, 0.84], ['120px', '0px', '-40px']);
  const croissantRotate = useTransform(smoothProgress, [0.62, 0.84], [12, -8]);

  const espressoOpacity = useTransform(smoothProgress, [0.68, 0.74, 0.84, 0.88], [0, 1, 1, 0]);
  const espressoScale = useTransform(smoothProgress, [0.68, 0.76], [0.8, 1]);

  const companionTextOpacity = useTransform(smoothProgress, [0.64, 0.70, 0.84, 0.88], [0, 1, 1, 0]);

  return (
    <div ref={containerRef} className="relative h-[480vh] bg-cafe-cream">
      {/* Sticky Stage Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center pointer-events-none">
        {/* Soft Ambient Radial Backlights */}
        <div className="absolute w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-cafe-coral/10 via-cafe-mango/15 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/4 right-1/4 w-[420px] h-[420px] rounded-full bg-cafe-sand/50 blur-2xl pointer-events-none -z-10" />

        {/* ----------------- SCENE 0: HERO OPENING ----------------- */}
        <motion.div
          style={{ opacity: heroTextOpacity, y: heroTextY, pointerEvents: heroTextPointerEvents as any }}
          className="absolute inset-x-0 top-24 sm:top-28 max-w-5xl mx-auto px-4 text-center z-30"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-cafe-coral/20 shadow-warm mb-6">
            <span className="w-2 h-2 rounded-full bg-cafe-coral animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cafe-espresso">
              Specialty Café Voice Intelligence
            </span>
            <span className="text-xs font-medium text-cafe-coral">• Telugu • Hindi • English</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-cafe-espresso tracking-tight leading-[1.06] mb-6 text-balance">
            The Voice Agent That Answers{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cafe-coral via-cafe-coral-dark to-cafe-espresso italic font-serif">
              Every Call
            </span>{' '}
            Your Café Misses.
          </h1>

          <p className="text-base sm:text-xl text-cafe-espresso/80 leading-relaxed max-w-2xl mx-auto mb-8 font-normal text-balance">
            Crafted for artisanal coffee shops and busy kitchens. While baristas pull shots and steam milk, <span className="font-semibold text-cafe-espresso">VAANI</span> takes phone orders, balances queue times, and routes tickets directly to your kitchen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenCallDemo}
              className="px-8 py-3.5 rounded-full bg-cafe-coral hover:bg-cafe-coral-dark text-white font-bold text-sm shadow-warm-lg transition-all hover:scale-105 flex items-center gap-2 cursor-pointer pointer-events-auto"
            >
              <Phone className="w-4 h-4" />
              <span>Try Voice Ordering</span>
            </button>
            <Link href="/app" className="pointer-events-auto">
              <Button
                variant="outline"
                className="rounded-full border-cafe-espresso/20 text-cafe-espresso hover:bg-white/80 font-bold px-7 py-3.5 h-auto text-sm"
              >
                <span>Open Operations Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-cafe-espresso/60 font-medium">
            <span className="animate-bounce">↓</span>
            <span>Scroll to experience the pour & conversation</span>
            <span className="animate-bounce">↓</span>
          </div>
        </motion.div>

        {/* ----------------- SCENE 1 & 2: PHOTOREALISTIC CUP & FILLING ANIMATION ----------------- */}
        <motion.div
          style={{
            scale: cupScale,
            rotate: cupRotate,
            x: cupX,
            y: cupY,
            opacity: cupOpacity,
          }}
          className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] flex items-center justify-center z-20 pointer-events-none"
        >
          {/* Ground Soft Contact Shadow */}
          <div className="absolute -bottom-6 w-[70%] h-8 bg-cafe-espresso/15 rounded-full blur-xl pointer-events-none" />

          {/* SINGLE CONTINUOUS POUR STREAM:
              Extends from 100vh above the cup directly into the liquid contact point (left: 43.46%, top: 32%)
              Zero gap, zero misalignment, pure continuous pour from above viewport into the cup! */}
          <motion.div
            style={{
              opacity: streamOpacity,
              scaleY: streamScaleY,
              transformOrigin: 'top center',
            }}
            className="absolute top-[-110vh] left-[43.46%] -translate-x-1/2 w-[28px] sm:w-[36px] h-[calc(110vh+32%)] z-30 pointer-events-none"
          >
            {/* The vertical stream image */}
            <div className="relative w-full h-full overflow-hidden">
              <Image
                src="/images/cafe/coffee-stream-clean.png"
                alt="Coffee Pour Stream"
                fill
                className="object-cover object-bottom"
                priority
              />
            </div>

            {/* Micro splash droplets and impact glow at liquid contact point */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 rounded-[50%] bg-[#E89244]/80 blur-[2px] animate-pulse pointer-events-none" />
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-10 h-5 rounded-[50%] border border-[#F4B544]/70 animate-ping pointer-events-none" />
          </motion.div>

          {/* High-Performance Canvas Image Sequence Player */}
          <canvas
            ref={canvasRef}
            width={640}
            height={640}
            className="w-full h-full object-contain drop-shadow-2xl"
          />

          {/* Static Fallback while images load */}
          {!framesLoaded && (
            <div className="absolute inset-0">
              <Image
                src="/images/cafe/hero-cup.png"
                alt="Artisanal Café Ceramic Cup"
                fill
                className="object-contain"
                priority
              />
            </div>
          )}
        </motion.div>

        {/* ----------------- SCENE 3: EDITORIAL STORIES AROUND CUP ----------------- */}
        {/* Left Story: Conversational Naturalness */}
        <motion.div
          style={{
            opacity: leftStoryOpacity,
            x: leftStoryX,
          }}
          className="absolute left-6 sm:left-12 lg:left-24 max-w-xs sm:max-w-sm z-30 pointer-events-auto"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cafe-coral/10 text-cafe-coral text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>01 • Acoustic Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-cafe-espresso leading-snug">
              Fluid as Freshly Poured Espresso.
            </h2>
            <p className="text-xs sm:text-sm text-cafe-espresso/80 leading-relaxed font-normal">
              Trained specifically on noisy café environments, grinding burrs, and colloquial Indian speech. Handles rapid multi-turn changes without rigid phone menus.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-xs font-semibold text-cafe-espresso/70">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cafe-leaf" />
                <span>&lt; 450ms Natural Response Latency</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cafe-leaf" />
                <span>Code-Mixed Hindi, Telugu & English</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Story: Kitchen KDS Routing */}
        <motion.div
          style={{
            opacity: rightStoryOpacity,
            x: rightStoryX,
          }}
          className="absolute right-6 sm:right-12 lg:right-24 max-w-xs sm:max-w-sm z-30 pointer-events-auto"
        >
          <div className="space-y-3 bg-white/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-cafe-coral/15 shadow-warm-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cafe-leaf/10 text-cafe-leaf text-[11px] font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>02 • Real-Time KDS Dispatch</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-cafe-espresso leading-snug">
              From Spoken Word to Kitchen Ticket.
            </h3>
            <p className="text-xs sm:text-sm text-cafe-espresso/70 leading-relaxed">
              Every confirmed voice order immediately prints or displays on your kitchen stations, factoring in queue congestion and dynamic preparation ETAs.
            </p>
            <div className="p-3 bg-cafe-sand/40 rounded-2xl border border-cafe-sand text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-cafe-espresso">
                <span>ORD-108 • Takeaway</span>
                <span className="text-cafe-coral">8m ETA</span>
              </div>
              <div className="text-cafe-espresso/70 text-[11px]">
                2x Flat White (Oat Milk) • 1x Almond Croissant
              </div>
            </div>
          </div>
        </motion.div>

        {/* ----------------- SCENE 4: REFINED CAFÉ MARQUEE ----------------- */}
        <motion.div
          style={{
            opacity: marqueeOpacity,
            y: marqueeY,
          }}
          className="absolute inset-x-0 bottom-16 sm:bottom-20 z-20 pointer-events-none"
        >
          <div className="py-3 bg-cafe-espresso text-cafe-cream overflow-hidden whitespace-nowrap shadow-warm-lg">
            <div className="inline-flex items-center gap-8 text-xs sm:text-sm font-bold uppercase tracking-widest animate-marquee">
              <span>Freshly Roasted Dialogue</span>
              <span>•</span>
              <span>Zero Missed Customer Calls</span>
              <span>•</span>
              <span>Automated Station Routing</span>
              <span>•</span>
              <span>Artisanal Hospitality</span>
              <span>•</span>
              <span>Queue-Aware Prep Time ETAs</span>
              <span>•</span>
              <span>Freshly Roasted Dialogue</span>
              <span>•</span>
              <span>Zero Missed Customer Calls</span>
              <span>•</span>
              <span>Automated Station Routing</span>
            </div>
          </div>
        </motion.div>

        {/* ----------------- SCENE 6: COMPANION ASSETS CHOREOGRAPHY ----------------- */}
        {/* Floating Coffee Beans Cluster */}
        <motion.div
          style={{
            opacity: beansOpacity,
            x: beansX,
            rotate: beansRotate,
          }}
          className="absolute top-20 sm:top-28 left-8 sm:left-24 w-36 h-36 sm:w-56 sm:h-56 z-25 pointer-events-none"
        >
          <Image
            src="/images/cafe/coffee-beans.png"
            alt="Roasted Coffee Beans"
            fill
            className="object-contain drop-shadow-xl"
          />
        </motion.div>

        {/* Floating Golden Artisan Croissant */}
        <motion.div
          style={{
            opacity: croissantOpacity,
            x: croissantX,
            rotate: croissantRotate,
          }}
          className="absolute bottom-24 sm:bottom-32 right-8 sm:right-24 w-44 h-44 sm:w-64 sm:h-64 z-25 pointer-events-none"
        >
          <Image
            src="/images/cafe/croissant.png"
            alt="Golden Artisan Croissant"
            fill
            className="object-contain drop-shadow-xl"
          />
        </motion.div>

        {/* Center Latte Art Espresso Cup */}
        <motion.div
          style={{
            opacity: espressoOpacity,
            scale: espressoScale,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-60 sm:h-60 z-25 pointer-events-none"
        >
          <Image
            src="/images/cafe/espresso-cup.png"
            alt="Latte Art Cup"
            fill
            className="object-contain drop-shadow-2xl"
          />
        </motion.div>

        {/* Companion Chapter Story Text */}
        <motion.div
          style={{ opacity: companionTextOpacity }}
          className="absolute bottom-16 inset-x-0 text-center max-w-xl mx-auto px-4 z-30 pointer-events-auto"
        >
          <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-cafe-espresso mb-2">
            Every Detail of Your Menu, Understood.
          </h3>
          <p className="text-xs sm:text-sm text-cafe-espresso/70 leading-relaxed font-normal">
            From single-origin roast profiles and alternative milks to freshly baked pastries. When an item runs out, Vaani gracefully replans without frustrating the caller.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
