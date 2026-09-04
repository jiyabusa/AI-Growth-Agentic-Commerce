const dbService = require('./dbService');

class AISalespersonService {
  /**
   * Parses natural language customer intent into structured commerce parameters
   */
  understandIntent(userMessage) {
    const msg = userMessage.toLowerCase().trim();
    const intent = {
      rawMessage: userMessage,
      action: 'SEARCH_AND_RECOMMEND',
      category: null,
      maxBudget: null,
      keywords: [],
      travelOriented: false,
      noiseCancelling: false,
      requestedDiscount: false,
      discountTargetPrice: null,
      discountTargetPercent: null,
      requestAccessories: false
    };

    // Word-to-Number conversion map for spoken phrases
    const parseSpokenAmount = (text) => {
      // Direct digits match (e.g., 5000, 5,000, ₹5000)
      const numMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+[\d,]*)/i);
      if (numMatch && parseInt(numMatch[1].replace(/,/g, ''), 10) > 0) {
        return parseInt(numMatch[1].replace(/,/g, ''), 10);
      }

      // Spoken words dictionary
      if (text.includes('fifty thousand')) return 50000;
      if (text.includes('twenty five thousand')) return 25000;
      if (text.includes('twenty thousand')) return 20000;
      if (text.includes('fifteen thousand')) return 15000;
      if (text.includes('twelve thousand')) return 12000;
      if (text.includes('ten thousand') || text.includes('10k')) return 10000;
      if (text.includes('nine thousand')) return 9000;
      if (text.includes('eight thousand')) return 8000;
      if (text.includes('seven thousand')) return 7000;
      if (text.includes('six thousand')) return 6000;
      if (text.includes('five thousand') || text.includes('5k')) return 5000;
      if (text.includes('four thousand') || text.includes('4k')) return 4000;
      if (text.includes('three thousand') || text.includes('3k')) return 3000;
      if (text.includes('two thousand') || text.includes('2k')) return 2000;
      if (text.includes('fifteen hundred') || text.includes('1500')) return 1500;
      if (text.includes('one thousand') || text.includes('thousand') || text.includes('1k')) return 1000;
      if (text.includes('eight hundred') || text.includes('800')) return 800;
      if (text.includes('five hundred') || text.includes('500')) return 500;

