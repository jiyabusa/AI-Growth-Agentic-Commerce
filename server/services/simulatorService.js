/**
 * Revenue Simulator & "What-If" Strategy Analysis Service
 * Models financial impact of adjusting AI merchant strategy variables.
 */

const dbService = require('./dbService');

class RevenueSimulatorService {
  simulate({ crossSellRate = 24, upsellRate = 18, recConversionRate = 9 }) {
    const analytics = dbService.getAnalytics();
    const baselineMonthlyRevenue = 840000; // ₹8.4L baseline
    const totalMonthlySessions = 1240;

    // Incremental calculations based on demo dataset
    const crossSellDelta = (crossSellRate - 24) / 100;
    const upsellDelta = (upsellRate - 18) / 100;
    const recDelta = (recConversionRate - 9) / 100;

    const crossSellRevenueLift = Math.round(totalMonthlySessions * 0.25 * crossSellDelta * 799);
    const upsellRevenueLift = Math.round(totalMonthlySessions * 0.15 * upsellDelta * 3500);
    const recConversionRevenueLift = Math.round(totalMonthlySessions * recDelta * 4499);

    const projectedIncrementalRevenue = Math.max(0, crossSellRevenueLift + upsellRevenueLift + recConversionRevenueLift);
    const simulatedMonthlyRevenue = baselineMonthlyRevenue + 80000 + projectedIncrementalRevenue;

    const projectedAOV = Math.round(analytics.aovWithAI * (1 + (projectedIncrementalRevenue / (simulatedMonthlyRevenue || 1))));

    return {
      currentMonthlyRevenue: baselineMonthlyRevenue,
      currentAOV: analytics.aovWithAI,
      simulatedMonthlyRevenue,
      projectedIncrementalRevenue: 80000 + projectedIncrementalRevenue,
      projectedAOV,
      projectedAOVLiftPercentage: Number((((projectedAOV - analytics.aovBeforeAI) / analytics.aovBeforeAI) * 100).toFixed(1)),
      parameters: {
        crossSellRate,
        upsellRate,
        recConversionRate
      },
      disclaimer: 'Estimated impact calculated based on historical merchant baseline and simulated agentic conversion models.'
    };
  }

  applyStrategy(strategy) {
    dbService.updatePolicies({
      primary_goal: `Maximize Revenue with ${strategy.crossSellRate}% Cross-Sell & ${strategy.upsellRate}% Upsell`,
      selling_controls: {
        upsell_enabled: strategy.upsellRate > 0,
        cross_sell_enabled: strategy.crossSellRate > 0
      }
    });

    dbService.recordAuditEvent({
      action: 'STRATEGY_APPLIED',
      actor: 'Merchant Admin',
      reason: `Applied What-If revenue strategy (Target Cross-Sell: ${strategy.crossSellRate}%, Upsell: ${strategy.upsellRate}%).`,
      status: 'SUCCESS'
    });

    return { success: true, message: 'Simulated strategy parameters applied to active AI salesperson agent.' };
  }
}

module.exports = new RevenueSimulatorService();
