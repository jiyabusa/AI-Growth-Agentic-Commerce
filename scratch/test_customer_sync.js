const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING COMPLETE CUSTOMER SYNCHRONIZATION TEST ===\n');

  // Test 1: Fetch all customer accounts
  console.log('Test 1: Verify Seeded Indian Demo Customer Accounts...');
  const allCustRes = await request('GET', '/api/customer/all');
  if (allCustRes.status !== 200) throw new Error(`Customer fetch failed with status ${allCustRes.status}`);
  const customers = allCustRes.body.customers;
  console.log(`✓ Loaded ${customers.length} customer accounts.`);

  const requiredNames = [
    'Aarav Sharma', 'Ananya Patel', 'Rohan Mehta', 'Priya Shah',
    'Arjun Verma', 'Sneha Iyer', 'Aditya Kapoor', 'Kavya Nair'
  ];

  for (const reqName of requiredNames) {
    const found = customers.find(c => c.name === reqName);
    if (!found) throw new Error(`Required demo customer "${reqName}" not found in accounts store!`);
    console.log(`  ✓ Found customer account: ${found.name} (${found.id})`);
  }

  // Test 2: Login as Priya Shah
  console.log('\nTest 2: Log in as Priya Shah...');
  const loginRes = await request('POST', '/api/customer/login', {
    email: 'priya@example.com',
    password: 'password123'
  });
  if (!loginRes.body.success) throw new Error(`Login failed: ${loginRes.body.error}`);
  const priya = loginRes.body.customer;
  console.log(`✓ Authenticated as: ${priya.name} (${priya.id})`);
  console.log(`  Returning customer: ${priya.isReturning}`);

  // Test 3: Priya Shah adds Headphones (₹4,499) + AI-recommended Travel Case (₹799)
  console.log('\nTest 3: Add Headphones + Companion Travel Case to Cart...');
  const sessId = 'sess_test_' + Date.now();
  await request('POST', '/api/shopping/cart/add', {
    sessionId: sessId,
    productId: 'prod_anc_headphones',
    quantity: 1,
    isUpsell: false,
    isCrossSell: false
  });
  const cartRes = await request('POST', '/api/shopping/cart/add', {
    sessionId: sessId,
    productId: 'prod_travel_case',
    quantity: 1,
    isUpsell: false,
    isCrossSell: true
  });
  const cart = cartRes.body.cart;
  console.log(`✓ Cart Subtotal: ₹${cart.subtotal}, Total: ₹${cart.total}, Items: ${cart.items.length}`);
  if (cart.total !== 5298) throw new Error(`Expected cart total ₹5,298 but got ₹${cart.total}`);

  // Test 4: Checkout evaluate & Razorpay payment as Priya Shah
  console.log('\nTest 4: Execute Checkout with Razorpay Test Mode...');
  const payRes = await request('POST', '/api/shopping/checkout/pay', {
    sessionId: sessId,
    customerId: priya.id,
    customerName: priya.name,
    cardNumber: '4111111111111111',
    userApproved: true
  });
  if (!payRes.body.success) throw new Error(`Checkout payment failed: ${JSON.stringify(payRes.body)}`);
  const order = payRes.body.order;
  console.log(`✓ Order Created: #${order.id}`);
  console.log(`  Customer Name: ${order.customer_name}`);
  console.log(`  Total: ₹${order.total}`);
  console.log(`  Base Revenue: ₹${order.base_revenue}`);
  console.log(`  Cross-Sell Revenue: ₹${order.cross_sell_revenue}`);
  console.log(`  Razorpay Payment ID: ${order.razorpay_payment_id}`);

  if (order.customer_name !== 'Priya Shah') throw new Error(`Customer name mismatch on order: ${order.customer_name}`);
  if (order.total !== 5298) throw new Error(`Order total mismatch: ${order.total}`);
  if (order.cross_sell_revenue !== 799) throw new Error(`Cross-sell attribution mismatch: ${order.cross_sell_revenue}`);

  // Test 5: Verify Order appears in Merchant Command Center Orders table
  console.log('\nTest 5: Verify Order appears in /api/merchant/orders...');
  const ordersRes = await request('GET', '/api/merchant/orders');
  const merchantOrders = ordersRes.body.orders;
  const verifiedOrder = merchantOrders.find(o => o.id === order.id);
  if (!verifiedOrder) throw new Error(`New order #${order.id} not found in merchant orders!`);
  console.log(`✓ Verified order in Merchant Command Center: #${verifiedOrder.id}`);
  console.log(`  Exact Customer Name: ${verifiedOrder.customer_name}`);
  console.log(`  Total Order Value: ₹${verifiedOrder.total}`);
  console.log(`  Cross-Sell Attribution: ₹${verifiedOrder.cross_sell_revenue}`);

  // Test 6: Verify AI Revenue Attribution breakdown in /api/merchant/analytics
  console.log('\nTest 6: Verify AI Revenue Attribution Matrix in /api/merchant/analytics...');
  const analyticsRes = await request('GET', '/api/merchant/analytics');
  const analytics = analyticsRes.body;
  console.log(`✓ Total Store Revenue: ₹${analytics.totalRevenue.toLocaleString('en-IN')}`);
  console.log(`✓ AI Incremental Revenue: ₹${analytics.aiIncrementalRevenue.toLocaleString('en-IN')}`);
  console.log(`✓ Cross-Sell Revenue: ₹${analytics.crossSellRevenue.toLocaleString('en-IN')}`);

  const customerAttribution = analytics.customerAttribution;
  const priyaAttr = customerAttribution.find(c => c.customer_name === 'Priya Shah');
  if (!priyaAttr) throw new Error('Priya Shah not found in customerAttribution matrix!');
  console.log(`✓ Customer Attribution entry for ${priyaAttr.customer_name}:`);
  console.log(`  Total Spend: ₹${priyaAttr.total_spend}`);
  console.log(`  Base Revenue: ₹${priyaAttr.base_revenue}`);
  console.log(`  Cross-Sell Attributed: ₹${priyaAttr.cross_sell_revenue}`);
  console.log(`  Total Incremental: ₹${priyaAttr.incremental_revenue}`);
  console.log(`  Orders Count: ${priyaAttr.total_orders}`);

  // Test 7: Verify Profile Name Update propagates to Orders & Attribution
  console.log('\nTest 7: Test Profile Name Update Propagation...');
  const updateRes = await request('POST', '/api/customer/profile/update', {
    customerId: priya.id,
    name: 'Priya Shah-Mehta',
    email: 'priya.mehta@example.com'
  });
  if (!updateRes.body.success) throw new Error(`Profile update failed: ${updateRes.body.error}`);
  console.log(`✓ ${updateRes.body.message}`);

  // Re-fetch merchant orders to confirm updated name
  const updatedOrdersRes = await request('GET', '/api/merchant/orders');
  const matchingUpdatedOrder = updatedOrdersRes.body.orders.find(o => o.id === order.id);
  console.log(`✓ Synced Order Customer Name: ${matchingUpdatedOrder.customer_name}`);
  if (matchingUpdatedOrder.customer_name !== 'Priya Shah-Mehta') {
    throw new Error(`Profile name did not synchronize to historical orders! Found: ${matchingUpdatedOrder.customer_name}`);
  }

  // Re-fetch analytics to confirm updated name in attribution matrix
  const updatedAnalyticsRes = await request('GET', '/api/merchant/analytics');
  const updatedPriyaAttr = updatedAnalyticsRes.body.customerAttribution.find(c => c.customer_id === priya.id);
  console.log(`✓ Synced Attribution Matrix Name: ${updatedPriyaAttr.customer_name}`);
  if (updatedPriyaAttr.customer_name !== 'Priya Shah-Mehta') {
    throw new Error(`Profile name did not synchronize to customer attribution matrix!`);
  }

  console.log('\n=================================================================');
  console.log('  ALL CUSTOMER SYNCHRONIZATION TESTS PASSED PERFECTLY (100% OK)');
  console.log('=================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test execution error:', err);
  process.exit(1);
});
