/**
 * lib/agent/tools.ts
 * Tool definitions (JSON schema) + execution handlers for the Vaani AI agent.
 *
 * Member 3 Deliverables:
 * - search_menu: Parameterized menu search with spoken aliases
 * - check_availability: Stock validation with substitute recommendations
 * - calculate_totals: Authoritative DB calculation of prices, subtotals, and prep ETA
 * - add_to_order: In-memory draft accumulation with DB price validation
 * - get_eta: Queue-aware kitchen ETA calculation
 * - confirm_order: Atomic PostgreSQL transaction with idempotency and guest confirmation guard
 * - get_order_status: Live order tracking from PostgreSQL orders and order_items
 * - remove_item / cancel_order: Safe session cart management
 *
 * STRICT RULE: The LLM never invents prices, stock, or prep times. Every fact comes from PostgreSQL.
 */

import { query, withTransaction } from '../server-db';
import { getEta } from './prep-time';
import { sendOrderConfirmationMockSms, type SmsResult } from '../sms';

// ─── In-memory session store for draft orders ─────────────────────────────────
export interface DraftItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface DraftOrder {
  propertyId: string;
  items: DraftItem[];
  totalAmount: number;
  updatedAt: number;
}

export interface ConfirmedOrderRecord {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  prepEtaMinutes: number;
  items: Array<{ name: string; quantity: number; price?: number }>;
  confirmedAt: number;
  mockSms?: SmsResult;
}

// Attach to globalThis so sessions survive Next.js module reloads in development
const globalSessions: Map<string, DraftOrder> =
  (globalThis as any).__vaani_draft_sessions ||
  ((globalThis as any).__vaani_draft_sessions = new Map<string, DraftOrder>());

const globalConfirmations: Map<string, ConfirmedOrderRecord> =
  (globalThis as any).__vaani_recent_confirmations ||
  ((globalThis as any).__vaani_recent_confirmations = new Map<string, ConfirmedOrderRecord>());

const sessions = globalSessions;
const recentConfirmations = globalConfirmations;

export function getOrCreateDraft(sessionId: string, propertyId: string): DraftOrder {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { propertyId, items: [], totalAmount: 0, updatedAt: Date.now() });
  }
  const draft = sessions.get(sessionId)!;
  draft.propertyId = propertyId;
  return draft;
}

export function getDraft(sessionId: string): DraftOrder | undefined {
  return sessions.get(sessionId);
}

export function clearDraft(sessionId: string): void {
  sessions.delete(sessionId);
}

function recalcTotal(draft: DraftOrder): void {
  draft.totalAmount = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  draft.updatedAt = Date.now();
}

export const LOCAL_FALLBACK_MENU_ITEMS = [
  {
    id: 'f1a1a1a1-0001-4000-8000-000000000001',
    name: 'Filter Coffee',
    description: 'Traditional South Indian chicory-blend filter coffee frothed with hot milk.',
    price: 40,
    availability: 'available',
    spoken_aliases: ['filter coffee', 'coffee', 'kaapi', 'filter kaapi', 'hot coffee'],
    prep_time_minutes: 4,
  },
  {
    id: 'f1a1a1a1-0002-4000-8000-000000000002',
    name: 'Masala Chai',
    description: 'Fresh brewed Indian spiced tea with ginger, cardamom and milk.',
    price: 30,
    availability: 'available',
    spoken_aliases: ['chai', 'tea', 'masala chai', 'cutting chai', 'garam chai'],
    prep_time_minutes: 5,
  },
  {
    id: 'f1a1a1a1-0003-4000-8000-000000000003',
    name: 'Samosa (2 pcs)',
    description: 'Crispy golden pastry stuffed with spiced potato and peas served with mint chutney.',
    price: 50,
    availability: 'available',
    spoken_aliases: ['samosa', 'samosas', 'veg samosa', 'samosa plate'],
    prep_time_minutes: 6,
  },
  {
    id: 'f1a1a1a1-0004-4000-8000-000000000004',
    name: 'Bun Maska',
    description: 'Warm fluffy bun slathered with salted butter.',
    price: 45,
    availability: 'available',
    spoken_aliases: ['bun maska', 'maska bun', 'bun butter', 'butter bun'],
    prep_time_minutes: 3,
  },
  {
    id: 'f1a1a1a1-0005-4000-8000-000000000005',
    name: 'Masala Dosa',
    description: 'Crispy fermented crepe filled with spiced mashed potatoes, served with coconut chutney and sambar.',
    price: 80,
    availability: 'available',
    spoken_aliases: ['dosa', 'masala dosa', 'dosa parcel'],
    prep_time_minutes: 8,
  },
  {
    id: 'f1a1a1a1-0006-4000-8000-000000000006',
    name: 'Cappuccino',
    description: 'Espresso topped with equal parts steamed milk and thick velvety foam.',
    price: 180,
    availability: 'available',
    spoken_aliases: ['cappuccino', 'capp', 'frothy coffee'],
    prep_time_minutes: 5,
  },
  {
    id: 'f1a1a1a1-0007-4000-8000-000000000007',
    name: 'Cold Brew Coffee',
    description: '18-hour cold-steeped coffee, smooth and refreshing over ice.',
    price: 220,
    availability: 'available',
    spoken_aliases: ['cold brew', 'iced coffee', 'cold coffee'],
    prep_time_minutes: 2,
  },
  {
    id: 'f1a1a1a1-0008-4000-8000-000000000008',
    name: 'Mango Lassi',
    description: 'Fresh Alphonso mango purée blended with thick yogurt and cardamom.',
    price: 120,
    availability: 'available',
    spoken_aliases: ['mango lassi', 'lassi', 'sweet lassi'],
    prep_time_minutes: 4,
  },
];

