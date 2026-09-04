/**
 * Unified Relational Store & Seed Data Service
 * Maintains live products, merchant policies, orders, analytics, carts, and audit events.
 */

class DatabaseService {
  constructor() {
    this.resetState();
  }

  resetState() {
    // 1. Products (Structured, AI-Readable Catalog from Multiple Sources)
    this.products = [
      {
        id: 'prod_anc_headphones',
        name: 'AcousticPro Wireless ANC Headphones',
        description: 'Studio-grade hybrid active noise cancellation headphones with 40-hour battery life and foldable travel chassis.',
        category: 'electronics',
        price: 4499,
        costPrice: 2800,
        currency: 'INR',
        stock: 24,
        brand: 'AcousticPro',
        rating: 4.8,
        source: 'OmniGrowth Direct',
        source_type: 'MERCHANT_DIRECT',
        features: ['Hybrid Active Noise Cancellation', 'Bluetooth 5.3', '40-Hour Battery Life', 'Foldable Design'],
        compatible_products: ['prod_travel_case', 'prod_headphone_stand', 'prod_bt_adapter'],
        frequently_bought_with: ['prod_travel_case', 'prod_bt_adapter'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 1699,
        upsell_id: 'prod_anc_headphones_pro'
      },
      {
        id: 'prod_anc_headphones_pro',
        name: 'AcousticPro Master ANC Studio Edition',
        description: 'Flagship studio headphones with ultra-low latency DAC, custom titanium drivers, and 55-hour battery.',
        category: 'electronics',
        price: 7999,
        costPrice: 4900,
        currency: 'INR',
        stock: 14,
        brand: 'AcousticPro',
        rating: 4.9,
        source: 'AcousticPro Studio Network',
        source_type: 'PARTNER_NETWORK',
        features: ['Studio Master DAC', '55-Hour Battery', 'Custom Titanium Drivers', 'Multipoint Connection'],
        compatible_products: ['prod_travel_case', 'prod_headphone_stand'],
        frequently_bought_with: ['prod_travel_case'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 3099,
        upsell_id: null
      },
      {
        id: 'prod_travel_case',
        name: 'Hard-Shell Protective Travel Case',
        description: 'Shockproof, water-resistant EVA molded case tailor-fitted for AcousticPro headphones with cable pocket.',
        category: 'accessories',
        price: 799,
        costPrice: 320,
        currency: 'INR',
        stock: 50,
        brand: 'AcousticPro',
        rating: 4.7,
        source: 'HyperTravel Tech Supply',
        source_type: 'CONFIGURED_SUPPLY',
        features: ['Shockproof EVA Shell', 'Water-Resistant Zipper', 'Cable Mesh Pocket'],
        compatible_products: ['prod_anc_headphones', 'prod_anc_headphones_pro'],
        frequently_bought_with: ['prod_anc_headphones'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 479,
        upsell_id: null
      },
      {
        id: 'prod_bt_adapter',
        name: 'Low-Latency Bluetooth 5.3 Audio Transmitter',
        description: 'Universal USB-C/3.5mm low-latency transmitter for aircraft in-flight entertainment and PC gaming.',
        category: 'accessories',
        price: 999,
        costPrice: 450,
        currency: 'INR',
        stock: 35,
        brand: 'AcousticPro',
        rating: 4.6,
        source: 'HyperTravel Tech Supply',
        source_type: 'CONFIGURED_SUPPLY',
        features: ['aptX Low Latency', 'Airplane 3.5mm Adapter Included', 'Dual Audio Stream'],
        compatible_products: ['prod_anc_headphones', 'prod_anc_headphones_pro'],
        frequently_bought_with: ['prod_anc_headphones', 'prod_travel_case'],
        merchant_priority: 'medium',
        ai_readable: true,
        margin_inr: 549,
        upsell_id: null
      },
      {
        id: 'prod_travel_backpack',
        name: 'AeroGlide Anti-Theft Smart Commute Backpack',
        description: 'Weatherproof 22L laptop & travel bag with dedicated shockproof audio compartment and USB-C pass-through charging.',
        category: 'accessories',
        price: 3299,
        costPrice: 1800,
        currency: 'INR',
        stock: 20,
        brand: 'AeroGlide',
        rating: 4.8,
        source: 'Global Travel Warehouse',
        source_type: 'VERIFIED_CATALOG',
        features: ['TSA-Friendly Lay-Flat Design', 'Water-Resistant Cordura', 'Hidden Passport Pocket', 'Luggage Pass-Through'],
        compatible_products: ['prod_anc_headphones', 'prod_usbc_hub'],
        frequently_bought_with: ['prod_anc_headphones', 'prod_travel_case'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 1499,
        upsell_id: null
      },
      {
        id: 'prod_mech_keyboard',
        name: 'KeyCraft Pro RGB Mechanical Keyboard',
        description: 'Hot-swappable tactile switches, gasket-mounted aluminum frame with per-key RGB backlighting.',
        category: 'electronics',
        price: 4499,
        costPrice: 2700,
        currency: 'INR',
        stock: 18,
        brand: 'KeyCraft',
        rating: 4.8,
        source: 'KeyCraft Labs',
        source_type: 'PARTNER_NETWORK',
        features: ['Hot-Swappable Switches', 'Gasket Mount Design', 'Detachable Type-C Cable', 'Sound Dampening Foam'],
        compatible_products: ['prod_coiled_cable', 'prod_desk_mat'],
        frequently_bought_with: ['prod_coiled_cable', 'prod_desk_mat'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 1799,
        upsell_id: null
      },
      {
        id: 'prod_coiled_cable',
        name: 'Braided Aviator Coiled USB-C Cable',
        description: 'Custom double-sleeved coil with quick-release aviator lock for mechanical keyboards and fast charging.',
        category: 'accessories',
        price: 699,
        costPrice: 280,
        currency: 'INR',
        stock: 40,
        brand: 'KeyCraft',
        rating: 4.7,
        source: 'KeyCraft Labs',
        source_type: 'PARTNER_NETWORK',
        features: ['Double-Sleeved Braiding', 'Detachable Aviator Port', 'Gold-Plated Connectors'],
        compatible_products: ['prod_mech_keyboard'],
        frequently_bought_with: ['prod_mech_keyboard'],
        merchant_priority: 'medium',
        ai_readable: true,
        margin_inr: 419,
        upsell_id: null
      },
      {
        id: 'prod_desk_mat',
        name: 'Water-Resistant Merino Felt Desk Mat (900x400mm)',
        description: 'Ultra-smooth surface crafted from sustainable Merino felt with non-slip natural rubber underlay.',
        category: 'accessories',
        price: 799,
        costPrice: 320,
        currency: 'INR',
        stock: 30,
        brand: 'OmniDesk',
        rating: 4.9,
        source: 'OmniDesk Global Warehouse',
        source_type: 'VERIFIED_CATALOG',
        features: ['Premium Merino Felt', 'Anti-Slip Rubber Base', 'Anti-Fray Stitched Edges'],
        compatible_products: ['prod_mech_keyboard', 'prod_laptop_stand'],
        frequently_bought_with: ['prod_mech_keyboard', 'prod_coiled_cable'],
        merchant_priority: 'medium',
        ai_readable: true,
        margin_inr: 479,
        upsell_id: null
      },
      {
        id: 'prod_laptop_stand',
        name: 'Ergonomic Aircraft-Aluminium Laptop Riser',
        description: 'Precision CNC-machined folding laptop riser with 6-level height adjustment and thermal cooling cutouts.',
        category: 'accessories',
        price: 1899,
        costPrice: 950,
        currency: 'INR',
        stock: 25,
        brand: 'OmniDesk',
        rating: 4.8,
        source: 'OmniDesk Global Warehouse',
        source_type: 'VERIFIED_CATALOG',
        features: ['Aircraft Aluminum Alloy', '6 Adjustable Angles', 'Foldable & Portable', 'Non-Slip Silicone Grips'],
        compatible_products: ['prod_usbc_hub', 'prod_desk_mat'],
        frequently_bought_with: ['prod_usbc_hub', 'prod_desk_mat'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 949,
        upsell_id: null
      },
      {
        id: 'prod_usbc_hub',
        name: '8-in-1 Aluminium 4K60Hz USB-C Docking Hub',
        description: 'Multi-port hub featuring 100W PD charging, 4K@60Hz HDMI output, Gigabit Ethernet, and UHS-I SD card readers.',
        category: 'electronics',
        price: 3999,
        costPrice: 2400,
        currency: 'INR',
        stock: 22,
        brand: 'OmniDesk',
        rating: 4.7,
        source: 'OmniGrowth Direct',
        source_type: 'MERCHANT_DIRECT',
        features: ['100W Power Delivery', '4K 60Hz HDMI', 'Gigabit Ethernet', 'SD/TF Card Readers'],
        compatible_products: ['prod_desk_mat', 'prod_laptop_stand'],
        frequently_bought_with: ['prod_desk_mat'],
        merchant_priority: 'medium',
        ai_readable: true,
        margin_inr: 1599,
        upsell_id: null
      },
      {
        id: 'prod_gan_charger',
        name: 'Ultra-Compact 65W GaN Dual-Port Fast Charger',
        description: 'Next-gen Gallium Nitride (GaN) fast wall charger with dual USB-C Power Delivery ports for laptops and phones.',
        category: 'electronics',
        price: 2199,
        costPrice: 1100,
        currency: 'INR',
        stock: 32,
        brand: 'VoltCraft',
        rating: 4.9,
        source: 'Prime Tech Supply',
        source_type: 'PARTNER_NETWORK',
        features: ['65W GaN III Technology', 'Dual USB-C Output', 'Foldable Travel Pins', 'Intelligent Power Allocation'],
        compatible_products: ['prod_anc_headphones', 'prod_usbc_hub'],
        frequently_bought_with: ['prod_anc_headphones'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 1099,
        upsell_id: null
      },
      {
        id: 'prod_earbuds_anc',
        name: 'SoundWave True Wireless Active Noise Cancelling Earbuds',
        description: 'Pocket-sized IPX5 earbuds with active ambient transparency mode, 32-hr playback, and wireless charging case.',
        category: 'electronics',
        price: 3499,
        costPrice: 1950,
        currency: 'INR',
        stock: 28,
        brand: 'SoundWave',
        rating: 4.7,
        source: 'Prime Audio Systems',
        source_type: 'PARTNER_NETWORK',
        features: ['Active Noise Cancellation', 'Transparency Mode', 'IPX5 Water Resistance', 'Wireless Charging Case'],
        compatible_products: ['prod_travel_case', 'prod_gan_charger'],
        frequently_bought_with: ['prod_gan_charger'],
        merchant_priority: 'high',
        ai_readable: true,
        margin_inr: 1549,
        upsell_id: null
      }
    ];

    // 2. Customer Authentication & Profile Store (Shared Single Source of Truth)
    this.customers = new Map();

    // 1. Aarav Sharma
    this.customers.set('cust_aarav', {
      id: 'cust_aarav',
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'headphones under ₹5,000 for travel',
        'wireless ANC noise cancellation',
        'AcousticPro headphones',
        'travel gear'
      ],
      purchaseHistory: ['prod_anc_headphones'],
      viewedHistory: ['prod_anc_headphones', 'prod_travel_case', 'prod_travel_backpack'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 5000,
      createdAt: '2026-06-10T09:00:00.000Z'
    });

    // 2. Priya Shah (ANC Headphones + Travel Case companion cross-sell)
    this.customers.set('cust_priya', {
      id: 'cust_priya',
      name: 'Priya Shah',
      email: 'priya@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'AcousticPro Wireless ANC Headphones',
        'protective travel case',
        'hard-shell headphone case',
        'travel accessories'
      ],
      purchaseHistory: ['prod_anc_headphones', 'prod_travel_case'],
      viewedHistory: ['prod_anc_headphones', 'prod_travel_case', 'prod_bt_adapter'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 6000,
      createdAt: '2026-06-12T11:30:00.000Z'
    });

    // 3. Rohan Mehta (KeyCraft mechanical keyboard + coiled cable & desk mat)
    this.customers.set('cust_rohan', {
      id: 'cust_rohan',
      name: 'Rohan Mehta',
      email: 'rohan@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'KeyCraft mechanical keyboard',
        'coiled aviator cable',
        'ergonomic desk setup',
        'merino felt desk mat'
      ],
      purchaseHistory: ['prod_mech_keyboard', 'prod_coiled_cable', 'prod_desk_mat'],
      viewedHistory: ['prod_mech_keyboard', 'prod_coiled_cable', 'prod_desk_mat', 'prod_laptop_stand'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 6500,
      createdAt: '2026-06-18T14:15:00.000Z'
    });

    // 4. Ananya Patel (Ergonomic desk riser + USB-C Hub)
    this.customers.set('cust_ananya', {
      id: 'cust_ananya',
      name: 'Ananya Patel',
      email: 'ananya@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'ergonomic aluminium laptop riser',
        'USB-C docking hub 4K',
        'work from home setup'
      ],
      purchaseHistory: ['prod_laptop_stand', 'prod_usbc_hub'],
      viewedHistory: ['prod_laptop_stand', 'prod_usbc_hub', 'prod_desk_mat'],
      browsingCategories: ['accessories', 'electronics'],
      preferredBudget: 7000,
      createdAt: '2026-07-02T10:00:00.000Z'
    });

    // 5. Arjun Verma (Studio master headphones pro upgrade + travel case)
    this.customers.set('cust_arjun', {
      id: 'cust_arjun',
      name: 'Arjun Verma',
      email: 'arjun@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'studio headphones low latency DAC',
        'AcousticPro Master ANC Studio Edition',
        'audiophile gear'
      ],
      purchaseHistory: ['prod_anc_headphones_pro', 'prod_travel_case'],
      viewedHistory: ['prod_anc_headphones_pro', 'prod_travel_case', 'prod_bt_adapter'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 10000,
      createdAt: '2026-07-15T16:45:00.000Z'
    });

    // 6. Sneha Iyer (SoundWave ANC Earbuds + 65W GaN fast charger)
    this.customers.set('cust_sneha', {
      id: 'cust_sneha',
      name: 'Sneha Iyer',
      email: 'sneha@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'wireless ANC earbuds for commute',
        'GaN 65W fast charger dual port',
        'portable audio'
      ],
      purchaseHistory: ['prod_earbuds_anc', 'prod_gan_charger'],
      viewedHistory: ['prod_earbuds_anc', 'prod_gan_charger', 'prod_travel_backpack'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 6000,
      createdAt: '2026-07-28T12:20:00.000Z'
    });

    // 7. Aditya Kapoor (AeroGlide Smart Backpack)
    this.customers.set('cust_aditya', {
      id: 'cust_aditya',
      name: 'Aditya Kapoor',
      email: 'aditya@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'smart commute backpack 22L',
        'waterproof anti-theft laptop bag'
      ],
      purchaseHistory: ['prod_travel_backpack'],
      viewedHistory: ['prod_travel_backpack', 'prod_anc_headphones'],
      browsingCategories: ['accessories'],
      preferredBudget: 4000,
      createdAt: '2026-08-05T08:30:00.000Z'
    });

    // 8. Kavya Nair (AcousticPro ANC + Bluetooth Transmitter)
    this.customers.set('cust_kavya', {
      id: 'cust_kavya',
      name: 'Kavya Nair',
      email: 'kavya@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: [
        'in-flight bluetooth adapter',
        'AcousticPro wireless headphones',
        'airplane dual audio stream'
      ],
      purchaseHistory: ['prod_anc_headphones', 'prod_bt_adapter'],
      viewedHistory: ['prod_anc_headphones', 'prod_bt_adapter', 'prod_travel_case'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 6000,
      createdAt: '2026-08-12T15:00:00.000Z'
    });

    // Backwards-compatible profile for Jiya Patel
    this.customers.set('cust_jiya', {
      id: 'cust_jiya',
      name: 'Jiya Patel',
      email: 'jiya@example.com',
      password: 'password123',
      isReturning: true,
      searchHistory: ['headphones under ₹5,000 for travel'],
      purchaseHistory: ['prod_anc_headphones'],
      viewedHistory: ['prod_travel_case', 'prod_bt_adapter'],
      browsingCategories: ['electronics', 'accessories'],
      preferredBudget: 5000,
      createdAt: '2026-06-15T10:00:00.000Z'
    });

    // 2b. Merchant Authentication & Profile Store
    this.merchants = new Map();

    this.merchants.set('merch_omnigrowth', {
      id: 'merch_omnigrowth',
      businessName: 'OmniGrowth Labs',
      ownerName: 'Vikram Desai',
      email: 'admin@omnigrowth.com',
      password: 'password123',
      plan: 'Razorpay Test Mode',
      createdAt: '2026-01-15T09:00:00.000Z'
    });

    this.merchants.set('merch_acousticpro', {
      id: 'merch_acousticpro',
      businessName: 'AcousticPro Audio',
      ownerName: 'Meera Joshi',
      email: 'meera@acousticpro.com',
      password: 'password123',
      plan: 'Razorpay Test Mode',
      createdAt: '2026-02-20T11:00:00.000Z'
    });

    // 2c. AI-to-AI Commerce Authorized Users Store
    this.ai2aiUsers = new Map();

    this.ai2aiUsers.set('ai2ai_operator', {
      id: 'ai2ai_operator',
      name: 'Commerce Operator',
      email: 'operator@omnigrowth.com',
      password: 'password123',
      role: 'operator',
      createdAt: '2026-03-01T09:00:00.000Z'
    });

    this.ai2aiUsers.set('ai2ai_admin', {
      id: 'ai2ai_admin',
      name: 'Agent Admin',
      email: 'agent-admin@omnigrowth.com',
      password: 'password123',
      role: 'admin',
      createdAt: '2026-03-01T09:00:00.000Z'
    });

    // 3. Merchant Policies & Agent Controls
    this.policies = {
      agent_status: 'ACTIVE', // 'ACTIVE' | 'PAUSED'
      primary_goal: 'Increase Average Order Value (+15%)',
      preferred_strategy: 'Cross-sell complementary accessories',
      spending_controls: {
        max_transaction_limit: 10000,
        daily_spending_limit: 25000,
        auto_approval_threshold: 2000
      },
      product_controls: {
        allowed_categories: ['electronics', 'accessories', 'audio', 'computing'],
        blocked_categories: ['restricted_goods', 'gambling', 'crypto'],
        approval_required_categories: ['premium_electronics']
      },
      selling_controls: {
        max_discount_percentage: 10,
        min_allowed_margin: 500,
        upsell_enabled: true,
        cross_sell_enabled: true,
        negotiation_enabled: true,
        preferred_negotiation_method: 'bundle_discount'
      }
    };

    // 4. Seeded Historical & Live Orders (Directly linked to actual customer accounts)
    this.orders = [
      {
        id: 'ORD-10482',
        customer_id: 'cust_priya',
        customer_name: 'Priya Shah',
        items: [
          { id: 'prod_anc_headphones', name: 'AcousticPro Wireless ANC Headphones', price: 4499, quantity: 1, isUpsell: false, isCrossSell: false },
          { id: 'prod_travel_case', name: 'Hard-Shell Protective Travel Case', price: 799, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 5298,
        discount: 0,
        total: 5298,
        base_revenue: 4499,
        upsell_revenue: 0,
        cross_sell_revenue: 799,
        incremental_revenue: 799,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay UPI (Verified)',
        razorpay_order_id: 'order_RZP_PR928A',
        razorpay_payment_id: 'pay_RZP_PR928A',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'ORD-10481',
        customer_id: 'cust_aarav',
        customer_name: 'Aarav Sharma',
        items: [
          { id: 'prod_anc_headphones', name: 'AcousticPro Wireless ANC Headphones', price: 4499, quantity: 1, isUpsell: false, isCrossSell: false }
        ],
        subtotal: 4499,
        discount: 0,
        total: 4499,
        base_revenue: 4499,
        upsell_revenue: 0,
        cross_sell_revenue: 0,
        incremental_revenue: 0,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: false,
        payment_status: 'PAID',
        payment_method: 'Razorpay Test Card (4111...)',
        razorpay_order_id: 'order_RZP_AR1048',
        razorpay_payment_id: 'pay_RZP_AR1048',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: 'ORD-10480',
        customer_id: 'cust_rohan',
        customer_name: 'Rohan Mehta',
        items: [
          { id: 'prod_mech_keyboard', name: 'KeyCraft Pro RGB Mechanical Keyboard', price: 4499, quantity: 1, isUpsell: false, isCrossSell: false },
          { id: 'prod_coiled_cable', name: 'Braided Aviator Coiled USB-C Cable', price: 699, quantity: 1, isUpsell: false, isCrossSell: true },
          { id: 'prod_desk_mat', name: 'Water-Resistant Merino Felt Desk Mat', price: 799, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 5997,
        discount: 498, // Bundled negotiation
        total: 5499,
        base_revenue: 4499,
        upsell_revenue: 0,
        cross_sell_revenue: 1000,
        incremental_revenue: 1000,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay UPI Test',
        razorpay_order_id: 'order_H72G91XP',
        razorpay_payment_id: 'pay_M12K4590',
        created_at: new Date(Date.now() - 3600000 * 8).toISOString()
      },
      {
        id: 'ORD-10479',
        customer_id: 'cust_arjun',
        customer_name: 'Arjun Verma',
        items: [
          { id: 'prod_anc_headphones_pro', name: 'AcousticPro Master ANC Studio Edition', price: 7999, quantity: 1, isUpsell: true, isCrossSell: false },
          { id: 'prod_travel_case', name: 'Hard-Shell Protective Travel Case', price: 799, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 8798,
        discount: 0,
        total: 8798,
        base_revenue: 4499,
        upsell_revenue: 3500,
        cross_sell_revenue: 799,
        incremental_revenue: 4299,
        ai_assisted: true,
        upsell_converted: true,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay Test Card',
        razorpay_order_id: 'order_P34M88QL',
        razorpay_payment_id: 'pay_P34M88QA',
        created_at: new Date(Date.now() - 3600000 * 14).toISOString()
      },
      {
        id: 'ORD-10478',
        customer_id: 'cust_ananya',
        customer_name: 'Ananya Patel',
        items: [
          { id: 'prod_laptop_stand', name: 'Ergonomic Aircraft-Aluminium Laptop Riser', price: 1899, quantity: 1, isUpsell: false, isCrossSell: false },
          { id: 'prod_usbc_hub', name: '8-in-1 Aluminium 4K60Hz USB-C Docking Hub', price: 3999, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 5898,
        discount: 0,
        total: 5898,
        base_revenue: 1899,
        upsell_revenue: 0,
        cross_sell_revenue: 3999,
        incremental_revenue: 3999,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay UPI',
        razorpay_order_id: 'order_RZP_AN7782',
        razorpay_payment_id: 'pay_RZP_AN7782',
        created_at: new Date(Date.now() - 3600000 * 20).toISOString()
      },
      {
        id: 'ORD-10477',
        customer_id: 'cust_sneha',
        customer_name: 'Sneha Iyer',
        items: [
          { id: 'prod_earbuds_anc', name: 'SoundWave True Wireless Active Noise Cancelling Earbuds', price: 3499, quantity: 1, isUpsell: false, isCrossSell: false },
          { id: 'prod_gan_charger', name: 'Ultra-Compact 65W GaN Dual-Port Fast Charger', price: 2199, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 5698,
        discount: 0,
        total: 5698,
        base_revenue: 3499,
        upsell_revenue: 0,
        cross_sell_revenue: 2199,
        incremental_revenue: 2199,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay Test Card',
        razorpay_order_id: 'order_RZP_SN9921',
        razorpay_payment_id: 'pay_RZP_SN9921',
        created_at: new Date(Date.now() - 3600000 * 28).toISOString()
      },
      {
        id: 'ORD-10476',
        customer_id: 'cust_aditya',
        customer_name: 'Aditya Kapoor',
        items: [
          { id: 'prod_travel_backpack', name: 'AeroGlide Anti-Theft Smart Commute Backpack', price: 3299, quantity: 1, isUpsell: false, isCrossSell: false }
        ],
        subtotal: 3299,
        discount: 0,
        total: 3299,
        base_revenue: 3299,
        upsell_revenue: 0,
        cross_sell_revenue: 0,
        incremental_revenue: 0,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: false,
        payment_status: 'PAID',
        payment_method: 'Razorpay UPI',
        razorpay_order_id: 'order_RZP_AD4412',
        razorpay_payment_id: 'pay_RZP_AD4412',
        created_at: new Date(Date.now() - 3600000 * 36).toISOString()
      },
      {
        id: 'ORD-10475',
        customer_id: 'cust_kavya',
        customer_name: 'Kavya Nair',
        items: [
          { id: 'prod_anc_headphones', name: 'AcousticPro Wireless ANC Headphones', price: 4499, quantity: 1, isUpsell: false, isCrossSell: false },
          { id: 'prod_bt_adapter', name: 'Low-Latency Bluetooth 5.3 Audio Transmitter', price: 999, quantity: 1, isUpsell: false, isCrossSell: true }
        ],
        subtotal: 5498,
        discount: 0,
        total: 5498,
        base_revenue: 4499,
        upsell_revenue: 0,
        cross_sell_revenue: 999,
        incremental_revenue: 999,
        ai_assisted: true,
        upsell_converted: false,
        cross_sell_converted: true,
        payment_status: 'PAID',
        payment_method: 'Razorpay Test Card',
        razorpay_order_id: 'order_RZP_KV8891',
        razorpay_payment_id: 'pay_RZP_KV8891',
        created_at: new Date(Date.now() - 3600000 * 44).toISOString()
      }
    ];

    // 4. Cart Store (keyed by sessionId)
    this.carts = new Map();

    // 5. Audit Events & Visual Replays (keyed by eventId or orderId)
    this.auditEvents = [];
    this.visualReplays = new Map();

    // 6. Blocked Attempts Counter
    this.blockedAttempts = [
      {
        id: 'blk_991',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        actor: 'AI Shopping Agent',
        intent: 'Attempted purchase of Studio Bundle (₹14,500)',
        amount: 14500,
        reason: 'Blocked by Policy Engine: Amount ₹14,500 exceeds maximum transaction limit of ₹10,000.',
        risk: 'HIGH'
      }
    ];

    // 7. Customer Session Memory Store (keyed by sessionId)
    this.sessionMemories = new Map();

    // Initialize baseline metrics
    this.updateAnalytics();
  }

  // --- Products ---
  getProducts() {
    return this.products;
  }

  getProductById(id) {
    return this.products.find(p => p.id === id) || null;
  }

  updateProductStock(id, qtyDeducted) {
    const p = this.getProductById(id);
    if (p) {
      p.stock = Math.max(0, p.stock - qtyDeducted);
    }
  }

  // --- Policies & Agent State ---
  getPolicies() {
    return this.policies;
  }

  updatePolicies(newPolicies) {
    this.policies = {
      ...this.policies,
      ...newPolicies,
      spending_controls: { ...this.policies.spending_controls, ...(newPolicies.spending_controls || {}) },
      product_controls: { ...this.policies.product_controls, ...(newPolicies.product_controls || {}) },
      selling_controls: { ...this.policies.selling_controls, ...(newPolicies.selling_controls || {}) }
    };
    return this.policies;
  }

  toggleAgentStatus(status) {
    this.policies.agent_status = status; // 'ACTIVE' or 'PAUSED'
    return this.policies.agent_status;
  }

  // --- Carts ---
  getCart(sessionId = 'default') {
    if (!this.carts.has(sessionId)) {
      this.carts.set(sessionId, {
        sessionId,
        items: [],
        appliedDiscount: 0,
        discountReason: null,
        subtotal: 0,
        total: 0
      });
    }
    return this.carts.get(sessionId);
  }

  addToCart(sessionId = 'default', productId, quantity = 1, isUpsell = false, isCrossSell = false) {
    const cart = this.getCart(sessionId);
    const product = this.getProductById(productId);
    if (!product) return { success: false, reason: 'Product not found' };

    const existingIndex = cart.items.findIndex(i => i.id === productId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        category: product.category,
        brand: product.brand,
        isUpsell,
        isCrossSell
      });
    }

    this.recalculateCart(sessionId);
    return { success: true, cart };
  }

  applyCartDiscount(sessionId = 'default', discountAmount, reason) {
    const cart = this.getCart(sessionId);
    cart.appliedDiscount = discountAmount;
    cart.discountReason = reason;
    this.recalculateCart(sessionId);
    return cart;
  }

  removeFromCart(sessionId = 'default', productId) {
    const cart = this.getCart(sessionId);
    cart.items = cart.items.filter(i => i.id !== productId);
    this.recalculateCart(sessionId);
    return cart;
  }

  clearCart(sessionId = 'default') {
    const cart = this.getCart(sessionId);
    cart.items = [];
    cart.appliedDiscount = 0;
    cart.discountReason = null;
    cart.subtotal = 0;
    cart.total = 0;
    return cart;
  }

  recalculateCart(sessionId = 'default') {
    const cart = this.getCart(sessionId);
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.total = Math.max(0, cart.subtotal - (cart.appliedDiscount || 0));
    return cart;
  }

  // --- Customer Authentication & Profiles ---
  registerCustomer({ name, email, password }) {
    if (!name || !email || !password) {
      return { success: false, error: 'Name, email, and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    for (const cust of this.customers.values()) {
      if (cust.email.toLowerCase() === normalizedEmail) {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      }
    }

    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer = {
      id: customerId,
      name: name.trim(),
      email: normalizedEmail,
      password,
      isReturning: false,
      searchHistory: [],
      purchaseHistory: [],
      viewedHistory: [],
      browsingCategories: [],
      preferredBudget: null,
      createdAt: new Date().toISOString()
    };

    this.customers.set(customerId, newCustomer);
    return {
      success: true,
      customer: {
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        role: 'customer',
        isReturning: newCustomer.isReturning,
        searchHistory: newCustomer.searchHistory,
        purchaseHistory: newCustomer.purchaseHistory,
        viewedHistory: newCustomer.viewedHistory,
        createdAt: newCustomer.createdAt
      }
    };
  }

  loginCustomer({ email, password }) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    let matchedCustomer = null;
    for (const cust of this.customers.values()) {
      if (cust.email.toLowerCase() === normalizedEmail) {
        matchedCustomer = cust;
        break;
      }
    }

    if (!matchedCustomer) {
      return { success: false, error: 'Customer account not found. Please sign up.' };
    }

    if (matchedCustomer.password !== password) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    return {
      success: true,
      customer: {
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        email: matchedCustomer.email,
        role: 'customer',
        isReturning: matchedCustomer.isReturning || matchedCustomer.purchaseHistory?.length > 0 || matchedCustomer.searchHistory?.length > 0,
        searchHistory: matchedCustomer.searchHistory || [],
        purchaseHistory: matchedCustomer.purchaseHistory || [],
        viewedHistory: matchedCustomer.viewedHistory || [],
        browsingCategories: matchedCustomer.browsingCategories || [],
        preferredBudget: matchedCustomer.preferredBudget || null,
        createdAt: matchedCustomer.createdAt
      }
    };
  }

  getCustomerById(id) {
    if (!id) return null;
    const cust = this.customers.get(id);
    if (!cust) return null;
    return {
      id: cust.id,
      name: cust.name,
      email: cust.email,
      isReturning: cust.isReturning || (cust.purchaseHistory && cust.purchaseHistory.length > 0) || (cust.searchHistory && cust.searchHistory.length > 0),
      searchHistory: cust.searchHistory || [],
      purchaseHistory: cust.purchaseHistory || [],
      viewedHistory: cust.viewedHistory || [],
      browsingCategories: cust.browsingCategories || [],
      preferredBudget: cust.preferredBudget || null,
      createdAt: cust.createdAt
    };
  }

  recordCustomerSignal(customerId, signalType, value) {
    if (!customerId) return null;
    const cust = this.customers.get(customerId);
    if (!cust) return null;

    if (signalType === 'SEARCH' && value) {
      if (!cust.searchHistory) cust.searchHistory = [];
      if (!cust.searchHistory.includes(value)) {
        cust.searchHistory.unshift(value);
        if (cust.searchHistory.length > 10) cust.searchHistory.pop();
      }
    } else if (signalType === 'VIEW' && value) {
      if (!cust.viewedHistory) cust.viewedHistory = [];
      if (!cust.viewedHistory.includes(value)) {
        cust.viewedHistory.unshift(value);
        if (cust.viewedHistory.length > 15) cust.viewedHistory.pop();
      }
      const prod = this.getProductById(value);
      if (prod && prod.category) {
        if (!cust.browsingCategories) cust.browsingCategories = [];
        if (!cust.browsingCategories.includes(prod.category)) {
          cust.browsingCategories.push(prod.category);
        }
      }
    } else if (signalType === 'PURCHASE' && value) {
      if (!cust.purchaseHistory) cust.purchaseHistory = [];
      if (!cust.purchaseHistory.includes(value)) {
        cust.purchaseHistory.push(value);
      }
      cust.isReturning = true;
    }

    return this.getCustomerById(customerId);
  }

  getCustomers() {
    return Array.from(this.customers.values()).map(cust => ({
      id: cust.id,
      name: cust.name,
      email: cust.email,
      isReturning: cust.isReturning || (cust.purchaseHistory && cust.purchaseHistory.length > 0) || (cust.searchHistory && cust.searchHistory.length > 0),
      searchHistory: cust.searchHistory || [],
      purchaseHistory: cust.purchaseHistory || [],
      viewedHistory: cust.viewedHistory || [],
      browsingCategories: cust.browsingCategories || [],
      preferredBudget: cust.preferredBudget || null,
      createdAt: cust.createdAt
    }));
  }

  updateCustomerProfile(customerId, { name, email }) {
    if (!customerId) return { success: false, error: 'Customer ID is required.' };
    const cust = this.customers.get(customerId);
    if (!cust) return { success: false, error: 'Customer profile not found.' };

    const oldName = cust.name;
    if (name && name.trim()) {
      cust.name = name.trim();
      // Synchronize shared source of truth across all historical orders for this customer
      for (const ord of this.orders) {
        if (ord.customer_id === customerId) {
          ord.customer_name = cust.name;
        }
      }
    }
    if (email && email.trim()) {
      cust.email = email.trim().toLowerCase();
    }

    this.updateAnalytics();
    return {
      success: true,
      customer: this.getCustomerById(customerId),
      message: `Profile updated from "${oldName}" to "${cust.name}". Synced across Orders and AI Revenue Attribution.`
    };
  }

  getCustomerOrders(customerId) {
    if (!customerId) return [];
    return this.orders.filter(o => o.customer_id === customerId);
  }

  // --- Merchant Authentication & Profiles ---
  registerMerchant({ businessName, storeName, ownerName, email, password }) {
    const finalBusinessName = (businessName || storeName || '').trim();
    if (!finalBusinessName || !email || !password) {
      return { success: false, error: 'Business name, email, and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    for (const m of this.merchants.values()) {
      if (m.email.toLowerCase() === normalizedEmail) {
        return { success: false, error: 'A merchant account with this email already exists. Please log in.' };
      }
    }

    const merchantId = `merch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMerchant = {
      id: merchantId,
      businessName: finalBusinessName,
      ownerName: (ownerName || '').trim() || finalBusinessName,
      email: normalizedEmail,
      password,
      plan: 'Razorpay Test Mode',
      createdAt: new Date().toISOString()
    };

    this.merchants.set(merchantId, newMerchant);
    return {
      success: true,
      merchant: {
        id: newMerchant.id,
        name: newMerchant.businessName,
        businessName: newMerchant.businessName,
        ownerName: newMerchant.ownerName,
        email: newMerchant.email,
        role: 'merchant',
        plan: newMerchant.plan,
        createdAt: newMerchant.createdAt
      }
    };
  }

  loginMerchant({ email, password }) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    let matched = null;
    for (const m of this.merchants.values()) {
      if (m.email.toLowerCase() === normalizedEmail) {
        matched = m;
        break;
      }
    }

    if (!matched) {
      return { success: false, error: 'Merchant account not found. Please sign up.' };
    }
    if (matched.password !== password) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    return {
      success: true,
      merchant: {
        id: matched.id,
        name: matched.businessName,
        businessName: matched.businessName,
        ownerName: matched.ownerName,
        email: matched.email,
        role: 'merchant',
        plan: matched.plan,
        createdAt: matched.createdAt
      }
    };
  }

  getMerchants() {
    return Array.from(this.merchants.values()).map(m => ({
      id: m.id,
      businessName: m.businessName,
      ownerName: m.ownerName,
      email: m.email,
      plan: m.plan,
      createdAt: m.createdAt
    }));
  }

  // --- AI-to-AI Commerce Authorized Users ---
  registerAi2aiUser({ name, email, password }) {
    if (!name || !email || !password) {
      return { success: false, error: 'Name, email, and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    for (const u of this.ai2aiUsers.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      }
    }

    const userId = `ai2ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'operator',
      createdAt: new Date().toISOString()
    };

    this.ai2aiUsers.set(userId, newUser);
    return {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    };
  }

  loginAi2aiUser({ email, password }) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    let matched = null;
    for (const u of this.ai2aiUsers.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        matched = u;
        break;
      }
    }

    if (!matched) {
      return { success: false, error: 'Account not found. Please sign up.' };
    }
    if (matched.password !== password) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    return {
      success: true,
      user: {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        createdAt: matched.createdAt
      }
    };
  }

  // --- Orders ---
  getOrders() {
    return this.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createOrder({
    customer_id,
    customer_name = 'AI Buyer Customer',
    items,
    subtotal,
    discount = 0,
    total,
    ai_assisted = true,
    upsell_converted = false,
    cross_sell_converted = false,
    payment_method = 'Razorpay Test Mode',
    razorpay_order_id,
    razorpay_payment_id
  }) {
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;

    // Resolve accurate customer profile from shared source of truth if available
    let resolvedCustomerName = customer_name;
    if (customer_id && this.customers.has(customer_id)) {
      const existingCust = this.customers.get(customer_id);
      if (existingCust && existingCust.name) {
        resolvedCustomerName = existingCust.name;
      }
    }

    // Explicitly compute item-level AI revenue attribution
    let calculatedUpsellRevenue = 0;
    let calculatedCrossSellRevenue = 0;

    for (const it of items) {
      const itemTotal = (it.price || 0) * (it.quantity || 1);
      if (it.isUpsell) {
        calculatedUpsellRevenue += itemTotal;
      }
      if (it.isCrossSell) {
        calculatedCrossSellRevenue += itemTotal;
      }
    }

    const hasUpsell = upsell_converted || calculatedUpsellRevenue > 0;
    const hasCrossSell = cross_sell_converted || calculatedCrossSellRevenue > 0;
    const incrementalRevenue = calculatedUpsellRevenue + calculatedCrossSellRevenue;
    const baseRevenue = Math.max(0, total - incrementalRevenue);

    const newOrder = {
      id: orderId,
      customer_id: customer_id || 'cust_guest',
      customer_name: resolvedCustomerName,
      items: [...items],
      subtotal,
      discount,
      total,
      base_revenue: baseRevenue,
      upsell_revenue: calculatedUpsellRevenue,
      cross_sell_revenue: calculatedCrossSellRevenue,
      incremental_revenue: incrementalRevenue,
      ai_assisted,
      upsell_converted: hasUpsell,
      cross_sell_converted: hasCrossSell,
      payment_status: 'PAID',
      payment_method,
      razorpay_order_id: razorpay_order_id || `order_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      razorpay_payment_id: razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date().toISOString()
    };

    // Deduct stock & update customer purchase history
    for (const it of items) {
      this.updateProductStock(it.id, it.quantity || 1);
      if (customer_id && this.customers.has(customer_id)) {
        this.recordCustomerSignal(customer_id, 'PURCHASE', it.id);
      }
    }

    this.orders.unshift(newOrder);
    this.updateAnalytics();

    return newOrder;
  }

  // --- Audit Events & Replay ---
  recordAuditEvent(event) {
    const fullEvent = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    this.auditEvents.unshift(fullEvent);
    if (this.auditEvents.length > 200) this.auditEvents.pop();
    return fullEvent;
  }

  recordVisualReplay(replayId, replayData) {
    this.visualReplays.set(replayId, replayData);
  }

  storeVisualReplay(replayData) {
    if (replayData && replayData.orderId) {
      this.visualReplays.set(replayData.orderId, replayData);
    }
  }

  getVisualReplay(replayId) {
    return this.visualReplays.get(replayId) || null;
  }

  getAuditEvents() {
    return this.auditEvents;
  }

  recordBlockedAttempt(attempt) {
    const entry = {
      id: `blk_${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      ...attempt
    };
    this.blockedAttempts.unshift(entry);
    return entry;
  }

  getBlockedAttempts() {
    return this.blockedAttempts;
  }

  getIncidents() {
    return [
      {
        id: 'inc_101',
        severity: 'HIGH',
        category: 'Policy Limit Violation Attempt',
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        description: 'Transaction of ₹15,000 attempted by AI Buyer Agent exceeding ₹10,000 ceiling.',
        actionTaken: 'Payment blocked by Deterministic Policy Engine before gateway initiation. No order created.'
      },
      {
        id: 'inc_102',
        severity: 'MEDIUM',
        category: 'Transaction Velocity Anomaly',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        description: 'Transaction cluster of ₹28,500 detected significantly above normal operating band (₹1,500 - ₹6,000).',
        actionTaken: 'Flagged for merchant velocity review. 1-Click mitigation available.'
      },
      {
        id: 'inc_103',
        severity: 'LOW',
        category: 'Unauthorized Discount Request',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        description: 'Shopper requested 25% discount on AcousticPro Headphones exceeding 10% maximum margin ceiling.',
        actionTaken: 'Direct price concession rejected. Autonomous bundle counter-offer issued at ₹4,779.'
      },
      {
        id: 'inc_104',
        severity: 'INFO',
        category: 'Human Approval Gate Enforced',
        timestamp: new Date(Date.now() - 3600000 * 7).toISOString(),
        description: 'Basket of ₹5,298 exceeded auto-approval threshold of ₹2,000.',
        actionTaken: 'Transaction held in pending state until explicit user approval was confirmed.'
      }
    ];
  }

  // --- Session Shopping Context / Memory ---
  getSessionMemory(sessionId = 'default') {
    if (!this.sessionMemories.has(sessionId)) {
      this.sessionMemories.set(sessionId, {
        useCase: 'Travel & Daily Commute',
        budget: 5000,
        preference: 'Foldable & Lightweight',
        priority: 'Active Noise Cancellation (ANC)',
        historyIntents: ['Headphones for travel']
      });
    }
    return this.sessionMemories.get(sessionId);
  }

  updateSessionMemory(sessionId = 'default', updates) {
    const current = this.getSessionMemory(sessionId);
    const updated = { ...current, ...updates };
    this.sessionMemories.set(sessionId, updated);
    return updated;
  }

  clearSessionMemory(sessionId = 'default') {
    this.sessionMemories.delete(sessionId);
    return this.getSessionMemory(sessionId);
  }

  // --- Analytics Engine ---
  updateAnalytics() {
    const baselineOrdersCount = 380;
    const baselineAOV = 2340;
    const baselineRevenue = 840000; // ₹8.4L baseline

    const aiOrders = this.orders.filter(o => o.ai_assisted);
    const aiOrdersCount = aiOrders.length + 58; // Include realistic baseline seed count
    const liveRevenueFromAI = aiOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalAiRevenue = liveRevenueFromAI + 170000;

    const allOrdersTotal = this.orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const currentAOV = this.orders.length > 0 ? Math.round(allOrdersTotal / this.orders.length) : 2710;

    const upsellOrders = aiOrders.filter(o => o.upsell_converted || (o.upsell_revenue && o.upsell_revenue > 0)).length + 14;
    const crossSellOrders = aiOrders.filter(o => o.cross_sell_converted || (o.cross_sell_revenue && o.cross_sell_revenue > 0)).length + 22;

    const liveUpsellRevenue = this.orders.reduce((sum, o) => sum + (o.upsell_revenue || (o.upsell_converted ? 3500 : 0)), 0);
    const liveCrossSellRevenue = this.orders.reduce((sum, o) => sum + (o.cross_sell_revenue || (o.cross_sell_converted ? 799 : 0)), 0);

    const upsellRevenue = liveUpsellRevenue + 12000;
    const crossSellRevenue = liveCrossSellRevenue + 8500;
    const aiIncrementalRevenue = upsellRevenue + crossSellRevenue;

    const upsellConversionRate = Math.round((upsellOrders / aiOrdersCount) * 100);
    const crossSellConversionRate = Math.round((crossSellOrders / aiOrdersCount) * 100);

    const totalConversations = 1240;
    const revenuePerConversation = Math.round(totalAiRevenue / totalConversations);

    // =========================================================================
    // DYNAMIC CUSTOMER REVENUE ATTRIBUTION (SHARED SINGLE SOURCE OF TRUTH)
    // Synchronized directly with registered customer accounts and actual orders
    // =========================================================================
    const customerMap = new Map();

    // 1. Initialize from existing customer accounts so every active customer has a record
    for (const [id, cust] of this.customers.entries()) {
      customerMap.set(id, {
        customer_id: id,
        customer_name: cust.name,
        customer_email: cust.email,
        total_orders: 0,
        total_spend: 0,
        ai_assisted_spend: 0,
        base_revenue: 0,
        upsell_revenue: 0,
        cross_sell_revenue: 0,
        incremental_revenue: 0,
        recent_order_id: null,
        recent_order_date: cust.createdAt,
        products_purchased: [],
        has_incremental_ai: false
      });
    }

    // 2. Aggregate all confirmed orders strictly by customer
    for (const o of this.orders) {
      const cId = o.customer_id || 'cust_guest';
      let entry = customerMap.get(cId);

      if (!entry) {
        entry = {
          customer_id: cId,
          customer_name: o.customer_name || 'Guest Shopper',
          customer_email: 'guest@example.com',
          total_orders: 0,
          total_spend: 0,
          ai_assisted_spend: 0,
          base_revenue: 0,
          upsell_revenue: 0,
          cross_sell_revenue: 0,
          incremental_revenue: 0,
          recent_order_id: null,
          recent_order_date: null,
          products_purchased: [],
          has_incremental_ai: false
        };
        customerMap.set(cId, entry);
      } else {
        // Ensure customer name is current if updated in profile
        entry.customer_name = o.customer_name || entry.customer_name;
      }

      const orderTotal = o.total || 0;
      const orderUpsell = o.upsell_revenue || (o.upsell_converted ? 3500 : 0);
      const orderCrossSell = o.cross_sell_revenue || (o.cross_sell_converted ? 799 : 0);
      const orderInc = o.incremental_revenue || (orderUpsell + orderCrossSell);
      const orderBase = o.base_revenue !== undefined ? o.base_revenue : Math.max(0, orderTotal - orderInc);

      entry.total_orders += 1;
      entry.total_spend += orderTotal;

      if (o.ai_assisted) {
        entry.ai_assisted_spend += orderTotal;
      }

      entry.base_revenue += orderBase;
      entry.upsell_revenue += orderUpsell;
      entry.cross_sell_revenue += orderCrossSell;
      entry.incremental_revenue += orderInc;

      if (orderInc > 0) {
        entry.has_incremental_ai = true;
      }

      if (!entry.recent_order_id) {
        entry.recent_order_id = o.id;
        entry.recent_order_date = o.created_at;
      }

      if (o.items && Array.isArray(o.items)) {
        for (const it of o.items) {
          const itName = it.name || it.id;
          if (!entry.products_purchased.includes(itName)) {
            entry.products_purchased.push(itName);
          }
        }
      }
    }

    const customerAttribution = Array.from(customerMap.values())
      .filter(c => c.total_orders > 0 || c.total_spend > 0)
      .sort((a, b) => b.total_spend - a.total_spend);

    this.analytics = {
      totalRevenue: baselineRevenue + allOrdersTotal,
      aiAttributedRevenue: totalAiRevenue,
      aiIncrementalRevenue: aiIncrementalRevenue,
      baseRevenue: Math.max(0, totalAiRevenue - aiIncrementalRevenue),
      upsellRevenue,
      crossSellRevenue,
      customerAttribution,
      revenuePerConversation,
      aiConversionRate: 23.5,
      aovBeforeAI: baselineAOV,
      aovWithAI: currentAOV,
      aovChangePercentage: Number((((currentAOV - baselineAOV) / baselineAOV) * 100).toFixed(1)),
      aiAssistedOrdersCount: aiOrdersCount,
      upsellConversionRate: Math.min(100, Math.max(18, upsellConversionRate)),
      crossSellConversionRate: Math.min(100, Math.max(24, crossSellConversionRate)),
      additionalRevenueGenerated: aiIncrementalRevenue,
      blockedActionsCount: this.blockedAttempts.length + 7,
      agentStatus: this.policies.agent_status,
      funnel: {
        conversations: totalConversations,
        searches: 842,
        recommendationsViewed: 612,
        productsAdded: 421,
        checkoutStarted: 328,
        successfulPurchases: 291,
        conversionRates: {
          convToSearch: '67.9%',
          searchToRec: '72.7%',
          recToAdd: '68.8%',
          addToCheckout: '77.9%',
          checkoutToPurchase: '88.7%',
          overallRate: '23.5%'
        }
      },
      topPerformingRecommendations: [
        { product: 'Hard-Shell Protective Case', category: 'Cross-Sell', conversions: 42, revenue: 33558 },
        { product: 'AcousticPro Master Studio Edition', category: 'Upsell', conversions: 18, revenue: 143982 },
        { product: 'Aviator Coiled USB-C Cable', category: 'Cross-Sell', conversions: 28, revenue: 19572 }
      ],
      monthlyRevenueTrend: [
        { month: 'May', baseline: 620000, withAI: 620000 },
        { month: 'Jun', baseline: 680000, withAI: 740000 },
        { month: 'Jul', baseline: 710000, withAI: 830000 },
        { month: 'Aug', baseline: 740000, withAI: 890000 },
        { month: 'Sep (Live)', baseline: 760000, withAI: 950000 + allOrdersTotal }
      ]
    };
  }

  getAnalytics() {
    this.updateAnalytics();
    return this.analytics;
  }
}

module.exports = new DatabaseService();
