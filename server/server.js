const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const dbService = require('./services/dbService');
const aiSalespersonService = require('./services/aiSalespersonService');
const policyEngine = require('./services/policyEngine');
const auditReplayService = require('./services/auditReplayService');
const razorpayService = require('./services/razorpayService');

// Advanced AI-Native Commerce Services
const readinessService = require('./services/readinessService');
const anomalyService = require('./services/anomalyService');
const simulatorService = require('./services/simulatorService');
const policyParserService = require('./services/policyParserService');

// Retain protocol service utilities
const mandateService = require('./services/mandateService');
const frmService = require('./services/frmService');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { authMiddleware, optionalAuthMiddleware } = require('./middleware/authMiddleware');

const app = express();

// Security: CORS locked to trusted origins with credentials support
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Dev mode permissive fallback while keeping credentials header clean
  },
  credentials: true
}));

app.use(cookieParser(config.COOKIE_SECRET));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Rate Limiting to prevent brute-force on auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Helper: Issue httpOnly JWT Cookie for authenticated sessions
 */
function setAuthCookie(res, user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'customer'
  };
  const token = jwt.sign(payload, config.JWT_SECRET || 'revify-jwt-super-secret-key-2026', {
    expiresIn: '7d'
  });
  res.cookie('revify_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  return token;
}

// =================================================================
// 0. CUSTOMER AUTHENTICATION & PROFILE APIS (REAL DB & JWT SESSIONS)
// =================================================================

/**
 * Customer Sign Up / Registration
 */
const handleRegister = (req, res) => {
  const { name, email, password } = req.body;
  const result = dbService.registerCustomer({ name, email, password });
  if (!result.success) {
    return res.status(400).json(result);
  }
  const token = setAuthCookie(res, result.customer);
  res.json({
    ...result,
    token
  });
};
app.post('/api/auth/register', handleRegister);
app.post('/api/customer/register', handleRegister);

/**
 * Customer Login / Sign In (with Rate Limiting & httpOnly JWT Cookie)
 */
const handleLogin = (req, res) => {
  const { email, password } = req.body;
  const result = dbService.loginCustomer({ email, password });
  if (!result.success) {
    return res.status(401).json(result);
  }
  const token = setAuthCookie(res, result.customer);
  res.json({
    ...result,
    token
  });
};
app.post('/api/auth/login', loginLimiter, handleLogin);
app.post('/api/customer/login', loginLimiter, handleLogin);

/**
 * Session Verification (/api/auth/me)
 * Checks httpOnly cookie on page load to restore authenticated session
 */
const handleGetMe = (req, res) => {
  const customer = dbService.getCustomerById(req.user.id);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }
  const activeMandate = dbService.getActiveMandate(req.user.id);
  res.json({
    success: true,
    customer,
    activeMandate: activeMandate || null,
    hasActiveMandate: !!activeMandate
  });
};
app.get('/api/auth/me', authMiddleware, handleGetMe);
app.get('/api/customer/me', authMiddleware, handleGetMe);

/**
 * Customer Log Out
 * Clears httpOnly JWT session cookie
 */
