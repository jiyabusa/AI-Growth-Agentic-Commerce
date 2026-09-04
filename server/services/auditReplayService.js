const dbService = require('./dbService');

class AuditReplayService {
  /**
   * Constructs a structured multi-step visual replay for an AI transaction lifecycle
   */
  createVisualReplay({
    orderId,
    customerIntent,
    catalogSearch,
    productRanking,
    recommendation,
    crossSell,
    policyCheck,
    userApproval,
    payment,
    order
  }) {
    const replayId = orderId || `rep_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const steps = [
      {
        stepIndex: 1,
        stepName: 'CUSTOMER INTENT',
        status: 'COMPLETED',
        timeOffset: '0.0s',
        actor: 'Customer / AI Buyer',
        summary: `Understood natural language intent: "${customerIntent.rawMessage}"`,
        details: {
          rawMessage: customerIntent.rawMessage,
          extractedBudget: customerIntent.maxBudget ? `₹${customerIntent.maxBudget.toLocaleString('en-IN')}` : 'Flexible',
          preferences: [
            customerIntent.travelOriented ? 'Travel & Commute' : null,
            customerIntent.noiseCancelling ? 'Noise Cancellation (ANC)' : null,
            customerIntent.requestAccessories ? 'Compatible Accessories' : null
          ].filter(Boolean)
        }
      },
      {
        stepIndex: 2,
        stepName: 'CATALOG SEARCH',
        status: 'COMPLETED',
        timeOffset: '0.4s',
        actor: 'Agent Tool (search_products)',
        summary: `Queried agent-readable catalog feed: ${catalogSearch.matchedCount || catalogSearch.items?.length || 0} matching in-stock products found`,
        details: {
          queryFilter: catalogSearch.filter || 'electronics',
          matchedItems: (catalogSearch.items || []).map(i => {
            const p = i.product || i;
            return `${p.name} (₹${(p.price || 0).toLocaleString('en-IN')})`;
          })
        }
      },
      {
        stepIndex: 3,
        stepName: 'PRODUCT RANKING',
        status: 'COMPLETED',
        timeOffset: '0.8s',
        actor: 'AI Salesperson Engine',
        summary: `Calculated multi-factor recommendation score for candidates`,
        details: {
          scores: (productRanking || []).map(r => {
            const p = r.product || r;
            return {
              product: p.name,
              overallScore: `${r.recommendationScore || 90}/100`,
              fit: `Customer: ${r.breakdown?.customerFit || 90}%, Budget: ${r.breakdown?.budgetFit || 90}%, Margin: ${r.breakdown?.merchantAlignment || 90}%`
            };
          })
        }
      },
      {
        stepIndex: 4,
        stepName: 'RECOMMENDATION',
        status: 'COMPLETED',
        timeOffset: '1.2s',
        actor: 'AI Shopping Assistant',
        summary: `Recommended ${recommendation.product.name} with business-safe explanation`,
        details: {
          productName: recommendation.product.name,
          price: `₹${recommendation.product.price.toLocaleString('en-IN')}`,
          explanation: recommendation.explanation
        }
      },
      {
        stepIndex: 5,
        stepName: 'CROSS-SELL / UPSELL',
        status: crossSell?.accepted ? 'CONVERTED' : 'EVALUATED',
        timeOffset: '1.6s',
        actor: 'Upsell Engine',
        summary: crossSell?.accepted 
          ? `Customer accepted recommended cross-sell accessory: ${crossSell.item.name} (+₹${crossSell.item.price.toLocaleString('en-IN')})`
          : 'Compatible accessories identified and presented to customer',
        details: {
          crossSellItem: crossSell?.item?.name || 'Hard-Shell Protective Travel Case',
          revenueContribution: crossSell?.accepted ? `+₹${crossSell.item.price.toLocaleString('en-IN')}` : '₹0',
          relevanceReason: 'Matched via product compatibility & frequently-bought-together graph'
        }
      },
      {
        stepIndex: 6,
        stepName: 'POLICY CHECK',
        status: policyCheck.authorized ? 'APPROVED' : 'BLOCKED',
        timeOffset: '2.0s',
        actor: 'Deterministic Policy Engine',
        summary: policyCheck.authorized 
          ? `All guardrails passed. Transaction within ₹${policyCheck.thresholds.maxTxLimit.toLocaleString('en-IN')} limit.`
          : `BLOCKED: ${policyCheck.reason}`,
        details: {
          checksEvaluated: policyCheck.checks,
          riskLevel: policyCheck.riskLevel,
          requiresApproval: policyCheck.approvalRequired
        }
      },
      {
        stepIndex: 7,
        stepName: 'USER APPROVAL',
        status: 'APPROVED',
        timeOffset: '3.5s',
        actor: 'Human User (Approval Gate)',
        summary: `User explicitly approved purchase order of ₹${order.total.toLocaleString('en-IN')}`,
        details: {
          approvedAmount: `₹${order.total.toLocaleString('en-IN')}`,
          timestamp: new Date().toISOString()
        }
      },
      {
        stepIndex: 8,
        stepName: 'RAZORPAY PAYMENT',
        status: 'PAID',
        timeOffset: '4.8s',
        actor: 'Razorpay Test Gateway',
        summary: `Razorpay Order ${payment.orderId} verified and captured successfully`,
        details: {
          orderId: payment.orderId,
          paymentId: payment.paymentId,
          amountPaid: `₹${order.total.toLocaleString('en-IN')}`,
          method: payment.method || 'Razorpay Test Card (4111...)'
        }
      },
      {
        stepIndex: 9,
        stepName: 'ORDER CREATION & REVENUE ATTRIBUTION',
        status: 'CONFIRMED',
        timeOffset: '5.2s',
        actor: 'Commerce Core',
        summary: `Order #${order.id} confirmed. Stock deducted. Merchant analytics updated with AI-attributed revenue.`,
        details: {
          orderId: order.id,
          totalRevenue: `₹${order.total.toLocaleString('en-IN')}`,
          aiAttribution: '100% AI-assisted (Discovery + Cross-Sell)',
          itemsCount: order.items.length
        }
      }
    ];

    const replayRecord = {
      replayId,
      orderId: order.id,
      timestamp,
      orderSummary: {
        id: order.id,
        customer: order.customer_name,
        total: order.total,
        items: order.items.map(i => i.name)
      },
      steps
    };

    dbService.recordVisualReplay(replayId, replayRecord);
    if (order.id) {
      dbService.recordVisualReplay(order.id, replayRecord);
    }

    // Also record into audit logs
    dbService.recordAuditEvent({
      action: 'ORDER_COMPLETED',
      actor: 'AI Shopping Assistant',
      orderId: order.id,
      amount: order.total,
      reason: `Completed end-to-end purchase of ${order.items.map(i => i.name).join(', ')} via Razorpay Test Mode.`,
      status: 'SUCCESS',
      replayId
    });

    return replayRecord;
  }
}

module.exports = new AuditReplayService();
