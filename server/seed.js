const bcrypt = require('bcryptjs');
const { run, get, exec, initSchema } = require('./database');

const SEED_PRODUCTS = [
  {
    id: 'prod_anc_headphones',
    name: 'AcousticPro Wireless ANC Headphones',
    description: 'Studio-grade hybrid active noise cancellation headphones with 40-hour battery life and foldable travel chassis.',
    category: 'electronics',
    price: 4499,
    cost_price: 2800,
    currency: 'INR',
    stock: 24,
    brand: 'AcousticPro',
    rating: 4.8,
    source: 'Revify Direct',
    source_type: 'MERCHANT_DIRECT',
    features_json: JSON.stringify(['Hybrid Active Noise Cancellation', 'Bluetooth 5.3', '40-Hour Battery Life', 'Foldable Design']),
    compatible_json: JSON.stringify(['prod_travel_case', 'prod_bt_adapter', 'prod_headphone_stand']),
    frequently_bought_with_json: JSON.stringify(['prod_travel_case', 'prod_bt_adapter']),
    merchant_priority: 'high',
    ai_readable: 1,
    margin_inr: 1699,
    upsell_id: 'prod_anc_headphones_pro'
  },
  {
    id: 'prod_anc_headphones_pro',
    name: 'AcousticPro Master ANC Studio Edition',
    description: 'Flagship studio headphones with ultra-low latency DAC, custom titanium drivers, and 55-hour battery.',
    category: 'electronics',
    price: 7999,
    cost_price: 4900,
    currency: 'INR',
    stock: 14,
    brand: 'AcousticPro',
    rating: 4.9,
    source: 'AcousticPro Studio Network',
    source_type: 'PARTNER_NETWORK',
    features_json: JSON.stringify(['Studio Master DAC', '55-Hour Battery', 'Custom Titanium Drivers', 'Multipoint Connection']),
    compatible_json: JSON.stringify(['prod_travel_case', 'prod_headphone_stand']),
    frequently_bought_with_json: JSON.stringify(['prod_travel_case']),
    merchant_priority: 'high',
    ai_readable: 1,
    margin_inr: 3099,
    upsell_id: null
  },
  {
    id: 'prod_travel_case',
    name: 'Hard-Shell Protective Travel Case',
    description: 'Shockproof, water-resistant EVA molded case tailor-fitted for AcousticPro headphones with cable pocket.',
    category: 'accessories',
    price: 799,
    cost_price: 320,
    currency: 'INR',
    stock: 50,
    brand: 'AcousticPro',
    rating: 4.7,
    source: 'HyperTravel Tech Supply',
    source_type: 'CONFIGURED_SUPPLY',
    features_json: JSON.stringify(['Shockproof EVA Shell', 'Water-Resistant Zipper', 'Cable Mesh Pocket']),
    compatible_json: JSON.stringify(['prod_anc_headphones', 'prod_anc_headphones_pro']),
    frequently_bought_with_json: JSON.stringify(['prod_anc_headphones']),
    merchant_priority: 'high',
    ai_readable: 1,
    margin_inr: 479,
    upsell_id: null
  },
  {
    id: 'prod_bt_adapter',
    name: 'Low-Latency Bluetooth 5.3 Audio Transmitter',
    description: 'Universal USB-C/3.5mm low-latency transmitter for aircraft in-flight entertainment and PC gaming.',
    category: 'accessories',
    price: 999,
    cost_price: 450,
    currency: 'INR',
    stock: 35,
    brand: 'AcousticPro',
    rating: 4.6,
    source: 'HyperTravel Tech Supply',
    source_type: 'CONFIGURED_SUPPLY',
    features_json: JSON.stringify(['aptX Low Latency', 'Airplane 3.5mm Adapter Included', 'Dual Audio Stream']),
    compatible_json: JSON.stringify(['prod_anc_headphones', 'prod_anc_headphones_pro']),
    frequently_bought_with_json: JSON.stringify(['prod_anc_headphones', 'prod_travel_case']),
    merchant_priority: 'medium',
    ai_readable: 1,
    margin_inr: 549,
    upsell_id: null
  },
  {
    id: 'prod_travel_backpack',
    name: 'AeroGlide Anti-Theft Smart Commute Backpack',
    description: 'Weatherproof 22L laptop backpack with dedicated headphone cradle, USB pass-through, and luggage sleeve.',
    category: 'accessories',
    price: 3299,
    cost_price: 1800,
    currency: 'INR',
    stock: 18,
    brand: 'AeroGlide',
    rating: 4.8,
    source: 'Revify Direct',
    source_type: 'MERCHANT_DIRECT',
    features_json: JSON.stringify(['Dedicated Headphone Cradle', 'Luggage Pass-Through', 'TSA-Ready Laptop Sleeve']),
    compatible_json: JSON.stringify(['prod_anc_headphones', 'prod_travel_case']),
    frequently_bought_with_json: JSON.stringify(['prod_anc_headphones']),
    merchant_priority: 'medium',
    ai_readable: 1,
    margin_inr: 1499,
    upsell_id: null
  },
  {
    id: 'prod_mech_keyboard',
    name: 'Revify KeyCraft 75 Wireless Mechanical Keyboard',
    description: '75% compact mechanical keyboard with gasket mount, factory-lubed switches, and tri-mode wireless connectivity.',
    category: 'electronics',
    price: 5499,
    cost_price: 3200,
    currency: 'INR',
    stock: 20,
    brand: 'KeyCraft',
    rating: 4.9,
    source: 'Revify Direct',
    source_type: 'MERCHANT_DIRECT',
    features_json: JSON.stringify(['Gasket Mounted', 'Tri-Mode Wireless', 'Hot-Swappable PCB', 'PBT Keycaps']),
    compatible_json: JSON.stringify(['prod_coiled_cable', 'prod_desk_mat']),
    frequently_bought_with_json: JSON.stringify(['prod_coiled_cable', 'prod_desk_mat']),
    merchant_priority: 'high',
    ai_readable: 1,
    margin_inr: 2299,
    upsell_id: null
  },
  {
    id: 'prod_coiled_cable',
    name: 'Custom Double-Sleeved Aviator Coiled Cable',
    description: 'Heavy-duty coiled USB-C cable with detachable 4-pin metal aviator connector and pet sleeving.',
    category: 'accessories',
    price: 1299,
    cost_price: 600,
    currency: 'INR',
    stock: 45,
    brand: 'KeyCraft',
    rating: 4.7,
    source: 'KeyCraft Studio',
    source_type: 'PARTNER_NETWORK',
    features_json: JSON.stringify(['Zinc Alloy Aviator', 'Double Sleeved', '1.5m Total Length']),
    compatible_json: JSON.stringify(['prod_mech_keyboard']),
    frequently_bought_with_json: JSON.stringify(['prod_mech_keyboard']),
    merchant_priority: 'medium',
    ai_readable: 1,
    margin_inr: 699,
    upsell_id: null
  },
  {
    id: 'prod_desk_mat',
    name: 'Ultra-Dense Minimalist Felt & Rubber Desk Mat',
    description: '900x400mm water-resistant desk mat crafted with non-slip natural rubber base and precision stitched edges.',
    category: 'accessories',
    price: 1099,
    cost_price: 480,
    currency: 'INR',
    stock: 40,
    brand: 'Revify Studio',
    rating: 4.8,
    source: 'Revify Direct',
    source_type: 'MERCHANT_DIRECT',
    features_json: JSON.stringify(['900x400mm Large Area', 'Anti-Fray Stitched Edges', 'Natural Rubber Grip']),
    compatible_json: JSON.stringify(['prod_mech_keyboard', 'prod_coiled_cable']),
    frequently_bought_with_json: JSON.stringify(['prod_mech_keyboard']),
    merchant_priority: 'medium',
    ai_readable: 1,
    margin_inr: 619,
    upsell_id: null
  }
];

