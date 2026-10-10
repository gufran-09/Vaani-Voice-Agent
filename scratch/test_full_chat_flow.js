const http = require('http');

function sendTurn(sessionId, transcript) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ sessionId, transcript });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/agent/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const sessionId = 'flow-test-' + Date.now();
  console.log('=== Step 1: User says "Hi, what can I order?" ===');
  let res = await sendTurn(sessionId, 'Hi, what can I order?');
  console.log('Vaani Reply:', res.reply);

  console.log('\n=== Step 2: User says "I would like one masala chai and two samosas, please." ===');
  res = await sendTurn(sessionId, 'I would like one masala chai and two samosas, please.');
  console.log('Vaani Reply:', res.reply);
  console.log('Cart:', res.cart);
  console.log('Total Amount: ₹' + res.totalAmount);

  console.log('\n=== Step 3: User says "Actually, make that three samosas." ===');
  res = await sendTurn(sessionId, 'Actually, make that three samosas.');
  console.log('Vaani Reply:', res.reply);
  console.log('Cart:', res.cart);
  console.log('Total Amount: ₹' + res.totalAmount);

  console.log('\n=== Step 4: User says "Haanji, please confirm the order." ===');
  res = await sendTurn(sessionId, 'Haanji, please confirm the order.');
  console.log('Vaani Reply:', res.reply);
  console.log('Order Created:', res.orderCreated);
}

run().catch(console.error);
