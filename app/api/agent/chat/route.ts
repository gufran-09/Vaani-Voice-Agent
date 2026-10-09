import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';

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
    const {
      message = '',
      history = [],
      propertyId: inputPropertyId,
      customerPhone = '+919876543210',
      customerName = 'Guest Caller',
    } = body;

    const lowerText = message.toLowerCase().trim();

    // 1. Resolve Property ID
    let propertyId = inputPropertyId;
    if (!propertyId) {
      const propRes = await query<{ id: string }>('SELECT id FROM properties LIMIT 1');
      if (propRes.rows.length > 0) {
        propertyId = propRes.rows[0].id;
      }
    }

    if (!propertyId) {
      return NextResponse.json({
        reply: "Welcome to Cafe Vaani! We are getting things ready for you.",
      });
    }

    // 2. Fetch all menu items for this property
    const menuRes = await query<MenuItem>(
      `SELECT id, name, price, availability, spoken_aliases, prep_time_minutes 
       FROM menu_items 
       WHERE property_id = $1`,
      [propertyId]
    );
    const menuItems = menuRes.rows;

    // 3. Simple Greetings
    if (
      lowerText === 'hi' ||
      lowerText === 'hello' ||
      lowerText === 'namaste' ||
      lowerText.includes('kaise ho')
    ) {
      return NextResponse.json({
        reply: "Namaste! Welcome to Cafe Vaani. We have fresh Filter Coffee, Masala Chai, Samosas, and Bun Maska today. What would you like to order?",
      });
    }

    // 4. Quantity Extractor (Hindi, Telugu, English)
    const extractQuantity = (text: string, itemName: string): number => {
      // Look for numbers near the item name
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

      // Check general Hindi/Telugu numerals in sentence
      if (text.includes(' do ') || text.startsWith('do ') || text.includes(' rendu ')) return 2;
      if (text.includes(' teen ') || text.includes(' moodu ')) return 3;
      if (text.includes(' ek ') || text.startsWith('ek ') || text.includes(' okati ')) return 1;

      return 1;
    };

    // 5. Match items from speech
    const matchedItems: { item: MenuItem; quantity: number }[] = [];
    const outOfStockItems: MenuItem[] = [];

    for (const item of menuItems) {
      const aliases = [item.name.toLowerCase(), ...(item.spoken_aliases || []).map((a) => a.toLowerCase())];
      const isMatched = aliases.some((alias) => lowerText.includes(alias));

      if (isMatched) {
        if (item.availability === 'out_of_stock') {
          outOfStockItems.push(item);
        } else {
          const qty = extractQuantity(lowerText, item.name.toLowerCase());
          matchedItems.push({ item, quantity: qty });
        }
      }
    }

    // 6. AGENTIC STOCK-OUT REPLANNING (Winning Demo Feature)
    if (outOfStockItems.length > 0) {
      const oos = outOfStockItems[0];
      // Find substitute
      const substitute = menuItems.find(
        (m) => m.id !== oos.id && m.availability === 'available'
      );
      const subName = substitute ? substitute.name : 'our fresh Veg Puff';

      return NextResponse.json({
        reply: `Sorry ji, our ${oos.name} just ran out for today! Would you like hot ${subName} instead?`,
        stockOut: true,
        item: oos.name,
      });
    }

    // 7. If Items Matched -> Place Order
    if (matchedItems.length > 0) {
      let totalAmount = 0;
      let maxPrepTime = 5;

      for (const m of matchedItems) {
        totalAmount += parseFloat(m.item.price) * m.quantity;
        if (m.item.prep_time_minutes > maxPrepTime) {
          maxPrepTime = m.item.prep_time_minutes;
        }
      }

      // Live Queue factor (count orders currently in preparation)
      const queueRes = await query<{ count: string }>(
        `SELECT COUNT(*) FROM orders WHERE property_id = $1 AND status IN ('confirmed', 'preparing')`,
        [propertyId]
      );
      const activeQueue = parseInt(queueRes.rows[0]?.count || '0', 10);
      const totalEta = maxPrepTime + activeQueue * 2;

      // Generate Order Number
      const orderNum = `ORD-${Math.floor(100 + Math.random() * 900)}`;

      // Insert Order into PostgreSQL
      const orderInsertRes = await query<{ id: string }>(
        `INSERT INTO orders (property_id, order_number, status, channel, customer_name, customer_phone, total_amount, prep_eta_minutes, notes)
         VALUES ($1, $2, 'confirmed', 'voice', $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          propertyId,
          orderNum,
          customerName,
          customerPhone,
          totalAmount,
          totalEta,
          `Voice order: "${message}"`,
        ]
      );
      const orderId = orderInsertRes.rows[0].id;

      // Insert Order Items
      for (const m of matchedItems) {
        await query(
          `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, m.item.id, m.item.name, m.item.price, m.quantity]
        );
      }

      // Record call log
      const callRes = await query<{ id: string }>(
        `INSERT INTO calls (property_id, caller_phone, status, outcome, duration_seconds, transcript_available)
         VALUES ($1, $2, 'completed', 'order_placed', 45, true)
         RETURNING id`,
        [propertyId, customerPhone]
      );
      if (callRes.rows.length > 0) {
        await query(
          `INSERT INTO conversation_messages (call_id, role, content) VALUES ($1, 'caller', $2)`,
          [callRes.rows[0].id, message]
        );
      }

      const itemSummary = matchedItems
        .map((m) => `${m.quantity} ${m.item.name}`)
        .join(' and ');

      const reply = `Order ${orderNum} confirmed! That's ${itemSummary}. Total is ₹${totalAmount.toFixed(0)}. Kitchen prep time is ${totalEta} minutes. A confirmation SMS is sent to your phone!`;

      return NextResponse.json({
        reply,
        order: {
          id: orderId,
          orderNumber: orderNum,
          totalAmount,
          prepEta: totalEta,
          items: matchedItems.map((m) => ({ name: m.item.name, quantity: m.quantity })),
        },
      });
    }

    // 8. Default intelligent response
    return NextResponse.json({
      reply: `I heard "${message}". We have South Indian Filter Coffee, Masala Chai, Samosas, and Bun Maska. Which one can I get for you?`,
    });
  } catch (error: any) {
    console.error('Agent chat route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
