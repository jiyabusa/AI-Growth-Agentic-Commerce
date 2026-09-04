const { EventEmitter } = require('events');

class AuditService extends EventEmitter {
  constructor() {
    super();
    this.auditLogs = [];
  }

  /**
   * Records a complete transaction evaluation lifecycle event
   * @param {Object} entry
   * @returns {Object} Stored audit record
   */
  logTransactionEvent({
    id,
    actor = 'AI Agent (agent_growth_01)',
    userId = 'merchant_usr_9921',
    intent,
    items = [],
    amount,
    currency = 'INR',
    agentReasoning,
    mandateEvaluation,
    frmEvaluation,
    razorpayCall,
    finalStatus, // 'APPROVED' | 'HELD' | 'REJECTED' | 'FAILED' | 'SECURITY_FLAGGED'
    narrativeSummary,
    securityAlert = null,
    trustTierUpdate = null
  }) {
    const recordId = id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    // Generate human-readable narrative if not provided
    let narrative = narrativeSummary;
    if (!narrative) {
      narrative = this.generateHumanNarrative({
        actor,
        intent,
        amount,
        mandateEvaluation,
        frmEvaluation,
        razorpayCall,
        finalStatus
      });
    }

    const auditEntry = {
      id: recordId,
      timestamp,
      actor,
      userId,
      intent,
      items,
      amount,
      currency,
      agentReasoning: agentReasoning || 'Evaluated cart and customer preference parameters according to merchant bounds.',
      mandateEvaluation: mandateEvaluation || { valid: false, code: 'NOT_EVALUATED' },
      frmEvaluation: frmEvaluation || { decision: 'NOT_EVALUATED', riskScore: 0, rulesFired: [] },
      razorpayCall: razorpayCall || null,
      finalStatus,
      narrativeSummary: narrative,
      securityAlert,
      trustTierUpdate
    };

    // Prepend to front of list (chronological newest first)
    this.auditLogs.unshift(auditEntry);

    // Keep last 200 events
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }

    // Broadcast to SSE clients
    this.emit('new_audit_entry', auditEntry);

    return auditEntry;
  }

  /**
   * Builds clear narrative for judges
   */
  generateHumanNarrative({ actor, intent, amount, mandateEvaluation, frmEvaluation, razorpayCall, finalStatus }) {
    const parts = [];
    parts.push(`[${actor}] initiated intent: "${intent}" for ₹${(amount || 0).toLocaleString('en-IN')}.`);

    if (mandateEvaluation) {
      if (mandateEvaluation.valid) {
        parts.push(`Cryptographic Mandate Verified: Scoped under ₹${mandateEvaluation.payload?.max_amount?.toLocaleString('en-IN')} (${mandateEvaluation.payload?.category}) with single-use nonce committed.`);
      } else {
        parts.push(`Mandate Gate REJECTED: ${mandateEvaluation.reason} (Code: ${mandateEvaluation.code}). Transaction halted before gateway.`);
      }
    }

    if (frmEvaluation && frmEvaluation.decision !== 'NOT_EVALUATED') {
      const ruleCount = frmEvaluation.rulesFired?.length || 0;
      if (frmEvaluation.decision === 'APPROVED') {
        parts.push(`FRM Risk Engine: Score ${frmEvaluation.riskScore}/100 (Safe). All velocity & category heuristics cleared.`);
      } else if (frmEvaluation.decision === 'HELD') {
        parts.push(`FRM Risk Engine: Placed on HOLD (Score ${frmEvaluation.riskScore}/100). Triggered ${ruleCount} risk rule(s). Awaiting human release.`);
      } else if (frmEvaluation.decision === 'REJECTED') {
        parts.push(`FRM Risk Engine: AUTO-REJECTED (Score ${frmEvaluation.riskScore}/100). Violations detected: ${frmEvaluation.rulesFired?.map(r => r.name).join(', ')}.`);
      }
    }

    if (razorpayCall) {
      if (razorpayCall.success) {
        parts.push(`Razorpay API: Successfully generated ${razorpayCall.orderId ? `Order ${razorpayCall.orderId}` : `Payment Link ${razorpayCall.paymentLinkId}`} for ₹${amount}. Final status: ${finalStatus}.`);
      } else {
        parts.push(`Razorpay Execution: Failed (${razorpayCall.errorCode || 'DECLINED'}). ${razorpayCall.errorReason || 'Payment declined by gateway.'}`);
      }
    }

    return parts.join(' → ');
  }

  /**
   * Get all logs
   */
  getLogs() {
    return this.auditLogs;
  }

  /**
   * Clear logs
   */
  clear() {
    this.auditLogs = [];
  }
}

module.exports = new AuditService();