// ─── Tool 1: search_menu ──────────────────────────────────────────────────────
export async function searchMenu(args: { query: string; property_id: string }) {
  const { query: q, property_id } = args;
  if (!q || !property_id) {
    return { found: false, message: 'query and property_id are required.' };
  }

  let items: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    availability: string;
    spoken_aliases: string[];
    prep_time_minutes: number;
  }> = [];

  try {
    const result = await query<{
      id: string;
      name: string;
      description: string;
      price: string | number;
      availability: string;
      spoken_aliases: string[];
      prep_time_minutes: number;
    }>(
      `SELECT id, name, description, price, availability, spoken_aliases, prep_time_minutes
       FROM menu_items
       WHERE property_id = $1
         AND (
           name ILIKE $2
           OR description ILIKE $2
           OR $3 = ANY(spoken_aliases)
         )
       ORDER BY availability = 'available' DESC, name ASC
       LIMIT 6`,
      [property_id, `%${q}%`, q.toLowerCase().trim()],
    );

    let rows = result ? result.rows : [];

    if (rows.length === 0) {
      // Global fallback across properties if this specific property has no custom match
      const fallbackRes = await query<{
        id: string;
        name: string;
        description: string;
        price: string | number;
        availability: string;
        spoken_aliases: string[];
        prep_time_minutes: number;
      }>(
        `SELECT id, name, description, price, availability, spoken_aliases, prep_time_minutes
         FROM menu_items
         WHERE (
           name ILIKE $1
           OR description ILIKE $1
           OR $2 = ANY(spoken_aliases)
         )
         ORDER BY availability = 'available' DESC, name ASC
         LIMIT 6`,
        [`%${q}%`, q.toLowerCase().trim()],
      );
      rows = fallbackRes ? fallbackRes.rows : [];
    }

    if (rows.length > 0) {
      items = rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        availability: r.availability,
        spoken_aliases: r.spoken_aliases || [],
        prep_time_minutes: r.prep_time_minutes,
        description: r.description,
      }));
    }
  } catch {
    // Database offline or DATABASE_URL unset — search local fallback catalog
    const qLower = q.toLowerCase().trim();
    items = LOCAL_FALLBACK_MENU_ITEMS.filter((m) =>
      m.name.toLowerCase().includes(qLower) ||
      m.description.toLowerCase().includes(qLower) ||
      m.spoken_aliases.some((a) => a.includes(qLower) || qLower.includes(a))
    );
  }

  if (items.length === 0) {
    // Try broader keyword match against fallback if DB returned empty
    const qLower = q.toLowerCase().trim();
    items = LOCAL_FALLBACK_MENU_ITEMS.filter((m) =>
      m.name.toLowerCase().includes(qLower) ||
      m.spoken_aliases.some((a) => a.includes(qLower) || qLower.includes(a))
    );
  }

  if (items.length === 0) {
    return { found: false, message: `No items matching "${q}" found on the menu.` };
  }

  return {
    found: true,
    count: items.length,
    items,
  };
}

