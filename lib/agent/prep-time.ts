/**
 * lib/agent/prep-time.ts
 * Queue-aware ETA calculation across kitchen stations.
 *
 * Formula: ETA = max(base_prep_time) + (active_orders_at_busiest_shared_station × 3 min) + 2 min buffer
 * Station is encoded in the description field as "station:drinks" etc.
 */

import { query } from '../server-db';

// Base station capacity: how many orders a station can handle simultaneously
const STATION_THROUGHPUT_MINUTES = 3; // Each queued order adds 3 min
const SAFETY_BUFFER_MINUTES = 2;

/**
 * Given a list of menu item IDs in the current order,
 * calculate the live estimated prep time in minutes.
 */
export async function getEta(propertyId: string, itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0;

  try {
    // 1. Fetch base prep times + station info for ordered items
    const itemRes = await query<{ id: string; prep_time_minutes: number; description: string }>(
      `SELECT id, prep_time_minutes, COALESCE(description, '') as description
       FROM menu_items
       WHERE id = ANY($1::uuid[]) AND property_id = $2`,
      [itemIds, propertyId],
    );

    if (itemRes.rows.length === 0) return 10; // safe default

  // Extract stations from description (encoded as "station:drinks|...")
  const stationsInOrder = new Set<string>();
  let maxBasePrep = 0;

  for (const row of itemRes.rows) {
    const stationMatch = row.description.match(/station:([^|]+)/);
    if (stationMatch) stationsInOrder.add(stationMatch[1].trim().toLowerCase());
    if (row.prep_time_minutes > maxBasePrep) maxBasePrep = row.prep_time_minutes;
  }

  if (stationsInOrder.size === 0) {
    // No station info — return base prep + buffer
    return maxBasePrep + SAFETY_BUFFER_MINUTES;
  }

  // 2. Count active orders (received/preparing) at the same stations
  const stationArray = Array.from(stationsInOrder);

  const backlogRes = await query<{ backlog: string }>(
    `SELECT COUNT(DISTINCT o.id)::text AS backlog
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE o.property_id = $1
       AND o.status IN ('received', 'preparing')
       AND mi.description ILIKE ANY($2::text[])`,
    [propertyId, stationArray.map((s) => `%station:${s}%`)],
  );

  const backlog = parseInt(backlogRes.rows[0]?.backlog ?? '0', 10);

  const eta = maxBasePrep + (backlog * STATION_THROUGHPUT_MINUTES) + SAFETY_BUFFER_MINUTES;
  return Math.min(eta, 45); // cap at 45 min
  } catch {
    return 10; // Safe fallback ETA when database is offline
  }
}
