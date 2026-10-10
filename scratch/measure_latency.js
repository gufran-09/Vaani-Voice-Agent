const fs = require('fs');
const path = require('path');

async function measureTimings() {
  console.log('⏱️ MEASURING REAL SYSTEM LATENCIES...\n');

  // 1. Whisper Transcription Latency
  const wavPath = path.resolve(__dirname, 'test_audio_coffee.wav');
  if (fs.existsSync(wavPath)) {
    const fileBytes = fs.readFileSync(wavPath);
    const blob = new Blob([fileBytes], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'test_audio_coffee.wav');

    const sttStartTime = Date.now();
    try {
      const transcribeRes = await fetch('http://localhost:3000/api/agent/transcribe', {
        method: 'POST',
        body: formData,
      });
      const sttDuration = Date.now() - sttStartTime;
      const transData = await transcribeRes.json();
      console.log(`1. Whisper Small STT: ${sttDuration}ms`);
      console.log(`   Transcript: "${transData.transcript}" (${transData.provider || 'local'})\n`);
    } catch (e) {
      console.log(`1. Whisper Small STT error: ${e.message}\n`);
    }
  }

  // 2. Chat / LLM + DB Roundtrip Latency
  const propId = '62e1b115-9382-40f8-853a-0a773735d034';
  const chatStartTime = Date.now();
  try {
    const chatRes = await fetch('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Can I get one South Indian Filter Coffee and two samosas please?',
        sessionId: 'latency-test-' + Date.now(),
        propertyId: propId,
      }),
    });
    const chatDuration = Date.now() - chatStartTime;
    const chatData = await chatRes.json();
    console.log(`2. Chat Turn (LLM + RDS DB): ${chatDuration}ms`);
    console.log(`   Response: "${chatData.reply.slice(0, 80)}..."\n`);
  } catch (e) {
    console.log(`2. Chat Turn error: ${e.message}\n`);
  }

  // 3. Database Direct Query Latency
  const { Client } = require('pg');
  const c = new Client({
    host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'vaani_app',
    password: 'Qjw9CTgRHrbQXncKPnBonaB4',
    database: 'vaani',
    ssl: { rejectUnauthorized: false },
  });
  const dbStartTime = Date.now();
  await c.connect();
  const dbConnectDuration = Date.now() - dbStartTime;
  const qStartTime = Date.now();
  await c.query('SELECT id, name, price, availability FROM menu_items WHERE property_id = $1 LIMIT 10', [propId]);
  const queryDuration = Date.now() - qStartTime;
  await c.end();
  console.log(`3. AWS RDS PostgreSQL Connect: ${dbConnectDuration}ms, Query: ${queryDuration}ms`);
}

measureTimings().catch(console.error);
