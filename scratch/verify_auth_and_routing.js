const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function req(method, endpoint, body = null, cookie = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, data, contentType, setCookie };
}

async function runVerification() {
  console.log('>>> RUNNING COMPREHENSIVE AUTH, ROUTING & DEMO VERIFICATION <<<\n');

  // TEST 1: Vercel Config & Serverless Entrypoint Check
  console.log('[TEST 1] Verifying Vercel configuration & serverless entrypoint...');
  assert(fs.existsSync('vercel.json'), 'vercel.json must exist');
  const vercelCfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert(vercelCfg.rewrites && vercelCfg.rewrites.length >= 2, 'vercel.json must configure rewrites');
  assert(fs.existsSync('api/index.js'), 'api/index.js must exist');
  const serverlessApp = require('../api/index.js');
  assert(typeof serverlessApp === 'function', 'api/index.js must export Express app');
  console.log('✔ Vercel configuration & api/index.js serverless entrypoint valid.');

  // TEST 2: Customer Signup -> Immediate Login
  console.log('\n[TEST 2] Testing Customer Signup -> Immediate Login with same credentials...');
  const testEmail = `newcust_${Date.now()}@example.com`;
  const testPassword = 'mysecurepassword123';
  const regRes = await req('POST', '/api/auth/register', {
    name: 'Test Customer',
    email: testEmail,
    password: testPassword
  });
  assert.strictEqual(regRes.status, 200);
  assert.strictEqual(regRes.data.success, true);
  assert(regRes.setCookie && regRes.setCookie.includes('revify_token'), 'Must issue revify_token cookie');

  // Immediate login with newly created credentials
  const loginRes = await req('POST', '/api/auth/login', {
    email: testEmail,
    password: testPassword
  });
  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.data.success, true);
  assert.strictEqual(loginRes.data.user.email, testEmail);
  console.log('✔ Customer signup directly followed by login SUCCEEDED.');

  // TEST 3: Duplicate Email Signup Rejection
  console.log('\n[TEST 3] Testing Duplicate Email Signup Rejection...');
  const dupRes = await req('POST', '/api/auth/register', {
    name: 'Duplicate User',
    email: testEmail,
    password: testPassword
  });
  assert.strictEqual(dupRes.status, 400);
  assert.strictEqual(dupRes.data.success, false);
  assert.strictEqual(dupRes.data.code, 'EMAIL_EXISTS');
  assert(dupRes.data.error.includes('already exists'), 'Must specify account already exists');
  console.log('✔ Duplicate customer email accurately rejected with specific message:', dupRes.data.error);

  // TEST 4: Distinct Error on Wrong Password vs Missing Account
  console.log('\n[TEST 4] Testing Distinct Login Error Messages...');
  const wrongPassRes = await req('POST', '/api/auth/login', {
    email: testEmail,
    password: 'wrongpassword999'
  });
  assert.strictEqual(wrongPassRes.status, 401);
  assert.strictEqual(wrongPassRes.data.code, 'INVALID_CREDENTIALS');
  assert(wrongPassRes.data.error.includes('Incorrect password'), 'Must specify incorrect password');

  const noAccRes = await req('POST', '/api/auth/login', {
    email: `nonexistent_${Date.now()}@example.com`,
    password: 'password123'
  });
  assert.strictEqual(noAccRes.status, 401);
  assert.strictEqual(noAccRes.data.code, 'USER_NOT_FOUND');
  assert(noAccRes.data.error.includes('No account found'), 'Must specify no account found');
  console.log('✔ Wrong password error distinct from missing account error.');

  // TEST 5: Merchant Signup -> Immediate Login
  console.log('\n[TEST 5] Testing Merchant Signup -> Immediate Login...');
  const merchEmail = `merch_${Date.now()}@example.com`;
  const merchReg = await req('POST', '/api/merchant/register', {
    businessName: 'Apex Innovations',
    ownerName: 'Dev Sharma',
    email: merchEmail,
    password: 'merchantpass123'
  });
  assert.strictEqual(merchReg.status, 200);
  assert.strictEqual(merchReg.data.success, true);
  assert(merchReg.setCookie && merchReg.setCookie.includes('revify_merchant_token'));

  const merchLogin = await req('POST', '/api/merchant/login', {
    email: merchEmail,
    password: 'merchantpass123'
  });
  assert.strictEqual(merchLogin.status, 200);
  assert.strictEqual(merchLogin.data.success, true);
  assert.strictEqual(merchLogin.data.merchant.businessName, 'Apex Innovations');
  console.log('✔ Merchant signup directly followed by login SUCCEEDED.');

  // TEST 6: Merchant Session Guard (/api/merchant/me)
  console.log('\n[TEST 6] Testing Merchant Session Verification & Auth Guard...');
  // Without cookie -> 401
  const unauthMe = await req('GET', '/api/merchant/me');
  assert.strictEqual(unauthMe.status, 401);
  assert.strictEqual(unauthMe.data.authenticated, false);

  // With cookie from login -> 200
  const authMe = await req('GET', '/api/merchant/me', null, merchLogin.setCookie);
  assert.strictEqual(authMe.status, 200);
  assert.strictEqual(authMe.data.authenticated, true);
  assert.strictEqual(authMe.data.merchant.businessName, 'Apex Innovations');
  console.log('✔ /api/merchant/me session guard accurately protects dashboard.');

  // TEST 7: Route Aliases (/api/auth/signup & /api/merchant/signup)
  console.log('\n[TEST 7] Testing Route Aliases...');
  const aliasCustEmail = `alias_cust_${Date.now()}@example.com`;
  const aliasCust = await req('POST', '/api/auth/signup', {
    name: 'Alias User',
    email: aliasCustEmail,
    password: 'password123'
  });
  assert.strictEqual(aliasCust.status, 200);
  assert.strictEqual(aliasCust.data.success, true);

  const aliasMerchEmail = `alias_merch_${Date.now()}@example.com`;
  const aliasMerch = await req('POST', '/api/merchant/signup', {
    businessName: 'Alias Merchant',
    ownerName: 'Alias Owner',
    email: aliasMerchEmail,
    password: 'password123'
  });
  assert.strictEqual(aliasMerch.status, 200);
  assert.strictEqual(aliasMerch.data.success, true);
  console.log('✔ Route aliases /api/auth/signup and /api/merchant/signup reachable and working.');

  // TEST 8: Seeded Customer Demo Accounts
  console.log('\n[TEST 8] Testing Pre-Seeded 1-Click Customer Demo Accounts...');
  const customerDemos = [
    { email: 'aarav@example.com', name: 'Aarav Sharma' },
    { email: 'priya@example.com', name: 'Priya Shah' },
    { email: 'rohan@example.com', name: 'Rohan Mehta' }
  ];
  for (const demo of customerDemos) {
    const res = await req('POST', '/api/auth/login', { email: demo.email, password: 'password123' });
    assert.strictEqual(res.status, 200, `Demo customer ${demo.email} should login successfully`);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.user.email, demo.email);
    console.log(`  ✔ Customer Demo [${demo.name}]: Logged in successfully`);
  }

  // TEST 9: Seeded Merchant Demo Accounts
  console.log('\n[TEST 9] Testing Pre-Seeded 1-Click Merchant Demo Accounts...');
  const merchantDemos = [
    { email: 'admin@revify.com', name: 'Revify Labs' },
    { email: 'meera@acousticpro.com', name: 'AcousticPro Audio' },
    { email: 'karan@hypertravel.com', name: 'HyperTravel Tech Supply' }
  ];
  for (const demo of merchantDemos) {
    const res = await req('POST', '/api/merchant/login', { email: demo.email, password: 'password123' });
    assert.strictEqual(res.status, 200, `Demo merchant ${demo.email} should login successfully`);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.merchant.email, demo.email);
    console.log(`  ✔ Merchant Demo [${demo.name}]: Logged in successfully`);
  }

  console.log('\n======================================================');
  console.log('  ALL AUTH, ROUTING & DEMO VERIFICATION CHECKS PASSED! ');
  console.log('======================================================');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