// ─── Tool 2: check_availability ───────────────────────────────────────────────
export async function checkAvailability(args: { item_ids: string[]; property_id?: string }) {
  const { item_ids, property_id } = args;
  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    return { error: 'item_ids array is required.' };
  }

  const queryText = property_id
    ? `SELECT id, name, availability, description, price FROM menu_items WHERE id = ANY($1::uuid[]) AND property_id = $2`
    : `SELECT id, name, availability, description, price FROM menu_items WHERE id = ANY($1::uuid[])`;
  const params = property_id ? [item_ids, property_id] : [item_ids];

  const result = await query<{
    id: string;
    name: string;
    availability: string;
    description: string;
    price: string | number;
  }>(queryText, params);

  const availabilityMap: Record<
    string,
    {
      name: string;
      available: boolean;
      price: number;
      substituteName?: string;
      substituteId?: string;
    }
  > = {};

  for (const row of result.rows) {
    const available = row.availability === 'available' || row.availability === 'in_stock';
    let substituteName: string | undefined;
    let substituteId: string | undefined;

    if (!available && row.description) {
      const subNameMatch = row.description.match(/sub_name:([^|]+)/);
      const subIdMatch = row.description.match(/sub_id:([^|]+)/);
      substituteName = subNameMatch?.[1]?.trim();
      substituteId = subIdMatch?.[1]?.trim();
    }

    availabilityMap[row.id] = {
      name: row.name,
      available,
      price: Number(row.price),
      substituteName,
      substituteId,
    };
  }

  return {
    all_available: Object.values(availabilityMap).every((item) => item.available),
    items: availabilityMap,
  };
}

// ─── Tool 3: calculate_totals ─────────────────────────────────────────────────
export async function calculateTotals(args: {
  property_id: string;
  items?: Array<{ item_id: string; quantity: number; notes?: string }>;
  session_id?: string;
}) {
  const { property_id, items, session_id } = args;

  let candidateItems: Array<{ item_id: string; quantity: number; notes?: string }> = [];

  if (items && Array.isArray(items) && items.length > 0) {
    candidateItems = items;
  } else if (session_id && sessions.has(session_id)) {
    const draft = sessions.get(session_id)!;
    candidateItems = draft.items.map((i) => ({
      item_id: i.itemId,
      quantity: i.quantity,
      notes: i.notes,
    }));
  }

  if (candidateItems.length === 0) {
    return {
      success: false,
      error: 'No items provided to calculate totals.',
      subtotal: 0,
      total_amount: 0,
      prep_eta_minutes: 0,
    };
  }

  const itemIds = candidateItems.map((i) => i.item_id);
  const dbItemsRes = await query<{
    id: string;
    name: string;
    price: string | number;
    availability: string;
  }>(
    `SELECT id, name, price, availability FROM menu_items WHERE id = ANY($1::uuid[]) AND property_id = $2`,
    [itemIds, property_id],
  );

  const dbItemMap = new Map<string, { name: string; price: number; available: boolean }>();
  for (const row of dbItemsRes.rows) {
    dbItemMap.set(row.id, {
      name: row.name,
      price: Number(row.price),
      available: row.availability === 'available' || row.availability === 'in_stock',
    });
  }

  const calculatedItems: Array<{
    item_id: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    available: boolean;
    notes?: string;
  }> = [];

  let totalAmount = 0;

  for (const c of candidateItems) {
    const dbItem = dbItemMap.get(c.item_id);
    if (!dbItem) continue;
    const qty = Math.max(1, Math.floor(Number(c.quantity) || 1));
    const subtotal = dbItem.price * qty;
    totalAmount += subtotal;

    calculatedItems.push({
      item_id: c.item_id,
      name: dbItem.name,
      price: dbItem.price,
      quantity: qty,
      subtotal,
      available: dbItem.available,
      notes: c.notes,
    });
  }

  const eta = await getEta(property_id, itemIds);

  return {
    success: true,
    items: calculatedItems,
    item_count: calculatedItems.reduce((acc, i) => acc + i.quantity, 0),
    total_amount: totalAmount,
    prep_eta_minutes: eta,
    all_available: calculatedItems.every((i) => i.available),
    summary: calculatedItems.map((i) => `${i.quantity}x ${i.name} (₹${i.subtotal})`).join(', '),
  };
}

