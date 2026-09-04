const http = require('http');
const assert = require('assert');

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

async function runVerification() {
  console.log('========================================================================');
  console.log('  FULL END-TO-END VERIFICATION: CUSTOMER IDENTITY & ATTRIBUTION SYNC');
  console.log('========================================================================\n');

  // STEP 1: HTML & Frontend assets check
  console.log('Step 1: Validating Client HTML Elements & Modals...');
  const indexHtml = await request('GET', '/');
  assert.strictEqual(indexHtml.status, 200, 'index.html should return 200');
  const html = indexHtml.raw || JSON.stringify(indexHtml.body);
  
  assert(html.includes('customer-attribution-table'), 'Missing customer-attribution-table');
  assert(html.includes('customer-attribution-tbody'), 'Missing customer-attribution-tbody');
  assert(html.includes('modal-edit-profile'), 'Missing modal-edit-profile');
  assert(html.includes('btn-edit-profile-name'), 'Missing btn-edit-profile-name');
  assert(html.includes('btn-fill-demo-aarav'), 'Missing btn-fill-demo-aarav');
  assert(html.includes('btn-fill-demo-priya'), 'Missing btn-fill-demo-priya');
  assert(html.includes('btn-fill-demo-rohan'), 'Missing btn-fill-demo-rohan');
  assert(html.includes('btn-fill-demo-ananya'), 'Missing btn-fill-demo-ananya');
  console.log('✓ All client HTML components, demo accounts, and attribution tables validated.');

  // STEP 2: Demo Customer Accounts (Shared Single Source of Truth)
  console.log('\nStep 2: Validating Seeded Indian Customer Accounts in dbService...');
  const custRes = await request('GET', '/api/customer/all');
  assert.strictEqual(custRes.status, 200);
  const customers = custRes.body.customers;
  const expectedNames = [
    'Aarav Sharma', 'Ananya Patel', 'Rohan Mehta', 'Priya Shah',
    'Arjun Verma', 'Sneha Iyer', 'Aditya Kapoor', 'Kavya Nair'
  ];
  for (const name of expectedNames) {
    const cust = customers.find(c => c.name === name);
    assert(cust, `Missing demo account for: ${name}`);
    console.log(`  ✓ Account Verified: ${cust.name} (ID: ${cust.id}, Email: ${cust.email})`);
  }

  // STEP 3: Test Scenario 1 - Aarav Sharma buys headphones (₹4,499)
  console.log('\nStep 3: Test Scenario 1 - Aarav Sharma Signs Up / Logs In & Purchases Headphones...');
  const aaravLogin = await request('POST', '/api/customer/login', {
    email: 'aarav@example.com',
    password: 'password123'
  });
  assert(aaravLogin.body.success, 'Aarav login failed');
  const aarav = aaravLogin.body.customer;
  console.log(`  ✓ Authenticated as: ${aarav.name} (${aarav.id})`);

  const sessAarav = 'sess_aarav_' + Date.now();
  await request('POST', '/api/shopping/cart/add', {
    sessionId: sessAarav,
    productId: 'prod_anc_headphones',
    quantity: 1,
    isUpsell: false,
    isCrossSell: false
  });

  const aaravPay = await request('POST', '/api/shopping/checkout/pay', {
    sessionId: sessAarav,
    customerId: aarav.id,
    customerName: aarav.name,
    cardNumber: '4111111111111111',
    userApproved: true
  });
  assert(aaravPay.body.success, 'Aarav payment failed');
  const aaravOrder = aaravPay.body.order;
  console.log(`  ✓ Order Confirmed: #${aaravOrder.id} for ${aaravOrder.customer_name}, Total: ₹${aaravOrder.total}`);
  assert.strictEqual(aaravOrder.customer_name, 'Aarav Sharma');
  assert.strictEqual(aaravOrder.total, 4499);

  // STEP 4: Test Scenario 2 - Priya Shah buys headphones (₹4,499) + AI companion case (₹799)
  console.log('\nStep 4: Test Scenario 2 - Priya Shah Purchases Headphones + AI Cross-Sell Case (₹5,298 Total)...');
  const priyaLogin = await request('POST', '/api/customer/login', {
    email: 'priya@example.com',
    password: 'password123'
  });
  assert(priyaLogin.body.success, 'Priya login failed');
  const priya = priyaLogin.body.customer;

  const sessPriya = 'sess_priya_' + Date.now();
  await request('POST', '/api/shopping/cart/add', {
    sessionId: sessPriya,
    productId: 'prod_anc_headphones',
    quantity: 1,
    isUpsell: false,
    isCrossSell: false
  });
  await request('POST', '/api/shopping/cart/add', {
    sessionId: sessPriya,
    productId: 'prod_travel_case',
    quantity: 1,
    isUpsell: false,
    isCrossSell: true
  });

  const priyaPay = await request('POST', '/api/shopping/checkout/pay', {
    sessionId: sessPriya,
    customerId: priya.id,
    customerName: priya.name,
    cardNumber: '4111111111111111',
    userApproved: true
  });
  assert(priyaPay.body.success, 'Priya payment failed');
  const priyaOrder = priyaPay.body.order;
  console.log(`  ✓ Order Confirmed: #${priyaOrder.id} for ${priyaOrder.customer_name}, Total: ₹${priyaOrder.total}`);
  console.log(`  ✓ Cross-Sell Attributed: ₹${priyaOrder.cross_sell_revenue}`);
  assert.strictEqual(priyaOrder.customer_name, 'Priya Shah');
  assert.strictEqual(priyaOrder.total, 5298);
  assert.strictEqual(priyaOrder.cross_sell_revenue, 799);

  // STEP 5: Verify Orders & Attribution in Merchant Command Center
  console.log('\nStep 5: Verifying Merchant Command Center Synchronized Data...');
  const merchantOrdersRes = await request('GET', '/api/merchant/orders');
  assert.strictEqual(merchantOrdersRes.status, 200);
  const merchantOrders = merchantOrdersRes.body.orders;

  const foundAarav = merchantOrders.find(o => o.id === aaravOrder.id);
  assert(foundAarav, 'Aarav order missing in merchant orders');
  assert.strictEqual(foundAarav.customer_name, 'Aarav Sharma');
  console.log(`  ✓ Merchant Orders contains Aarav Sharma: Order #${foundAarav.id}, ₹${foundAarav.total}`);

  const foundPriya = merchantOrders.find(o => o.id === priyaOrder.id);
  assert(foundPriya, 'Priya order missing in merchant orders');
  assert.strictEqual(foundPriya.customer_name, 'Priya Shah');
  assert.strictEqual(foundPriya.cross_sell_revenue, 799);
  console.log(`  ✓ Merchant Orders contains Priya Shah: Order #${foundPriya.id}, ₹${foundPriya.total} (+₹${foundPriya.cross_sell_revenue} Cross-Sell)`);

  const analyticsRes = await request('GET', '/api/merchant/analytics');
  assert.strictEqual(analyticsRes.status, 200);
  const analytics = analyticsRes.body;
  const matrix = analytics.customerAttribution;
  assert(Array.isArray(matrix), 'customerAttribution must be an array');

  const priyaAttr = matrix.find(c => c.customer_id === priya.id);
  assert(priyaAttr, 'Priya Shah missing from customer attribution matrix');
  console.log(`  ✓ Attribution Matrix: ${priyaAttr.customer_name} -> Total Spend: ₹${priyaAttr.total_spend}, Cross-Sell: ₹${priyaAttr.cross_sell_revenue}, Orders: ${priyaAttr.total_orders}`);

  // STEP 6: Verify Dynamic Profile Name Synchronization Everywhere
  console.log('\nStep 6: Testing Profile Name Update Synchronization Across All Sections...');
  const updateRes = await request('POST', '/api/customer/profile/update', {
    customerId: aarav.id,
    name: 'Aarav V. Sharma',
    email: 'aarav.sharma@example.com'
  });
  assert(updateRes.body.success, 'Profile update failed');
  console.log(`  ✓ ${updateRes.body.message}`);

  // Check updated profile
  const updatedProfileRes = await request('GET', `/api/customer/profile?customerId=${aarav.id}`);
  assert.strictEqual(updatedProfileRes.body.customer.name, 'Aarav V. Sharma');

  // Check updated orders in merchant command center
  const recheckOrders = await request('GET', '/api/merchant/orders');
  const updatedOrder = recheckOrders.body.orders.find(o => o.id === aaravOrder.id);
  assert.strictEqual(updatedOrder.customer_name, 'Aarav V. Sharma', 'Order customer name should reflect updated profile name');
  console.log(`  ✓ Merchant Orders immediately reflects updated name: ${updatedOrder.customer_name}`);

  // Check updated attribution matrix
  const recheckAnalytics = await request('GET', '/api/merchant/analytics');
  const updatedAaravAttr = recheckAnalytics.body.customerAttribution.find(c => c.customer_id === aarav.id);
  assert.strictEqual(updatedAaravAttr.customer_name, 'Aarav V. Sharma', 'Attribution matrix should reflect updated profile name');
  console.log(`  ✓ Attribution Matrix immediately reflects updated name: ${updatedAaravAttr.customer_name}`);

  // STEP 7: Check regression safety (Policy engine, Voice, Replay)
  console.log('\nStep 7: Validating Existing Core Features (Zero Regressions)...');
  const polRes = await request('GET', '/api/merchant/policies');
  assert.strictEqual(polRes.status, 200);
  assert(polRes.body.spending_controls, 'Policies intact');

  const replayRes = await request('GET', `/api/merchant/audit/replay/${priyaOrder.id}`);
  assert.strictEqual(replayRes.status, 200);
  assert(replayRes.body.steps && replayRes.body.steps.length >= 6, 'Visual replay generated intact');
  console.log(`  ✓ Visual Audit Replay verified (${replayRes.body.steps.length} timeline steps).`);

  console.log('\n========================================================================');
  console.log('  ALL VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!');
  console.log('========================================================================\n');
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
