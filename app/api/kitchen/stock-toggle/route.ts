/**
 * app/api/kitchen/stock-toggle/route.ts
 * POST /api/kitchen/stock-toggle
 *
 * Called by Member 3's KDS "Out of Stock" toggle button.
 * Member 2 owns the replanning logic. Member 3 consumes the response to send SMS.
 *
 * Request: { menuItemId: string, available: boolean }
 * Response: { success: true, affectedOrders: [...], substituteName: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleStockOut, handleStockRestore } from '@/lib/agent/replanner';

const PROPERTY_ID = process.env.VAANI_PROPERTY_ID ?? '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { menuItemId?: string; available?: boolean };
    const { menuItemId, available } = body;

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 });
    }
    if (typeof available !== 'boolean') {
      return NextResponse.json({ error: 'available (boolean) is required' }, { status: 400 });
    }

    if (!available) {
      // Mark out of stock + find affected orders
      const result = await handleStockOut(PROPERTY_ID, menuItemId);
      return NextResponse.json({ success: true, ...result });
    } else {
      // Restore to available
      await handleStockRestore(PROPERTY_ID, menuItemId);
      return NextResponse.json({ success: true, affectedOrders: [], substituteName: null });
    }

  } catch (err) {
    console.error('[/api/kitchen/stock-toggle] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
