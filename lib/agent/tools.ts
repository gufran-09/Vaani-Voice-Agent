/**
 * lib/agent/tools.ts
 * Tool definitions (JSON schema) + execution handlers for the Vaani AI agent.
 * Tools: search_menu | add_to_order | get_eta | confirm_order | check_availability
 *
 * RULE: The LLM never invents prices, stock, or prep times. Every fact comes from a tool call.
 */

import { query } from '@/lib/server-db';
import { getEta } from './prep-time';

// ─── In-memory session store (survives the process lifetime; fine for demo) ───
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
}

const sessions = new Map<string, DraftOrder>();

function getOrCreateDraft(sessionId: string, propertyId: string): DraftOrder {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { propertyId, items: [], totalAmount: 0 });
  }
  return sessions.get(sessionId)!;
}

function recalcTotal(draft: DraftOrder): void {
  draft.totalAmount = draft.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ─── Tool: search_menu ────────────────────────────────────────────────────────
async function searchMenu(args: { query: string; property_id: string }) {
  const { query: q, property_id } = args;
  const result = await query<{
    id: string; name: string; description: string; price: number;
    availability: string; spoken_aliases: string[]; prep_time_minutes: number;
  }>(
    `SELECT id, name, description, price, availability, spoken_aliases, prep_time_minutes
     FROM menu_items
     WHERE property_id = $1
       AND (
         name ILIKE $2
         OR description ILIKE $2
         OR $3 = ANY(spoken_aliases)
       )
     ORDER BY availability = 'available' DESC, name
     LIMIT 5`,
    [property_id, `%${q}%`, q.toLowerCase()],
  );

  if (result.rows.length === 0) {
    return { found: false, message: `No items matching "${q}" on the menu.` };
  }

  return {
    found: true,
    items: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      availability: r.availability,
      spoken_aliases: r.spoken_aliases,
      prep_time_minutes: r.prep_time_minutes,
    })),
  };
}

// ─── Tool: check_availability ─────────────────────────────────────────────────
async function checkAvailability(args: { item_ids: string[] }) {
  const result = await query<{
    id: string; name: string; availability: string; description: string;
  }>(
    `SELECT id, name, availability, description FROM menu_items WHERE id = ANY($1::uuid[])`,
    [args.item_ids],
  );

  const map: Record<string, { available: boolean; substituteName?: string; substituteId?: string }> = {};
  for (const row of result.rows) {
    const available = row.availability === 'available';
    // Substitute encoded in description as "station:X|sub_name:Y|sub_id:Z"
    let substituteName: string | undefined;
    let substituteId: string | undefined;
    if (!available && row.description) {
      const subNameMatch = row.description.match(/sub_name:([^|]+)/);
      const subIdMatch   = row.description.match(/sub_id:([^|]+)/);
      substituteName = subNameMatch?.[1];
      substituteId   = subIdMatch?.[1];
    }
    map[row.id] = { available, substituteName, substituteId };
  }
  return map;
}

// ─── Tool: add_to_order ───────────────────────────────────────────────────────
async function addToOrder(args: {
  session_id: string; property_id: string;
  item_id: string; quantity: number; notes?: string;
}) {
  const { session_id, property_id, item_id, quantity, notes } = args;

  // Fetch live price + name from DB (never trust LLM for this)
  const res = await query<{ id: string; name: string; price: number; availability: string }>(
    `SELECT id, name, price, availability FROM menu_items WHERE id = $1 AND property_id = $2`,
    [item_id, property_id],
  );
  if (res.rows.length === 0) return { success: false, error: 'Item not found.' };
  const item = res.rows[0];
  if (item.availability !== 'available') {
    return { success: false, error: `${item.name} is currently unavailable.` };
  }

  const draft = getOrCreateDraft(session_id, property_id);
  const existing = draft.items.find((i) => i.itemId === item_id);
  if (existing) {
    existing.quantity += quantity;
    if (notes) existing.notes = notes;
  } else {
    draft.items.push({ itemId: item_id, name: item.name, price: item.price, quantity, notes });
  }
  recalcTotal(draft);

  return {
    success: true,
    cart: draft.items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.price * i.quantity })),
    total_amount: draft.totalAmount,
  };
}

// ─── Tool: get_eta ────────────────────────────────────────────────────────────
async function getEtaTool(args: { session_id: string; property_id: string }) {
  const draft = sessions.get(args.session_id);
  if (!draft || draft.items.length === 0) return { eta_minutes: 0 };
  const itemIds = draft.items.map((i) => i.itemId);
  const eta = await getEta(args.property_id, itemIds);
  return { eta_minutes: eta };
}

