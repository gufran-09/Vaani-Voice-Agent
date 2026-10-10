const { runTurn } = require('../lib/agent/orchestrator');

async function test() {
  const sessionId = 'test-flow-' + Date.now();
  
  console.log('--- Step 1: User asks for menu ---');
  let res = await runTurn(sessionId, 'What do you have on the menu?');
  console.log('Vaani:', res.reply);
  
  console.log('\n--- Step 2: User orders chai and samosas ---');
  res = await runTurn(sessionId, "I'd like one masala chai and two samosas please");
  console.log('Vaani:', res.reply);
  
  console.log('\n--- Step 3: User corrects quantity ---');
  res = await runTurn(sessionId, 'Actually make that three samosas');
  console.log('Vaani:', res.reply);
  
  console.log('\n--- Step 4: User confirms ---');
  res = await runTurn(sessionId, 'Haanji, please confirm the order');
  console.log('Vaani:', res.reply);
  console.log('Order created:', res.orderCreated);
}

test().catch(console.error);
