const config = require('../config');

// In-Memory state for velocity tracking and hold-for-review queue
const transactionHistory = []; // { timestamp, userId, amount, status, sessionId }
const failedAttemptStreak = new Map(); // userId -> count
const holdQueue = new Map(); // holdId -> { txDetails, riskReport, createdAt, status }

class FraudRiskManagementService {
  constructor() {
    this.config = config.FRM_CONFIG;
  }

  /**
   * Evaluates a transaction attempt against all deterministic FRM risk rules
   * @param {Object} tx
   * @param {string} tx.userId
   * @param {string} tx.sessionId
   * @param {number} tx.amount
   * @param {string} tx.category
   * @param {string} [tx.buyerId]
   * @param {boolean} [tx.simulateOddHours]
   * @returns {Object} Comprehensive FRM risk report
   */
  evaluateTransaction(tx) {
    const rulesFired = [];
    let totalRiskScore = 0;
    const now = Date.now();

    // 1. BLOCKLIST & ALLOWLIST CHECK (Critical Guardrail)
    const isCategoryBlocked = this.config.BLOCKED_CATEGORIES.includes((tx.category || '').toLowerCase());
    const isBuyerBlocked = this.config.BLOCKED_BUYER_IDS.includes((tx.buyerId || tx.userId || '').toLowerCase());

    if (isCategoryBlocked || isBuyerBlocked) {
      rulesFired.push({
        id: 'RULE_BLOCKLIST_MATCH',
        name: 'Restricted Entity / Forbidden Category',
        weight: 100,
        severity: 'CRITICAL',
        details: isCategoryBlocked 
          ? `Category "${tx.category}" is on the restricted merchant blacklist.`
          : `Buyer identifier "${tx.buyerId || tx.userId}" is present on the high-risk blocklist.`
      });
      totalRiskScore += 100;
    }

    // 2. VELOCITY CHECK (Burst frequency per user / session)
    const recentWindowStart = now - (this.config.VELOCITY_WINDOW_SECONDS * 1000);
    const recentTxCount = transactionHistory.filter(
      h => (h.userId === tx.userId || h.sessionId === tx.sessionId) && h.timestamp >= recentWindowStart
    ).length;

    if (recentTxCount >= this.config.MAX_TX_PER_WINDOW) {
      const riskWeight = 40;
      rulesFired.push({
        id: 'RULE_VELOCITY_BURST',
        name: 'High-Frequency Velocity Burst',
        weight: riskWeight,
        severity: 'HIGH',
        details: `Observed ${recentTxCount + 1} transactions within ${this.config.VELOCITY_WINDOW_SECONDS}s (Threshold: ${this.config.MAX_TX_PER_WINDOW} tx/window).`
      });
      totalRiskScore += riskWeight;
    }

    // 3. HISTORICAL AMOUNT DEVIATION
    const thresholdAmount = this.config.HISTORICAL_AVG_AMOUNT * this.config.HISTORICAL_MULTIPLIER_FLAG;
    if (tx.amount > thresholdAmount) {
      const riskWeight = 35;
      rulesFired.push({
        id: 'RULE_HISTORICAL_DEVIATION',
        name: 'Unusual Transaction Amount Spike',
        weight: riskWeight,
        severity: 'MEDIUM',
        details: `Requested ₹${tx.amount.toLocaleString('en-IN')} is ${(tx.amount / this.config.HISTORICAL_AVG_AMOUNT).toFixed(1)}x higher than user baseline avg ₹${this.config.HISTORICAL_AVG_AMOUNT.toLocaleString('en-IN')}.`
      });
      totalRiskScore += riskWeight;
    }

    // 4. ODD HOURS CHECK (Anomalous 1 AM - 5 AM activity)
    const currentHour = new Date().getHours();
    const isOddHours = tx.simulateOddHours || (currentHour >= this.config.ODD_HOURS_START && currentHour < this.config.ODD_HOURS_END);
    if (isOddHours) {
      const riskWeight = 20;
      rulesFired.push({
        id: 'RULE_ODD_HOURS',
        name: 'Anomalous Time-of-Day Activity',
        weight: riskWeight,
        severity: 'LOW',
        details: `Transaction initiated during high-risk off-peak window (01:00 - 05:00 hrs).`
      });
      totalRiskScore += riskWeight;
    }

    // 5. REPEATED FAILED ATTEMPTS STREAK
    const userFailedStreak = failedAttemptStreak.get(tx.userId) || 0;
    if (userFailedStreak >= 2) {
      const riskWeight = 30;
      rulesFired.push({
        id: 'RULE_FAILED_ATTEMPT_STREAK',
        name: 'Prior Failed Payment Pattern',
        weight: riskWeight,
        severity: 'HIGH',
        details: `Account has ${userFailedStreak} consecutive unrecovered payment failures in current session.`
      });
      totalRiskScore += riskWeight;
    }

    // Cap maximum score at 100
    totalRiskScore = Math.min(100, totalRiskScore);

    // Determine Action
    let decision = 'APPROVED';
    let decisionReason = 'Transaction within safe risk tolerances.';
    let holdId = null;

    if (totalRiskScore >= this.config.REJECT_THRESHOLD_SCORE) {
      decision = 'REJECTED';
      decisionReason = `Cumulative risk score ${totalRiskScore}/100 exceeds auto-rejection threshold (${this.config.REJECT_THRESHOLD_SCORE}).`;
    } else if (totalRiskScore >= this.config.HOLD_THRESHOLD_SCORE) {
      decision = 'HELD';
      decisionReason = `Risk score ${totalRiskScore}/100 exceeds safe threshold (${this.config.HOLD_THRESHOLD_SCORE}). Routed to Hold-for-Review Queue for human release.`;
      
      holdId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      holdQueue.set(holdId, {
        holdId,
        txDetails: { ...tx },
        riskScore: totalRiskScore,
        rulesFired,
        status: 'PENDING_HUMAN_REVIEW',
        createdAt: new Date().toISOString()
      });
    }

    // Record attempt into history
    transactionHistory.push({
      timestamp: now,
      userId: tx.userId,
      sessionId: tx.sessionId,
      amount: tx.amount,
      status: decision,
      score: totalRiskScore
    });

    return {
      decision,
      decisionReason,
      riskScore: totalRiskScore,
      rulesFired,
      holdId,
      thresholds: {
        hold: this.config.HOLD_THRESHOLD_SCORE,
        reject: this.config.REJECT_THRESHOLD_SCORE
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves all active transactions in the hold queue
   */
  getHoldQueue() {
    return Array.from(holdQueue.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Human Risk Officer releases a held transaction
   * @param {string} holdId
   * @param {string} officerNotes
   */
  releaseHold(holdId, officerNotes = 'Approved after secondary identity & cart verification.') {
    const item = holdQueue.get(holdId);
    if (!item) {
      return { success: false, reason: 'Hold record not found or already processed.' };
    }
    if (item.status !== 'PENDING_HUMAN_REVIEW') {
      return { success: false, reason: `Item is already in status: ${item.status}` };
    }

    item.status = 'MANUALLY_RELEASED';
    item.resolvedAt = new Date().toISOString();
    item.officerNotes = officerNotes;

    return {
      success: true,
      holdRecord: item
    };
  }

  /**
   * Human Risk Officer rejects a held transaction
   * @param {string} holdId
   * @param {string} officerNotes
   */
  rejectHold(holdId, officerNotes = 'Declined by risk officer due to unverified velocity surge.') {
    const item = holdQueue.get(holdId);
    if (!item) {
      return { success: false, reason: 'Hold record not found.' };
    }

    item.status = 'MANUALLY_REJECTED';
    item.resolvedAt = new Date().toISOString();
    item.officerNotes = officerNotes;

    return {
      success: true,
      holdRecord: item
    };
  }

  /**
   * Track failed payment to increment streak
   */
  recordFailedAttempt(userId) {
    const current = failedAttemptStreak.get(userId) || 0;
    failedAttemptStreak.set(userId, current + 1);
  }

  /**
   * Clear failed streak on success
   */
  recordSuccessfulPayment(userId) {
    failedAttemptStreak.set(userId, 0);
  }

  /**
   * Clear history for testing
   */
  reset() {
    transactionHistory.length = 0;
    failedAttemptStreak.clear();
    holdQueue.clear();
  }
}

module.exports = new FraudRiskManagementService();
