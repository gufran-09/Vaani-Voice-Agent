'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Coffee, ChefHat, Clock, Sparkles, AlertCircle, Utensils, CheckCircle2 } from 'lucide-react';
import { ALL_FOOD_ITEMS, MENU_CATEGORIES, type CafeMenuItem } from '@/lib/menu-data';

export function CafeAtmosphere() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredItems = activeCategory === 'all'
    ? ALL_FOOD_ITEMS
    : ALL_FOOD_ITEMS.filter((item) => item.category_id === activeCategory);

  return (
    <section className="py-24 bg-cafe-sand/30 relative overflow-hidden" id="menu-intelligence">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-cafe-coral uppercase tracking-widest mb-3">
              <ChefHat className="w-4 h-4" />
              <span>Comprehensive 28-Item Database Menu & Voice Intelligence</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-cafe-espresso leading-tight">
              Every Sip, Snack & Tiffin Handled Live by Vaani.
            </h2>
          </div>
          <p className="text-sm sm:text-base text-cafe-espresso/70 max-w-md font-normal leading-relaxed">
            All 28 chef-crafted items from our live database—from South Indian Filter Kaapi and Kadak Chai to Medu Vadas, Avocado Toast, and Dal Makhani. Vaani understands colloquial Indian phrasing and verifies stock instantly.
          </p>
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-cafe-espresso text-white shadow-warm'
                : 'bg-white text-cafe-espresso/70 hover:bg-cafe-sand/60 border border-cafe-espresso/10'
            }`}
          >
            All Menu Items ({ALL_FOOD_ITEMS.length})
          </button>
          {MENU_CATEGORIES.map((cat) => {
            const count = ALL_FOOD_ITEMS.filter((i) => i.category_id === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cafe-espresso text-white shadow-warm'
                    : 'bg-white text-cafe-espresso/70 hover:bg-cafe-sand/60 border border-cafe-espresso/10'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Editorial Food Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white/95 rounded-3xl p-6 border border-cafe-espresso/10 hover:border-cafe-coral/30 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Photographic Food Card Banner */}
                <div className="relative h-48 w-full mb-5 rounded-2xl overflow-hidden group-hover:scale-[1.03] transition-transform duration-300 bg-cafe-sand/20 shadow-inner">
                  <Image
                    src={item.image || '/images/food/filter-coffee.jpg'}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
                  <Badge className="absolute top-3 left-3 bg-cafe-espresso/90 backdrop-blur-sm text-cafe-cream text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {item.badge || item.category_name}
                  </Badge>
                  {item.availability !== 'available' && (
                    <Badge variant="destructive" className="absolute top-3 right-3 text-[10px] shadow-sm">
                      {item.availability}
                    </Badge>
                  )}
                </div>

                {/* Header */}
                <div className="flex items-start justify-between mb-1 gap-2">
                  <h3 className="font-display font-bold text-base text-cafe-espresso group-hover:text-cafe-coral transition-colors">
                    {item.name}
                  </h3>
                  <span className="font-mono font-bold text-sm text-cafe-coral shrink-0">
                    ₹{item.price}
                  </span>
                </div>

                <p className="text-xs text-cafe-espresso/70 mb-3 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Spoken Dialect Query */}
                {item.spokenQuery && (
                  <div className="bg-cafe-sand/40 rounded-xl p-2.5 mb-3 border border-cafe-sand/60">
                    <span className="text-[9px] font-bold text-cafe-espresso/50 uppercase tracking-wider block mb-0.5">
                      Voice Recognition Query:
                    </span>
                    <p className="text-xs italic font-medium text-cafe-espresso line-clamp-2">
                      {item.spokenQuery}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {/* Allergens & Aliases */}
                {item.allergens.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[10px] text-cafe-espresso/50 font-medium">Allergens:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.allergens.map((alg) => (
                        <span key={alg} className="text-[10px] px-1.5 py-0.5 rounded bg-cafe-sand/70 text-cafe-espresso/80 font-medium capitalize">
                          {alg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Station & Prep Time */}
                <div className="pt-3 border-t border-cafe-sand flex items-center justify-between text-[11px] text-cafe-espresso/70 font-semibold">
                  <span className="flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5 text-cafe-coral" />
                    {item.station}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-cafe-leaf">
                    <Clock className="w-3 h-3" />
                    {item.prep_time_minutes} min
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
