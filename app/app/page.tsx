'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, ClipboardList, CalendarDays, ConciergeBell, TrendingUp,
  Clock, ArrowUpRight, ArrowRight, AlertCircle, CheckCircle2,
  Activity, Headset
} from 'lucide-react';
import Link from 'next/link';

export default function AppOverviewPage() {
  const { currentOrg, currentProperty } = useApp();
  const [stats, setStats] = useState({
    activeOrders: 0,
    todayReservations: 0,
    openGuestRequests: 0,
    todayCalls: 0,
    completedOrders: 0,
    humanTransfers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProperty) {
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      const today = new Date().toISOString().split('T')[0];

      const [orders, reservations, guestRequests, calls] = await Promise.all([
        supabase.from('orders').select('*').eq('property_id', currentProperty.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('reservations').select('*').eq('property_id', currentProperty.id).eq('reservation_date', today),
        supabase.from('guest_requests').select('*').eq('property_id', currentProperty.id).in('status', ['open', 'assigned', 'in_progress']),
        supabase.from('calls').select('*').eq('property_id', currentProperty.id).order('started_at', { ascending: false }).limit(10),
      ]);

      const allOrders = orders.data ?? [];
      const active = allOrders.filter((o: any) => ['received', 'preparing', 'ready'].includes(o.status));
      const completed = allOrders.filter((o: any) => o.status === 'completed');

      const allCalls = calls.data ?? [];
      const transfers = allCalls.filter((c: any) => c.outcome === 'human_transfer');

      setStats({
        activeOrders: active.length,
        todayReservations: reservations.data?.length ?? 0,
        openGuestRequests: guestRequests.data?.length ?? 0,
        todayCalls: allCalls.length,
        completedOrders: completed.length,
        humanTransfers: transfers.length,
      });

      setRecentOrders(active.slice(0, 5));
      setRecentCalls(allCalls.slice(0, 5));
      setLoading(false);
    })();
  }, [currentProperty]);

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Building2Icon />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property configured yet</h2>
        <p className="text-muted-foreground mb-6">
          Add your first property to start using VAANI.
        </p>
        <Link href="/app/properties">
          <Button>
            Add a property
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Orders', value: stats.activeOrders, icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10' },
    { label: "Today's Reservations", value: stats.todayReservations, icon: CalendarDays, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Open Guest Requests', value: stats.openGuestRequests, icon: ConciergeBell, color: 'text-success', bg: 'bg-success/10' },
    { label: "Today's Calls", value: stats.todayCalls, icon: Phone, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{currentProperty.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentProperty.city ? `${currentProperty.city}, ` : ''}{currentOrg?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/orders">
            <Button variant="outline" size="sm">
              <ClipboardList className="w-4 h-4 mr-2" />
              View Orders
            </Button>
          </Link>
          <Link href="/app/ai-receptionist">
            <Button size="sm">
              <Headset className="w-4 h-4 mr-2" />
              AI Receptionist
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-display font-bold">
                {loading ? <span className="text-muted-foreground/40">—</span> : stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-display">Active Orders</CardTitle>
            <Link href="/app/orders" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No active orders right now
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {order.order_number?.slice(-3) ?? '---'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {order.customer_name ?? 'Walk-in customer'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ₹{order.total_amount} • {order.channel}
                        </div>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-display">Recent Calls</CardTitle>
            <Link href="/app/calls" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentCalls.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No calls yet today
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        call.status === 'completed' ? 'bg-success/10' : call.status === 'missed' ? 'bg-destructive/10' : 'bg-secondary'
                      }`}>
                        <Phone className={`w-4 h-4 ${
                          call.status === 'completed' ? 'text-success' : call.status === 'missed' ? 'text-destructive' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {call.language ?? 'Unknown language'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {call.outcome === 'human_transfer' && (
                        <Badge variant="outline" className="text-xs">Transferred</Badge>
                      )}
                      <Badge variant={call.status === 'completed' ? 'default' : call.status === 'missed' ? 'destructive' : 'secondary'} className="text-xs">
                        {call.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Receptionist status */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Headset className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">AI Receptionist is {currentOrg?.subscription_status === 'trial' ? 'in trial mode' : 'active'}</h3>
              <p className="text-sm text-primary-foreground/70">
                {currentOrg?.supported_languages?.length ?? 1} language(s) configured • {currentProperty.status === 'active' ? 'Accepting calls' : 'Setup pending'}
              </p>
            </div>
          </div>
          <Link href="/app/ai-receptionist">
            <Button variant="secondary" size="sm">
              Configure
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'secondary',
    received: 'default',
    preparing: 'default',
    ready: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
  };
  return <Badge variant={styles[status] as any ?? 'secondary'} className="text-xs capitalize">{status}</Badge>;
}

function Building2Icon() {
  return (
    <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </svg>
  );
}
