const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('========================================================================');
console.log('  VERIFYING SHOPPING CONVERSION: CHAT BOX & SPEECH RECOGNITION');
console.log('========================================================================\n');

// 1. Verify HTML elements
console.log('Step 1: Checking Client HTML components...');
const htmlPath = path.join(__dirname, '../client/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

assert(html.includes('id="voice-soundwave"'), 'Missing #voice-soundwave in index.html');
assert(html.includes('class="soundwave-bar"'), 'Missing .soundwave-bar in index.html');
assert(html.includes('id="voice-quick-prompts-tray"'), 'Missing #voice-quick-prompts-tray in index.html');
assert(html.includes('class="btn-voice-prompt"'), 'Missing .btn-voice-prompt in index.html');
assert(html.includes('Interactive 1-click cart actions, bundle offers &amp; voice shopping'), 'Missing updated shopping conversation header in index.html');
console.log('✓ All Voice & Chat HTML components validated.');

// 2. Verify CSS rules
console.log('\nStep 2: Checking Client CSS styles...');
const cssPath = path.join(__dirname, '../client/index.css');
const css = fs.readFileSync(cssPath, 'utf8');

const requiredSelectors = [
  '.voice-soundwave',
  '.soundwave-bar',
  '@keyframes soundwave-pulse',
  '.voice-quick-prompts-tray',
  '.btn-voice-prompt',
  '.chat-product-card',
  '.cpc-thumb',
  '.cpc-btn-add',
  '.cpc-btn-buynow',
  '.chat-bundle-card',
  '.cbc-btn-accept',
  '.chat-action-pills',
  '.chat-action-pill',
  '.chat-cart-confirm-banner',
  '.ccc-btn-checkout',
  '.chat-typing-bubble',
  '.typing-dot'
];

for (const sel of requiredSelectors) {
  assert(css.includes(sel), `Missing CSS selector: ${sel}`);
}
console.log('✓ All CSS selectors and animations verified.');

// 3. Verify JavaScript logic
console.log('\nStep 3: Checking Client JavaScript controller...');
const jsPath = path.join(__dirname, '../client/app.js');
const js = fs.readFileSync(jsPath, 'utf8');

const requiredJsSnippets = [
  'appendAssistantChatResponse',
  'chat-product-card',
  'window.quickBuyNow',
  'window.triggerCheckoutFlow',
  'appendInChatCartConfirmation',
  'appendTypingIndicator',
  'simulateVoiceCommand',
  'voice-quick-prompts-tray',
  'btn-voice-prompt'
];

for (const snip of requiredJsSnippets) {
  assert(js.includes(snip), `Missing JS logic for: ${snip}`);
}
console.log('✓ All JS conversion functions and voice commands verified.');

// 4. Verify API response structure for conversational queries
console.log('\nStep 4: Testing API Chat & Negotiation Responses...');

function makeRequest(method, pathName, data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: pathName,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  // Test query 1: "I need wireless headphones under ₹5,000 for travel"
  const sessId = 'sess_test_voice_' + Date.now();
  const q1 = await makeRequest('POST', '/api/shopping/chat', {
    message: 'I need wireless headphones under ₹5,000 for travel',
    sessionId: sessId
  });

  assert.strictEqual(q1.status, 200);
  assert(q1.body.recommendations && q1.body.recommendations.length > 0, 'No recommendations returned');
  const topProd = q1.body.recommendations[0].product;
  console.log(`  ✓ Search Query OK: Recommended "${topProd.name}" (₹${topProd.price})`);
  assert(topProd.price <= 5000, 'Product exceeded budget');

  // Test query 2: Negotiation "Can you make it ₹4,000?"
  const q2 = await makeRequest('POST', '/api/shopping/chat', {
    message: 'Can you make it ₹4,000?',
    sessionId: sessId
  });
  assert.strictEqual(q2.status, 200);
  assert(q2.body.negotiation, 'Missing negotiation evaluation');
  console.log(`  ✓ Negotiation Query OK: Evaluated discount (Bundle alternative: ${q2.body.negotiation.bundleAlternative ? 'Present' : 'None'})`);

  // Test cart add and discount
  const addRes = await makeRequest('POST', '/api/shopping/cart/add', {
    sessionId: sessId,
    productId: topProd.id,
    quantity: 1
  });
  assert.strictEqual(addRes.status, 200);
  assert(addRes.body.success, 'Failed to add item to cart');
  console.log(`  ✓ Cart Conversion OK: Cart total ₹${addRes.body.cart.total}`);

  console.log('\n========================================================================');
  console.log('  ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
})().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
