/**
 * lib/agent/replanner.ts
 * Stock-out event handler.
 * Called when kitchen staff marks an item as unavailable via the stock toggle.
 * - Scans open orders containing the item
 * - Returns replanning info so caller can notify customer / update UI
 */

import { query } from '@/lib/server-db';

export interface ReplanResult {
  affectedOrders: Array<{
    orderId: string;
    orderNumber: string;
    customerPhone: string | null;
    itemName: string;
  }>;
  substituteName: string | null;
  substituteId: string | null;
}

/**
 * Mark a menu item as out_of_stock and find all open orders that contain it.
 * Returns affected orders so Member 3 (SMS / KDS) can notify customers.
 */
export async function handleStockOut(
  propertyId: string,
  menuItemId: string,
): Promise<ReplanResult> {
  // 1. Mark item unavailable
  await query(
    `UPDATE menu_items SET availability = 'unavailable', updated_at = NOW()
     WHERE id = $1 AND property_id = $2`,
    [menuItemId, propertyId],
  );

  // 2. Fetch item info (name + encoded substitute)
  const itemRes = await query<{ name: string; description: string }>(
    `SELECT name, COALESCE(description, '') as description FROM menu_items WHERE id = $1`,
    [menuItemId],
  );
  const item = itemRes.rows[0];
  const subNameMatch = item?.description.match(/sub_name:([^|]+)/);
  const subIdMatch   = item?.description.match(/sub_id:([^|]+)/);
  const substituteName = subNameMatch?.[1] ?? null;
  const substituteId   = subIdMatch?.[1] ?? null;

  // 3. Find open orders (received/preparing) containing this item
  const affectedRes = await query<{
    order_id: string; order_number: string;
    customer_phone: string | null; item_name: string;
  }>(
    `SELECT o.id as order_id, o.order_number, o.customer_phone, oi.name as item_name
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.property_id = $1
       AND o.status IN ('received', 'preparing')
       AND oi.menu_item_id = $2`,
    [propertyId, menuItemId],
  );

  return {
    affectedOrders: affectedRes.rows.map((r) => ({
      orderId: r.order_id,
      orderNumber: r.order_number,
      customerPhone: r.customer_phone,
      itemName: r.item_name,
    })),
    substituteName,
    substituteId,
  };
}

/**
 * Restore an item to available (toggle back on).
 */
export async function handleStockRestore(
  propertyId: string,
  menuItemId: string,
): Promise<void> {
  await query(
    `UPDATE menu_items SET availability = 'available', updated_at = NOW()
     WHERE id = $1 AND property_id = $2`,
    [menuItemId, propertyId],
  );
}
