/**
 * app/api/agent/chat/route.ts
 * POST /api/agent/chat
 *
 * Primary voice agent turn handler:
 * 1. Tries local Ollama / Qwen model first via runTurn.
 * 2. If local Ollama is offline or unavailable, activates the local database-backed
 *    menu agent that directly verifies PostgreSQL menu_items, calculates authoritative totals & ETA,
 *    enforces the two-step Draft -> Confirm protocol, and commits transactionally via confirmOrder.
 * 3. Triggers MockSmsProvider upon order confirmation and returns simulated notification details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTurn } from '@/lib/agent/orchestrator';
import { query } from '@/lib/server-db';
import { addToOrder, confirmOrder, getDraft, searchMenu } from '@/lib/agent/tools';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface MenuItemRow extends Record<string, unknown> {
  id: string;
  name: string;
  price: string | number;
  availability: string;
  spoken_aliases: string[];
  prep_time_minutes: number;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const transcript = body.transcript || body.message || '';
    const sessionId = body.sessionId || body.callId || 'default-session';
    const callerPhone = body.callerPhone || '+919876543210';
    const customerName = body.customerName || 'Guest Caller';
    const inputPropertyId = body.propertyId || process.env.VAANI_PROPERTY_ID;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return NextResponse.json({ error: 'transcript or message is required' }, { status: 400 });
    }

    // Resolve propertyId
    let propertyId = inputPropertyId;
    if (!propertyId) {
      const propRes = await query<{ id: string }>('SELECT id FROM properties LIMIT 1');
      if (propRes.rows.length > 0) propertyId = propRes.rows[0].id;
    }

    if (!propertyId) {
      return NextResponse.json({
        reply: 'Welcome to Cafe Vaani! We are getting things ready for you.',
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Step 1: Try the AI Agent (Ollama Local Model / Tool loop)
    // ──────────────────────────────────────────────────────────────────────────
    try {
      const result = await runTurn(sessionId, transcript.trim(), callerPhone, propertyId);
      return NextResponse.json({
        reply: result.reply,
        ...(result.orderCreated
          ? {
              orderCreated: result.orderCreated,
              order: {
                id: result.orderCreated.orderId,
                orderNumber: result.orderCreated.orderNumber,
                totalAmount: result.orderCreated.totalAmount,
                prepEta: result.orderCreated.etaMinutes,
                items: result.orderCreated.items,
              },
              mockSms: result.orderCreated.mockSms,
            }
          : {}),
      });
    } catch (agentErr: any) {
      console.warn(
        'ℹ️ AI Agent provider unavailable. Running local DB-backed menu agent:',
        agentErr.message,
      );

      // ────────────────────────────────────────────────────────────────────────
      // Step 2: Local PostgreSQL-backed Menu & Order Engine
      // ────────────────────────────────────────────────────────────────────────
      const lowerText = transcript.toLowerCase().trim();

      // Check for Affirmation / Confirmation of Draft Order
      const isAffirmation =
        /\b(yes|confirm|haan|ha|sari|sure|okay|ok|theek hai|please confirm|confirm order|pack kar do|parcel cheyyandi)\b/i.test(
          lowerText,
        );

      const existingDraft = getDraft(sessionId);

      // If user confirms and a draft order exists, commit it via confirmOrder
      if (isAffirmation && existingDraft && existingDraft.items.length > 0) {
        const confirmResult = (await confirmOrder({
          session_id: sessionId,
          property_id: propertyId,
          customer_name: customerName,
          customer_phone: callerPhone,
        })) as any;

        if (confirmResult.success) {
          const itemSummary = confirmResult.items
            .map((i: any) => `${i.quantity}x ${i.name}`)
            .join(' and ');
          const reply = `Order ${confirmResult.order_number} confirmed! That's ${itemSummary}. Total is ₹${confirmResult.total_amount}. Ready in ~${confirmResult.prep_eta_minutes} minutes. A confirmation SMS has been simulated!`;

          return NextResponse.json({
            reply,
            orderCreated: {
              orderId: confirmResult.order_id,
              orderNumber: confirmResult.order_number,
              totalAmount: confirmResult.total_amount,
              etaMinutes: confirmResult.prep_eta_minutes,
              items: confirmResult.items,
              mockSms: confirmResult.mock_sms,
            },
            order: {
              id: confirmResult.order_id,
              orderNumber: confirmResult.order_number,
              totalAmount: confirmResult.total_amount,
              prepEta: confirmResult.prep_eta_minutes,
              items: confirmResult.items,
            },
            mockSms: confirmResult.mock_sms,
          });
        }
      }

      // Check for Greeting
      if (
        lowerText === 'hi' ||
        lowerText === 'hello' ||
        lowerText === 'namaste' ||
        lowerText === 'namaskaram' ||
        lowerText.includes('kaise ho')
      ) {
        return NextResponse.json({
          reply:
            'Namaste! Welcome to Cafe Vaani. We have fresh Filter Coffee, Masala Chai, Samosas, Bun Maska, Vada Pav, Croissants, and Cold Brew today. What would you like to order?',
        });
      }

      // Query live menu items for property, with graceful fallback to all menu items if property has none
      const menuRes = await query<MenuItemRow>(
        `SELECT id, name, price, availability, spoken_aliases, prep_time_minutes, description
         FROM menu_items WHERE property_id = $1`,
        [propertyId],
      );
      let menuItems = menuRes.rows;
      if (menuItems.length === 0) {
        const allRes = await query<MenuItemRow>(
          `SELECT id, name, price, availability, spoken_aliases, prep_time_minutes, description
           FROM menu_items ORDER BY name ASC`,
        );
        menuItems = allRes.rows;
      }

      // Quantity extraction supporting English, Hindi, and Telugu
      const extractQuantity = (text: string, itemName: string): number => {
        const regex = new RegExp(
          `(\\d+|one|two|three|four|do|teen|chaar|okati|rendu|moodu)\\s*(?:plates?|cups?|pieces?|pcs?)?\\s*(?:of\\s*)?${itemName}`,
          'i',
        );
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

      const matchedItems: { item: MenuItemRow; quantity: number }[] = [];
      const outOfStockItems: MenuItemRow[] = [];

      for (const item of menuItems) {
        const aliases = [
          item.name.toLowerCase(),
          ...(item.spoken_aliases || []).map((a) => a.toLowerCase()),
        ];
        if (aliases.some((alias) => lowerText.includes(alias))) {
          if (item.availability === 'out_of_stock' || item.availability === 'unavailable') {
            outOfStockItems.push(item);
          } else {
            matchedItems.push({
              item,
              quantity: extractQuantity(lowerText, item.name.toLowerCase()),
            });
          }
        }
      }

      // If out of stock, offer substitute from PostgreSQL
      if (outOfStockItems.length > 0) {
        const oos = outOfStockItems[0];
        const substitute = menuItems.find(
          (m) =>
            m.id !== oos.id &&
            (m.availability === 'available' || m.availability === 'in_stock'),
        );
        const subName = substitute ? substitute.name : 'our fresh Veg Puff';
        return NextResponse.json({
          reply: `Kshama kijiye, our ${oos.name} is currently out of stock for today! Would you like hot ${subName} instead?`,
          stockOut: true,
          item: oos.name,
        });
      }

      // If items matched: add to draft and either confirm or prompt for confirmation
      if (matchedItems.length > 0) {
        // Accumulate each item into draft
        for (const m of matchedItems) {
          await addToOrder({
            session_id: sessionId,
            property_id: propertyId,
            item_id: m.item.id,
            quantity: m.quantity,
          });
        }

        const draft = getDraft(sessionId);
        const totalAmount = draft?.totalAmount || 0;
        const itemSummary = matchedItems
          .map((m) => `${m.quantity}x ${m.item.name}`)
          .join(' and ');

        // If customer said "pack kar do" / "parcel cheyyandi" or explicit confirmation in the same turn:
        const instantOrder =
          lowerText.includes('pack kar do') ||
          lowerText.includes('parcel') ||
          lowerText.includes('jaldi dena') ||
          lowerText.includes('confirm');

        if (instantOrder) {
          const confirmResult = (await confirmOrder({
            session_id: sessionId,
            property_id: propertyId,
            customer_name: customerName,
            customer_phone: callerPhone,
          })) as any;

          if (confirmResult.success) {
            const reply = `Order ${confirmResult.order_number} confirmed! That's ${itemSummary}. Total is ₹${confirmResult.total_amount}. Ready in ~${confirmResult.prep_eta_minutes} minutes. A confirmation SMS is simulated!`;

            return NextResponse.json({
              reply,
              orderCreated: {
                orderId: confirmResult.order_id,
                orderNumber: confirmResult.order_number,
                totalAmount: confirmResult.total_amount,
                etaMinutes: confirmResult.prep_eta_minutes,
                items: confirmResult.items,
                mockSms: confirmResult.mock_sms,
              },
              order: {
                id: confirmResult.order_id,
                orderNumber: confirmResult.order_number,
                totalAmount: confirmResult.total_amount,
                prepEta: confirmResult.prep_eta_minutes,
                items: confirmResult.items,
              },
              mockSms: confirmResult.mock_sms,
            });
          }
        }

        // Otherwise, ask for explicit guest confirmation
        return NextResponse.json({
          reply: `I have noted ${itemSummary}. Total is ₹${totalAmount}, ready in ~10 minutes. Shall I confirm your order?`,
          confirmationRequired: true,
          cart: draft?.items,
          totalAmount,
        });
      }

      // Fallback response for unhandled utterances
      return NextResponse.json({
        reply: `I heard "${transcript}". We have Filter Coffee, Masala Chai, Samosas, and Bun Maska. What can I get for you?`,
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
    property: process.env.VAANI_PROPERTY_ID,
  });
}
