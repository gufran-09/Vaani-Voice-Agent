const fs = require('fs');

async function testE2E() {
  const sessionId = 'e2e-turbo-' + Date.now();
  const propId = '62e1b115-9382-40f8-853a-0a773735d034';

  console.log('=== E2E TEST: WHISPER LARGE-V3-TURBO + OLLAMA + AWS RDS ===\n');

  // Step 1: Transcribe actual spoken WAV with Large-v3-Turbo
  console.log('1. Transcribing spoken audio (phrase2_chai_samosa.wav)...');
  const bytes = fs.readFileSync('scratch/phrase2_chai_samosa.wav');
  const blob = new Blob([bytes], { type: 'audio/wav' });
  const form = new FormData();
  form.append('file', blob, 'phrase2_chai_samosa.wav');

  const t0 = Date.now();
  const sttRes = await fetch('http://localhost:3001/api/agent/transcribe', { method: 'POST', body: form });
  const sttTime = Date.now() - t0;
  const sttData = await sttRes.json();
  console.log(`STT [${sttData.device} - ${sttData.provider}]: "${sttData.transcript}" (${sttTime}ms)\n`);

  // Step 2: Chat Turn 1 (Order Placement)
  console.log('2. Processing order turn with Vaani...');
  const t1 = Date.now();
  const chatRes = await fetch('http://localhost:3001/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: sttData.transcript, sessionId, propertyId: propId })
  });
  const chatTime = Date.now() - t1;
  const chatData = await chatRes.json();
  console.log(`Chat Turn: "${chatData.reply}" (${chatTime}ms)\n`);

  // Step 3: Quantity Correction (Actually make that 3 samosas)
  console.log('3. Sending quantity correction...');
  const t2 = Date.now();
  const corrRes = await fetch('http://localhost:3001/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'Actually, make that three samosas.', sessionId, propertyId: propId })
  });
  const corrTime = Date.now() - t2;
  const corrData = await corrRes.json();
  console.log(`Correction Turn: "${corrData.reply}" (${corrTime}ms)\n`);

  // Step 4: Final Confirmation
  console.log('4. Confirming order...');
  const t3 = Date.now();
  const confRes = await fetch('http://localhost:3001/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'Haanji, please confirm the order.', sessionId, propertyId: propId })
  });
  const confTime = Date.now() - t3;
  const confData = await confRes.json();
  console.log(`Confirmation Turn: "${confData.reply}" (${confTime}ms)`);
  console.log('Order Created in AWS RDS:', confData.orderCreated?.orderNumber, 'Total: Rs', confData.orderCreated?.totalAmount);
}

testE2E().catch(console.error);
