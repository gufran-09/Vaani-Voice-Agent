import { addToOrder, getDraft } from '../lib/agent/tools';

async function test() {
  const sessionId = 'test-session-debug-1';
  const propertyId = '62e1b115-9382-40f8-853a-0a773735d034';

  console.log('Testing addToOrder...');
  const res1 = await addToOrder({
    session_id: sessionId,
    property_id: propertyId,
    item_id: 'f1a1a1a1-0001-4000-8000-000000000001',
    quantity: 1,
  });
  console.log('Res 1:', res1);

  const res2 = await addToOrder({
    session_id: sessionId,
    property_id: propertyId,
    item_id: 'f1a1a1a1-0003-4000-8000-000000000003',
    quantity: 2,
  });
  console.log('Res 2:', res2);

  const draft = getDraft(sessionId);
  console.log('Final draft in session:', draft);
}

test().catch(console.error);
