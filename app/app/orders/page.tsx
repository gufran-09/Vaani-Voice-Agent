'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Plus,
  Loader2,
  PackageOpen,
  ShoppingBag,
  Minus,
  Trash2,
} from 'lucide-react';
import type { OrderStatus, OrderChannel } from '@/lib/types';
import { ALL_FOOD_ITEMS } from '@/lib/menu-data';

type Order = Database['public']['Tables']['orders']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

const DEFAULT_MENU_ITEMS: MenuItem[] = ALL_FOOD_ITEMS.map((item) => ({
  id: item.id,
  property_id: 'prop-1',
  category_id: item.category_id,
  name: item.name,
  description: item.description,
  price: item.price,
  availability: item.availability,
  spoken_aliases: item.spoken_aliases,
  allergens: item.allergens,
  prep_time_minutes: item.prep_time_minutes,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface OrderLineInput {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'preparing', 'ready'];
const COMPLETED_STATUSES: OrderStatus[] = ['completed'];

const statusVariantMap: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  received: 'default',
  preparing: 'default',
  ready: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant={statusVariantMap[status] ?? 'secondary'}
      className="capitalize"
    >
      {status}
    </Badge>
  );
}

function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${code}`;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrdersPage() {
  const { currentProperty, refresh } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // New order dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [lineItems, setLineItems] = useState<OrderLineInput[]>([]);

  const fetchOrders = useCallback(async () => {
    const propId = currentProperty?.id || '62e1b115-9382-40f8-853a-0a773735d034';
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('Orders fetch error from RDS:', fetchError);
        setOrders([]);
      } else {
        setOrders((data ?? []) as Order[]);
      }
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, [currentProperty]);

  const fetchMenuItems = useCallback(async () => {
    if (!currentProperty) {
      setMenuItems(DEFAULT_MENU_ITEMS);
      return;
    }
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('property_id', currentProperty.id)
        .order('name', { ascending: true });
      if (data && data.length > 0) {
        setMenuItems(data as MenuItem[]);
      } else {
        setMenuItems(DEFAULT_MENU_ITEMS);
      }
    } catch {
      setMenuItems(DEFAULT_MENU_ITEMS);
    }
  }, [currentProperty]);

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, [fetchOrders, fetchMenuItems]);

  const filteredOrders = useMemo(() => {
    switch (statusFilter) {
      case 'active':
        return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
      case 'completed':
        return orders.filter((o) => COMPLETED_STATUSES.includes(o.status));
      case 'cancelled':
        return orders.filter((o) => o.status === 'cancelled');
      default:
        return orders;
    }
  }, [orders, statusFilter]);

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0),
    [lineItems],
  );

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedItemId('');
    setLineItems([]);
    setFormError(null);
  };

  const addLineItem = () => {
    if (!selectedItemId) return;
    const item = menuItems.find((m) => m.id === selectedItemId);
    if (!item) return;
    const existing = lineItems.find((li) => li.menu_item_id === item.id);
    if (existing) {
      setLineItems(
        lineItems.map((li) =>
          li.menu_item_id === item.id
            ? { ...li, quantity: li.quantity + 1 }
            : li,
        ),
      );
    } else {
      setLineItems([
        ...lineItems,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
    setSelectedItemId('');
  };

  const updateLineItemQuantity = (menuItemId: string, delta: number) => {
    setLineItems((prev) =>
      prev
        .map((li) =>
          li.menu_item_id === menuItemId
            ? { ...li, quantity: li.quantity + delta }
            : li,
        )
        .filter((li) => li.quantity > 0),
    );
  };

  const removeLineItem = (menuItemId: string) => {
    setLineItems((prev) =>
      prev.filter((li) => li.menu_item_id !== menuItemId),
    );
  };

  const handleCreateOrder = async () => {
    if (!currentProperty) return;
    setFormError(null);

    if (lineItems.length === 0) {
      setFormError('Add at least one item to create an order.');
      return;
    }

    setSubmitting(true);
    const orderNumber = generateOrderNumber();

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        property_id: currentProperty.id,
        order_number: orderNumber,
        status: 'received' as OrderStatus,
        channel: 'counter' as OrderChannel,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        total_amount: totalAmount,
      })
      .select()
      .maybeSingle();

    if (orderError || !orderData) {
      setFormError(orderError?.message ?? 'Failed to create order.');
      setSubmitting(false);
      return;
    }

    const orderRows = lineItems.map((li) => ({
      order_id: orderData.id,
      menu_item_id: li.menu_item_id,
      name: li.name,
      price: li.price,
      quantity: li.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderRows);

    if (itemsError) {
      setFormError(itemsError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setDialogOpen(false);
    resetForm();
    refresh();
    fetchOrders();
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a property to view and manage its orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and create orders for {currentProperty.name}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>New Order</DialogTitle>
              <DialogDescription>
                Create a counter order. Add items from the menu and fill in the
                customer details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer name</Label>
                  <Input
                    id="customer-name"
                    placeholder="e.g. Aarav Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input
                    id="customer-phone"
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Item picker */}
              <div className="space-y-2">
                <Label>Add items</Label>
                <div className="flex gap-2">
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a menu item" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No available menu items
                        </SelectItem>
                      ) : (
                        menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} — {formatCurrency(item.price, currentProperty.currency)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addLineItem}
                    disabled={!selectedItemId}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Line items */}
              {lineItems.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  {lineItems.map((li) => (
                    <div
                      key={li.menu_item_id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{li.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(li.price, currentProperty.currency)} ×{' '}
                          {li.quantity} ={' '}
                          {formatCurrency(li.price * li.quantity, currentProperty.currency)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => updateLineItemQuantity(li.menu_item_id, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {li.quantity}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => updateLineItemQuantity(li.menu_item_id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeLineItem(li.menu_item_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-muted/40">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(totalAmount, currentProperty.currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground rounded-lg border border-dashed">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No items added yet
                </div>
              )}

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading orders…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium mb-1">No orders found</h3>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'all'
                ? 'Create your first order to get started.'
                : `No ${statusFilter} orders for this property.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      {order.customer_name ?? (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.channel}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(order.total_amount, currentProperty.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