const SEED_USERS = [
  {
    id: 'usr_priya',
    name: 'Priya Shah',
    email: 'priya@example.com',
    password: 'password123',
    notification_pref: 'email',
    role: 'customer'
  },
  {
    id: 'usr_aarav',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    password: 'password123',
    notification_pref: 'email',
    role: 'customer'
  },
  {
    id: 'usr_rohan',
    name: 'Rohan Mehta',
    email: 'rohan@example.com',
    password: 'password123',
    notification_pref: 'sms',
    role: 'customer'
  }
];

async function seedDatabase() {
  console.log('[Seed] Initializing SQLite database schema...');
  await initSchema();

  console.log('[Seed] Seeding product catalog...');
  for (const prod of SEED_PRODUCTS) {
    await run(
      `INSERT INTO products (
        id, name, description, category, price, cost_price, currency, stock, brand,
        rating, source, source_type, features_json, compatible_json, frequently_bought_with_json,
        merchant_priority, ai_readable, margin_inr, upsell_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        price = excluded.price,
        stock = excluded.stock,
        features_json = excluded.features_json,
        compatible_json = excluded.compatible_json,
        frequently_bought_with_json = excluded.frequently_bought_with_json`,
      [
        prod.id, prod.name, prod.description, prod.category, prod.price, prod.cost_price, prod.currency,
        prod.stock, prod.brand, prod.rating, prod.source, prod.source_type, prod.features_json,
        prod.compatible_json, prod.frequently_bought_with_json, prod.merchant_priority,
        prod.ai_readable, prod.margin_inr, prod.upsell_id
      ]
    );
  }
  console.log(`[Seed] Seeded ${SEED_PRODUCTS.length} products successfully.`);

  console.log('[Seed] Seeding sample users with bcrypt password hashes...');
  const salt = await bcrypt.genSalt(10);
  for (const u of SEED_USERS) {
    const hash = await bcrypt.hash(u.password, salt);
    await run(
      `INSERT INTO users (id, name, email, password_hash, notification_pref, role)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         password_hash = excluded.password_hash,
         notification_pref = excluded.notification_pref`,
      [u.id, u.name, u.email, hash, u.notification_pref, u.role]
    );

    // Initialize an empty cart for the user if none exists
    await run(
      `INSERT INTO carts (user_id, items_json) VALUES (?, '[]')
       ON CONFLICT(user_id) DO NOTHING`,
      [u.id]
    );
  }
  console.log(`[Seed] Seeded ${SEED_USERS.length} sample users with secure bcrypt hashes.`);

  console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Database seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, SEED_PRODUCTS, SEED_USERS };
