const { converseWithOllama } = require('../lib/agent/ollama');

async function testUpdateReply() {
  const prompt = `You are Vaani, a warm, lively cafe host at Cafe Vaani in Indiranagar, Bangalore. You talk like a real human person, not a machine or script.
CRITICAL RULES:
1. Speak in warm, conversational Indian English. Never use markdown formatting (no asterisks **, no hashes #).
2. Keep it crisp and under 25 words.
3. Be varied, warm, and charming.

Facts:
- Guest corrected quantity: Now 1x Cutting Masala Chai and 3x Crispy Samosas.
- Authoritative total: ₹180.
- Kitchen ETA: 8 minutes.
- Guest just said: "Actually make that three samosas"

Generate Vaani's natural spoken reply to the guest:`;

  const res = await converseWithOllama(
    [{ role: 'user', content: prompt }],
    [],
    'You are Vaani, the friendly human host of Cafe Vaani.'
  );

  console.log('Human Vaani update reply:\n', res.content[0].text);
}

testUpdateReply().catch(console.error);
