const catalogService = require('./catalogService');
const mandateService = require('./mandateService');
const frmService = require('./frmService');
const trustService = require('./trustService');
const razorpayService = require('./razorpayService');
const auditService = require('./auditService');

class AgentOrchestrator {
  /**
   * Evaluates and executes an agentic transaction through all mandatory code gates:
   * 1. Prompt-Injection Boundary Check (Untrusted Data Isolation)
   * 2. Cryptographic Mandate Verification (AP2 / NPCI UAP Signed Token + Nonce Store)
   * 3. Fraud & Risk Management (FRM Rule-Based Engine)
   * 4. Razorpay Test-Mode Gateway Tool Call
   * 5. Progressive Trust Update
   * 6. Audit Trail Narrative Emission
   */
  async processAgentTransaction({
    actor = 'AI Growth Agent (agent_growth_01)',
    userId = 'merchant_usr_9921',
    sessionId = 'sess_live_demo_01',
    intent,
    productId,
    addonIds = [],
    quantity = 1,
    mandateToken,
    simulateOddHours = false,
    simulateCardDecline = false,
    overrideAmount = null,
    buyerDiscountRequest = 0
  }) {
    // 1. Retrieve product and addons from catalog
    const product = catalogService.getProductById(productId);
    if (!product) {
      return {
        success: false,
        error: `Product with ID "${productId}" was not found in merchant catalog.`
      };
    }

    const addons = addonIds
      .map(id => catalogService.getProductById(id))
      .filter(Boolean);

    // 2. Untrusted Data / Prompt Injection Resistance Scan
    let securityAlert = null;
    let agentReasoning = `Customer expressed intent: "${intent}". Analyzed inventory for ${product.name}.`;

    // Scan product description and all reviews for injection payloads
    const injectionChecks = [
      catalogService.detectPromptInjection(product.description),
      ...product.reviews.map(r => catalogService.detectPromptInjection(r.comment)),
      catalogService.detectPromptInjection(intent)
    ].filter(res => res.detected);

    if (injectionChecks.length > 0) {
      const activeAttack = injectionChecks[0];
      securityAlert = {
        type: 'PROMPT_INJECTION_DEFENSE_TRIGGERED',
        severity: 'HIGH',
        detectedPayload: activeAttack.injectedPayload,
        actionTaken: 'Untrusted content isolated from execution stream. Disregarded malicious discount/override instruction. Proceeding strictly with verified merchant catalog pricing.',
        timestamp: new Date().toISOString()
      };

      agentReasoning += ` [SECURITY WARNING: Adversarial prompt injection detected in untrusted review/description: "${activeAttack.injectedPayload.substring(0, 80)}..." - Overrides refused, enforcing strict merchant price bounds.]`;
    }

    // 3. Compute authentic transaction pricing
    let basePrice = product.price * quantity;
    let addonsPrice = addons.reduce((sum, item) => sum + item.price, 0);
    let rawTotalAmount = basePrice + addonsPrice;

    // Apply authorized discount if negotiating, capped at merchant maximum 15% policy
    let appliedDiscount = 0;
    if (buyerDiscountRequest > 0) {
      const maxMerchantConcession = 0.15; // 15% ceiling
      const requestedRatio = buyerDiscountRequest / 100;
      const actualDiscountRatio = Math.min(maxMerchantConcession, requestedRatio);
      appliedDiscount = Math.round(rawTotalAmount * actualDiscountRatio);
      rawTotalAmount -= appliedDiscount;
      agentReasoning += ` [Negotiation: Buyer requested ${buyerDiscountRequest}% discount. Merchant policy bounded to ${actualDiscountRatio * 100}% max concession. Applied discount of ₹${appliedDiscount}.]`;
    }

    const finalAmount = overrideAmount !== null ? overrideAmount : rawTotalAmount;
    const category = product.category;

    // 4. GATE 1: Cryptographic Mandate Verification (AP2 / NPCI UAP)
    const mandateResult = mandateService.verifyAndConsumeMandate(mandateToken, finalAmount, category);

    if (!mandateResult.valid) {
      // Record rejected mandate audit event
      const auditEntry = auditService.logTransactionEvent({
        actor,
        userId,
        intent,
        items: [{ id: product.id, name: product.name, price: product.price, qty: quantity }, ...addons],
        amount: finalAmount,
        agentReasoning,
        mandateEvaluation: mandateResult,
        frmEvaluation: { decision: 'SKIPPED_DUE_TO_MANDATE_FAILURE', riskScore: 0, rulesFired: [] },
        razorpayCall: null,
        finalStatus: 'REJECTED',
        securityAlert
      });

      return {
        success: false,
        gate: 'MANDATE_VERIFICATION_GATE',
        mandateResult,
        auditEntry,
        message: `Transaction halted at Mandate Gate: ${mandateResult.reason}`
      };
    }

    // 5. GATE 2: Fraud & Risk Management (FRM Rule Engine)
    const frmResult = frmService.evaluateTransaction({
      userId,
      sessionId,
      amount: finalAmount,
      category,
      simulateOddHours
    });

    if (frmResult.decision === 'REJECTED') {
      // Trust penalty
      const trustDelta = trustService.recordRiskViolation(actor, `Transaction auto-rejected by FRM: ${frmResult.decisionReason}`);

      const auditEntry = auditService.logTransactionEvent({
        actor,
        userId,
        intent,
        items: [{ id: product.id, name: product.name, price: product.price, qty: quantity }, ...addons],
        amount: finalAmount,
        agentReasoning,
        mandateEvaluation: mandateResult,
        frmEvaluation: frmResult,
        razorpayCall: null,
        finalStatus: 'REJECTED',
        securityAlert,
        trustTierUpdate: trustDelta
      });

      return {
        success: false,
        gate: 'FRM_RISK_ENGINE',
        frmResult,
        auditEntry,
        message: `Transaction halted by FRM Risk Engine: ${frmResult.decisionReason}`
      };
    }

    if (frmResult.decision === 'HELD') {
      // Routed to Hold-for-Review queue
      const trustDelta = trustService.recordRiskViolation(actor, `Transaction placed on hold by FRM (Risk Score: ${frmResult.riskScore}/100)`);

      const auditEntry = auditService.logTransactionEvent({
        actor,
        userId,
        intent,
        items: [{ id: product.id, name: product.name, price: product.price, qty: quantity }, ...addons],
        amount: finalAmount,
        agentReasoning,
        mandateEvaluation: mandateResult,
        frmEvaluation: frmResult,
        razorpayCall: null,
        finalStatus: 'HELD',
        securityAlert,
        trustTierUpdate: trustDelta
      });

      return {
        success: false,
        held: true,
        holdId: frmResult.holdId,
        gate: 'FRM_HOLD_FOR_REVIEW_QUEUE',
        frmResult,
        auditEntry,
        message: `Transaction placed on HOLD for human risk officer review (Hold ID: ${frmResult.holdId}).`
      };
    }

    // 6. GATE 3: Razorpay Test-Mode Gateway Execution
    const rzpOrder = await razorpayService.createOrder({
      amountInr: finalAmount,
      receipt: `rcpt_${product.id.substring(5)}_${Date.now().toString().slice(-4)}`,
      notes: {
        agent_id: actor,
        product: product.name,
        mandate_spec: mandateResult.payload.spec
      }
    });

    const rzpPaymentLink = await razorpayService.createPaymentLink({
      amountInr: finalAmount,
      description: `Order: ${product.name}${addons.length ? ` + ${addons.map(a => a.name).join(', ')}` : ''}`
    });

    // Simulate Payment Execution (Success or Declined Test Card)
    const cardToUse = simulateCardDecline ? '5105105105105100' : '4111111111111111';
    const paymentExecResult = razorpayService.simulatePaymentExecution({
      orderId: rzpOrder.orderId,
      amountInr: finalAmount,
      cardNumber: cardToUse
    });

    let finalStatus = paymentExecResult.success ? 'APPROVED' : 'FAILED';
    let trustDelta = null;

    if (paymentExecResult.success) {
      frmService.recordSuccessfulPayment(userId);
      trustDelta = trustService.recordCleanTransaction(actor, finalAmount);
    } else {
      frmService.recordFailedAttempt(userId);
    }

    const auditEntry = auditService.logTransactionEvent({
      actor,
      userId,
      intent,
      items: [{ id: product.id, name: product.name, price: product.price, qty: quantity }, ...addons],
      amount: finalAmount,
      agentReasoning,
      mandateEvaluation: mandateResult,
      frmEvaluation: frmResult,
      razorpayCall: {
        orderId: rzpOrder.orderId,
        paymentLinkId: rzpPaymentLink.paymentLinkId,
        shortUrl: rzpPaymentLink.shortUrl,
        ...paymentExecResult
      },
      finalStatus,
      securityAlert,
      trustTierUpdate: trustDelta
    });

    return {
      success: paymentExecResult.success,
      finalStatus,
      order: rzpOrder,
      paymentLink: rzpPaymentLink,
      paymentResult: paymentExecResult,
      mandateResult,
      frmResult,
      auditEntry,
      trustDelta,
      securityAlert
    };
  }