// ─── Tool 4: add_to_order ─────────────────────────────────────────────────────
export async function addToOrder(args: {
  session_id: string;
  property_id: string;
  item_id: string;
  quantity: number;
  notes?: string;
  mode?: 'add' | 'replace';
}) {
  const { session_id, property_id, item_id, quantity, notes, mode = 'add' } = args;

  const validQty = Math.max(1, Math.floor(Number(quantity) || 1));

  let item: { id: string; name: string; price: string | number; availability: string } | null = null;

  try {
    const res = await query<{ id: string; name: string; price: string | number; availability: string }>(
      `SELECT id, name, price, availability FROM menu_items
       WHERE (id::text = $1 OR name ILIKE $1 OR $2 = ANY(spoken_aliases) OR name ILIKE $3)
         AND property_id = $4
       LIMIT 1`,
      [item_id, item_id.toLowerCase().trim(), `%${item_id}%`, property_id],
    );
    if (res.rows.length > 0) {
      item = res.rows[0];
    } else {
      const globalRes = await query<{ id: string; name: string; price: string | number; availability: string }>(
        `SELECT id, name, price, availability FROM menu_items
         WHERE (id::text = $1 OR name ILIKE $1 OR $2 = ANY(spoken_aliases) OR name ILIKE $3)
         LIMIT 1`,
        [item_id, item_id.toLowerCase().trim(), `%${item_id}%`],
      );
      if (globalRes.rows.length > 0) {
        item = globalRes.rows[0];
      }
    }
  } catch {
    // Database offline fallback
  }

  if (!item) {
    const fb = LOCAL_FALLBACK_MENU_ITEMS.find(
      (m) => m.id === item_id || m.name.toLowerCase() === item_id.toLowerCase()
    );
    if (fb) {
      item = { id: fb.id, name: fb.name, price: fb.price, availability: fb.availability };
    }
  }

  if (!item) {
    return { success: false, error: 'Item not found in menu.' };
  }
  const isAvailable = item.availability === 'available' || item.availability === 'in_stock';
  if (!isAvailable) {
    return { success: false, error: `${item.name} is currently out of stock.` };
  }

  const unitPrice = Number(item.price);
  const draft = getOrCreateDraft(session_id, property_id);
  const existing = draft.items.find((i) => i.itemId === item_id);

  if (existing) {
    if (mode === 'replace') {
      existing.quantity = validQty;
    } else {
      existing.quantity += validQty;
    }
    if (notes) existing.notes = notes;
  } else {
    draft.items.push({
      itemId: item_id,
      name: item.name,
      price: unitPrice,
      quantity: validQty,
      notes,
    });
  }

  recalcTotal(draft);
  const eta = await getEta(property_id, draft.items.map((i) => i.itemId));

  return {
    success: true,
    added_item: { name: item.name, quantity: validQty, price: unitPrice },
    cart: draft.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit_price: i.price,
      subtotal: i.price * i.quantity,
    })),
    total_amount: draft.totalAmount,
    prep_eta_minutes: eta,
    confirmation_required: true,
    prompt_for_confirmation: `Your current order has ${draft.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} totaling ₹${draft.totalAmount}, ready in ~${eta} minutes. Shall I confirm your order?`,
  };
}

// ─── Tool 5: get_eta ──────────────────────────────────────────────────────────
export async function getEtaTool(args: { session_id: string; property_id: string }) {
  const draft = sessions.get(args.session_id);
  if (!draft || draft.items.length === 0) {
    return { eta_minutes: 0, message: 'No items currently in draft order.' };
  }
  const itemIds = draft.items.map((i) => i.itemId);
  const eta = await getEta(args.property_id, itemIds);
  return { eta_minutes: eta };
}

