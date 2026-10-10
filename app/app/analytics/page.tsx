'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Phone,
  ClipboardList,
  CalendarDays,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Loader2,
  Utensils,
} from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Call = Database['public']['Tables']['calls']['Row'];
type Reservation = Database['public']['Tables']['reservations']['Row'];
type GuestRequest = Database['public']['Tables']['guest_requests']['Row'];

type DateRange = '7' | '30' | '90';

type OrderStatus = Order['status'];
type CallOutcome = NonNullable<Call['outcome']>;

const ORDER_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
const CALL_OUTCOMES: CallOutcome[] = [
  'order_placed',
  'reservation_made',
  'info_provided',
  'human_transfer',
  'unresolved',
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

interface PopularItem {
  name: string;
  count: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const { currentProperty } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30');

  const fetchAnalytics = useCallback(async () => {
    const propId = currentProperty?.id || '62e1b115-9382-40f8-853a-0a773735d034';
    setLoading(true);
    setError(null);

    const since = daysAgo(Number(dateRange));

    try {
      const [ordersRes, callsRes, reservationsRes, guestRequestsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('property_id', propId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase
          .from('calls')
          .select('*')
          .eq('property_id', propId)
          .gte('started_at', since)
          .order('started_at', { ascending: false }),
        supabase
          .from('reservations')
          .select('*')
          .eq('property_id', propId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
        supabase
          .from('guest_requests')
          .select('*')
          .eq('property_id', propId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
      ]);

      const fetchedOrders = (ordersRes.data ?? []) as Order[];
      const fetchedCalls = (callsRes.data ?? []) as Call[];

      setOrders(fetchedOrders);
      setCalls(fetchedCalls);
      setReservations(reservationsRes.data ?? []);
      setGuestRequests(guestRequestsRes.data ?? []);

      const orderIds = fetchedOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        setOrderItems((items ?? []) as OrderItem[]);
      } else {
        setOrderItems([]);
      }
    } catch (e) {
      console.warn('Analytics fetch error from RDS:', e);
      setOrders([]);
      setCalls([]);
      setOrderItems([]);
    }
    setLoading(false);
  }, [currentProperty, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const totalCalls = calls.length;
    const ordersCreated = orders.length;
    const reservationsCount = reservations.length;
    const avgOrderValue =
      orders.length > 0
        ? orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) / orders.length
        : 0;
    return { totalCalls, ordersCreated, reservationsCount, avgOrderValue };
  }, [calls, orders, reservations]);

  // ---- Orders by status (bar chart) ----
  const ordersByStatus = useMemo(() => {
    return ORDER_STATUSES.map((status) => ({
      name: status.replace(/_/g, ' '),
      status,
      count: orders.filter((o) => o.status === status).length,
    }));
  }, [orders]);

  // ---- Calls by outcome (bar chart) ----
  const callsByOutcome = useMemo(() => {
    return CALL_OUTCOMES.map((outcome) => ({
      name: outcome.replace(/_/g, ' '),
      outcome,
      count: calls.filter((c) => c.outcome === outcome).length,
    }));
  }, [calls]);

  // ---- Popular menu items ----
  const popularItems = useMemo<PopularItem[]>(() => {
    const map = new Map<string, PopularItem>();
    for (const item of orderItems) {
      const existing = map.get(item.name);
      if (existing) {
        existing.count += item.quantity;
        existing.revenue += item.price * item.quantity;
      } else {
        map.set(item.name, {
          name: item.name,
          count: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [orderItems]);

  const currency = currentProperty?.currency ?? 'INR';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Crunching the numbers…</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Calls',
      value: stats.totalCalls,
      icon: Phone,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Orders Created',
      value: stats.ordersCreated,
      icon: ClipboardList,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Reservations',
      value: stats.reservationsCount,
      icon: CalendarDays,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue, currency),
      icon: IndianRupee,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  const hasData =
    orders.length > 0 || calls.length > 0 || reservations.length > 0 || guestRequests.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance insights for {currentProperty?.name ?? 'Cafe Vaani — Flagship'}.
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground">
              Analytics will appear here once your property starts receiving calls and orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
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
                  <div className="text-2xl font-display font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Orders by status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display">Orders by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ordersByStatus} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Calls by outcome */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display">Calls by Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={callsByOutcome} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Popular menu items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Popular Menu Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {popularItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    No order items in this period.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularItems.map((item, idx) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {item.count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.revenue, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
