const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('========================================================================');
console.log('  VERIFYING CUSTOMER LOGIN & AUTHENTICATION POP-UP MODAL');
console.log('========================================================================\n');

// 1. Verify HTML Structure
console.log('Step 1: Checking Login Pop-up Modal HTML...');
const html = fs.readFileSync(path.join(__dirname, '../client/index.html'), 'utf8');

assert(html.includes('id="modal-customer-login"'), 'Missing #modal-customer-login in index.html');
assert(html.includes('id="btn-close-customer-login-modal"'), 'Missing #btn-close-customer-login-modal');
assert(html.includes('id="tab-popup-login"'), 'Missing #tab-popup-login');
assert(html.includes('id="tab-popup-signup"'), 'Missing #tab-popup-signup');
assert(html.includes('id="form-popup-login"'), 'Missing #form-popup-login');
assert(html.includes('id="form-popup-signup"'), 'Missing #form-popup-signup');
assert(html.includes('id="popup-login-email"'), 'Missing #popup-login-email');
assert(html.includes('id="popup-login-password"'), 'Missing #popup-login-password');
assert(html.includes('id="btn-popup-submit-login"'), 'Missing #btn-popup-submit-login');
assert(html.includes('id="btn-popup-submit-signup"'), 'Missing #btn-popup-submit-signup');
assert(html.includes('id="btn-popup-demo-aarav"'), 'Missing #btn-popup-demo-aarav');
assert(html.includes('id="btn-popup-demo-priya"'), 'Missing #btn-popup-demo-priya');
assert(html.includes('id="btn-orders-switch-account"'), 'Missing #btn-orders-switch-account');
console.log('✓ All login pop-up HTML elements verified.');

// 2. Verify JavaScript Logic
console.log('\nStep 2: Checking Client JavaScript Controller...');
const js = fs.readFileSync(path.join(__dirname, '../client/app.js'), 'utf8');

const requiredJs = [
  'setupCustomerLoginModal',
  'openCustomerLoginModal',
  'closeCustomerLoginModal',
  'modal-customer-login',
  'tab-popup-login',
  'tab-popup-signup',
  'form-popup-login',
  'form-popup-signup',
  'btn-popup-demo-aarav',
  'btn-popup-demo-priya',
  'btn-orders-switch-account'
];

for (const snip of requiredJs) {
  assert(js.includes(snip), `Missing JS logic for: ${snip}`);
}
console.log('✓ All JS controller functions and popup hooks verified.');

// 3. Verify Login API
console.log('\nStep 3: Verifying Customer Login API...');
function post(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const res = await post('/api/customer/login', { email: 'priya@example.com', password: 'password123' });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.success, 'Login failed');
    assert.strictEqual(res.body.customer.name, 'Priya Shah', 'Wrong customer name');
    console.log('✓ Customer Login API returned verified customer:', res.body.customer.name);

    console.log('\n========================================================================');
    console.log('  ALL LOGIN POP-UP VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================');
  } catch (err) {
    console.error('API Verification error:', err);
    process.exit(1);
  }
})();
