const assert = require('assert');
const dbService = require('../services/dbService');
const aiSalespersonService = require('../services/aiSalespersonService');
const policyEngine = require('../services/policyEngine');
const auditReplayService = require('../services/auditReplayService');
const razorpayService = require('../services/razorpayService');

async function runTestSuite() {
  console.log('>>> Running Comprehensive AI Growth & Agentic Commerce Test Suite <<<\n');

  // TEST 1: Intent Understanding & Multi-factor Recommendations (Voice & Text)
  console.log('[TEST 1] Testing Voice & Natural Language Shopping Intent Understanding...');
  
  // Voice Test 1: Spoken words with currency
  const v1 = aiSalespersonService.understandIntent('I need wireless headphones under five thousand rupees');
  assert.strictEqual(v1.category, 'electronics');
  assert.strictEqual(v1.maxBudget, 5000);
  assert(v1.keywords.includes('headphones'));

  // Voice Test 2: Contextual travel intent
  const v2 = aiSalespersonService.understandIntent('Show me something good for travel');
  assert.strictEqual(v2.travelOriented, true);

  // Voice Test 3: Spoken ANC
  const v3 = aiSalespersonService.understandIntent('Do you have wireless headphones with noise cancellation?');
  assert.strictEqual(v3.noiseCancelling, true);
  assert(v3.keywords.includes('headphones'));

  // Voice Test 4: Higher spoken budget
  const v4 = aiSalespersonService.understandIntent('Can you find me something under ten thousand?');
  assert.strictEqual(v4.maxBudget, 10000);

  // Voice Test 5: Companion accessory request
  const v5 = aiSalespersonService.understandIntent('Add the travel case to my cart');
  assert.strictEqual(v5.requestAccessories, true);

  // Voice Test 6: Paused utterance simulated as unified sentence
  const v6 = aiSalespersonService.understandIntent('I need headphones under five thousand with good battery life');
  assert.strictEqual(v6.maxBudget, 5000);
  assert(v6.keywords.includes('headphones'));

  // Voice Test 7: Long natural sentence
  const v7 = aiSalespersonService.understandIntent('I am looking for wireless headphones under five thousand rupees, preferably with active noise cancellation, good battery life, and something that would be comfortable for traveling.');
  assert.strictEqual(v7.category, 'electronics');
  assert.strictEqual(v7.maxBudget, 5000);
  assert.strictEqual(v7.travelOriented, true);
  assert.strictEqual(v7.noiseCancelling, true);

  const recs = aiSalespersonService.recommendProducts(v7);
  assert(recs.length > 0, 'Must return at least one product recommendation');
  const topRec = recs[0];
  assert(topRec.product.name.includes('Headphones'), 'Top recommendation should be headphones');
  assert(topRec.recommendationScore >= 80, 'Score should be high for matching intent');
  assert(topRec.explanation.length > 10, 'Business-safe explanation must be generated');
  console.log(`✔ All 7 Voice shopping queries accurately extracted!`);
  console.log(`✔ Top recommended: ${topRec.product.name} (Score: ${topRec.recommendationScore}/100)`);
  console.log(`  Explanation: "${topRec.explanation}"\n`);

  // TEST 2: Intelligent Upsell & Cross-Sell Matcher
  console.log('[TEST 2] Testing Intelligent Upsell & Cross-Sell Matcher...');
  const upsellCross = aiSalespersonService.getUpsellAndCrossSell('prod_anc_headphones');
  assert(upsellCross.upsell, 'Upsell must be identified for baseline headphones');
  assert.strictEqual(upsellCross.upsell.product.id, 'prod_anc_headphones_pro');
  assert(upsellCross.crossSells.length > 0, 'Compatible cross-sell accessories must be returned');
  assert(upsellCross.crossSells.some(cs => cs.product.id === 'prod_travel_case'), 'Travel case must be in cross-sells');
  console.log(`✔ Upsell: ${upsellCross.upsell.product.name} (+₹${upsellCross.upsell.priceDiff})`);
  console.log(`✔ Companion Cross-sells: ${upsellCross.crossSells.map(c => c.product.name).join(', ')}\n`);

  // TEST 3: Bounded AI Negotiation
  console.log('[TEST 3] Testing Merchant Bounded AI Negotiation...');
  // Customer asks for ₹4,000 on ₹4,499 product (11.1% discount > 10% policy cap)
  const negResult = aiSalespersonService.evaluateNegotiation('prod_anc_headphones', 4000);
  assert.strictEqual(negResult.allowed, false, 'Direct 11.1% discount must be rejected');
  assert(negResult.bundleAlternative, 'Bundle alternative must be proposed as merchant-safe alternative');
  console.log(`✔ Direct discount over 10% rejected. Bundle counter-offer: ${negResult.bundleAlternative.bundleName} (Special Price: ₹${negResult.bundleAlternative.specialBundlePrice})\n`);

  // TEST 4: Deterministic Policy Engine & Kill Switch
  console.log('[TEST 4] Testing Policy Engine Guardrails & Kill Switch...');
  dbService.resetState();

  // Test 4a: Normal transaction within limit requiring approval (> ₹2,000)
  const pol1 = policyEngine.evaluateTransaction({
    amount: 5298,
    items: [
      { id: 'prod_anc_headphones', name: 'Headphones', price: 4499, category: 'electronics' },
      { id: 'prod_travel_case', name: 'Case', price: 799, category: 'accessories' }
    ]
  });
  assert.strictEqual(pol1.authorized, true);
  assert.strictEqual(pol1.status, 'APPROVAL_REQUIRED');
  assert.strictEqual(pol1.approvalRequired, true);
  console.log('✔ Amount ₹5,298 correctly routed to Human Approval Gate.');

  // Test 4b: Transaction exceeding max limit (₹15,000 > ₹10,000)
  const pol2 = policyEngine.evaluateTransaction({
    amount: 15000,
    items: [{ id: 'prod_anc_headphones_pro', name: 'Flagship Studio Bundle', price: 15000, category: 'electronics' }]
  });
  assert.strictEqual(pol2.authorized, false);
  assert.strictEqual(pol2.status, 'BLOCKED');
  console.log('✔ Transaction ₹15,000 correctly BLOCKED by policy.');

  // Test 4c: Emergency Kill Switch
  dbService.toggleAgentStatus('PAUSED');
  const pol3 = policyEngine.evaluateTransaction({ amount: 1000, items: [] });
  assert.strictEqual(pol3.authorized, false);
  assert.strictEqual(pol3.status, 'AGENT_PAUSED');
  console.log('✔ Emergency kill switch verified: Financial transactions halted when agent is paused.\n');

  // Resume agent for remaining tests
  dbService.toggleAgentStatus('ACTIVE');

  // TEST 5: Order Creation, Analytics & Visual Audit Replay
  console.log('[TEST 5] Testing Order Creation, Razorpay & Visual Audit Replay...');
  const initialStockHeadphones = dbService.getProductById('prod_anc_headphones').stock;
  
  const rzpOrder = await razorpayService.createOrder({ amountInr: 4899, receipt: 'rcpt_test_01' });
  const paymentResult = razorpayService.simulatePaymentExecution({
    orderId: rzpOrder.orderId,
    amountInr: 4899,
    cardNumber: '4111111111111111'
  });

  const order = dbService.createOrder({
    customer_name: 'Rahul Sharma',
    items: [
      { id: 'prod_anc_headphones', name: 'AcousticPro Wireless ANC Headphones', price: 4499, quantity: 1 },
      { id: 'prod_travel_case', name: 'Hard-Shell Protective Travel Case', price: 799, quantity: 1 }
    ],
    subtotal: 5298,
    discount: 399,
    total: 4899,
    ai_assisted: true,
    upsell_converted: false,
    cross_sell_converted: true,
    razorpay_order_id: rzpOrder.orderId,
    razorpay_payment_id: paymentResult.paymentId
  });

  assert(order.id.toUpperCase().startsWith('ORD-') || order.id.toLowerCase().startsWith('ord_'));
  const newStock = dbService.getProductById('prod_anc_headphones').stock;
  assert.strictEqual(newStock, initialStockHeadphones - 1, 'Stock must decrement by 1');

  // Generate Visual Replay
  const replay = auditReplayService.createVisualReplay({
    orderId: order.id,
    customerIntent: v7,
    catalogSearch: { filter: 'electronics', items: recs, matchedCount: recs.length },
    productRanking: recs,
    recommendation: { product: recs[0].product, explanation: recs[0].explanation },
    crossSell: { accepted: true, item: upsellCross.crossSells[0].product },
    policyCheck: pol1,
    userApproval: { approved: true, confirmedAt: new Date().toISOString() },
    payment: paymentResult,
    order
  });

  dbService.storeVisualReplay(replay);
  const fetchedReplay = dbService.getVisualReplay(order.id);
  assert(fetchedReplay, 'Replay must be retrievable from DB');
  assert.strictEqual(fetchedReplay.steps.length, 9, 'Lifecycle replay must comprise 9 verifiable steps');
  console.log(`✔ Order created: ${order.id} (Razorpay: ${order.razorpay_payment_id})`);
  console.log(`✔ Stock decremented: ${initialStockHeadphones} -> ${newStock}`);
  console.log(`✔ Visual Audit Replay verified with ${fetchedReplay.steps.length} sequential chronological steps.\n`);

  // TEST 6: AI Commerce Readiness Scorecard
  console.log('[TEST 6] Testing AI Commerce Readiness Scorecard Engine...');
  const readinessService = require('../services/readinessService');
  const readiness = readinessService.getReadinessScore();
  assert(readiness.overallScore >= 80 && readiness.overallScore <= 100, 'Score must be realistic');
  assert(readiness.breakdown.catalogReadability.score >= 90);
  assert(readiness.actionableRecommendations.length >= 3);
  console.log(`✔ AI Commerce Readiness: ${readiness.overallScore}/100 (${readiness.grade})`);
  console.log(`  Submetrics: Readability: ${readiness.breakdown.catalogReadability.score}%, Pricing: ${readiness.breakdown.pricingClarity.score}%\n`);

  // TEST 7: Revenue Simulator ("What-If" Analysis)
  console.log('[TEST 7] Testing Revenue Simulator & Predictive Growth Engine...');
  const simulatorService = require('../services/simulatorService');
  const simResult = simulatorService.simulate({ crossSellRate: 32, upsellRate: 20, recConversionRate: 12 });
  assert(simResult.simulatedMonthlyRevenue > simResult.currentMonthlyRevenue);
  assert(simResult.projectedIncrementalRevenue > 0);
  assert(simResult.projectedAOV >= simResult.currentAOV);
  console.log(`✔ Simulation: Baseline ₹${simResult.currentMonthlyRevenue.toLocaleString('en-IN')} -> Simulated ₹${simResult.simulatedMonthlyRevenue.toLocaleString('en-IN')}`);
  console.log(`  Projected Lift: +₹${simResult.projectedIncrementalRevenue.toLocaleString('en-IN')} (AOV: ₹${simResult.projectedAOV})\n`);

  // TEST 8: Anomaly Detection & Velocity Monitor
  console.log('[TEST 8] Testing Transaction Velocity & Anomaly Monitor...');
  const anomalyService = require('../services/anomalyService');
  const anomalies = anomalyService.getAnomalies();
  assert(anomalies.anomalies.length > 0);
  assert.strictEqual(anomalies.status, 'ANOMALY_DETECTED');
  const mitigateRes = anomalyService.mitigateAnomaly(anomalies.anomalies[0].id);
  assert.strictEqual(mitigateRes.success, true);
  console.log(`✔ Anomaly detected: ${anomalies.anomalies[0].message}`);
  console.log(`✔ 1-Click mitigation successfully executed.\n`);

  // TEST 9: Natural Language to Deterministic Policy Parser
  console.log('[TEST 9] Testing Natural Language to Policy Parser...');
  const policyParserService = require('../services/policyParserService');
  const parsedPolicy = policyParserService.parse('Do not give more than 10% discount, auto approve under 2000, and max transaction 10000');
  assert.strictEqual(parsedPolicy.parsedPolicy.selling_controls.max_discount_percentage, 10);
  assert.strictEqual(parsedPolicy.parsedPolicy.spending_controls.auto_approval_threshold, 2000);
  assert.strictEqual(parsedPolicy.parsedPolicy.spending_controls.max_transaction_limit, 10000);
  console.log(`✔ Natural language prompt converted to deterministic rules:`);
  console.log(`  Max Discount: ${parsedPolicy.parsedPolicy.selling_controls.max_discount_percentage}% | Auto-Approve: ₹${parsedPolicy.parsedPolicy.spending_controls.auto_approval_threshold}\n`);

  // TEST 10: AI-to-AI Autonomous Commerce Simulation
  console.log('[TEST 10] Testing Autonomous AI-to-AI Commerce Simulation...');
  const aiToAiCommerceService = require('../services/aiToAiCommerceService');
  const ai2aiResult = await aiToAiCommerceService.runSimulation({
    buyerIntent: 'Find noise-cancelling headphones for travel under ₹5,000'
  });
  assert(ai2aiResult.success, 'AI-to-AI negotiation must succeed');
  assert(ai2aiResult.dialogueSteps.length >= 6, 'Must have multi-turn negotiation and tool calls');
  assert(ai2aiResult.finalOrder.razorpay_payment_id.startsWith('pay_'));
  console.log(`✔ AI-to-AI Autonomous Negotiation completed in ${ai2aiResult.dialogueSteps.length} turns.`);
  // TEST 11: Merchant Intelligence & Product AI Audit
  console.log('[TEST 11] Testing AI Sales Intelligence & Product AI Audit Engine...');
  const merchantIntelligenceService = require('../services/merchantIntelligenceService');
  const insights = merchantIntelligenceService.generateSalesInsights();
  assert(insights.length >= 4, 'Must generate commercial intelligence insights');
  assert(insights[0].headline && insights[0].whatHappened && insights[0].whyItMatters && insights[0].evidence);
  console.log(`✔ Generated ${insights.length} dynamic AI Sales Insights (Top: "${insights[0].headline}")`);

  const auditProducts = merchantIntelligenceService.getProductAIAudit();
  assert(auditProducts.length > 0, 'Must audit all catalog products');
  const targetProd = auditProducts[0];
  const optimizeResult = merchantIntelligenceService.optimizeProductForAI(targetProd.id);
  assert.strictEqual(optimizeResult.success, true);
  assert.strictEqual(optimizeResult.product.optimizedForAI, true);
  console.log(`✔ Product AI Audit: ${targetProd.name} optimized to 100% AI Readiness\n`);

  // TEST 12: AI Experiment Lab & Customer Experience (CX) Index
  console.log('[TEST 12] Testing AI Sales Experiment Lab & CX Metrics Engine...');
  const expStrategies = merchantIntelligenceService.getExperimentStrategies();
  assert.strictEqual(expStrategies.strategies.length, 3, 'Must support Conservative, Balanced, and Growth strategies');

  const deployResult = merchantIntelligenceService.deployExperimentStrategy('growth');
  assert.strictEqual(deployResult.success, true);
  assert.strictEqual(dbService.getPolicies().active_experiment_strategy, 'growth');
  assert.strictEqual(dbService.getPolicies().selling_controls.max_discount_percentage, 15);
  console.log(`✔ Deployed "Growth" strategy: Max discount updated to 15%, auto-approve to ₹4,000.`);

  const cxMetrics = merchantIntelligenceService.getCustomerExperienceMetrics();
  assert(cxMetrics.cxScore >= 85, 'Must calculate high CX score');
  assert(cxMetrics.csatScore >= 4.0, 'CSAT must be measured');
  console.log(`✔ Customer Experience Index: ${cxMetrics.cxScore}/100 (CSAT: ${cxMetrics.csatScore}/5.0, Rating: ${cxMetrics.ratingGrade})\n`);

  console.log('======================================================');
  console.log('  ALL 12 COMPREHENSIVE TEST SUITES PASSED (100% OK)   ');
  console.log('======================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