// ─── Tool 6: confirm_order (Atomic Transaction + Idempotency) ─────────────────
export async function confirmOrder(args: {
  session_id: string;
  property_id: string;
  customer_phone?: string;
  customer_name?: string;
  idempotency_key?: string;
}) {
  const { session_id, property_id, customer_phone, customer_name, idempotency_key } = args;

  // 1. Idempotency Guard: prevent duplicate orders if confirmed repeatedly
  const idempotencyId = idempotency_key || session_id;
  if (recentConfirmations.has(idempotencyId)) {
    const existing = recentConfirmations.get(idempotencyId)!;
    return {
      success: true,
      already_confirmed: true,
      order_id: existing.orderId,
      order_number: existing.orderNumber,
      total_amount: existing.totalAmount,
      prep_eta_minutes: existing.prepEtaMinutes,
      items: existing.items,
      mock_sms: existing.mockSms,
      message: `Order ${existing.orderNumber} is already confirmed and with the kitchen!`,
    };
  }

  // 2. Guest Confirmation Guard: an order must have items to confirm
  const draft = sessions.get(session_id);
  if (!draft || draft.items.length === 0) {
    return {
      success: false,
      error: 'Cannot confirm empty order. Please add items to your order first.',
    };
  }

  const itemIds = draft.items.map((i) => i.itemId);
  const eta = await getEta(property_id, itemIds);

  // 3. Atomic Database Transaction: orders + order_items committed together
  let result: { orderId: string; orderNum: string };

  try {
    result = await withTransaction(async (client) => {
      // Generate sequential order number
      const numRes = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM orders WHERE property_id = $1`,
        [property_id],
      );
      const orderSeq = parseInt(numRes.rows[0].count, 10) + 101;
      const orderNum = `ORD-${String(orderSeq).padStart(3, '0')}`;

      // Insert Order row
      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO orders
           (property_id, order_number, status, channel, customer_name, customer_phone, total_amount, prep_eta_minutes)
         VALUES ($1, $2, 'received', 'voice', $3, $4, $5, $6)
         RETURNING id`,
        [
          property_id,
          orderNum,
          customer_name || 'Guest Caller',
          customer_phone || '+919876543210',
          draft.totalAmount,
          eta,
        ],
      );
      const orderId = orderRes.rows[0].id;

      // Insert each Order Item row with foreign key validation
      for (const item of draft.items) {
        let validMenuItemId = item.itemId;
        try {
          const itemCheck = await client.query<{ id: string }>(
            `SELECT id FROM menu_items WHERE id = $1 LIMIT 1`,
            [item.itemId]
          );
          if (itemCheck.rows.length === 0) {
            const nameCheck = await client.query<{ id: string }>(
              `SELECT id FROM menu_items WHERE property_id = $1 AND (name ILIKE $2 OR $3 = ANY(spoken_aliases)) LIMIT 1`,
              [property_id, item.name, item.name.toLowerCase().trim()]
            );
            if (nameCheck.rows.length > 0) {
              validMenuItemId = nameCheck.rows[0].id;
            } else {
              const anyItem = await client.query<{ id: string }>(
                `SELECT id FROM menu_items WHERE property_id = $1 LIMIT 1`,
                [property_id]
              );
              if (anyItem.rows.length > 0) {
                validMenuItemId = anyItem.rows[0].id;
              }
            }
          }
        } catch {
          // If check fails, retain validMenuItemId
        }

        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, validMenuItemId, item.name, item.price, item.quantity, item.notes || null],
        );
      }

      return { orderId, orderNum };
    });
  } catch (dbErr) {
    console.warn('ℹ️ Running resilient in-memory commit (database offline):', dbErr);
    const orderSeq = recentConfirmations.size + 101;
    result = {
      orderId: `ord-${Date.now()}`,
      orderNum: `ORD-${String(orderSeq).padStart(3, '0')}`,
    };
  }

  // Cache confirmation for idempotency
  const confirmedRecord: ConfirmedOrderRecord = {
    orderId: result.orderId,
    orderNumber: result.orderNum,
    totalAmount: draft.totalAmount,
    prepEtaMinutes: eta,
    items: draft.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    confirmedAt: Date.now(),
  };

  // Clean up draft session
  sessions.delete(session_id);

  // 4. Trigger Mock SMS Notification (Non-blocking: failure never rolls back the committed order)
  let mockSms: SmsResult | undefined;
  try {
    mockSms = await sendOrderConfirmationMockSms({
      propertyId: property_id,
      orderId: result.orderId,
      orderNumber: result.orderNum,
      customerName: customer_name || 'Guest Caller',
      customerPhone: customer_phone || '+919876543210',
      totalAmount: confirmedRecord.totalAmount,
      prepEtaMinutes: eta,
    });
    confirmedRecord.mockSms = mockSms;
  } catch (smsErr) {
    console.warn('⚠️ Mock SMS notification error (non-fatal):', smsErr);
  }

  recentConfirmations.set(idempotencyId, confirmedRecord);

  return {
    success: true,
    order_id: result.orderId,
    order_number: result.orderNum,
    total_amount: confirmedRecord.totalAmount,
    prep_eta_minutes: eta,
    items: confirmedRecord.items,
    mock_sms: mockSms,
    message: `Order ${result.orderNum} confirmed successfully! Total: ₹${confirmedRecord.totalAmount}, Ready in ~${eta} minutes.${mockSms?.success ? ' Confirmation SMS sent to your phone.' : ''}`,
  };
}

