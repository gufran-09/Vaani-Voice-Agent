const http = require('http');

const body = JSON.stringify({
  model: 'qwen3.5:4b-q4_K_M',
  messages: [
    {
      role: 'system',
      content: 'You are Vaani, the warm AI voice host at Cafe Vaani in Indiranagar, Bangalore. Act like a real person, not a machine. Speak warmly and naturally. Never repeat canned lines.'
    },
    {
      role: 'user',
      content: 'search_menu'
    }
  ],
  stream: false,
  options: {
    temperature: 0.7,
    top_p: 0.9,
    repeat_penalty: 1.15
  }
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 11434,
    path: '/api/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log('Ollama Response:', JSON.parse(data).message.content);
    });
  }
);

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