// ─── Tool: confirm_order ──────────────────────────────────────────────────────
async function confirmOrder(args: {
  session_id: string; property_id: string;
  customer_phone?: string; customer_name?: string;
}) {
  const { session_id, property_id, customer_phone, customer_name } = args;
  const draft = sessions.get(session_id);
  if (!draft || draft.items.length === 0) {
    return { success: false, error: 'No items in order.' };
  }

  const itemIds = draft.items.map((i) => i.itemId);
  const eta = await getEta(property_id, itemIds);

  // Use shared pool — import Pool for transactional write
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const conn = await pool.connect();

  try {
    await conn.query('BEGIN');

    // Generate sequential order number
    const numRes = await conn.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM orders WHERE property_id = $1`,
      [property_id],
    );
    const orderNum = `ORD-${String(parseInt(numRes.rows[0].count) + 101).padStart(3, '0')}`;

    // Insert order
    const orderRes = await conn.query<{ id: string }>(
      `INSERT INTO orders
         (property_id, order_number, status, channel, customer_name, customer_phone, total_amount, prep_eta_minutes)
       VALUES ($1, $2, 'received', 'voice', $3, $4, $5, $6)
       RETURNING id`,
      [property_id, orderNum, customer_name ?? null, customer_phone ?? null, draft.totalAmount, eta],
    );
    const orderId = orderRes.rows[0].id;

    // Insert each order item
    for (const item of draft.items) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.itemId, item.name, item.price, item.quantity, item.notes ?? null],
      );
    }

    await conn.query('COMMIT');
    sessions.delete(session_id);

    return {
      success: true,
      order_id: orderId,
      order_number: orderNum,
      total_amount: draft.totalAmount,
      prep_eta_minutes: eta,
      items: draft.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

// ─── Tool: remove_item ────────────────────────────────────────────────────────
function removeItem(args: { session_id: string; item_name: string }) {
  const draft = sessions.get(args.session_id);
  if (!draft) return { success: false, error: 'No active order.' };
  const before = draft.items.length;
  draft.items = draft.items.filter(
    (i) => !i.name.toLowerCase().includes(args.item_name.toLowerCase()),
  );
  recalcTotal(draft);
  return {
    success: draft.items.length < before,
    cart: draft.items,
    total_amount: draft.totalAmount,
  };
}

// ─── Tool: cancel_order ───────────────────────────────────────────────────────
function cancelOrder(args: { session_id: string }) {
  sessions.delete(args.session_id);
  return { success: true, message: 'Order cancelled.' };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'search_menu':       return searchMenu(args as Parameters<typeof searchMenu>[0]);
    case 'check_availability':return checkAvailability(args as Parameters<typeof checkAvailability>[0]);
    case 'add_to_order':      return addToOrder(args as Parameters<typeof addToOrder>[0]);
    case 'get_eta':           return getEtaTool(args as Parameters<typeof getEtaTool>[0]);
    case 'confirm_order':     return confirmOrder(args as Parameters<typeof confirmOrder>[0]);
    case 'remove_item':       return removeItem(args as Parameters<typeof removeItem>[0]);
    case 'cancel_order':      return cancelOrder(args as Parameters<typeof cancelOrder>[0]);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ─── JSON Schemas (sent to Claude) ───────────────────────────────────────────
export const TOOL_SPECS = [
  {
    name: 'search_menu',
    description: 'Search the cafe menu by item name or spoken alias (e.g. "kaapi", "samosa", "dosa"). Always call this before add_to_order to get the correct item ID and price.',
    input_schema: {
      type: 'object',
      properties: {
        query:       { type: 'string', description: 'Item name or spoken alias' },
        property_id: { type: 'string', description: 'The cafe property ID' },
      },
      required: ['query', 'property_id'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check if specific items are in stock. Returns available:false with a substitute suggestion if the item is sold out.',
    input_schema: {
      type: 'object',
      properties: {
        item_ids: { type: 'array', items: { type: 'string' }, description: 'Array of menu item UUIDs' },
      },
      required: ['item_ids'],
    },
  },
  {
    name: 'add_to_order',
    description: 'Add an item to the customer\'s current order. Requires the item_id from search_menu.',
    input_schema: {
      type: 'object',
      properties: {
        session_id:  { type: 'string' },
        property_id: { type: 'string' },
        item_id:     { type: 'string', description: 'UUID from search_menu result' },
        quantity:    { type: 'number', description: 'Number of units' },
        notes:       { type: 'string', description: 'Special instructions (e.g. "extra spicy", "no sugar")' },
      },
      required: ['session_id', 'property_id', 'item_id', 'quantity'],
    },
  },
  {
    name: 'get_eta',
    description: 'Get the estimated preparation time in minutes for the current draft order, based on live kitchen queue.',
    input_schema: {
      type: 'object',
      properties: {
        session_id:  { type: 'string' },
        property_id: { type: 'string' },
      },
      required: ['session_id', 'property_id'],
    },
  },
  {
    name: 'confirm_order',
    description: 'Finalize and submit the order to the kitchen. Call this ONLY when the customer explicitly confirms. Writes to the database.',
    input_schema: {
      type: 'object',
      properties: {
        session_id:     { type: 'string' },
        property_id:    { type: 'string' },
        customer_phone: { type: 'string', description: 'Customer phone number for SMS notification' },
        customer_name:  { type: 'string' },
      },
      required: ['session_id', 'property_id'],
    },
  },
  {
    name: 'remove_item',
    description: 'Remove an item from the current draft order (when customer says "cancel that" or "remove the coffee").',
    input_schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        item_name:  { type: 'string', description: 'Name of item to remove' },
      },
      required: ['session_id', 'item_name'],
    },
  },
  {
    name: 'cancel_order',
    description: 'Cancel the entire current order session.',
    input_schema: {
      type: 'object',
      properties: { session_id: { type: 'string' } },
      required: ['session_id'],
    },
  },
];
