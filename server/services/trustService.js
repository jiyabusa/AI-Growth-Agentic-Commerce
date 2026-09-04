const config = require('../config');

// In-Memory state for agent progressive trust
const agentTrustState = new Map(); // agentId -> { tier, cleanTxCount, autonomousLimit, history: [] }

class ProgressiveTrustService {
  constructor() {
    this.tiers = config.TRUST_TIERS;
  }

  /**
   * Get or initialize trust state for an agent
   * @param {string} agentId
   */
  getAgentState(agentId = 'agent_growth_01') {
    if (!agentTrustState.has(agentId)) {
      agentTrustState.set(agentId, {
        agentId,
        tier: 1,
        cleanTxCount: 0,
        autonomousLimit: this.tiers[1].autonomousLimit,
        tierName: this.tiers[1].name,
        history: [{
          timestamp: new Date().toISOString(),
          event: 'INITIALIZED',
          tier: 1,
          limit: this.tiers[1].autonomousLimit,
          reason: 'Agent initialized in default Tier 1 (Mandatory Confirmation).'
        }]
      });
    }
    return agentTrustState.get(agentId);
  }

  /**
   * Record a successful on-policy, non-flagged transaction and step-up trust if qualified
   * @param {string} agentId
   * @param {number} amount
   * @returns {Object} Updated trust state with any tier change delta
   */
  recordCleanTransaction(agentId = 'agent_growth_01', amount) {
    const state = this.getAgentState(agentId);
    state.cleanTxCount += 1;
    let tierChanged = false;
    let transitionReason = null;
    const oldTier = state.tier;

    // Check progression from Tier 1 -> Tier 2
    if (state.tier === 1 && state.cleanTxCount >= this.tiers[2].requiredCleanTx) {
      state.tier = 2;
      state.autonomousLimit = this.tiers[2].autonomousLimit;
      state.tierName = this.tiers[2].name;
      tierChanged = true;
      transitionReason = `Upgraded to Tier 2: Completed ${state.cleanTxCount} consecutive verified on-policy transactions. Spending ceiling elevated to ₹${state.autonomousLimit.toLocaleString('en-IN')}.`;
    } 
    // Check progression from Tier 2 -> Tier 3
    else if (state.tier === 2 && state.cleanTxCount >= this.tiers[3].requiredCleanTx) {
      state.tier = 3;
      state.autonomousLimit = this.tiers[3].autonomousLimit;
      state.tierName = this.tiers[3].name;
      tierChanged = true;
      transitionReason = `Upgraded to Tier 3 (Autonomous High Trust): Completed ${state.cleanTxCount} flawless transactions. Spending ceiling elevated to ₹${state.autonomousLimit.toLocaleString('en-IN')}.`;
    }

    if (tierChanged) {
      state.history.unshift({
        timestamp: new Date().toISOString(),
        event: 'TIER_UPGRADE',
        fromTier: oldTier,
        toTier: state.tier,
        limit: state.autonomousLimit,
        reason: transitionReason
      });
    }

    return {
      state,
      tierChanged,
      transitionReason,
      oldTier,
      newTier: state.tier
    };
  }

  /**
   * Record an FRM flag or suspicious event and step-down trust immediately
   * @param {string} agentId
   * @param {string} reason
   * @returns {Object} Downgrade result
   */
  recordRiskViolation(agentId = 'agent_growth_01', reason = 'FRM high-risk score or security violation triggered.') {
    const state = this.getAgentState(agentId);
    const oldTier = state.tier;
    const oldLimit = state.autonomousLimit;

    // Immediate penalty drop to Tier 1
    state.tier = 1;
    state.cleanTxCount = 0;
    state.autonomousLimit = this.tiers[1].autonomousLimit;
    state.tierName = this.tiers[1].name;

    const transitionReason = `Demoted to Tier 1 (Spending Ceiling reset to ₹${state.autonomousLimit.toLocaleString('en-IN')}): ${reason}`;

    state.history.unshift({
      timestamp: new Date().toISOString(),
      event: 'TIER_DEMOTION',
      fromTier: oldTier,
      toTier: 1,
      limit: state.autonomousLimit,
      reason: transitionReason
    });

    return {
      state,
      tierChanged: oldTier !== 1,
      transitionReason,
      oldTier,
      newTier: 1,
      oldLimit,
      newLimit: state.autonomousLimit
    };
  }

  reset() {
    agentTrustState.clear();
  }
}

module.exports = new ProgressiveTrustService();
