const { runTurn } = require('../lib/agent/orchestrator');

async function test() {
  const t1 = await runTurn('test-human-turn-1', 'menu');
  console.log('Turn 1 reply:', t1.reply);
  
  const t2 = await runTurn('test-human-turn-1', 'search_menu');
  console.log('Turn 2 reply:', t2.reply);
  
  const t3 = await runTurn('test-human-turn-1', 'I want one masala chai and two samosas');
  console.log('Turn 3 reply:', t3.reply);
}

test().catch(console.error);
