/**
 * app/api/agent/chat/route.ts
 * POST /api/agent/chat
 *
 * Resolves merge conflict between Member 1's Regex Mock and Member 2's AI Agent.
 * Tries the AI Agent first. If Bedrock quota fails, falls back to the Regex Mock
 * so the frontend UI is never blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTurn } from '@/lib/agent/orchestrator';
import { query } from '@/lib/server-db';

export const runtime = 'nodejs'; // Required — uses AWS SDK (no edge runtime)
export const maxDuration = 30;   // 30s timeout for Bedrock round-trips

interface MenuItem {
  [key: string]: unknown;
  id: string;
  name: string;
  price: string;
  availability: string;
  spoken_aliases: string[];
  prep_time_minutes: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Support both Member 1 & Member 2 payload structures
    const transcript = body.transcript || body.message || '';
    const sessionId = body.sessionId || body.callId || 'default-session';
    const callerPhone = body.callerPhone || '+919876543210';
    const customerName = body.customerName || 'Guest Caller';
    const inputPropertyId = body.propertyId || process.env.VAANI_PROPERTY_ID;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return NextResponse.json({ error: 'transcript or message is required' }, { status: 400 });
    }

    try {
      // 1. Try the AI Agent (Member 2's implementation)
      const result = await runTurn(sessionId, transcript.trim(), callerPhone);
      return NextResponse.json({
        reply: result.reply,
        // Send both formats to satisfy Member 3 / Member 1 frontend
        ...(result.orderCreated ? { 
          orderCreated: result.orderCreated, 
          order: {
            id: result.orderCreated.orderId,
            orderNumber: result.orderCreated.orderNumber,
            totalAmount: result.orderCreated.totalAmount,
            prepEta: result.orderCreated.etaMinutes,
            items: result.orderCreated.items
          }
        } : {}),
      });
    } catch (agentErr: any) {
      console.warn('⚠️ AI Agent failed (likely Bedrock quota). Falling back to Regex Bot:', agentErr.message);
      
      // 2. Regex Fallback (Member 1's mock implementation)
      const lowerText = transcript.toLowerCase().trim();
      let propertyId = inputPropertyId;
      if (!propertyId) {
        const propRes = await query<{ id: string }>('SELECT id FROM properties LIMIT 1');
        if (propRes.rows.length > 0) propertyId = propRes.rows[0].id;
      }

      if (!propertyId) {
        return NextResponse.json({ reply: "Welcome to Cafe Vaani! We are getting things ready for you." });
      }

      const menuRes = await query<MenuItem>(
        `SELECT id, name, price, availability, spoken_aliases, prep_time_minutes FROM menu_items WHERE property_id = $1`,
        [propertyId]
      );
      const menuItems = menuRes.rows;

      if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'namaste' || lowerText.includes('kaise ho')) {
        return NextResponse.json({
          reply: "Namaste! Welcome to Cafe Vaani. We have fresh Filter Coffee, Masala Chai, Samosas, and Bun Maska today. What would you like to order?",
        });
      }

      const extractQuantity = (text: string, itemName: string): number => {
        const regex = new RegExp(`(\\d+|one|two|three|four|do|teen|chaar|okati|rendu|moodu)\\s*(?:plates?|cups?|pieces?|pcs?)?\\s*(?:of\\s*)?${itemName}`, 'i');
        const match = text.match(regex);
        if (match) {
          const val = match[1].toLowerCase();
          if (val === '1' || val === 'one' || val === 'ek' || val === 'okati') return 1;
          if (val === '2' || val === 'two' || val === 'do' || val === 'rendu') return 2;
          if (val === '3' || val === 'three' || val === 'teen' || val === 'moodu') return 3;
          if (val === '4' || val === 'four' || val === 'chaar') return 4;
          const num = parseInt(val, 10);
          if (!isNaN(num)) return num;
        }
        if (text.includes(' do ') || text.startsWith('do ') || text.includes(' rendu ')) return 2;
        if (text.includes(' teen ') || text.includes(' moodu ')) return 3;
        if (text.includes(' ek ') || text.startsWith('ek ') || text.includes(' okati ')) return 1;
        return 1;
      };

      const matchedItems: { item: MenuItem; quantity: number }[] = [];
      const outOfStockItems: MenuItem[] = [];

      for (const item of menuItems) {
        const aliases = [item.name.toLowerCase(), ...(item.spoken_aliases || []).map((a) => a.toLowerCase())];
        if (aliases.some((alias) => lowerText.includes(alias))) {
          if (item.availability === 'out_of_stock' || item.availability === 'unavailable') {
            outOfStockItems.push(item);
          } else {
            matchedItems.push({ item, quantity: extractQuantity(lowerText, item.name.toLowerCase()) });
          }
        }
      }

      if (outOfStockItems.length > 0) {
        const oos = outOfStockItems[0];
        const substitute = menuItems.find((m) => m.id !== oos.id && (m.availability === 'available' || m.availability === 'in_stock'));
        const subName = substitute ? substitute.name : 'our fresh Veg Puff';
        return NextResponse.json({
          reply: `Sorry ji, our ${oos.name} just ran out for today! Would you like hot ${subName} instead?`,
          stockOut: true,
          item: oos.name,
        });
      }

      if (matchedItems.length > 0) {
        let totalAmount = 0;
        let maxPrepTime = 5;
        for (const m of matchedItems) {
          totalAmount += parseFloat(m.item.price) * m.quantity;
          if (m.item.prep_time_minutes > maxPrepTime) maxPrepTime = m.item.prep_time_minutes;
        }

        const queueRes = await query<{ count: string }>(
          `SELECT COUNT(*) as count FROM orders WHERE property_id = $1 AND status IN ('confirmed', 'preparing', 'received')`,
          [propertyId]
        );
        const activeQueue = parseInt(queueRes.rows[0]?.count || '0', 10);
        const totalEta = maxPrepTime + activeQueue * 2;
        const orderNum = `ORD-${Math.floor(100 + Math.random() * 900)}`;

        const orderInsertRes = await query<{ id: string }>(
          `INSERT INTO orders (property_id, order_number, status, channel, customer_name, customer_phone, total_amount, prep_eta_minutes, notes)
           VALUES ($1, $2, 'confirmed', 'voice', $3, $4, $5, $6, $7) RETURNING id`,
          [propertyId, orderNum, customerName, callerPhone, totalAmount, totalEta, `Voice order: "${transcript}"`]
        );
        const orderId = orderInsertRes.rows[0].id;

        for (const m of matchedItems) {
          await query(
            `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, m.item.id, m.item.name, m.item.price, m.quantity]
          );
        }

        const itemSummary = matchedItems.map((m) => `${m.quantity} ${m.item.name}`).join(' and ');
        const reply = `Order ${orderNum} confirmed! That's ${itemSummary}. Total is ₹${totalAmount.toFixed(0)}. Kitchen prep time is ${totalEta} minutes. A confirmation SMS is sent to your phone!`;

        return NextResponse.json({
          reply,
          orderCreated: { 
            orderId, 
            orderNumber: orderNum, 
            totalAmount, 
            etaMinutes: totalEta, 
            items: matchedItems.map((m) => ({ name: m.item.name, quantity: m.quantity })) 
          },
          order: { 
            id: orderId, 
            orderNumber: orderNum, 
            totalAmount, 
            prepEta: totalEta, 
            items: matchedItems.map((m) => ({ name: m.item.name, quantity: m.quantity })) 
          },
        });
      }

      return NextResponse.json({
        reply: `I heard "${transcript}". We have South Indian Filter Coffee, Masala Chai, Samosas, and Bun Maska. Which one can I get for you?`,
      });
    }

  } catch (err: any) {
    console.error('[/api/agent/chat] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// Health-check — GET /api/agent/chat
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    model: process.env.BEDROCK_MODEL_ID,
    property: process.env.VAANI_PROPERTY_ID,
  });
}
