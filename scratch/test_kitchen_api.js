const http = require('http');

http.get('http://localhost:3000/api/kitchen/orders?propertyId=62e1b115-9382-40f8-853a-0a773735d034', (res) => {
  let body = '';
  res.on('data', (c) => (body += c));
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Kitchen Orders Count:', data.orders.length);
    console.log('Latest Order:', data.orders[0]);
    console.log('Notifications Count:', data.notifications.length);
    console.log('Stock Items Count:', data.stockItems.length);
  });
}).on('error', console.error);
