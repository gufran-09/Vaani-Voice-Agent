'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/components/app-provider';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, Phone, Activity, ClipboardList, CalendarDays,
  ConciergeBell, BookOpen, UtensilsCrossed, Package, MessageSquare,
  BarChart3, Plug, Users, Building2, CreditCard, ScrollText, Settings,
  Headset, Flame, Sparkles
} from 'lucide-react';

interface NavGroup {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: any;
    badge?: string;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Café Operations',
    items: [
      { href: '/app', label: 'Overview', icon: LayoutDashboard },
      { href: '/app/live-operations', label: 'Live Operations', icon: Flame, badge: 'Live KDS' },
      { href: '/app/orders', label: 'Orders', icon: ClipboardList },
      { href: '/app/menus', label: 'Menu & Stock', icon: UtensilsCrossed },
      { href: '/app/inventory', label: 'Inventory', icon: Package },
    ],
  },
  {
    title: 'Voice & Interactions',
    items: [
      { href: '/app/ai-receptionist', label: 'AI Voice Receptionist', icon: Headset, badge: 'Voice' },
      { href: '/app/calls', label: 'Calls & Transcripts', icon: MessageSquare },
      { href: '/app/guest-requests', label: 'Guest Requests', icon: ConciergeBell },
      { href: '/app/reservations', label: 'Reservations', icon: CalendarDays },
    ],
  },
  {
    title: 'Intelligence & Management',
    items: [
      { href: '/app/analytics', label: 'Analytics & Revenue', icon: BarChart3 },
      { href: '/app/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
      { href: '/app/integrations', label: 'Integrations', icon: Plug },
      { href: '/app/team', label: 'Team', icon: Users },
      { href: '/app/properties', label: 'Café Outlets', icon: Building2 },
      { href: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { currentOrg } = useApp();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-cafe-sand/80 bg-white/90 backdrop-blur-md flex-shrink-0 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-cafe-sand/80 flex-shrink-0 bg-cafe-cream/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-cafe-coral text-white flex items-center justify-center shadow-warm transition-transform group-hover:scale-105">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg text-cafe-espresso leading-none">
              VAANI
            </span>
            <span className="text-[10px] uppercase tracking-wider text-cafe-coral font-bold mt-0.5">
              Café Operations
            </span>
          </div>
        </Link>
        <span className="w-2 h-2 rounded-full bg-cafe-leaf animate-pulse" title="System Live" />
      </div>

      {currentOrg && (
        <div className="px-4 py-2.5 border-b border-cafe-sand/80 bg-cafe-sand/30">
          <div className="text-[10px] text-cafe-espresso/60 uppercase font-bold tracking-wider">Active Workspace</div>
          <div className="font-semibold text-xs text-cafe-espresso truncate">{currentOrg.name}</div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-cafe-espresso/50 mb-2">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-cafe-coral text-white shadow-warm'
                        : 'text-cafe-espresso/70 hover:bg-cafe-sand/60 hover:text-cafe-espresso'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-cafe-coral')} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-cafe-mango/20 text-cafe-espresso'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