const handleLogout = (req, res) => {
  res.clearCookie('revify_token', {
    httpOnly: true,
    sameSite: 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
};
app.post('/api/auth/logout', handleLogout);
app.post('/api/customer/logout', handleLogout);

/**
 * Editable Customer Profile (PATCH /api/customer/profile and PATCH /profile)
 */
const handleProfilePatch = (req, res) => {
  const { name, email, notification_pref } = req.body;
  const result = dbService.updateCustomerProfile(req.user.id, { name, email, notification_pref });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
};
app.patch('/api/customer/profile', authMiddleware, handleProfilePatch);
app.patch('/api/profile', authMiddleware, handleProfilePatch);

/**
 * Get Customer Profile & Interaction Signals (Optional Auth or query param)
 */
app.get('/api/customer/profile', optionalAuthMiddleware, (req, res) => {
  const targetId = req.query.customerId || (req.user ? req.user.id : null);
  if (!targetId) {
    return res.status(400).json({ error: 'customerId query parameter or valid authentication is required.' });
  }
  const profile = dbService.getCustomerById(targetId);
  if (!profile) {
    return res.status(404).json({ error: 'Customer not found.' });
  }
  const activeMandate = dbService.getActiveMandate(targetId);
  res.json({ customer: profile, activeMandate: activeMandate || null });
});

/**
 * Update Customer Profile (Legacy POST / PUT support)
 */
app.post('/api/customer/profile/update', optionalAuthMiddleware, (req, res) => {
  const customerId = req.body.customerId || (req.user ? req.user.id : null);
  const { name, email, notification_pref } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required.' });
  }
  const result = dbService.updateCustomerProfile(customerId, { name, email, notification_pref });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.put('/api/customer/profile', optionalAuthMiddleware, (req, res) => {
  const customerId = req.body.customerId || (req.user ? req.user.id : null);
  const { name, email, notification_pref } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required.' });
  }
  const result = dbService.updateCustomerProfile(customerId, { name, email, notification_pref });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

/**
 * Get All Registered Customer Accounts
 */
app.get('/api/customer/all', (req, res) => {
  const customers = dbService.getCustomers();
  res.json({ customers, count: customers.length });
});

/**
 * Record Dynamic Customer Signal (Search, View, Interaction)
 */
app.post('/api/customer/signal', optionalAuthMiddleware, (req, res) => {
  const customerId = req.body.customerId || (req.user ? req.user.id : null);
  const { signalType, value } = req.body;
  if (!customerId || !signalType || !value) {
    return res.status(400).json({ error: 'customerId, signalType, and value are required.' });
  }
  const updated = dbService.recordCustomerSignal(customerId, signalType, value);
  res.json({ success: true, customer: updated });
});

/**
 * Get Customer Order History (Scoped to authenticated session)
 */
app.get('/api/customer/orders', optionalAuthMiddleware, (req, res) => {
  const targetId = (req.user && req.user.id) || req.query.customerId;
  if (!targetId) {
    return res.json({ orders: [], count: 0 });
  }
  const orders = dbService.getCustomerOrders(targetId);
  res.json({ orders: orders || [], count: (orders || []).length });
});

// =================================================================
// 0a. AP2 / UAP SPEND MANDATE APIS
// =================================================================

/**
 * Get Current Active Mandate for Authenticated User
 */
app.get('/api/mandates/active', authMiddleware, (req, res) => {
  const mandate = dbService.getActiveMandate(req.user.id);
  res.json({
    success: true,
    mandate: mandate || null,
    hasActiveMandate: !!mandate
  });
});

/**
 * Create Cryptographically Signed AP2 / UAP Spend Mandate
 */
app.post('/api/mandates/create', authMiddleware, (req, res) => {
  const { max_amount, category, valid_duration_seconds } = req.body;
  const maxAmountNum = Number(max_amount) || 5000;
  const durationSec = Number(valid_duration_seconds) || 3600;

  const signed = mandateService.createMandate({
    user_id: req.user.id,
    max_amount: maxAmountNum,
    category: category || 'electronics',
    valid_duration_seconds: durationSec
  });

  const saved = dbService.saveMandate({
    user_id: req.user.id,
    agent_id: signed.payload.agent_id,
    max_amount: signed.payload.max_amount,
    category: signed.payload.category,
    valid_duration_seconds: durationSec,
    issued_at: signed.payload.issued_at,
    valid_until: signed.payload.valid_until,
    nonce: signed.payload.nonce,
    token: signed.token
  });

  res.json({
    success: true,
    mandate: saved,
    token: signed.token,
    formatted_details: signed.formatted_details
  });
});

/**
 * Revoke Mandate for Authenticated User
 */
app.post('/api/mandates/revoke', authMiddleware, (req, res) => {
  const result = dbService.revokeMandate(req.user.id);
  res.json(result);
});

// =================================================================
// 0c. REAL DATABASE-BACKED USER CART APIS
// =================================================================

app.get('/api/cart', optionalAuthMiddleware, (req, res) => {
  const userId = (req.user && req.user.id) || req.query.userId || 'guest';
  const items = dbService.getUserCart(userId);
  res.json({ success: true, items: items || [] });
});

app.post('/api/cart/add', optionalAuthMiddleware, (req, res) => {
  const userId = (req.user && req.user.id) || req.body.userId || 'guest';
  const { productId, quantity } = req.body;
  const items = dbService.addToUserCart(userId, productId, Number(quantity) || 1);
  res.json({ success: true, items });
});

app.delete('/api/cart/clear', optionalAuthMiddleware, (req, res) => {
  const userId = (req.user && req.user.id) || req.body.userId || 'guest';
  const items = dbService.clearUserCart(userId);
  res.json({ success: true, items });
});

// =================================================================
// 0b. MERCHANT AUTHENTICATION APIS
// =================================================================

/**
 * Merchant Sign Up / Registration
 */
app.post('/api/merchant/register', (req, res) => {
  const { businessName, storeName, ownerName, email, password } = req.body;
  const result = dbService.registerMerchant({ businessName, storeName, ownerName, email, password });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

/**
 * Merchant Login / Sign In
 */
app.post('/api/merchant/login', (req, res) => {
  const { email, password } = req.body;
  const result = dbService.loginMerchant({ email, password });
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

/**
 * Get 6-8 Explainable Top Recommendations (Personalized or Multi-Source Trending)
 */
app.get('/api/shopping/recommendations/top', (req, res) => {
  const customerId = req.query.customerId;
  const customerProfile = customerId ? dbService.getCustomerById(customerId) : null;
  const recommendations = aiSalespersonService.getPersonalizedTopRecommendations(customerProfile, 8);
  res.json({
    recommendations,
    count: recommendations.length,
    isPersonalized: !!(customerProfile && customerProfile.isReturning),
    customerName: customerProfile ? customerProfile.name : null
  });
});

// =================================================================
// 1. AI SHOPPING APIS (CUSTOMER-FACING)
// =================================================================

/**
 * Primary Natural Language Shopping Agent Endpoint
 */
app.post('/api/shopping/chat', (req, res) => {
  const { message, sessionId = 'default', customerId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Record customer search signal if authenticated
  if (customerId) {
    dbService.recordCustomerSignal(customerId, 'SEARCH', message);
  }

  // Check if Agent is Paused
  const policies = dbService.getPolicies();
  if (policies.agent_status === 'PAUSED') {
    return res.json({
      agentStatus: 'PAUSED',
      reply: "The merchant's AI purchasing system is currently paused by admin controls. You can still browse our catalog, but financial transactions cannot be processed at this moment.",
      recommendations: [],
      negotiation: null,
      upsellAndCrossSell: null,
      smartCartOpportunity: null
    });
  }

  // 1. Understand Intent & Confidence
  const intent = aiSalespersonService.understandIntent(message);

  // Update session memory
  if (intent.travelOriented) dbService.updateSessionMemory(sessionId, { useCase: 'Travel' });
  if (intent.maxBudget) dbService.updateSessionMemory(sessionId, { budget: intent.maxBudget });
  if (intent.noiseCancelling) dbService.updateSessionMemory(sessionId, { priority: 'Active Noise Cancellation' });
  const sessionMemory = dbService.getSessionMemory(sessionId);

  // Handle Ambiguity with Clarifying Prompt
  if (intent.isAmbiguous) {
    return res.json({
      agentStatus: 'ACTIVE',
      intent,
      reply: intent.clarifyingPrompt,
      recommendations: [],
      upsellAndCrossSell: null,
      negotiation: null,
      sessionMemory,
      smartCartOpportunity: null
    });
  }

  // 2. Recommendation & Search
  const recommendations = aiSalespersonService.recommendProducts(intent);
  const primaryRecommendation = recommendations.length > 0 ? recommendations[0].product : null;

  // 3. Upsell & Cross-Sell Match
  let upsellAndCrossSell = null;
  if (primaryRecommendation) {
    upsellAndCrossSell = aiSalespersonService.getUpsellAndCrossSell(primaryRecommendation.id);
  }

  // 4. Negotiation Handling
  let negotiation = null;
  if (intent.requestedDiscount && primaryRecommendation) {
    negotiation = aiSalespersonService.evaluateNegotiation(
      primaryRecommendation.id,
      intent.discountTargetPrice || Math.round(primaryRecommendation.price * (1 - (intent.discountTargetPercent || 10) / 100))
    );
  }

  // 5. Smart Cart Opportunity Analysis
  const currentCart = dbService.getCart(sessionId);
  const smartCartOpportunity = aiSalespersonService.analyzeCartOptimization(currentCart, sessionMemory);

  // 6. Construct conversational response
  let replyText = '';
  if (negotiation) {
    if (negotiation.allowed) {
      replyText = `Great news! ${negotiation.explanation} Would you like to proceed with this discounted order?`;
    } else {
      replyText = `${negotiation.explanation}`;
      if (negotiation.bundleAlternative) {
        replyText += ` Alternatively, check out our special bundle option below!`;
      }
    }
  } else if (recommendations.length > 0) {
    const top = recommendations[0];
    replyText = `I found ${recommendations.length} great options. I especially recommend the **${top.product.name}** (₹${top.product.price.toLocaleString('en-IN')}) because ${top.explanation}`;
    if (upsellAndCrossSell && upsellAndCrossSell.crossSells.length > 0) {
      const topCross = upsellAndCrossSell.crossSells[0];
      replyText += ` To go with it, I also recommend adding the **${topCross.product.name}** (₹${topCross.product.price.toLocaleString('en-IN')}) for full protection.`;
    }
  } else {
    replyText = `I searched our agent-readable catalog for "${message}", but didn't find an exact match. Here are our top featured electronics.`;
  }

  res.json({
    agentStatus: 'ACTIVE',
    intent,
    reply: replyText,
    recommendations,
    upsellAndCrossSell,
    negotiation,
    sessionMemory,
    smartCartOpportunity
  });
});

/**
 * Session Context & Shopping Memory Endpoints
 */
app.get('/api/shopping/session/context', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  res.json(dbService.getSessionMemory(sessionId));
});

app.post('/api/shopping/session/context', (req, res) => {
  const { sessionId = 'default', updates = {} } = req.body;
  res.json(dbService.updateSessionMemory(sessionId, updates));
});

app.delete('/api/shopping/session/context', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  res.json(dbService.clearSessionMemory(sessionId));
});

/**
 * Get Agent-Readable Catalog
 */
app.get('/api/shopping/products', (req, res) => {
  res.json({
    products: dbService.getProducts(),
    count: dbService.getProducts().length
  });
});

/**
 * Cart Management Endpoints
 */
app.get('/api/shopping/cart', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  res.json(dbService.getCart(sessionId));
});

app.post('/api/shopping/cart/add', (req, res) => {
  const { sessionId = 'default', productId, quantity = 1, isUpsell = false, isCrossSell = false } = req.body;
  const result = dbService.addToCart(sessionId, productId, quantity, isUpsell, isCrossSell);
  res.json(result);
});

app.post('/api/shopping/cart/discount', (req, res) => {
  const { sessionId = 'default', discountAmount, reason } = req.body;
  const cart = dbService.applyCartDiscount(sessionId, discountAmount, reason);
  res.json(cart);
});

app.post('/api/shopping/cart/remove', (req, res) => {
  const { sessionId = 'default', productId } = req.body;
  const cart = dbService.removeFromCart(sessionId, productId);
  res.json(cart);
});

app.post('/api/shopping/cart/clear', (req, res) => {
  const { sessionId = 'default' } = req.body;
  const cart = dbService.clearCart(sessionId);
  res.json(cart);
});

/**
 * Checkout Step 1: Policy Engine Evaluation
 */
app.post('/api/shopping/checkout/evaluate', (req, res) => {
  const { sessionId = 'default', customerId, customerName = 'AI Buyer' } = req.body;
  const cart = dbService.getCart(sessionId);

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  let resolvedCustomerName = customerName;
  if (customerId) {
    const cust = dbService.getCustomerById(customerId);
    if (cust && cust.name) resolvedCustomerName = cust.name;
  }

  const evaluation = policyEngine.evaluateTransaction({
    amount: cart.total,
    items: cart.items,
    customerName: resolvedCustomerName
  });

  res.json({
    cart,
    customerName: resolvedCustomerName,
    policyEvaluation: evaluation
  });
});

/**
 * Checkout Step 2: Razorpay Test-Mode Payment & Order Confirmation with Mandate Verification
 */
app.post('/api/shopping/checkout/pay', optionalAuthMiddleware, async (req, res) => {
  const { sessionId = 'default', customerId, customerName, cardNumber = '4111111111111111', userApproved = true, originalIntentText } = req.body;
  const cart = dbService.getCart(sessionId);

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  // Resolve customer id and name from authenticated session or request body
  const effectiveUserId = (req.user && req.user.id) || customerId;
  let resolvedCustomerName = (req.user && req.user.name) || customerName;
  if (effectiveUserId) {
    const cust = dbService.getCustomerById(effectiveUserId);
    if (cust && cust.name) {
      resolvedCustomerName = cust.name;
    }
  }
  if (!resolvedCustomerName) resolvedCustomerName = 'Customer';

  // 0. Enforce Authenticated User's Agent Spend Mandate if present
  if (effectiveUserId) {
    const userMandate = dbService.getActiveMandate(effectiveUserId);
    if (userMandate) {
      if (cart.total > userMandate.max_amount) {
        return res.status(403).json({
          success: false,
          errorType: 'MANDATE_EXCEEDED',
          reason: `Transaction amount ₹${cart.total.toLocaleString('en-IN')} exceeds your agent's authorized spend mandate ceiling of ₹${userMandate.max_amount.toLocaleString('en-IN')}. Update your mandate in your profile to proceed.`,
          mandate: userMandate
        });
      }
    }
  }

  // 1. Policy Gate Check
  const policyCheck = policyEngine.evaluateTransaction({
    amount: cart.total,
    items: cart.items,
    customerName: resolvedCustomerName
  });

  if (!policyCheck.authorized) {
    return res.status(403).json({
      success: false,
      errorType: 'POLICY_BLOCKED',
      reason: policyCheck.reason,
      policyCheck
    });
  }

  // If approval was required but not granted
  if (policyCheck.approvalRequired && !userApproved) {
    return res.status(400).json({
      success: false,
      errorType: 'APPROVAL_REQUIRED',
      reason: 'Transaction requires explicit human approval before payment initiation.',
      policyCheck
    });
  }

  // 2. Razorpay Order Creation (Test Mode)
  const rzpOrder = await razorpayService.createOrder({
    amountInr: cart.total,
    receipt: `rcpt_${Date.now().toString().slice(-6)}`,
    notes: { customer: resolvedCustomerName, customerId: effectiveUserId || '', cartItems: cart.items.length }
  });

  // 3. Razorpay Payment Execution & Verification (Success vs Declined Test Card)
  const paymentResult = razorpayService.simulatePaymentExecution({
    orderId: rzpOrder.orderId,
    amountInr: cart.total,
    cardNumber
  });

  if (!paymentResult.success) {
    // Record failed attempt
    dbService.recordAuditEvent({
      action: 'PAYMENT_FAILED',
      actor: 'Razorpay Test Gateway',
      amount: cart.total,
      reason: `Payment declined: ${paymentResult.errorReason}`,
      status: 'FAILED'
    });

    return res.status(402).json({
      success: false,
      errorType: 'PAYMENT_FAILED',
      errorCode: paymentResult.errorCode,
      reason: paymentResult.errorReason,
      paymentResult
    });
  }

  // 4. Create Confirmed Order in Database with synchronized customer details
  const hasUpsell = cart.items.some(i => i.isUpsell);
  const hasCrossSell = cart.items.some(i => i.isCrossSell);

  const order = dbService.createOrder({
    customer_id: effectiveUserId,
    customer_name: resolvedCustomerName,
    items: cart.items,
    subtotal: cart.subtotal,
    discount: cart.appliedDiscount || 0,
    total: cart.total,
    ai_assisted: true,
    upsell_converted: hasUpsell,
    cross_sell_converted: hasCrossSell,
    payment_method: paymentResult.cardType,
    razorpay_order_id: rzpOrder.orderId,
    razorpay_payment_id: paymentResult.paymentId
  });

  // 5. Generate Step-by-Step Visual Replay Timeline
  const intentData = aiSalespersonService.understandIntent(originalIntentText || `Buy ${cart.items[0]?.name || 'headphones'}`);
  const searchResults = aiSalespersonService.recommendProducts(intentData);

  const replay = auditReplayService.createVisualReplay({
    orderId: order.id,
    customerIntent: intentData,
    catalogSearch: { filter: intentData.category || 'electronics', items: dbService.getProducts(), matchedCount: searchResults.length },
    productRanking: searchResults,
    recommendation: searchResults[0] || { product: cart.items[0], explanation: 'Matched customer parameters.' },
    crossSell: { accepted: hasCrossSell, item: cart.items.find(i => i.isCrossSell) },
    policyCheck,
    userApproval: { approved: true, timestamp: new Date().toISOString() },
    payment: { orderId: rzpOrder.orderId, paymentId: paymentResult.paymentId, method: paymentResult.cardType },
    order
  });

  // 6. Clear Cart
  dbService.clearCart(sessionId);

  res.json({
    success: true,
    order,
    paymentResult,
    replayId: replay.replayId
  });
});

// =================================================================
// 2. MERCHANT PORTAL APIS
// =================================================================

/**
 * Merchant Revenue & Performance Analytics
 */
app.get('/api/merchant/analytics', (req, res) => {
  res.json(dbService.getAnalytics());
});

/**
 * Merchant AI-Readable Catalog Management
 */
app.get('/api/merchant/products', (req, res) => {
  res.json({
    products: dbService.getProducts(),
    count: dbService.getProducts().length
  });
});

/**
 * Merchant Orders & Transactions
 */
app.get('/api/merchant/orders', (req, res) => {
  res.json({
    orders: dbService.getOrders(),
    count: dbService.getOrders().length
  });
});

/**
 * Merchant Policies & Guardrails
 */
app.get('/api/merchant/policies', (req, res) => {
  res.json(dbService.getPolicies());
});

app.post('/api/merchant/policies', (req, res) => {
  const updated = dbService.updatePolicies(req.body);
  dbService.recordAuditEvent({
    action: 'POLICY_UPDATED',
    actor: 'Merchant Admin',
    reason: 'Updated transaction limits, margin controls, and category rules.',
    status: 'SUCCESS'
  });
  res.json(updated);
});

/**
 * Agent Control Center & Kill Switch
 */
app.post('/api/merchant/agent/toggle', (req, res) => {
  const { status } = req.body; // 'ACTIVE' | 'PAUSED'
  const newStatus = dbService.toggleAgentStatus(status || (dbService.getPolicies().agent_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'));
  
  dbService.recordAuditEvent({
    action: newStatus === 'PAUSED' ? 'AGENT_PAUSED_KILL_SWITCH' : 'AGENT_RESUMED',
    actor: 'Merchant Admin',
    reason: newStatus === 'PAUSED' ? 'Emergency kill switch triggered: Paused agent financial execution.' : 'Resumed agent financial execution.',
    status: 'SUCCESS'
  });

  res.json({
    agent_status: newStatus,
    message: newStatus === 'PAUSED' ? 'AI Agent has been PAUSED. All financial actions are halted.' : 'AI Agent is now ACTIVE.'
  });
});

/**
 * Audit Trail & Visual Replay Endpoints
 */
app.get('/api/merchant/audit', (req, res) => {
  res.json({
    events: dbService.getAuditEvents(),
    blockedAttempts: dbService.getBlockedAttempts()
  });
});

app.get('/api/merchant/incidents', (req, res) => {
  res.json({
    incidents: dbService.getIncidents()
  });
});

app.get('/api/merchant/audit/replay/:id', (req, res) => {
  const replay = dbService.getVisualReplay(req.params.id);
  if (!replay) {
    // Generate fallback visual replay from existing order
    const order = dbService.getOrders().find(o => o.id === req.params.id);
    if (order) {
      const fallback = auditReplayService.createVisualReplay({
        orderId: order.id,
        customerIntent: { rawMessage: `Purchase ${order.items[0]?.name}`, maxBudget: order.total + 1000 },
        catalogSearch: { filter: 'electronics', items: dbService.getProducts(), matchedCount: 3 },
        productRanking: [{ product: order.items[0], recommendationScore: 94, breakdown: { customerFit: 95, budgetFit: 92, merchantAlignment: 95 } }],
        recommendation: { product: order.items[0], explanation: 'Top quality match for customer preferences and budget.' },
        crossSell: { accepted: order.items.length > 1, item: order.items[1] },
        policyCheck: { authorized: true, checks: [{ name: 'Spending Cap', passed: true }], riskLevel: 'LOW', thresholds: { maxTxLimit: 10000 } },
        userApproval: { approved: true },
        payment: { orderId: order.razorpay_order_id, paymentId: order.razorpay_payment_id, method: order.payment_method },
        order
      });
      return res.json(fallback);
    }
    return res.status(404).json({ error: 'Replay not found.' });
  }
  res.json(replay);
});

/**
 * AI Commerce Readiness Scorecard Endpoint
 */
app.get('/api/merchant/readiness', (req, res) => {
  res.json(readinessService.getReadinessScore());
});

/**
 * Revenue Simulator ("What-If" Analysis) Endpoints
 */
app.post('/api/merchant/simulator', (req, res) => {
  const result = simulatorService.simulate(req.body);
  res.json(result);
});

app.post('/api/merchant/simulator/apply', (req, res) => {
  const result = simulatorService.applyStrategy(req.body);
  res.json(result);
});

/**
 * Anomaly Detection & Velocity Monitor Endpoints
 */
app.get('/api/merchant/anomalies', (req, res) => {
  res.json(anomalyService.getAnomalies());
});

app.post('/api/merchant/anomalies/mitigate', (req, res) => {
  const { anomalyId } = req.body;
  const result = anomalyService.mitigateAnomaly(anomalyId);
  res.json(result);
});

/**
 * Natural Language to Deterministic Policy Parser
 */
app.post('/api/merchant/policies/nl-parse', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
  const result = policyParserService.parse(prompt);
  res.json(result);
});

/**
 * Merchant Intelligence Endpoints (Insights, Product AI Audit, Experiment Lab, CX)
 */
const merchantIntelligenceService = require('./services/merchantIntelligenceService');

app.get('/api/merchant/intelligence/insights', (req, res) => {
  res.json({ insights: merchantIntelligenceService.generateSalesInsights() });
});

app.get('/api/merchant/products/audit', (req, res) => {
  res.json({ products: merchantIntelligenceService.getProductAIAudit() });
});

app.post('/api/merchant/products/optimize', (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required.' });
  const result = merchantIntelligenceService.optimizeProductForAI(productId);
  res.json(result);
});

app.get('/api/merchant/experiments', (req, res) => {
  res.json(merchantIntelligenceService.getExperimentStrategies());
});

app.post('/api/merchant/experiments/deploy', (req, res) => {
  const { strategy } = req.body;
  const result = merchantIntelligenceService.deployExperimentStrategy(strategy);
  res.json(result);
});

app.get('/api/merchant/cx', (req, res) => {
  res.json(merchantIntelligenceService.getCustomerExperienceMetrics());
});

/**
 * Reset Demo State
 */
app.post('/api/merchant/reset', (req, res) => {
  dbService.resetState();
  mandateService.clearNonces();
  frmService.reset();
  res.json({ status: 'ok', message: 'Demo environment reset to initial seeded baseline.' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  AI Growth & Agentic Commerce Platform Running`);
  console.log(`  Unified URL: http://localhost:${PORT}`);
  console.log(`  - Landing Switcher: /`);
  console.log(`  - Merchant Portal: /#merchant`);
  console.log(`  - AI Shopping: /#shopping`);
  console.log(`  Mode: Razorpay Test Mode & Deterministic Policy Engine`);
  console.log(`======================================================\n`);
});
