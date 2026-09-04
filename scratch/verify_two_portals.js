const fs = require('fs');
const http = require('http');
const assert = require('assert');

const html = fs.readFileSync('client/index.html', 'utf8');

console.log('1. Checking removal of AI-to-AI elements from HTML...');
const forbiddenSelectors = [
  'id="btn-nav-ai2ai"',
  'id="btn-launch-ai2ai"',
  'id="card-enter-ai2ai"',
  'id="view-ai2ai-auth"',
  'id="sub-ai2ai"',
  'id="view-ai2ai"',
  'id="modal-ai-to-ai"',
  'class="ai2ai-promo-banner"',
  'special-ai2ai-nav'
];

forbiddenSelectors.forEach(sel => {
  assert(!html.includes(sel), 'Forbidden element still present in HTML: ' + sel);
});
console.log('✓ Zero AI-to-AI elements present in client/index.html');

console.log('2. Checking 2 core portals in client/index.html...');
assert(html.includes('id="card-enter-shopping"'), 'Missing card-enter-shopping');
assert(html.includes('id="card-enter-merchant"'), 'Missing card-enter-merchant');
assert(html.includes('id="view-shopping"'), 'Missing view-shopping');
assert(html.includes('id="view-merchant"'), 'Missing view-merchant');
console.log('✓ Both Customer Shopping and Merchant Command Center portals are intact');

console.log('3. Verifying removed endpoints return 404...');
async function testEndpoint(method, path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      resolve(res.statusCode);
    });
    req.write('{}');
    req.end();
  });
}

(async () => {
  const code1 = await testEndpoint('POST', '/api/ai2ai/login');
  assert.strictEqual(code1, 404, '/api/ai2ai/login should return 404');
  console.log('✓ POST /api/ai2ai/login returns 404 Not Found');

  const code2 = await testEndpoint('POST', '/api/ai2ai/register');
  assert.strictEqual(code2, 404, '/api/ai2ai/register should return 404');
  console.log('✓ POST /api/ai2ai/register returns 404 Not Found');

  const code3 = await testEndpoint('POST', '/api/simulation/ai-to-ai');
  assert.strictEqual(code3, 404, '/api/simulation/ai-to-ai should return 404');
  console.log('✓ POST /api/simulation/ai-to-ai returns 404 Not Found');

  console.log('\n======================================================');
  console.log('  ALL TWO-PORTAL ARCHITECTURE CHECKS PASSED 100%!     ');
  console.log('======================================================');
})();
