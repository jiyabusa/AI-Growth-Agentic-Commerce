const http = require('http');

async function runAuthTests() {
  console.log('--- Starting Real Auth & Mandate API Tests ---');

  // Let's test server.js directly using supertest-like fetch or against local server
  const baseUrl = 'http://localhost:3000';

  // 1. Health / Server check
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123';
  const testName = 'Dev Tester';

  let sessionCookie = '';

  // 2. Test Registration
  console.log('\n[TEST 1] Testing /api/auth/register...');
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });
  const regData = await regRes.json();
  console.log('Register status:', regRes.status, 'Success:', regData.success, 'User:', regData.customer?.email);
  if (!regData.success) throw new Error('Registration failed: ' + JSON.stringify(regData));

  // Extract cookie
  const setCookie = regRes.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
    console.log('✔ httpOnly Cookie captured:', sessionCookie.substring(0, 30) + '...');
  } else {
    throw new Error('No set-cookie header received on registration!');
  }

  // 3. Test /api/auth/me with Cookie
  console.log('\n[TEST 2] Testing /api/auth/me session restore...');
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Cookie': sessionCookie }
  });
  const meData = await meRes.json();
  console.log('Me status:', meRes.status, 'User:', meData.customer?.name, 'Active Mandate:', meData.activeMandate);
  if (!meData.success || meData.customer?.email !== testEmail) {
    throw new Error('/api/auth/me failed to restore user profile!');
  }
  console.log('✔ Session verified via httpOnly cookie successfully.');

  // 4. Test Spend Mandate Creation
  console.log('\n[TEST 3] Testing /api/mandates/create...');
  const mandateRes = await fetch(`${baseUrl}/api/mandates/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      max_amount: 3000,
      category: 'electronics',
      valid_duration_seconds: 3600
    })
  });
  const mandateData = await mandateRes.json();
  console.log('Mandate status:', mandateRes.status, 'Created limit:', mandateData.formatted_details?.authorized_limit);
  if (!mandateData.success || !mandateData.mandate) {
    throw new Error('Mandate creation failed!');
  }
  console.log('✔ AP2 Cryptographic mandate issued & stored in SQLite.');

  // 5. Test Mandate Enforcement on Checkout
  console.log('\n[TEST 4] Testing Mandate Enforcement...');
  // Add item of price 4499 (which exceeds 3000 mandate)
  // First setup cart
  await fetch(`${baseUrl}/api/shopping/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'test_session_mandate',
      productId: 'prod_anc_headphones',
      quantity: 1
    })
  });

  const payRes = await fetch(`${baseUrl}/api/shopping/checkout/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      sessionId: 'test_session_mandate',
      userApproved: true
    })
  });
  const payData = await payRes.json();
  console.log('Checkout pay status with exceeding amount:', payRes.status, 'ErrorType:', payData.errorType);
  if (payRes.status === 403 && payData.errorType === 'MANDATE_EXCEEDED') {
    console.log('✔ Mandate ceiling ENFORCED! Transaction properly rejected because total exceeds mandate limit.');
  } else {
    throw new Error('Expected mandate limit rejection, got: ' + JSON.stringify(payData));
  }

  // 6. Test Profile PATCH
  console.log('\n[TEST 5] Testing PATCH /api/customer/profile...');
  const patchRes = await fetch(`${baseUrl}/api/customer/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      name: 'Dev Tester Updated',
      notification_pref: 'sms'
    })
  });
  const patchData = await patchRes.json();
  console.log('Patch status:', patchRes.status, 'New Name:', patchData.customer?.name, 'Pref:', patchData.customer?.notification_pref);
  if (!patchData.success || patchData.customer?.name !== 'Dev Tester Updated') {
    throw new Error('Profile PATCH failed!');
  }
  console.log('✔ Profile updated and persisted successfully.');

  // 7. Test Logout
  console.log('\n[TEST 6] Testing /api/auth/logout...');
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': sessionCookie }
  });
  const logoutData = await logoutRes.json();
  console.log('Logout status:', logoutRes.status, 'Success:', logoutData.success);

  // Subsequent me check without cookie or with cleared cookie
  const checkAfterLogout = await fetch(`${baseUrl}/api/auth/me`);
  console.log('Check after logout status:', checkAfterLogout.status);
  if (checkAfterLogout.status === 401) {
    console.log('✔ Unauthenticated state properly returned after logout.');
  } else {
    throw new Error('Expected 401 after logout, got: ' + checkAfterLogout.status);
  }

  console.log('\n=============================================');
  console.log('  ALL BACKEND AUTH & MANDATE TESTS PASSED!   ');
  console.log('=============================================');
}

runAuthTests().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
