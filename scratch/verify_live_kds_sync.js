const http = require('http');

async function verify() {
  console.log('--- Step 1: Query current live KDS orders ---');
  const initialRes = await fetch('http://localhost:3000/api/kitchen/orders?propertyId=62e1b115-9382-40f8-853a-0a773735d034&_t=' + Date.now());
  const initialData = await initialRes.json();
  const initialCount = initialData.orders.length;
  console.log(`Initial tickets in KDS: ${initialCount}`);

  console.log('\n--- Step 2: Customer orders 1 Masala Dosa via Voice Agent ---');
  const sess = 'live-test-sess-' + Date.now();
  const orderAddRes = await fetch('http://localhost:3000/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'I want 1 masala dosa please',
      sessionId: sess,
      callerPhone: '+919876543210',
      customerName: 'Aarav Patel'
    })
  });
  const addData = await orderAddRes.json();
  console.log(`Agent reply: "${addData.reply}"`);
  console.log('Cart:', JSON.stringify(addData.cart));

  console.log('\n--- Step 3: Customer confirms order ("Haanji, confirm the order") ---');
  const confirmRes = await fetch('http://localhost:3000/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Haanji, please confirm the order',
      sessionId: sess,
      callerPhone: '+919876543210',
      customerName: 'Aarav Patel'
    })
  });
  const confirmData = await confirmRes.json();
  console.log(`Agent confirmation reply: "${confirmData.reply}"`);
  console.log('Committed Order Details:', JSON.stringify(confirmData.orderCreated, null, 2));

  console.log('\n--- Step 4: Verify ticket appears in Live Kitchen KDS API ---');
  const kdsRes = await fetch('http://localhost:3000/api/kitchen/orders?propertyId=62e1b115-9382-40f8-853a-0a773735d034&_t=' + Date.now());
  const kdsData = await kdsRes.json();
  console.log(`New tickets in KDS: ${kdsData.orders.length} (was ${initialCount})`);
  console.log('Top Ticket on Kitchen Board:', {
    id: kdsData.orders[0]?.id,
    order_number: kdsData.orders[0]?.order_number,
    customer_name: kdsData.orders[0]?.customer_name,
    status: kdsData.orders[0]?.status,
    total_amount: kdsData.orders[0]?.total_amount,
    items: kdsData.orders[0]?.order_items
  });

  const matching = kdsData.orders.find(o => o.order_number === confirmData.orderCreated.orderNumber);
  if (matching && matching.status === 'received') {
    console.log(`\n SUCCESS: Order ${matching.order_number} is LIVE in Column 1 (Received) on Kitchen Display!`);
  } else {
    console.error('\n ERROR: Order not found in KDS received list');
  }
}

verify().catch(console.error);