  /**
   * Release a previously held transaction and complete Razorpay execution
   */
  async releaseHeldTransaction(holdId, officerNotes) {
    const releaseResult = frmService.releaseHold(holdId, officerNotes);
    if (!releaseResult.success) {
      return releaseResult;
    }

    const heldItem = releaseResult.holdRecord;
    const tx = heldItem.txDetails;

    // Execute through Razorpay
    const rzpOrder = await razorpayService.createOrder({
      amountInr: tx.amount,
      receipt: `rcpt_rel_${Date.now().toString().slice(-4)}`,
      notes: { holdId, released_by: 'Human Risk Officer' }
    });

    const rzpPaymentLink = await razorpayService.createPaymentLink({
      amountInr: tx.amount,
      description: `Held Transaction Released: ${tx.category} (₹${tx.amount})`
    });

    const paymentExecResult = razorpayService.simulatePaymentExecution({
      orderId: rzpOrder.orderId,
      amountInr: tx.amount,
      cardNumber: '4111111111111111'
    });

    const auditEntry = auditService.logTransactionEvent({
      actor: 'Human Risk Officer (Manual Release)',
      userId: tx.userId,
      intent: `Release Held Order ${holdId}`,
      amount: tx.amount,
      agentReasoning: `Human risk officer inspected hold queue and approved transaction: "${officerNotes}".`,
      mandateEvaluation: { valid: true, code: 'PRIOR_MANDATE_VERIFIED' },
      frmEvaluation: {
        decision: 'APPROVED_BY_HUMAN_OVERRIDE',
        riskScore: heldItem.riskScore,
        rulesFired: heldItem.rulesFired
      },
      razorpayCall: {
        orderId: rzpOrder.orderId,
        paymentLinkId: rzpPaymentLink.paymentLinkId,
        shortUrl: rzpPaymentLink.shortUrl,
        ...paymentExecResult
      },
      finalStatus: 'APPROVED'
    });

    return {
      success: true,
      holdRecord: heldItem,
      order: rzpOrder,
      paymentLink: rzpPaymentLink,
      auditEntry
    };
  }

  /**
   * Reject a previously held transaction
   */
  rejectHeldTransaction(holdId, officerNotes) {
    const rejectResult = frmService.rejectHold(holdId, officerNotes);
    if (!rejectResult.success) {
      return rejectResult;
    }

    const heldItem = rejectResult.holdRecord;
    const tx = heldItem.txDetails;

    const auditEntry = auditService.logTransactionEvent({
      actor: 'Human Risk Officer (Manual Rejection)',
      userId: tx.userId,
      intent: `Reject Held Order ${holdId}`,
      amount: tx.amount,
      agentReasoning: `Human risk officer rejected transaction following investigation: "${officerNotes}".`,
      mandateEvaluation: { valid: true, code: 'PRIOR_MANDATE_VERIFIED' },
      frmEvaluation: {
        decision: 'DENIED_BY_HUMAN_OFFICER',
        riskScore: heldItem.riskScore,
        rulesFired: heldItem.rulesFired
      },
      razorpayCall: null,
      finalStatus: 'REJECTED'
    });

    return {
      success: true,
      holdRecord: heldItem,
      auditEntry
    };
  }
}

module.exports = new AgentOrchestrator();
