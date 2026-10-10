/**
 * app/api/kitchen/orders/route.ts
 *
 * Dedicated live kitchen operations API:
 * - GET: Retrieves active kitchen tickets (received, preparing, ready) directly from AWS RDS PostgreSQL.
 * - PATCH: Updates ticket status (received -> preparing -> ready -> completed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PROPERTY_ID = process.env.VAANI_PROPERTY_ID || '62e1b115-9382-40f8-853a-0a773735d034';

interface OrderRow {
  id: string;
  property_id: string;
  order_number: string;
  status: string;
  channel: string;
  customer_name: string;
  customer_phone: string;
  total_amount: string | number;
  prep_eta_minutes: number;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: string | number;
  quantity: number;
  notes?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId') || DEFAULT_PROPERTY_ID;

    // 1. Fetch active orders
    const ordersRes = await query<OrderRow>(
      `SELECT id, property_id, order_number, status, channel, customer_name, customer_phone,
              total_amount, prep_eta_minutes, created_at
       FROM orders
       WHERE status IN ('received', 'preparing', 'ready', 'confirmed')
         AND (
           $1::text IS NULL
           OR $1::text = ''
           OR $1::text = 'all'
           OR property_id::text = $1::text
           OR property_id::text = '62e1b115-9382-40f8-853a-0a773735d034'
         )
       ORDER BY created_at DESC
       LIMIT 50`,
      [propertyId],
    );

    const orders = ordersRes.rows;
    let formattedOrders: any[] = [];

    // 2. Fetch line items for these orders
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const itemsRes = await query<OrderItemRow>(
        `SELECT id, order_id, menu_item_id, name, price, quantity, notes
         FROM order_items
         WHERE order_id = ANY($1::uuid[])`,
        [orderIds],
      );

      const itemsByOrderId = new Map<string, Array<{ id: string; name: string; item_name: string; price: number; quantity: number; notes?: string }>>();
      for (const item of itemsRes.rows) {
        if (!itemsByOrderId.has(item.order_id)) {
          itemsByOrderId.set(item.order_id, []);
        }
        itemsByOrderId.get(item.order_id)!.push({
          id: item.id,
          name: item.name,
          item_name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          notes: item.notes,
        });
      }

      formattedOrders = orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || 'Phone Caller',
        customer_phone: o.customer_phone || '+91 98765 43210',
        channel: o.channel || 'voice',
        status: o.status,
        total_amount: Number(o.total_amount || 0),
        prep_eta_minutes: o.prep_eta_minutes || 10,
        created_at: o.created_at,
        order_items: itemsByOrderId.get(o.id) || [],
      }));
    }

    // 3. Fetch real notifications from AWS RDS
    const notifsRes = await query<{ id: string; recipient: string; body: string; status: string; created_at: string }>(
      `SELECT id, recipient, body, status, created_at
       FROM notifications
       ORDER BY created_at DESC
       LIMIT 6`,
    ).catch(() => ({ rows: [] }));

    // 4. Fetch real menu items from AWS RDS
    const stockRes = await query<{ id: string; name: string; availability: string; price: string | number }>(
      `SELECT id, name, availability, price
       FROM menu_items
       WHERE (property_id = $1 OR property_id = $2)
       ORDER BY availability = 'available' ASC, name ASC
       LIMIT 8`,
      [propertyId, DEFAULT_PROPERTY_ID],
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      orders: formattedOrders,
      count: formattedOrders.length,
      notifications: notifsRes.rows.map((n) => ({
        to: n.recipient,
        text: n.body,
        time: new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      })),
      stockItems: stockRes.rows.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.availability === 'available' || s.availability === 'in_stock' ? 'available' : 'unavailable',
        price: Number(s.price),
      })),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[/api/kitchen/orders] GET Error:', err);
    return NextResponse.json({ orders: [], error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
    }

    const validStatuses = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateRes = await query<{ id: string; order_number: string; status: string }>(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, order_number, status`,
      [status, orderId],
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: updateRes.rows[0],
    });
  } catch (err: any) {
    console.error('[/api/kitchen/orders] PATCH Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