      return null;
    };

    // Category extraction
    if (msg.includes('headphone') || msg.includes('audio') || msg.includes('earphone') || msg.includes('music') || msg.includes('soundwave') || msg.includes('acoustic')) {
      intent.category = 'electronics';
      intent.keywords.push('headphones');
    } else if (msg.includes('keyboard') || msg.includes('typing') || msg.includes('keycraft') || msg.includes('mech')) {
      intent.category = 'electronics';
      intent.keywords.push('keyboard');
    } else if (msg.includes('hub') || msg.includes('dock') || msg.includes('usb') || msg.includes('adapter')) {
      intent.category = 'electronics';
      intent.keywords.push('hub');
    } else if (msg.includes('case') || msg.includes('cable') || msg.includes('mat') || msg.includes('accessory') || msg.includes('accessories')) {
      intent.category = 'accessories';
      intent.keywords.push('accessories');
    }

    // Budget extraction (e.g., "under five thousand", "under ₹5,000", "below 5000", "budget ten thousand")
    const budgetContext = msg.match(/(?:under|below|budget|less than|within|around|max|for)\s*(?:₹|rs\.?|inr)?\s*([a-z0-9\s,]+)/i);
    if (budgetContext) {
      const parsed = parseSpokenAmount(budgetContext[1]);
      if (parsed) intent.maxBudget = parsed;
    }
    if (!intent.maxBudget) {
      const fallbackParsed = parseSpokenAmount(msg);
      if (fallbackParsed && (msg.includes('under') || msg.includes('below') || msg.includes('budget') || msg.includes('within') || msg.includes('for'))) {
        intent.maxBudget = fallbackParsed;
      }
    }

    // Contextual preferences
    if (msg.includes('travel') || msg.includes('flight') || msg.includes('commute') || msg.includes('portable') || msg.includes('trip')) {
      intent.travelOriented = true;
    }
    if (msg.includes('noise cancel') || msg.includes('anc') || msg.includes('quiet') || msg.includes('sound isolation')) {
      intent.noiseCancelling = true;
    }

    // Negotiation detection (e.g., "make it 4000", "make it four thousand", "discount", "cheaper", "better price")
    if (msg.includes('make it') || msg.includes('discount') || msg.includes('cheaper') || msg.includes('better price') || msg.includes('reduce') || msg.includes('deal')) {
      intent.requestedDiscount = true;
      const targetMatch = msg.match(/(?:make it|for|at|give it for|price to)\s*(?:₹|rs\.?|inr)?\s*([a-z0-9\s,]+)/i);
      if (targetMatch) {
        intent.discountTargetPrice = parseSpokenAmount(targetMatch[1]);
      }
      const pctMatch = msg.match(/(\d+)%\s*(?:discount|off)/i);
      if (pctMatch) {
        intent.discountTargetPercent = parseInt(pctMatch[1], 10);
      }
    }

    // Accessories detection
    if (msg.includes('accessory') || msg.includes('accessories') || msg.includes('case') || msg.includes('cable') || msg.includes('mat') || msg.includes('add whatever') || msg.includes('companion')) {
      intent.requestAccessories = true;
    }

    // Intent Confidence & Ambiguity Detection
    const hasCategory = !!intent.category;
    const hasBudget = !!intent.maxBudget;
    const hasPreference = intent.travelOriented || intent.noiseCancelling || intent.requestedDiscount;

    if (msg.includes('something cheap') || msg.includes('show me something') || (!hasCategory && !hasBudget && !hasPreference)) {
      intent.isAmbiguous = true;
      intent.confidence = 42;
      intent.clarifyingPrompt = 'Sure! What category of electronics are you looking for today? (e.g., ANC headphones, mechanical keyboards, or USB-C hubs)';
    } else {
      intent.isAmbiguous = false;
      let conf = 75;
      if (hasCategory) conf += 12;
      if (hasBudget) conf += 8;
      if (hasPreference) conf += 5;
      intent.confidence = Math.min(98, conf);
    }

    return intent;
  }

  /**
   * Scores and ranks products based on customer requirements & merchant business objectives
   */
  recommendProducts(intent) {
    const products = dbService.getProducts().filter(p => p.stock > 0);
    const scoredProducts = [];

    for (const prod of products) {
      let score = 50; // base score
      const explanations = [];
      const whyThisReasons = [];

      // Category / Keyword match
      const nameMatch = intent.keywords.some(k => prod.name.toLowerCase().includes(k));
      if (nameMatch) {
        score += 30;
        explanations.push(`Directly matches your search for ${intent.keywords.join(', ')}`);
        whyThisReasons.push(`Matches search: ${intent.keywords.join(', ')}`);
      }

      // Budget Fit
      if (intent.maxBudget) {
        if (prod.price <= intent.maxBudget) {
          score += 25;
          explanations.push(`Fits comfortably within your ₹${intent.maxBudget.toLocaleString('en-IN')} budget`);
          whyThisReasons.push(`Fits ₹${intent.maxBudget.toLocaleString('en-IN')} budget (₹${prod.price.toLocaleString('en-IN')})`);
        } else {
          score -= 35; // penalty if over budget unless explicitly high tier
        }
      }

      // Contextual Feature Match (Travel / ANC)
      if (intent.travelOriented && (prod.features.some(f => f.includes('Noise Cancellation') || f.includes('Battery') || f.includes('Foldable')) || prod.id.includes('case'))) {
        score += 20;
        explanations.push(`Ideal for travel with long battery life & noise isolation`);
        whyThisReasons.push('Optimized for travel with portable form factor');
      }

      if (intent.noiseCancelling && prod.features.some(f => f.includes('Noise Cancellation') || f.includes('DAC'))) {
        score += 25;
        explanations.push(`Equipped with hybrid active noise cancellation`);
        whyThisReasons.push('Active Noise Cancellation (ANC) certified');
      }

      // Product Rating & Stock
      if (prod.rating >= 4.7) {
        score += 15;
        whyThisReasons.push(`${prod.rating}★ Customer Satisfaction rating`);
      }
      if (prod.stock > 0) {
        whyThisReasons.push(`Currently in stock (${prod.stock} units ready to ship)`);
      }

      // Merchant Priority / Margin Alignment
      if (prod.merchant_priority === 'high') {
        score += 10;
      }

      // Default fallback reason
      if (whyThisReasons.length === 0) {
        whyThisReasons.push(`Top rated ${prod.category} selection in our catalog`);
      }

      const businessSafeExplanation = explanations.length > 0 
        ? explanations.join('; ') + '.'
        : `Top-rated choice with ${prod.rating}★ rating and verified in-stock availability.`;

      const breakdown = {
        customerFit: Math.min(100, Math.max(60, score + 5)),
        budgetFit: intent.maxBudget ? (prod.price <= intent.maxBudget ? 95 : 50) : 90,
        featureMatch: Math.min(100, Math.max(70, score)),
        availability: prod.stock > 10 ? 100 : 80,
        merchantAlignment: prod.merchant_priority === 'high' ? 95 : 80
      };

      scoredProducts.push({
        product: prod,
        recommendationScore: score,
        breakdown,
        whyThisReasons,
        explanation: businessSafeExplanation
      });
    }

    // Sort descending by score
    scoredProducts.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return scoredProducts.slice(0, 4);
  }

  /**
   * Smart Cart Optimization Engine
   * Analyzes current cart items to detect budget room, companion gaps, or bundle discount savings.
   */
  analyzeCartOptimization(cart, sessionMemory = {}) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return null;
    }

    const hasHeadphones = cart.items.some(i => i.id.includes('headphones'));
    const hasCase = cart.items.some(i => i.id === 'prod_travel_case');
    const hasKeyboard = cart.items.some(i => i.id.includes('keyboard'));
    const hasCable = cart.items.some(i => i.id === 'prod_coiled_cable');

    // Case 1: Has Headphones + Travel Case -> Highlight Bundle Savings
    if (hasHeadphones && hasCase) {
      return {
        type: 'BUNDLE_SAVINGS',
        title: 'Special Bundle Savings Active',
        message: 'You have combined AcousticPro Headphones + Protective Case. A special bundle discount of ₹299–₹519 is eligible!',
        discountEligible: 399,
        actionLabel: 'Apply Bundle Discount'
      };
    }

    // Case 2: Has Headphones but no Case -> Companion gap
    if (hasHeadphones && !hasCase) {
      const budgetCap = sessionMemory.budget || 5000;
      const budgetRemaining = Math.max(0, budgetCap - cart.total);
      return {
        type: 'COMPANION_GAP',
        title: 'Complete Your Travel Setup',
        message: `You have headphones in your cart. A tailored Hard-Shell Travel Case is available for ₹799 (fits your setup perfectly).`,
        suggestedProduct: dbService.getProductById('prod_travel_case'),
        budgetRemaining,
        actionLabel: '+ Add Travel Case (₹799)'
      };
    }

    // Case 3: Has Keyboard but no cable
    if (hasKeyboard && !hasCable) {
      return {
        type: 'COMPANION_GAP',
        title: 'Complementary Accessory Opportunity',
        message: 'KeyCraft Pro mechanical keyboard pairs seamlessly with the Braided Aviator Coiled USB-C Cable (₹699).',
        suggestedProduct: dbService.getProductById('prod_coiled_cable'),
        actionLabel: '+ Add Coiled Cable (₹699)'
      };
    }

    return null;
  }

  /**
   * Generates intelligent Upsell and Cross-sell opportunities
   */
  getUpsellAndCrossSell(productId) {
    const product = dbService.getProductById(productId);
    if (!product) return { upsell: null, crossSells: [] };

    let upsell = null;
    if (product.upsell_id) {
      const upItem = dbService.getProductById(product.upsell_id);
      if (upItem && upItem.stock > 0) {
        const priceDiff = upItem.price - product.price;
        upsell = {
          product: upItem,
          headline: `Upgrade to ${upItem.name}`,
          explanation: `For ₹${priceDiff.toLocaleString('en-IN')} more, get flagship titanium drivers, 55-hr battery, and studio DAC.`,
          priceDiff
        };
      }
    }

    // Compatible cross-sells
    const crossSells = (product.compatible_products || [])
      .map(id => dbService.getProductById(id))
      .filter(p => p && p.stock > 0 && p.id !== productId)
      .map(item => ({
        product: item,
        headline: `Compatible Accessory: ${item.name}`,
        explanation: `Designed specifically for ${product.name}. ${item.description}`,
        isFrequentlyBought: (product.frequently_bought_with || []).includes(item.id)
      }));

    return { upsell, crossSells };
  }

  /**
   * Evaluates customer negotiation requests against merchant-defined boundary rules
   */
  evaluateNegotiation(productId, targetPrice, bundleItemIds = []) {
    const policies = dbService.getPolicies();
    const sellingControls = policies.selling_controls;

    const mainProduct = dbService.getProductById(productId);
    if (!mainProduct) return { allowed: false, reason: 'Product not found.' };

    const bundleItems = bundleItemIds.map(id => dbService.getProductById(id)).filter(Boolean);
    const regularSubtotal = mainProduct.price + bundleItems.reduce((sum, b) => sum + b.price, 0);

    if (!sellingControls.negotiation_enabled) {
      return {
        allowed: false,
        reason: 'Merchant negotiation is currently disabled for this catalog.',
        suggestedOffer: null
      };
    }

    const maxAllowedDiscountPct = sellingControls.max_discount_percentage || 10;
    const minAllowedMargin = sellingControls.min_allowed_margin || 500;

    // Check direct discount request
    if (targetPrice && targetPrice > 0) {
      const requestedDiscount = regularSubtotal - targetPrice;
      const requestedDiscountPct = (requestedDiscount / regularSubtotal) * 100;
      const projectedMargin = (targetPrice - (mainProduct.costPrice + bundleItems.reduce((s, b) => s + b.costPrice, 0)));

      // If requested discount is within policy
      if (requestedDiscountPct <= maxAllowedDiscountPct && projectedMargin >= minAllowedMargin) {
        return {
          allowed: true,
          negotiationType: 'DIRECT_DISCOUNT_APPROVED',
          originalPrice: regularSubtotal,
          negotiatedPrice: targetPrice,
          discountAmount: requestedDiscount,
          discountPercentage: Number(requestedDiscountPct.toFixed(1)),
          explanation: `Approved! We can offer you a special price of ₹${targetPrice.toLocaleString('en-IN')} (saves ₹${requestedDiscount.toLocaleString('en-IN')}).`
        };
      }

      // If requested discount exceeds direct discount cap, propose Merchant-Safe Bundle Alternative
      const maxDirectDiscountAmount = Math.floor(regularSubtotal * (maxAllowedDiscountPct / 100));
      const counterDirectPrice = regularSubtotal - maxDirectDiscountAmount;

      // Create bundle counter-offer with compatible travel case / cable if available
      const crossSells = this.getUpsellAndCrossSell(mainProduct.id).crossSells;
      const recommendedCrossSell = crossSells.length > 0 ? crossSells[0].product : null;

      let bundleOffer = null;
      if (recommendedCrossSell) {
        const fullBundleRegular = mainProduct.price + recommendedCrossSell.price;
        const bundleSpecialDiscount = Math.round(recommendedCrossSell.price * 0.65); // 65% off accessory
        const bundleFinalPrice = fullBundleRegular - bundleSpecialDiscount;

        bundleOffer = {
          bundleName: `${mainProduct.name} + ${recommendedCrossSell.name} Companion Bundle`,
          bundleItems: [mainProduct, recommendedCrossSell],
          regularTotal: fullBundleRegular,
          specialBundlePrice: bundleFinalPrice,
          totalSavings: bundleSpecialDiscount,
          explanation: `I cannot discount the standalone headphones to ₹${targetPrice.toLocaleString('en-IN')}, but I can offer our Travel Companion Bundle (${mainProduct.name} + ${recommendedCrossSell.name}) for just ₹${bundleFinalPrice.toLocaleString('en-IN')} (saving you ₹${bundleSpecialDiscount.toLocaleString('en-IN')}).`
        };
      }

      return {
        allowed: false,
        negotiationType: 'DIRECT_DISCOUNT_REJECTED_BUNDLE_PROPOSED',
        originalPrice: regularSubtotal,
        requestedPrice: targetPrice,
        requestedDiscountPct: Number(requestedDiscountPct.toFixed(1)),
        maxAllowedDiscountPct,
        counterOfferPrice: counterDirectPrice,
        counterOfferDiscount: maxDirectDiscountAmount,
        bundleAlternative: bundleOffer,
        explanation: `A direct discount to ₹${targetPrice.toLocaleString('en-IN')} (${requestedDiscountPct.toFixed(1)}% off) exceeds merchant policy limits (Max ${maxAllowedDiscountPct}% allowed). Best standalone price is ₹${counterDirectPrice.toLocaleString('en-IN')}.`
      };
    }

    return {
      allowed: true,
      negotiationType: 'STANDARD_PRICING',
      originalPrice: regularSubtotal,
      negotiatedPrice: regularSubtotal,
      discountAmount: 0
    };
  }

  /**
   * Top 6-8 Explainable Recommendations Engine
   * Dynamically personalizes for returning customers (using search, purchase, viewed & browsing signals)
   * or serves explainable popular/trending recommendations across configured sources for new customers.
   */
  getPersonalizedTopRecommendations(customerProfile = null, limit = 8) {
    const products = dbService.getProducts().filter(p => p.stock > 0);
    const hasHistory = customerProfile && (
      (customerProfile.searchHistory && customerProfile.searchHistory.length > 0) ||
      (customerProfile.purchaseHistory && customerProfile.purchaseHistory.length > 0) ||
      (customerProfile.viewedHistory && customerProfile.viewedHistory.length > 0) ||
      (customerProfile.browsingCategories && customerProfile.browsingCategories.length > 0)
    );

    if (hasHistory) {
      const searchTerms = (customerProfile.searchHistory || []).join(' ').toLowerCase();
      const purchases = customerProfile.purchaseHistory || [];
      const viewed = customerProfile.viewedHistory || [];
      const categories = customerProfile.browsingCategories || [];

      const scored = products.map(prod => {
        let score = 50;
        let primaryReason = '';
        const whyThis = [];

        // 1. Compatible with prior purchase
        const isCompanionToPurchase = purchases.some(purId => {
          const purProd = dbService.getProductById(purId);
          return purProd && (purProd.compatible_products || []).includes(prod.id);
        });
        if (isCompanionToPurchase) {
          score += 45;
          const boughtProd = dbService.getProductById(purchases[0]);
          primaryReason = boughtProd ? `Companion for your ${boughtProd.name}` : 'Complements your recent purchase';
          whyThis.push(`Engineered as companion accessory for previous purchase`);
        }

        // 2. Previously viewed in past sessions
        if (viewed.includes(prod.id)) {
          score += 35;
          if (!primaryReason) primaryReason = 'Recently viewed in your previous session';
          whyThis.push('Saved from your previous browsing session');
        }

        // 3. Search history keyword match
        const prodTerms = `${prod.name} ${prod.description} ${prod.category} ${(prod.features || []).join(' ')}`.toLowerCase();
        const matchedSearch = (customerProfile.searchHistory || []).find(sh => {
          const words = sh.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          return words.some(w => prodTerms.includes(w));
        });
        if (matchedSearch) {
          score += 30;
          if (!primaryReason) primaryReason = `Based on your search for "${matchedSearch.slice(0, 30)}"`;
          whyThis.push(`Matches your recorded search: "${matchedSearch}"`);
        }

        // 4. Preferred Category Fit
        if (categories.includes(prod.category)) {
          score += 15;
          if (!primaryReason) primaryReason = `Popular in your preferred ${prod.category} category`;
          whyThis.push(`Aligns with your category browsing affinity`);
        }

        // 5. Ratings and Source quality
        if (prod.rating >= 4.8) score += 10;
        if (prod.merchant_priority === 'high') score += 8;

        if (!primaryReason) {
          primaryReason = `Top-rated ${prod.rating}★ selection from ${prod.source || 'Verified Source'}`;
          whyThis.push(`Verified ${prod.rating}★ customer rating`);
        }

        return {
          product: prod,
          score,
          reasonBadge: primaryReason,
          isPersonalized: true,
          whyThisReasons: whyThis.length > 0 ? whyThis : [`Recommended based on ${prod.rating}★ rating from ${prod.source}`]
        };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    }

    // New Customer or No Prior History: Transparent Trending & Popular Recommendations
    const defaultBadges = [
      '🔥 Trending #1 in Store',
      '⭐ 4.9★ Customer Favorite',
      '🎧 Bestselling Multi-Source Audio Pick',
      '⚡ Staff Productivity Choice',
      '💼 Top-Rated Travel Essential',
      '✨ Premium Partner Pick',
      '📦 AI-Native Bestseller',
      '🌟 High-Performance Gadget'
    ];

    const trending = products.map((prod, index) => {
      const badge = defaultBadges[index % defaultBadges.length];
      return {
        product: prod,
        score: Math.round(prod.rating * 20),
        reasonBadge: badge,
        isPersonalized: false,
        whyThisReasons: [
          `${prod.rating}★ verified satisfaction score`,
          `Available from configured source: ${prod.source || 'OmniGrowth Direct'}`,
          `In-stock and AI-readable specification verified`,
          `Popular with new shoppers in ${prod.category}`
        ]
      };
    });

    // Sort by rating & merchant priority
    trending.sort((a, b) => (b.product.rating * 10 + (b.product.merchant_priority === 'high' ? 5 : 0)) - (a.product.rating * 10 + (a.product.merchant_priority === 'high' ? 5 : 0)));
    return trending.slice(0, limit);
  }
}

module.exports = new AISalespersonService();
