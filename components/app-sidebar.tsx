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
  Headset
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard },
  { href: '/app/ai-receptionist', label: 'AI Receptionist', icon: Headset },
  { href: '/app/live-operations', label: 'Live Operations', icon: Activity },
  { href: '/app/orders', label: 'Orders', icon: ClipboardList },
  { href: '/app/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/app/guest-requests', label: 'Guest Requests', icon: ConciergeBell },
  { href: '/app/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/app/menus', label: 'Menus & Services', icon: UtensilsCrossed },
  { href: '/app/inventory', label: 'Inventory', icon: Package },
  { href: '/app/calls', label: 'Calls & Conversations', icon: MessageSquare },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/integrations', label: 'Integrations', icon: Plug },
  { href: '/app/team', label: 'Team & Permissions', icon: Users },
  { href: '/app/properties', label: 'Properties', icon: Building2 },
  { href: '/app/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/app/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { currentOrg } = useApp();

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r bg-card flex-shrink-0">
      <div className="h-16 flex items-center px-5 border-b flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Phone className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">VAANI</span>
        </Link>
      </div>

      {currentOrg && (
        <div className="px-4 py-3 border-b">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Organization</div>
          <div className="font-medium text-sm truncate">{currentOrg.name}</div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
