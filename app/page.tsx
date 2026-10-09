'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { CafeNavbar } from '@/components/landing/cafe-navbar';
import { CinematicCupExperience } from '@/components/landing/cinematic-cup-experience';
import { CafeAtmosphere } from '@/components/landing/cafe-atmosphere';
import { CafeHowItWorks } from '@/components/landing/cafe-how-it-works';
import { CafeFeaturesGrid } from '@/components/landing/cafe-features-grid';
import { CafeCta } from '@/components/landing/cafe-cta';
import { CafeCallModal } from '@/components/landing/cafe-call-modal';

// Dynamically load ambient Three.js floating canvas
const FloatingFoodCanvas = dynamic(
  () => import('@/components/landing/floating-food-canvas').then((mod) => mod.FloatingFoodCanvas),
  { ssr: false }
);

export default function HomePage() {
  const [callModalOpen, setCallModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cafe-cream text-cafe-espresso selection:bg-cafe-coral/20 selection:text-cafe-espresso relative">
      {/* 3D Ambient Three.js Canvas Layer */}
      <FloatingFoodCanvas />

      {/* Navigation */}
      <CafeNavbar onOpenDemo={() => setCallModalOpen(true)} />

      {/* Main Sections */}
      <main className="relative z-20">
        {/* Cinematic Scroll-Driven Cup Storytelling Experience */}
        <CinematicCupExperience onOpenCallDemo={() => setCallModalOpen(true)} />

        {/* Section 2: Café Atmosphere & Artisanal Menu Craft */}
        <div id="atmosphere">
          <CafeAtmosphere />
        </div>

        {/* Section 3: How Vaani Works — 4-Step Operational Pipeline */}
        <div id="how-it-works">
          <CafeHowItWorks />
        </div>

        {/* Section 4: Features Engineered for Busy Cafés */}
        <div id="features">
          <CafeFeaturesGrid />
        </div>

        {/* Section 5: Final CTA & Editorial Footer */}
        <CafeCta onOpenDemo={() => setCallModalOpen(true)} />
      </main>

      {/* Interactive Voice Call Testing Modal */}
      <CafeCallModal open={callModalOpen} onOpenChange={setCallModalOpen} />
    </div>
  );
}
