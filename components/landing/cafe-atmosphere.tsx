'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Coffee, Sparkles, ChefHat, CheckCircle2, Clock } from 'lucide-react';

export function CafeAtmosphere() {
  const items = [
    {
      title: 'Artisanal Flat White & Cortado',
      subtitle: 'Double ristretto, velvety steamed milk, delicate latte art rosette',
      image: '/images/cafe/espresso-cup.png',
      spokenQuery: '“Two oat milk flat whites, extra hot please.”',
      station: 'Espresso Bar',
      prepTime: '3 mins',
      price: '₹180',
      badge: 'Signature Brew',
    },
    {
      title: 'Golden Flaky French Croissant',
      subtitle: 'Pure butter lamination, crisp honeycomb interior, baked fresh every morning',
      image: '/images/cafe/croissant.png',
      spokenQuery: '“Ek warm butter croissant pack kar do.”',
      station: 'Pastry Station',
      prepTime: '2 mins',
      price: '₹140',
      badge: 'Fresh Bake',
    },
    {
      title: 'Double-Walled Pour Over & Cold Brew',
      subtitle: 'Single-origin washed roast, crystal clear extraction, slow immersion',
      image: '/images/cafe/glass-cup.png',
      spokenQuery: '“One iced pour over, black, with light ice.”',
      station: 'Slow Bar',
      prepTime: '5 mins',
      price: '₹220',
      badge: 'Single Origin',
    },
    {
      title: 'Estate Dark Roasted Espresso Beans',
      subtitle: 'Chikmagalur shade-grown Arabica, notes of dark chocolate and toasted hazelnut',
      image: '/images/cafe/coffee-beans.png',
      spokenQuery: '“Do packet espresso roast beans ground for French press.”',
      station: 'Retail & Grind',
      prepTime: '1 min',
      price: '₹450',
      badge: 'House Blend',
    },
  ];

  return (
    <section className="py-24 bg-cafe-sand/30 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-cafe-coral uppercase tracking-widest mb-3">
              <ChefHat className="w-4 h-4" />
              <span>Café Menu & Craft Intelligence</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-cafe-espresso leading-tight">
              Understands Every Customization, Roast & Pastry Pairing.
            </h2>
          </div>
          <p className="text-sm sm:text-base text-cafe-espresso/70 max-w-md font-normal leading-relaxed">
            From alternative milks and syrup pumps to fresh bakery batches. Vaani checks live station inventory before confirming any spoken order.
          </p>
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="group bg-white/95 rounded-3xl p-6 border border-cafe-espresso/10 hover:border-cafe-coral/30 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Isolated Asset Stage */}
                <div className="relative h-44 w-full mb-6 flex items-center justify-center bg-cafe-cream/40 rounded-2xl p-4 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-radial from-white to-transparent opacity-60" />
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={180}
                    height={180}
                    className="object-contain relative z-10 drop-shadow-lg"
                  />
                  <Badge className="absolute top-3 left-3 bg-cafe-espresso text-cafe-cream text-[10px] font-bold uppercase tracking-wider">
                    {item.badge}
                  </Badge>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display font-bold text-lg text-cafe-espresso group-hover:text-cafe-coral transition-colors">
                    {item.title}
                  </h3>
                  <span className="font-mono font-bold text-sm text-cafe-coral">
                    {item.price}
                  </span>
                </div>

                <p className="text-xs text-cafe-espresso/70 mb-4 line-clamp-2">
                  {item.subtitle}
                </p>
              </div>

              <div>
                {/* Spoken Dialect Query */}
                <div className="bg-cafe-sand/40 rounded-xl p-2.5 mb-4 border border-cafe-sand/60">
                  <span className="text-[10px] font-bold text-cafe-espresso/50 uppercase tracking-wider block mb-0.5">
                    Spoken Caller Order:
                  </span>
                  <p className="text-xs italic font-medium text-cafe-espresso">
                    {item.spokenQuery}
                  </p>
                </div>

                {/* Metadata Pill */}
                <div className="pt-3 border-t border-cafe-sand flex items-center justify-between text-[11px] text-cafe-espresso/70 font-semibold">
                  <span className="flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5 text-cafe-coral" />
                    {item.station}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-cafe-leaf">
                    <Clock className="w-3 h-3" />
                    {item.prepTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
