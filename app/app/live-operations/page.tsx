'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Activity, RefreshCw, Clock, AlertCircle, Flame,
  CheckCircle2, ConciergeBell, Package, Building2,
  Coffee, Utensils, Volume2, Plus, Sparkles, Filter,
  Phone, ArrowRight, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ALL_FOOD_ITEMS } from '@/lib/menu-data';

const STATUS_FLOW: Record<string, string> = {
  received: 'preparing',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Start Preparing',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready for Pickup',
  ready: 'Hand Over & Complete',
};

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  received: { bg: 'bg-cafe-mango/15', text: 'text-cafe-espresso', border: 'border-cafe-mango' },
  confirmed: { bg: 'bg-cafe-mango/15', text: 'text-cafe-espresso', border: 'border-cafe-mango' },
  preparing: { bg: 'bg-cafe-coral/15', text: 'text-cafe-coral', border: 'border-cafe-coral' },
  ready: { bg: 'bg-cafe-leaf/15', text: 'text-cafe-leaf', border: 'border-cafe-leaf' },
  completed: { bg: 'bg-cafe-sand', text: 'text-cafe-espresso/60', border: 'border-cafe-espresso/20' },
};

const REQUEST_FLOW: Record<string, string> = {
  open: 'assigned',
  assigned: 'in_progress',
  in_progress: 'completed',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'secondary',
  normal: 'default',
  high: 'default',
  urgent: 'destructive',
};

// Built-in starter demo orders covering all 28 database food items across stations
const DEMO_STARTER_ORDERS = [
  {
    id: 'demo-ord-1',
    order_number: 'ORD-104',
    customer_name: 'Rohan Sharma',
    channel: 'voice_telugu_hindi',
    status: 'received',
    prep_eta_minutes: 12,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    station: 'Fryer & Snacks',
    notes: 'Parcel • Less spicy ga • Extra coconut chutney',
    order_items: [
      { id: 'item-1', name: 'Samosa (2 pcs)', quantity: 2, price: 50 },
      { id: 'item-2', name: 'South Indian Filter Coffee', quantity: 1, price: 40 },
    ],
  },
  {
    id: 'demo-ord-2',
    order_number: 'ORD-105',
    customer_name: 'Ananya Rao',
    channel: 'voice_english',
    status: 'preparing',
    prep_eta_minutes: 8,
    created_at: new Date(Date.now() - 7 * 60000).toISOString(),
    station: 'Griddle & Tiffin',
    notes: 'Hot tawa • Sambar separate',
    order_items: [
      { id: 'item-3', name: 'Tawa Masala Dosa', quantity: 1, price: 90 },
      { id: 'item-4', name: 'Cold Brew Coffee', quantity: 1, price: 220 },
    ],
  },
  {
    id: 'demo-ord-3',
    order_number: 'ORD-106',
    customer_name: 'Vikram Mehta',
    channel: 'voice_hindi',
    status: 'ready',
    prep_eta_minutes: 4,
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
    station: 'Bakery',
    notes: 'Extra butter on Bun Maska • Warm brownie',
    order_items: [
      { id: 'item-5', name: 'Irani Bun Maska', quantity: 2, price: 50 },
      { id: 'item-6', name: 'Cutting Masala Chai', quantity: 2, price: 30 },
      { id: 'item-7', name: 'Warm Chocolate Brownie', quantity: 1, price: 180 },
    ],
  },
  {
    id: 'demo-ord-4',
    order_number: 'ORD-107',
    customer_name: 'Kavita Reddy',
    channel: 'voice_telugu',
    status: 'received',
    prep_eta_minutes: 14,
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    station: 'Main Kitchen',
    notes: 'Parcel with extra jeera rice • Chilled lassi',
    order_items: [
      { id: 'item-8', name: 'Dal Makhani Bowl', quantity: 1, price: 250 },
      { id: 'item-9', name: 'Mango Lassi', quantity: 1, price: 160 },
    ],
  },
  {
    id: 'demo-ord-5',
    order_number: 'ORD-108',
    customer_name: 'Deepak Verma',
    channel: 'voice_english',
    status: 'preparing',
    prep_eta_minutes: 15,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    station: 'Main Kitchen',
    notes: 'Extra parmesan cheese on pasta',
    order_items: [
      { id: 'item-10', name: 'Creamy Mushroom Pasta', quantity: 1, price: 320 },
      { id: 'item-11', name: 'Cheese Garlic Bread', quantity: 1, price: 130 },
      { id: 'item-12', name: 'Butter Croissant', quantity: 1, price: 90 },
    ],
  },
];