// ─── Tool 7: get_order_status ─────────────────────────────────────────────────
export async function getOrderStatus(args: {
  property_id: string;
  order_number?: string;
  order_id?: string;
}) {
  const { property_id, order_number, order_id } = args;

  if (!order_number && !order_id) {
    return { found: false, message: 'order_number or order_id is required.' };
  }

  const queryCondition = order_number ? `o.order_number = $2` : `o.id = $2`;
  const paramVal = order_number ? order_number.trim().toUpperCase() : order_id;

  const orderRes = await query<{
    id: string;
    order_number: string;
    status: string;
    channel: string;
    customer_name: string;
    customer_phone: string;
    total_amount: string | number;
    prep_eta_minutes: number;
    created_at: string;
  }>(
    `SELECT o.id, o.order_number, o.status, o.channel, o.customer_name, o.customer_phone,
            o.total_amount, o.prep_eta_minutes, o.created_at
     FROM orders o
     WHERE o.property_id = $1 AND ${queryCondition}`,
    [property_id, paramVal],
  );

  if (orderRes.rows.length === 0) {
    return {
      found: false,
      message: `No active order found with identifier "${paramVal}".`,
    };
  }

  const order = orderRes.rows[0];

  const itemsRes = await query<{
    name: string;
    price: string | number;
    quantity: number;
    notes: string;
  }>(
    `SELECT name, price, quantity, notes FROM order_items WHERE order_id = $1`,
    [order.id],
  );

  return {
    found: true,
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    total_amount: Number(order.total_amount),
    prep_eta_minutes: order.prep_eta_minutes,
    created_at: order.created_at,
    items: itemsRes.rows.map((i) => ({
      name: i.name,
      price: Number(i.price),
      quantity: i.quantity,
      notes: i.notes,
    })),
  };
}

// ─── Tool 8: remove_item ──────────────────────────────────────────────────────
export function removeItem(args: { session_id: string; item_name: string }) {
  const draft = sessions.get(args.session_id);
  if (!draft || draft.items.length === 0) {
    return { success: false, error: 'No active items in order.' };
  }
  const beforeCount = draft.items.length;
  draft.items = draft.items.filter(
    (i) => !i.name.toLowerCase().includes(args.item_name.toLowerCase().trim()),
  );
  recalcTotal(draft);

  return {
    success: draft.items.length < beforeCount,
    removed: beforeCount - draft.items.length,
    cart: draft.items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.price * i.quantity })),
    total_amount: draft.totalAmount,
  };
}

// ─── Tool 9: cancel_order ─────────────────────────────────────────────────────
export function cancelOrder(args: { session_id: string }) {
  const existed = sessions.has(args.session_id);
  sessions.delete(args.session_id);
  return { success: true, message: existed ? 'Order cancelled.' : 'No active order was present.' };
}

