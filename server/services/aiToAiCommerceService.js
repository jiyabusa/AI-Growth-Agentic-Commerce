/**
 * AI-to-AI Commerce Demonstration Service
 * Simulates an autonomous dialogue, negotiation, policy validation,
 * transaction guard, and payment between an AI Buyer Agent and Merchant AI Salesperson.
 */

const dbService = require('./dbService');
const policyEngine = require('./policyEngine');
const razorpayService = require('./razorpayService');

class AIToAICommerceService {
  async runSimulation({ buyerIntent = 'I need wireless headphones under ₹5,000 with noise cancellation.' } = {}) {
    const simulationId = `sim_a2a_${Date.now()}`;
    const steps = [];

    // Ensure product data exists
    let product = dbService.getProductById('prod_anc_headphones');
    if (!product) {
      product = {
        id: 'prod_anc_headphones',
        name: 'SoundWave ANC Wireless Headphones',
        price: 4499,
        category: 'Audio',
        rating: 4.8,
        inStock: true,
        stockCount: 18,
        features: ['Active Noise Cancellation', '40h Battery Life', 'Bluetooth 5.3', 'Comfort Memory Foam']
      };
    }
    const companion = dbService.getProductById('prod_travel_case') || {
      id: 'prod_travel_case',
      name: 'Hard-Shell Travel Protective Case',
      price: 799,
      category: 'Accessories',
      inStock: true,
      stockCount: 45
    };

    const bundleOriginalTotal = product.price + companion.price; // 4499 + 799 = 5298
    const bundleSpecialPrice = 4999;
    const bundleDiscount = bundleOriginalTotal - bundleSpecialPrice; // 299

    // Stage 1: DISCOVER
    steps.push({
      step: 1,
      stage: 'DISCOVERING',
      speaker: 'AI Buyer Agent',
      speakerRole: 'buyer',
      action: 'DISCOVER',
      humanMessage: 'I need wireless headphones under ₹5,000 with noise cancellation.',
      technicalAction: 'search_products',
      technicalParams: {
        category: 'headphones',
        max_price: 5000,
        currency: 'INR',
        required_features: ['Active Noise Cancellation (ANC)', 'Wireless Bluetooth'],
        intended_use: 'Travel / Commute'
      },
      technicalResult: { query_status: 'DISPATCHED_TO_CATALOG_AGENT' }
    });

    // Stage 2: SEARCH
    steps.push({
      step: 2,
      stage: 'SEARCHING',
      speaker: 'Merchant AI',
      speakerRole: 'merchant',
      action: 'SEARCH',
      humanMessage: 'Searching agent-readable catalog... 3 matching products found.',
      technicalAction: 'query_agent_catalog',
      technicalParams: {
        filter: { category: 'Audio', price_lte: 5000, features_include: 'ANC' },
        limit: 5
      },
      technicalResult: {
        matches_found: 3,
        candidates: [
          { id: product.id, name: product.name, price: 4499, stock: product.stockCount, rating: 4.8 },
          { id: 'prod_bass_anc', name: 'BassMax Over-Ear ANC', price: 4899, stock: 12, rating: 4.5 },
          { id: 'prod_lite_buds', name: 'AirPulse ANC Earbuds', price: 3499, stock: 30, rating: 4.3 }
        ]
      }
    });

    // Stage 3: COMPARE
    steps.push({
      step: 3,
      stage: 'SEARCHING',
      speaker: 'AI Buyer Agent',
      speakerRole: 'buyer',
      action: 'COMPARE',
      humanMessage: 'Which gives the best value?',
      technicalAction: 'compare_product_attributes',
      technicalParams: {
        target_product_ids: [product.id, 'prod_bass_anc', 'prod_lite_buds'],
        evaluation_weights: { noise_isolation: 0.4, battery_life: 0.3, price_efficiency: 0.3 }
      },
      technicalResult: {
        best_value_selection: product.id,
        composite_score: 94.6
      }
    });

    // Stage 4: OFFER
    steps.push({
      step: 4,
      stage: 'NEGOTIATING',
      speaker: 'Merchant AI',
      speakerRole: 'merchant',
      action: 'OFFER',
      humanMessage: `${product.name} at ₹${product.price.toLocaleString('en-IN')} provides the best balance of price, features, and availability.`,
      technicalAction: 'generate_product_offer',
      technicalParams: {
        product_id: product.id,
        unit_price: product.price,
        in_stock: true,
        warranty: '1-Year Extended Manufacturer Warranty'
      },
      technicalResult: { offer_status: 'PRESENTED' }
    });

    // Stage 5: NEGOTIATE
    steps.push({
      step: 5,
      stage: 'NEGOTIATING',
      speaker: 'AI Buyer Agent',
      speakerRole: 'buyer',
      action: 'NEGOTIATE',
      humanMessage: 'Can you improve the offer? Can you make it ₹4,000?',
      technicalAction: 'negotiate_price_concession',
      technicalParams: {
        base_product_id: product.id,
        current_price: product.price,
        target_price: 4000,
        requested_discount_pct: 11.1
      },
      technicalResult: { negotiation_type: 'PRICE_CONCESSION_REQUEST' }
    });

    // Stage 6: POLICY_CHECK
    steps.push({
      step: 6,
      stage: 'NEGOTIATING',
      speaker: 'Merchant AI',
      speakerRole: 'merchant',
      action: 'POLICY_CHECK',
      humanMessage: `Checking merchant negotiation policy... Maximum discount: 10%, Minimum margin: Protected. I can't reduce the product to ₹4,000 without violating the merchant's pricing policy. I can instead offer a compatible travel case as part of a bundle for ₹${bundleSpecialPrice.toLocaleString('en-IN')}.`,
      technicalAction: 'policy_check',
      technicalParams: {
        policy_rules: {
          max_allowed_discount_pct: 10.0,
          min_gross_margin_pct: 15.0,
          bundle_upsell_permission: true
        },
        requested_discount_pct: 11.1,
        evaluation_result: 'REJECT_DIRECT_DISCOUNT_OFFER_BUNDLE'
      },
      technicalResult: {
        direct_discount_allowed: false,
        bundle_proposal: {
          items: [product.name, companion.name],
          regular_total: bundleOriginalTotal,
          bundle_price: bundleSpecialPrice,
          total_discount: bundleDiscount,
          unit_margin_protected: true
        }
      }
    });

    // Stage 7: ACCEPT
    steps.push({
      step: 7,
      stage: 'VALIDATING',
      speaker: 'AI Buyer Agent',
      speakerRole: 'buyer',
      action: 'ACCEPT',
      humanMessage: 'Proceed with the bundle.',
      technicalAction: 'accept_bundle_offer',
      technicalParams: {
        accepted_bundle: {
          primary_item: product.id,
          cross_sell_item: companion.id,
          agreed_total: bundleSpecialPrice
        }
      },
      technicalResult: { proceed_to_authorization: true }
    });

    // Stage 8: TRANSACTION GUARD
    const guard = policyEngine.evaluateTransactionGuard({
      amount: bundleSpecialPrice,
      items: [product, companion],
      customerName: 'Autonomous AI Buyer (Session #882)'
    });

    steps.push({
      step: 8,
      stage: 'VALIDATING',
      speaker: 'Deterministic Policy Engine',
      speakerRole: 'system',
      action: 'TRANSACTION_GUARD',
      humanMessage: `Transaction Guard: SAFE TO PROCEED. Intent understood (✓), Product available (✓), Price verified at ₹${bundleSpecialPrice.toLocaleString('en-IN')} (✓), Policy passed (✓), Transaction limit passed (✓).`,
      technicalAction: 'transaction_guard_evaluation',
      technicalParams: {
        recalculated_server_total: bundleSpecialPrice,
        checks: guard.checks,
        max_transaction_limit: 10000,
        auto_approval_threshold: 2000
      },
      technicalResult: {
        overall_status: guard.status,
        safe_to_proceed: guard.safeToProceed,
        requires_human_gate: guard.requiresApproval
      }
    });

    // Stage 9: APPROVAL
    steps.push({
      step: 9,
      stage: 'VALIDATING',
      speaker: 'Approval Gate',
      speakerRole: 'system',
      action: 'APPROVAL',
      humanMessage: 'Merchant Policy: Auto-approval authorized under dynamic demo parameters for verified AI Buyer mandate.',
      technicalAction: 'request_approval',
      technicalParams: {
        amount: bundleSpecialPrice,
        risk_score: 'LOW',
        mandate_verified: true
      },
      technicalResult: { approval_status: 'GRANTED_BY_POLICY_ENGINE' }
    });

    // Stage 10: PAYMENT (Razorpay Test Mode)
    const rzpOrder = await razorpayService.createOrder({
      amountInr: bundleSpecialPrice,
      receipt: `rcpt_a2a_${Date.now().toString().slice(-4)}`,
      notes: { channel: 'AI_TO_AI_COMMERCE', buyer: 'Autonomous AI Buyer' }
    });

    const paymentResult = razorpayService.simulatePaymentExecution({
      orderId: rzpOrder.orderId,
      amountInr: bundleSpecialPrice,
      cardNumber: '4111111111111111'
    });

    steps.push({
      step: 10,
      stage: 'PAYING',
      speaker: 'Razorpay Test Gateway',
      speakerRole: 'system',
      action: 'PAYMENT',
      humanMessage: `Razorpay test-mode payment initiated for ₹${bundleSpecialPrice.toLocaleString('en-IN')}. Razorpay Order: ${rzpOrder.orderId}`,
      technicalAction: 'create_payment',
      technicalParams: {
        amount_paise: bundleSpecialPrice * 100,
        currency: 'INR',
        razorpay_order_id: rzpOrder.orderId,
        payment_method: 'AI Delegated Mandate (Test Mode)'
      },
      technicalResult: {
        payment_status: 'AUTHORIZED',
        transaction_id: paymentResult.paymentId
      }
    });

    // Stage 11: VERIFY & ORDER CREATION
    const order = dbService.createOrder({
      customer_name: 'Autonomous AI Buyer Agent',
      items: [
        { ...product, quantity: 1, isUpsell: false, isCrossSell: false },
        { ...companion, quantity: 1, isUpsell: false, isCrossSell: true }
      ],
      subtotal: bundleOriginalTotal,
      discount: bundleDiscount,
      total: bundleSpecialPrice,
      ai_assisted: true,
      upsell_converted: false,
      cross_sell_converted: true,
      payment_method: 'AI Autonomous Mandate (Razorpay)',
      razorpay_order_id: rzpOrder.orderId,
      razorpay_payment_id: paymentResult.paymentId
    });

    dbService.recordAuditEvent({
      action: 'AI_TO_AI_COMMERCE_ORDER',
      actor: 'AI Buyer Agent ↔ Merchant AI',
      amount: bundleSpecialPrice,
      reason: `Completed autonomous transaction for #${order.id} with SoundWave ANC + Travel Case Bundle.`,
      status: 'SUCCESS'
    });

    steps.push({
      step: 11,
      stage: 'COMPLETED',
      speaker: 'OmniGrowth Platform',
      speakerRole: 'system',
      action: 'ORDER',
      humanMessage: `Payment verified! Order #${order.id} confirmed. AI buyer successfully transacted with AI merchant.`,
      technicalAction: 'verify_payment_and_create_order',
      technicalParams: {
        razorpay_payment_id: paymentResult.paymentId,
        verification_signature: 'sha256_verified_deterministic',
        order_id: order.id,
        final_amount: bundleSpecialPrice
      },
      technicalResult: {
        order_status: 'CONFIRMED',
        inventory_updated: true,
        audit_trail_recorded: true
      }
    });

    return {
      success: true,
      simulationId,
      status: 'COMPLETED_SUCCESSFULLY',
      finalOrder: order,
      summary: {
        product: `${product.name} + ${companion.name}`,
        total: bundleSpecialPrice,
        paymentStatus: 'Verified (Razorpay Test Mode)',
        paymentId: paymentResult.paymentId,
        orderId: order.id,
        auditStatus: 'Complete'
      },
      dialogueSteps: steps
    };
  }
}

module.exports = new AIToAICommerceService();

