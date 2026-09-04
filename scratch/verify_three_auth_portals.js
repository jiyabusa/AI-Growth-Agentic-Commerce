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

async function verifyAll() {
  console.log('========================================================================');
  console.log('  VERIFICATION: 3 DEDICATED AUTHENTICATION DASHBOARDS & CLEAN ENTRY');
  console.log('========================================================================\n');

  // STEP 1: Landing Page Verification
  console.log('Step 1: Validating Landing Page HTML...');
  const resIndex = await request('GET', '/');
  assert.strictEqual(resIndex.status, 200, 'index.html should load');
  const html = resIndex.raw;

  // 1.1: Verify Customer Login card is REMOVED from landing page
  assert(!html.includes('id="card-enter-auth"'), 'FAILURE: card-enter-auth must be removed from landing page');
  console.log('  ✓ Verified: Customer Login card removed from landing page');

  // 1.2: Verify navbar button is REMOVED
  assert(!html.includes('id="btn-nav-auth"'), 'FAILURE: btn-nav-auth must be removed from navbar');
  console.log('  ✓ Verified: Customer Login button removed from navbar');

  // 1.3: Verify 3 portal entry cards exist
  assert(html.includes('id="card-enter-shopping"'), 'Missing card-enter-shopping');
  assert(html.includes('id="card-enter-merchant"'), 'Missing card-enter-merchant');
  assert(html.includes('id="card-enter-ai2ai"'), 'Missing card-enter-ai2ai');
  console.log('  ✓ Verified: 3 distinct portal cards on landing page (Shopping, Merchant, AI-to-AI)');

  // STEP 2: Verify All 3 Dedicated Dashboards in HTML
  console.log('\nStep 2: Validating 3 Dedicated Login Views in HTML...');
  
  // 2.1: Customer Login Dashboard
  assert(html.includes('id="view-customer-auth"'), 'Missing view-customer-auth');
  assert(html.includes('id="tab-auth-login"'), 'Missing tab-auth-login');
  assert(html.includes('id="tab-auth-signup"'), 'Missing tab-auth-signup');
  assert(html.includes('id="btn-fill-demo-aarav"'), 'Missing 1-click demo button for Aarav');
  console.log('  ✓ Verified: AI Shopping Assistant Login Dashboard (Customer)');

  // 2.2: Merchant Login Dashboard
  assert(html.includes('id="view-merchant-auth"'), 'Missing view-merchant-auth');
  assert(html.includes('merchant-theme'), 'Missing merchant-theme styling');
  assert(html.includes('id="tab-merchant-login"'), 'Missing tab-merchant-login');
  assert(html.includes('id="tab-merchant-signup"'), 'Missing tab-merchant-signup');
  assert(html.includes('id="form-merchant-login"'), 'Missing form-merchant-login');
  assert(html.includes('id="form-merchant-signup"'), 'Missing form-merchant-signup');
  assert(html.includes('id="btn-fill-demo-revify"') || html.includes('id="btn-fill-demo-omnigrowth"'), 'Missing 1-click demo button for merchant');
  console.log('  ✓ Verified: AI Commerce Command Center Login Dashboard (Merchant)');

  // 2.3: AI-to-AI Login Dashboard
  assert(html.includes('id="view-ai2ai-auth"'), 'Missing view-ai2ai-auth');
  assert(html.includes('ai2ai-theme'), 'Missing ai2ai-theme styling');
  assert(html.includes('id="tab-ai2ai-login"'), 'Missing tab-ai2ai-login');
  assert(html.includes('id="tab-ai2ai-signup"'), 'Missing tab-ai2ai-signup');
  assert(html.includes('id="form-ai2ai-login"'), 'Missing form-ai2ai-login');
  assert(html.includes('id="form-ai2ai-signup"'), 'Missing form-ai2ai-signup');
  assert(html.includes('id="btn-fill-demo-operator"'), 'Missing 1-click demo button for AI-to-AI operator');
  console.log('  ✓ Verified: AI-to-AI Autonomous Commerce Login Dashboard (Operator)');

  // STEP 3: Test All Backend Authentication Endpoints
  console.log('\nStep 3: Testing Backend Authentication Endpoints...');

  // 3.1 Customer Auth
  const custRes = await request('POST', '/api/customer/login', {
    email: 'aarav@example.com',
    password: 'password123'
  });
  assert(custRes.body.success, 'Customer login failed');
  assert.strictEqual(custRes.body.customer.name, 'Aarav Sharma');
  assert.strictEqual(custRes.body.customer.role, 'customer');
  console.log(`  ✓ Customer Login API: Logged in as ${custRes.body.customer.name} (Role: ${custRes.body.customer.role})`);

  // 3.2 Merchant Auth
  const merchRes = await request('POST', '/api/merchant/login', {
    email: 'admin@revify.com',
    password: 'password123'
  });
  assert(merchRes.body.success, 'Merchant login failed');
  assert.strictEqual(merchRes.body.merchant.name, 'Revify Labs');
  assert.strictEqual(merchRes.body.merchant.role, 'merchant');
  console.log(`  ✓ Merchant Login API: Logged in as ${merchRes.body.merchant.name} (Role: ${merchRes.body.merchant.role})`);

  // 3.3 AI-to-AI Auth
  const ai2aiRes = await request('POST', '/api/ai2ai/login', {
    email: 'operator@omnigrowth.com',
    password: 'password123'
  });
  assert(ai2aiRes.body.success, 'AI-to-AI login failed');
  assert.strictEqual(ai2aiRes.body.user.name, 'Commerce Operator');
  assert(['ai2ai', 'operator', 'admin'].includes(ai2aiRes.body.user.role), 'Unexpected role for ai2ai user');
  console.log(`  ✓ AI-to-AI Login API: Logged in as ${ai2aiRes.body.user.name} (Role: ${ai2aiRes.body.user.role})`);

  // STEP 4: Test New Registrations for Each Role
  console.log('\nStep 4: Testing Dynamic Registration for All 3 Roles...');

  const randSuffix = Date.now().toString().slice(-4);

  // 4.1 Register New Customer
  const newCustRes = await request('POST', '/api/customer/register', {
    name: 'Vikram Malhotra',
    email: `vikram_${randSuffix}@example.com`,
    password: 'securePassword123'
  });
  assert(newCustRes.body.success, 'New customer registration failed');
  console.log(`  ✓ Customer Registration: Registered ${newCustRes.body.customer.name}`);

  // 4.2 Register New Merchant
  const newMerchRes = await request('POST', '/api/merchant/register', {
    storeName: 'Bengaluru Tech Store',
    email: `bengaluru_${randSuffix}@store.com`,
    password: 'merchantPassword123'
  });
  assert(newMerchRes.body.success, 'New merchant registration failed');
  console.log(`  ✓ Merchant Registration: Registered ${newMerchRes.body.merchant.name}`);

  // 4.3 Register New AI-to-AI Operator
  const newAi2aiRes = await request('POST', '/api/ai2ai/register', {
    name: 'Autonomous Agent Controller',
    email: `agent_ops_${randSuffix}@omnigrowth.com`,
    password: 'agentPassword123'
  });
  assert(newAi2aiRes.body.success, 'New AI-to-AI user registration failed');
  console.log(`  ✓ AI-to-AI Registration: Registered ${newAi2aiRes.body.user.name}`);

  // STEP 5: End-to-End Customer Purchase & Merchant Attribution Sync
  console.log('\nStep 5: Testing Purchase & Revenue Attribution Synchronization...');
  const testSession = 'sess_e2e_' + Date.now();
  
  // Add product to cart
  await request('POST', '/api/shopping/cart/add', {
    sessionId: testSession,
    productId: 'prod_anc_headphones',
    quantity: 1
  });

  // Pay as new customer Vikram Malhotra
  const checkoutRes = await request('POST', '/api/shopping/checkout/pay', {
    sessionId: testSession,
    customerId: newCustRes.body.customer.id,
    customerName: newCustRes.body.customer.name,
    cardNumber: '4111111111111111',
    userApproved: true
  });
  assert(checkoutRes.body.success, 'Checkout failed');
  console.log(`  ✓ Order Completed: #${checkoutRes.body.order.id} for ₹${checkoutRes.body.order.totalAmount}`);

  // Check merchant analytics & orders
  const ordersRes = await request('GET', '/api/merchant/orders');
  assert.strictEqual(ordersRes.status, 200);
  const foundOrder = ordersRes.body.orders.find(o => o.id === checkoutRes.body.order.id);
  assert(foundOrder, 'Order not found in merchant orders');
  assert.strictEqual(foundOrder.customer_name, 'Vikram Malhotra', 'Customer name mismatch in merchant order');
  console.log(`  ✓ Merchant Order Sync: Order #${foundOrder.id} attributed to "${foundOrder.customer_name}" (Total: ₹${foundOrder.total})`);

  // Check AI Revenue Attribution
  const attrRes = await request('GET', '/api/merchant/analytics');
  assert.strictEqual(attrRes.status, 200);
  const attrEntries = attrRes.body.customerAttribution || [];
  const foundAttr = attrEntries.find(a => a.customer_name === 'Vikram Malhotra');
  assert(foundAttr, 'Vikram Malhotra not found in AI Revenue Attribution');
  console.log(`  ✓ AI Revenue Attribution Sync: ₹${foundAttr.total_spend} attributed to "${foundAttr.customer_name}"`);

  console.log('\n========================================================================');
  console.log('  ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('  - Clean landing page with 3 portal cards (no auth on landing)');
  console.log('  - 3 distinct dedicated login dashboards with role styling & 1-click demos');
  console.log('  - Full backend authentication & registration for Customer, Merchant & AI-to-AI');
  console.log('  - Full end-to-end customer sync with Merchant Orders & Revenue Attribution');
  console.log('========================================================================\n');
}

verifyAll().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