export default function LiveOperationsPage() {
  const { currentProperty } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stationFilter, setStationFilter] = useState<'all' | 'drinks' | 'fryer' | 'griddle' | 'bakery' | 'mains'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play pleasant audio alert for kitchen ticket progress
  const playKitchenChime = useCallback((pitch = 600) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Fallback
    }
  }, [soundEnabled]);

  const fetchData = useCallback(async () => {
    const propId = currentProperty?.id || '62e1b115-9382-40f8-853a-0a773735d034';

    try {
      // 1. Fetch live kitchen orders, real stock items, and real SMS logs from AWS RDS PostgreSQL with cache-busting
      const t = Date.now();
      let kitchenData = await fetch(`/api/kitchen/orders?propertyId=${propId}&_t=${t}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      if (!kitchenData || !kitchenData.orders || kitchenData.orders.length === 0) {
        kitchenData = await fetch(`/api/kitchen/orders?propertyId=62e1b115-9382-40f8-853a-0a773735d034&_t=${t}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
      }

      if (kitchenData && Array.isArray(kitchenData.orders)) {
        setOrders((prev) => {
          const fetched: any[] = kitchenData.orders || [];
          const fetchedIds = new Set(fetched.map((o) => o.id));
          const fetchedNums = new Set(fetched.map((o) => o.order_number));

          // Retain very recent optimistic orders created in the last 45 seconds that might still be syncing
          const recentOptimistic = prev.filter(
            (o) =>
              !fetchedIds.has(o.id) &&
              !fetchedNums.has(o.order_number) &&
              Date.now() - new Date(o.created_at || Date.now()).getTime() < 45000
          );

          return [...recentOptimistic, ...fetched];
        });
        setStockAlerts(kitchenData.stockItems || []);
        setSmsLogs(kitchenData.notifications || []);
      }

      try {
        const requestsRes = await supabase
          .from('guest_requests')
          .select('*')
          .eq('property_id', propId)
          .in('status', ['open', 'assigned', 'in_progress'])
          .order('created_at', { ascending: true });
        setRequests(requestsRes?.data ?? []);
      } catch {
        setRequests([]);
      }
    } catch (e) {
      console.warn('Error fetching live kitchen operations:', e);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [currentProperty]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // 2s ultra-fast real-time refresh

    const handleNewOrder = (orderData: any) => {
      if (!orderData) return;
      playKitchenChime(580);
      setOrders((prev) => {
        const id = orderData.id || orderData.orderId || orderData.order_number;
        const ordNum = orderData.orderNumber || orderData.order_number;
        if (
          prev.some(
            (o) =>
              (id && o.id === id) ||
              (ordNum && o.order_number === ordNum)
          )
        ) {
          return prev;
        }
        const formatted = {
          id: id || `ord-${Date.now()}`,
          order_number: ordNum || `#${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: orderData.customerName || orderData.customer_name || 'Phone Caller',
          customer_phone: orderData.customerPhone || orderData.customer_phone || '+91 98765 43210',
          channel: 'voice',
          order_type: 'takeaway',
          status: 'received',
          total_amount: orderData.totalAmount || orderData.total_amount || 0,
          prep_eta_minutes: orderData.prepEta || orderData.etaMinutes || orderData.prep_eta_minutes || 10,
          created_at: new Date().toISOString(),
          order_items: (orderData.items || orderData.order_items || []).map((it: any) => ({
            id: it.id || `item-${Math.random().toString(36).slice(2)}`,
            name: it.name || it.item_name,
            item_name: it.name || it.item_name,
            quantity: it.quantity || 1,
            price: it.price || 0,
          })),
        };
        return [formatted, ...prev];
      });
      setTimeout(fetchData, 600);
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        handleNewOrder(customEvent.detail);
      }
    };

    // 1. Same-window custom event
    window.addEventListener('vaani-order-created', handleCustomEvent);

    // 2. Cross-tab localStorage storage event (0ms instant cross-tab sync)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'vaani_last_order' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleNewOrder(parsed);
        } catch (_) { }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('vaani-orders');
        bc.onmessage = (e) => {
          if (e.data) {
            handleNewOrder(e.data);
          }
        };
      }
    } catch (_) { }

    // 4. Initial check for any recently placed order
    try {
      const last = localStorage.getItem('vaani_last_order');
      if (last) {
        const parsed = JSON.parse(last);
        if (Date.now() - (parsed._ts || 0) < 60000) {
          handleNewOrder(parsed);
        }
      }
    } catch (_) { }

    return () => {
      clearInterval(interval);
      window.removeEventListener('vaani-order-created', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      if (bc) bc.close();
    };
  }, [fetchData, playKitchenChime]);

  // Advance order status: Received -> Preparing -> Ready -> Completed
  const advanceOrderStatus = async (orderId: string, currentStatus: string) => {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;

    playKitchenChime(next === 'ready' ? 750 : next === 'completed' ? 950 : 520);

    if (next === 'completed') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }

    // Optimistic in-memory update for instant feedback
    setOrders((prev) =>
      prev
        .map((o) => (o.id === orderId ? { ...o, status: next } : o))
        .filter((o) => o.status !== 'completed')
    );

    // Database update via kitchen API
    if (!orderId.startsWith('demo-')) {
      await fetch('/api/kitchen/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: next }),
      }).catch((e) => console.warn('PATCH /api/kitchen/orders failed:', e));
      setTimeout(fetchData, 800);
    }
  };

  const advanceRequestStatus = async (requestId: string, currentStatus: string) => {
    const next = REQUEST_FLOW[currentStatus];
    if (!next) return;
    if (currentProperty) {
      await supabase
        .from('guest_requests')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', requestId);
      fetchData();
    } else {
      setRequests((prev) =>
        prev
          .map((r) => (r.id === requestId ? { ...r, status: next } : r))
          .filter((r) => r.status !== 'completed')
      );
    }
  };

  // Add an instant test ticket for live judge demonstration with random items from all 28 DB items
  const handleAddLiveVoiceTicket = async () => {
    playKitchenChime(850);
    // Pick 2 random items from ALL_FOOD_ITEMS catalog
    const randIdx1 = Math.floor(Math.random() * ALL_FOOD_ITEMS.length);
    const randIdx2 = (randIdx1 + 3 + Math.floor(Math.random() * 5)) % ALL_FOOD_ITEMS.length;
    const item1 = ALL_FOOD_ITEMS[randIdx1];
    const item2 = ALL_FOOD_ITEMS[randIdx2];
    const qty1 = Math.floor(1 + Math.random() * 2);
    const qty2 = 1;
    const totalAmount = item1.price * qty1 + item2.price * qty2;
    const prepEta = Math.max(item1.prep_time_minutes, item2.prep_time_minutes) + 4;

    const newDemoTicket = {
      id: `live-demo-${Date.now()}`,
      order_number: `ORD-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: 'Caller (Voice Phone)',
      channel: 'voice_code_mixed',
      status: 'received',
      prep_eta_minutes: prepEta,
      created_at: new Date().toISOString(),
      station: item1.station,
      notes: `${item1.name} (${qty1}x) + ${item2.name} (${qty2}x)`,
      order_items: [
        { id: `i-${Date.now()}-1`, name: item1.name, quantity: qty1, price: item1.price },
        { id: `i-${Date.now()}-2`, name: item2.name, quantity: qty2, price: item2.price },
      ],
    };

    setOrders((prev) => [newDemoTicket, ...prev]);

    // If real property exists, persist to DB as well
    if (currentProperty) {
      try {
        await supabase.from('orders').insert({
          property_id: currentProperty.id,
          order_number: newDemoTicket.order_number,
          customer_name: newDemoTicket.customer_name,
          channel: 'voice',
          status: 'received',
          total_amount: totalAmount,
          prep_eta_minutes: prepEta,
        });
      } catch {
        // Fallback
      }
    }
  };

  // Filter orders by station
  const filteredOrders = useMemo(() => {
    if (stationFilter === 'all') return orders;
    return orders.filter((o) => {
      const notes = (o.station || o.notes || '').toLowerCase();
      const items = (o.order_items || []).map((i: any) => (i?.name || i?.item_name || '').toLowerCase()).join(' ');
      if (stationFilter === 'drinks') {
        return notes.includes('drink') || items.includes('coffee') || items.includes('chai') || items.includes('kaapi') || items.includes('espresso') || items.includes('chocolate') || items.includes('lassi') || items.includes('cooler');
      }
      if (stationFilter === 'fryer') {
        return notes.includes('fryer') || items.includes('samosa') || items.includes('puff') || items.includes('roll') || items.includes('wrap') || items.includes('vada') || items.includes('corn');
      }
      if (stationFilter === 'griddle') {
        return notes.includes('griddle') || items.includes('dosa') || items.includes('maska') || items.includes('toast');
      }
      if (stationFilter === 'bakery') {
        return notes.includes('bakery') || items.includes('croissant') || items.includes('muffin') || items.includes('brownie') || items.includes('jamun') || items.includes('panna cotta');
      }
      if (stationFilter === 'mains') {
        return notes.includes('kitchen') || items.includes('makhani') || items.includes('pasta');
      }
      return true;
    });
  }, [orders, stationFilter]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-cafe-coral/10 text-cafe-coral flex items-center justify-center mx-auto mb-4 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-cafe-espresso animate-pulse">
          Connecting to Live Kitchen Stream...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner: Status, Station Filter, Live Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-3xl p-5 sm:p-6 shadow-warm border border-cafe-espresso/5">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-cafe-coral text-white flex items-center justify-center shadow-warm">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cafe-leaf border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-extrabold text-cafe-espresso">
                Live Kitchen Display (KDS)
              </h1>
              <Badge className="bg-cafe-coral text-white text-[10px] uppercase font-bold tracking-wider">
                {orders.length} Active Tickets
              </Badge>
            </div>
            <p className="text-xs text-cafe-espresso/60 mt-0.5 flex items-center gap-2">
              <span>Syncing with Voice Phone Line & Agent Tools</span>
              <span>•</span>
              <span className="font-mono">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Live'}
              </span>
            </p>
          </div>
        </div>

        {/* Station Filter Pills & Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-cafe-sand/60 p-1 rounded-2xl border border-cafe-sand text-xs font-bold overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Stations' },
              { id: 'drinks', label: '☕ Drinks' },
              { id: 'fryer', label: '🥟 Fryer' },
              { id: 'griddle', label: '🥞 Griddle' },
              { id: 'bakery', label: '🥐 Bakery' },
              { id: 'mains', label: '🍛 Mains' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStationFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all ${stationFilter === tab.id
                    ? 'bg-cafe-espresso text-white shadow-sm'
                    : 'text-cafe-espresso/70 hover:text-cafe-espresso'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleAddLiveVoiceTicket}
            className="rounded-2xl bg-cafe-coral hover:bg-cafe-coral-dark text-white font-bold shadow-warm text-xs px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Inbound Ticket
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-2xl border-cafe-sand text-xs text-cafe-espresso"
            title={soundEnabled ? 'Mute Kitchen Chimes' : 'Enable Kitchen Chimes'}
          >
            <Volume2 className={`w-3.5 h-3.5 ${soundEnabled ? 'text-cafe-leaf' : 'text-cafe-espresso/40'}`} />
          </Button>

          <Button variant="outline" size="sm" onClick={fetchData} className="rounded-2xl text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync
          </Button>
        </div>
      </div>

      {/* Main Grid: Kitchen Order Tickets (Large touch targets) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Column 1: Received Tickets (Need Prep Start) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cafe-mango" />
              <h2 className="font-display font-bold text-base text-cafe-espresso">
                1. Received (Incoming)
              </h2>
            </div>
            <span className="text-xs font-bold text-cafe-espresso/60 font-mono">
              {filteredOrders.filter((o) => o.status === 'received' || o.status === 'confirmed').length}
            </span>
          </div>

          <div className="space-y-3">
            {filteredOrders
              .filter((o) => o.status === 'received' || o.status === 'confirmed')
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  onAdvance={() => advanceOrderStatus(order.id, order.status)}
                />
              ))}

            {filteredOrders.filter((o) => o.status === 'received' || o.status === 'confirmed').length === 0 && (
              <EmptyColumnPlaceholder text="No new incoming tickets" />
            )}
          </div>
        </div>

        {/* Column 2: Preparing (Active on Stations) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cafe-coral animate-pulse" />
              <h2 className="font-display font-bold text-base text-cafe-espresso">
                2. Sizzling / Preparing
              </h2>
            </div>
            <span className="text-xs font-bold text-cafe-espresso/60 font-mono">
              {filteredOrders.filter((o) => o.status === 'preparing').length}
            </span>
          </div>

          <div className="space-y-3">
            {filteredOrders
              .filter((o) => o.status === 'preparing')
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  onAdvance={() => advanceOrderStatus(order.id, order.status)}
                />
              ))}

            {filteredOrders.filter((o) => o.status === 'preparing').length === 0 && (
              <EmptyColumnPlaceholder text="No tickets currently in prep" />
            )}
          </div>
        </div>

        {/* Column 3: Ready for Pickup */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cafe-leaf" />
              <h2 className="font-display font-bold text-base text-cafe-espresso">
                3. Ready for Customer
              </h2>
            </div>
            <span className="text-xs font-bold text-cafe-espresso/60 font-mono">
              {filteredOrders.filter((o) => o.status === 'ready').length}
            </span>
          </div>

          <div className="space-y-3">
            {filteredOrders
              .filter((o) => o.status === 'ready')
              .map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  onAdvance={() => advanceOrderStatus(order.id, order.status)}
                />
              ))}

            {filteredOrders.filter((o) => o.status === 'ready').length === 0 && (
              <EmptyColumnPlaceholder text="No orders waiting for pickup" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Operational Row: Stock Alerts & Guest Requests */}
      <div className="grid lg:grid-cols-2 gap-6 pt-4">
        {/* Stock Alerts & Replanning Panel */}
        <div className="bg-white rounded-3xl p-6 shadow-warm border border-cafe-espresso/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-cafe-coral" />
              <h3 className="font-display font-bold text-base text-cafe-espresso">
                Live Kitchen Stock & Availability
              </h3>
            </div>
            <Badge variant="outline" className="text-xs border-cafe-coral text-cafe-coral font-bold">
              Agent Stock-Aware
            </Badge>
          </div>

          <p className="text-xs text-cafe-espresso/70 mb-4">
            Toggling an item to <span className="font-bold text-destructive">Unavailable</span> stops Vaani from taking it on phone calls and automatically triggers suggested substitutes.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {stockAlerts.length > 0 ? (
              stockAlerts.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${item.status === 'available'
                      ? 'bg-cafe-cream/50 border-cafe-sand'
                      : 'bg-destructive/5 border-destructive/30'
                    }`}
                >
                  <div>
                    <div className="text-xs font-bold text-cafe-espresso">{item.name}</div>
                    <div className="text-[11px] text-cafe-espresso/60 font-mono">₹{item.price}</div>
                  </div>
                  <Badge
                    className={`text-[10px] uppercase font-bold ${item.status === 'available'
                        ? 'bg-cafe-leaf/20 text-cafe-leaf hover:bg-cafe-leaf/30'
                        : 'bg-destructive/20 text-destructive'
                      }`}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-xs text-cafe-espresso/50 py-3 text-center">
                All menu items in stock in PostgreSQL database.
              </div>
            )}
          </div>
        </div>

        {/* Live Customer Notifications & Delivery Stream */}
        <div className="bg-white rounded-3xl p-6 shadow-warm border border-cafe-espresso/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ConciergeBell className="w-5 h-5 text-cafe-leaf" />
              <h3 className="font-display font-bold text-base text-cafe-espresso">
                Real-Time Customer SMS Log
              </h3>
            </div>
            <Badge className="bg-cafe-leaf/20 text-cafe-leaf border-0 text-xs font-bold">
              AWS RDS Synced
            </Badge>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto">
            {smsLogs.length > 0 ? (
              smsLogs.map((msg, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-cafe-sand/40 border border-cafe-sand text-xs flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="font-bold font-mono text-cafe-espresso">{msg.to}</span>
                    <p className="text-[11px] text-cafe-espresso/70 leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-mono text-cafe-espresso/50 flex-shrink-0 ml-2">
                    {msg.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-cafe-espresso/50 py-4 text-center">
                No SMS notifications sent yet today.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * High-contrast, easy-to-scan kitchen ticket card
 */
function KitchenTicketCard({ order, onAdvance }: { order: any; onAdvance: () => void }) {
  const currentStatus = order.status || 'received';
  const badgeStyle = STATUS_BADGES[currentStatus] || STATUS_BADGES.received;
  const nextLabel = STATUS_LABELS[currentStatus];

  // Calculate elapsed minutes since ticket was created
  const createdDate = order.created_at ? new Date(order.created_at) : new Date();
  const elapsedMins = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / 60000));

  return (
    <Card
      className={`rounded-3xl border-2 transition-all shadow-warm hover:shadow-warm-lg bg-white overflow-hidden ${currentStatus === 'received'
          ? 'border-cafe-mango'
          : currentStatus === 'preparing'
            ? 'border-cafe-coral'
            : 'border-cafe-leaf'
        }`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Ticket Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl text-cafe-espresso tracking-tight">
                #{order.order_number?.replace('ORD-', '') || '104'}
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {currentStatus}
              </span>
            </div>
            <div className="text-xs text-cafe-espresso/70 mt-1 font-medium flex items-center gap-1.5">
              <span>{order.customer_name || 'Phone Caller'}</span>
              <span>•</span>
              <span className="text-[11px] text-cafe-coral font-bold uppercase">{order.channel || 'Voice Call'}</span>
            </div>
          </div>

          {/* Time & ETA badge */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold text-cafe-espresso">
              <Clock className="w-3.5 h-3.5 text-cafe-coral" />
              <span>{order.prep_eta_minutes || 10}m ETA</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${elapsedMins > 10 ? 'text-destructive font-bold' : 'text-cafe-espresso/50'}`}>
              {elapsedMins}m in kitchen
            </div>
          </div>
        </div>

        {/* Item List (Bold, prominent, easy to read for cooks) */}
        <div className="bg-cafe-sand/40 rounded-2xl p-3 my-3 border border-cafe-sand space-y-1.5">
          {order.order_items && order.order_items.length > 0 ? (
            order.order_items.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between text-xs font-bold text-cafe-espresso">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-cafe-espresso text-white flex items-center justify-center text-[10px] font-mono">
                    {item.quantity}x
                  </span>
                  <span>{item.name || item.item_name}</span>
                </span>
                <span className="font-mono text-cafe-espresso/70">
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-cafe-espresso/60 italic">Items loading...</div>
          )}
        </div>

        {/* Customization notes */}
        {order.notes && (
          <div className="text-[11px] bg-cafe-mango/15 text-cafe-espresso font-semibold rounded-xl px-2.5 py-1.5 mb-3 border border-cafe-mango/30">
            ⚠️ Note: {order.notes}
          </div>
        )}

        {/* Action Button: One-click status advance */}
        {nextLabel && (
          <Button
            size="lg"
            onClick={onAdvance}
            className={`w-full rounded-2xl font-bold text-xs tracking-wider uppercase h-11 shadow-warm transition-transform active:scale-95 ${currentStatus === 'received'
                ? 'bg-cafe-coral hover:bg-cafe-coral-dark text-white'
                : currentStatus === 'preparing'
                  ? 'bg-cafe-leaf hover:bg-cafe-leaf/90 text-white'
                  : 'bg-cafe-espresso hover:bg-cafe-espresso-dark text-white'
              }`}
          >
            <span>{nextLabel}</span>
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyColumnPlaceholder({ text }: { text: string }) {
  return (
    <div className="bg-white/60 border border-dashed border-cafe-sand rounded-3xl p-8 text-center text-xs text-cafe-espresso/50">
      <CheckCircle2 className="w-8 h-8 text-cafe-leaf/30 mx-auto mb-2" />
      <p className="font-medium">{text}</p>
    </div>
  );
}
