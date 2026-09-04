/**
 * Natural Language to Deterministic Policy Parser
 * Translates merchant natural language requirements into strict, deterministic JSON policy rules.
 */

class PolicyParserService {
  parse(naturalLanguagePrompt) {
    const text = naturalLanguagePrompt.toLowerCase();
    const structuredChanges = {
      spending_controls: {},
      selling_controls: {},
      product_controls: {}
    };

    const explanationList = [];

    // 1. Max Discount Percentage (e.g. "don't give more than 10% discount", "do not give more than 10%", "max 15% discount")
    const discountMatch = text.match(/(?:max(?:imum)?|no more than|do not give more than|don't give more than|under|cap|not more than)?\s*(\d+)\s*%\s*(?:discount)?/i);
    if (discountMatch && discountMatch[1]) {
      const discount = parseInt(discountMatch[1], 10);
      structuredChanges.selling_controls.max_discount_percentage = discount;
      explanationList.push(`Max discount capped at ${discount}%`);
    }

    // 2. Auto-Approval Threshold (e.g. "automatically approve purchases below ₹2,000", "auto approve under 3000")
    const autoApprMatch = text.match(/(?:auto(?:matically)?\s*approv[a-z]*|approval\s*under|below|under)\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i);
    if (autoApprMatch) {
      const val = parseInt(autoApprMatch[1].replace(/,/g, ''), 10);
      if (val > 100) {
        structuredChanges.spending_controls.auto_approval_threshold = val;
        explanationList.push(`Auto-approval threshold set to ₹${val.toLocaleString('en-IN')}`);
      }
    }

    // 3. Max Transaction Limit (e.g. "max transaction 10000", "limit purchases to ₹15,000")
    const maxTxMatch = text.match(/(?:max(?:imum)?\s*transaction(?: limit)?|limit purchases to|transaction cap)\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i);
    if (maxTxMatch) {
      const maxVal = parseInt(maxTxMatch[1].replace(/,/g, ''), 10);
      structuredChanges.spending_controls.max_transaction_limit = maxVal;
      explanationList.push(`Max transaction spending limit set to ₹${maxVal.toLocaleString('en-IN')}`);
    }

    // 4. Minimum Allowed Margin (e.g. "minimum margin ₹500", "min margin 600")
    const minMarginMatch = text.match(/(?:min(?:imum)?\s*margin|margin floor)\s*(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i);
    if (minMarginMatch) {
      const margin = parseInt(minMarginMatch[1].replace(/,/g, ''), 10);
      structuredChanges.selling_controls.min_allowed_margin = margin;
      explanationList.push(`Minimum margin floor set to ₹${margin.toLocaleString('en-IN')}`);
    }

    // 5. Category Approval Controls (e.g. "always ask me before selling premium products")
    if (text.includes('premium') || text.includes('high value') || text.includes('expensive')) {
      structuredChanges.product_controls.approval_required_categories = ['premium_electronics', 'flagship_audio'];
      explanationList.push('Enforced mandatory human approval on premium and flagship categories');
    }

    // 6. Upsell / Cross-sell / Negotiation toggles
    if (text.includes('disable upsell') || text.includes('no upsell')) {
      structuredChanges.selling_controls.upsell_enabled = false;
      explanationList.push('Disabled autonomous upsell');
    }
    if (text.includes('disable cross-sell') || text.includes('no accessories')) {
      structuredChanges.selling_controls.cross_sell_enabled = false;
      explanationList.push('Disabled autonomous companion cross-sell');
    }

    return {
      success: explanationList.length > 0,
      originalPrompt: naturalLanguagePrompt,
      parsedPolicy: structuredChanges,
      explanations: explanationList.length > 0 ? explanationList : ['Detected general rule update. Defaulting to standard guardrails.']
    };
  }
}

module.exports = new PolicyParserService();
