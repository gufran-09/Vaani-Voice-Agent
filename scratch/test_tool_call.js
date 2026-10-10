const { converseWithOllama } = require('../lib/agent/ollama');
const { TOOL_SPECS } = require('../lib/agent/tools');
const { SYSTEM_PROMPT } = require('../lib/agent/orchestrator');

async function check() {
  const res = await converseWithOllama(
    [{ role: 'user', content: "I'd like one masala chai and two samosas" }],
    TOOL_SPECS,
    SYSTEM_PROMPT
  );
  console.log('Result:', JSON.stringify(res, null, 2));
}

check().catch(console.error);
