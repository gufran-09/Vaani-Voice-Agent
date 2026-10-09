'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Activity, RefreshCw, Clock, AlertCircle, Flame,
  CheckCircle2, ConciergeBell, Package, Building2
} from 'lucide-react';

const STATUS_FLOW: Record<string, string> = {
  received: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-warning/10 text-warning border-warning/30',
  preparing: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  ready: 'bg-success/10 text-success border-success/30',
  completed: 'bg-secondary text-muted-foreground border-border',
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

export default function LiveOperationsPage() {
  const { currentProperty } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentProperty) return;

    const [ordersRes, requestsRes, stockRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('property_id', currentProperty.id)
        .in('status', ['received', 'preparing', 'ready'])
        .order('created_at', { ascending: true }),
      supabase
        .from('guest_requests')
        .select('*, departments(name)')
        .eq('property_id', currentProperty.id)
        .in('status', ['open', 'assigned', 'in_progress'])
        .order('created_at', { ascending: true }),
      supabase
        .from('menu_items')
        .select('name, availability, price')
        .eq('property_id', currentProperty.id)
        .neq('availability', 'available'),
    ]);

    setOrders(ordersRes.data ?? []);
    setRequests(requestsRes.data ?? []);
    setStockAlerts(stockRes.data ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  }, [currentProperty]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const advanceOrderStatus = async (orderId: string, currentStatus: string) => {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;
    await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', orderId);
    fetchData();
  };

  const advanceRequestStatus = async (requestId: string, currentStatus: string) => {
    const next = REQUEST_FLOW[currentStatus];
    if (!next) return;
    await supabase.from('guest_requests').update({ status: next, updated_at: new Date().toISOString() }).eq('id', requestId);
    fetchData();
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Building2 className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">Select a property to view live operations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground animate-pulse-soft">Loading live operations...</div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-6 h-6 text-accent" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse-soft" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Live Operations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Updating...'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Kitchen Display */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-warning" />
            <h2 className="font-display font-semibold text-lg">Kitchen Display</h2>
            <Badge variant="secondary" className="ml-1">{orders.length} active</Badge>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-success/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active orders. Kitchen is all caught up.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className={`border-l-4 ${
                  order.status === 'received' ? 'border-l-warning' :
                  order.status === 'preparing' ? 'border-l-chart-2' :
                  'border-l-success'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-lg">#{order.order_number?.slice(-4) ?? '----'}</span>
                          <Badge className={`text-xs ${STATUS_COLORS[order.status]}`} variant="outline">
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.customer_name ?? 'Walk-in'} • {order.channel}
                        </div>
                      </div>
                      {order.prep_eta_minutes && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {order.prep_eta_minutes}m ETA
                        </div>
                      )}
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {order.order_items.map((item: any) => (
                          <div key={item.id} className="text-sm flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator className="my-2" />

                    {order.status !== 'completed' && STATUS_FLOW[order.status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => advanceOrderStatus(order.id, order.status)}
                      >
                        Mark as {STATUS_FLOW[order.status]}
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Guest Requests */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ConciergeBell className="w-5 h-5 text-success" />
            <h2 className="font-display font-semibold text-lg">Guest Requests</h2>
            <Badge variant="secondary" className="ml-1">{requests.length} open</Badge>
          </div>

          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-success/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No open guest requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{req.request_type}</span>
                          <Badge variant={PRIORITY_COLORS[req.priority] as any} className="text-xs capitalize">
                            {req.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                      </div>
                      {req.room_number && (
                        <Badge variant="outline" className="text-xs">Room {req.room_number}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {req.departments?.name ?? 'Unassigned dept'}
                      </span>
                      <Badge variant="secondary" className="text-xs capitalize">{req.status}</Badge>
                    </div>

                    {REQUEST_FLOW[req.status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => advanceRequestStatus(req.id, req.status)}
                      >
                        Move to {REQUEST_FLOW[req.status]}
                        <ArrowRightSmall />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-destructive" />
            <h2 className="font-display font-semibold text-lg">Stock Alerts</h2>
            <Badge variant="destructive" className="ml-1">{stockAlerts.length} items</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stockAlerts.map((item) => (
              <Card key={item.name} className="border-destructive/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">₹{item.price}</div>
                  </div>
                  <Badge variant={item.availability === 'unavailable' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                    {item.availability}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRightSmall() {
  return (
    <svg className="w-3.5 h-3.5 ml-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