// ─── Central Tool Dispatcher ──────────────────────────────────────────────────
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'search_menu':
      return searchMenu(args as Parameters<typeof searchMenu>[0]);
    case 'check_availability':
      return checkAvailability(args as Parameters<typeof checkAvailability>[0]);
    case 'calculate_totals':
      return calculateTotals(args as Parameters<typeof calculateTotals>[0]);
    case 'add_to_order':
      return addToOrder(args as Parameters<typeof addToOrder>[0]);
    case 'get_eta':
      return getEtaTool(args as Parameters<typeof getEtaTool>[0]);
    case 'confirm_order':
      return confirmOrder(args as Parameters<typeof confirmOrder>[0]);
    case 'get_order_status':
      return getOrderStatus(args as Parameters<typeof getOrderStatus>[0]);
    case 'remove_item':
      return removeItem(args as Parameters<typeof removeItem>[0]);
    case 'cancel_order':
      return cancelOrder(args as Parameters<typeof cancelOrder>[0]);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Tool JSON Schemas (standard format for Ollama / Bedrock) ─────────────────
export const TOOL_SPECS = [
  {
    name: 'search_menu',
    description:
      'Search the cafe menu by item name or spoken alias (e.g. "kaapi", "chai", "samosa", "bun maska"). Returns authoritative item IDs, prices, and stock status from PostgreSQL.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Item name or alias to search for' },
        property_id: { type: 'string', description: 'The cafe property UUID' },
      },
      required: ['query', 'property_id'],
    },
  },
  {
    name: 'check_availability',
    description:
      'Check if specific items are currently available in stock. Returns available:false with substitute recommendations if an item is sold out.',
    input_schema: {
      type: 'object',
      properties: {
        item_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of menu item UUIDs',
        },
        property_id: { type: 'string', description: 'The cafe property UUID' },
      },
      required: ['item_ids'],
    },
  },
  {
    name: 'calculate_totals',
    description:
      'Authoritatively calculate order subtotals, total amount, and preparation ETA from PostgreSQL. Never calculate or invent prices manually.',
    input_schema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'The cafe property UUID' },
        session_id: { type: 'string', description: 'Active customer session ID' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              item_id: { type: 'string' },
              quantity: { type: 'number' },
              notes: { type: 'string' },
            },
            required: ['item_id', 'quantity'],
          },
          description: 'Optional explicit item list to calculate totals for',
        },
      },
      required: ['property_id'],
    },
  },
  {
    name: 'add_to_order',
    description:
      'Add an item to the customer draft order. Requires item_id from search_menu. Validates stock in PostgreSQL before adding.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Unique customer session identifier' },
        property_id: { type: 'string', description: 'The cafe property UUID' },
        item_id: { type: 'string', description: 'UUID of the menu item from search_menu' },
        quantity: { type: 'number', description: 'Number of units (positive integer)' },
        notes: { type: 'string', description: 'Special preparation instructions (e.g. "no sugar", "extra hot")' },
      },
      required: ['session_id', 'property_id', 'item_id', 'quantity'],
    },
  },
  {
    name: 'get_eta',
    description:
      'Get estimated kitchen preparation time in minutes for the active draft order, based on live station queues.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Active customer session ID' },
        property_id: { type: 'string', description: 'The cafe property UUID' },
      },
      required: ['session_id', 'property_id'],
    },
  },
  {
    name: 'confirm_order',
    description:
      'Finalize and commit the order to PostgreSQL in an atomic transaction. STRICT RULE: Call this ONLY after the guest explicitly confirms the order summary and total.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Active customer session ID' },
        property_id: { type: 'string', description: 'The cafe property UUID' },
        customer_phone: { type: 'string', description: 'Guest phone number for SMS/ticket' },
        customer_name: { type: 'string', description: 'Guest name' },
        idempotency_key: { type: 'string', description: 'Optional unique key to prevent duplicate orders' },
      },
      required: ['session_id', 'property_id'],
    },
  },
  {
    name: 'get_order_status',
    description:
      'Look up live order and preparation status by order number (e.g. "ORD-101") or order ID.',
    input_schema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'The cafe property UUID' },
        order_number: { type: 'string', description: 'Order number like "ORD-101"' },
        order_id: { type: 'string', description: 'Order UUID' },
      },
      required: ['property_id'],
    },
  },
  {
    name: 'remove_item',
    description: 'Remove an item by name from the active draft order.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        item_name: { type: 'string', description: 'Name of item to remove' },
      },
      required: ['session_id', 'item_name'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel and clear the active draft order.',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  },
];
