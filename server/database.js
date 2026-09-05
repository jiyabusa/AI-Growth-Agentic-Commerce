const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

// Ensure data directory exists
const dataDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(config.DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Failed to connect to SQLite database:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database at:', config.DB_PATH);
  }
});

// Enable foreign keys & WAL mode for high concurrency
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
});

/**
 * Promisified database helpers
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Initialize all relational schema tables
 */
async function initSchema() {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      notification_pref TEXT DEFAULT 'email',
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price INTEGER NOT NULL,
      cost_price INTEGER,
      currency TEXT DEFAULT 'INR',
      stock INTEGER DEFAULT 0,
      brand TEXT,
      rating REAL DEFAULT 4.5,
      source TEXT,
      source_type TEXT,
      features_json TEXT,
      compatible_json TEXT,
      frequently_bought_with_json TEXT,
      merchant_priority TEXT DEFAULT 'medium',
      ai_readable INTEGER DEFAULT 1,
      margin_inr INTEGER,
      upsell_id TEXT
    );

    CREATE TABLE IF NOT EXISTS carts (
      user_id TEXT PRIMARY KEY,
      items_json TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      items_json TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSING',
      payment_method TEXT DEFAULT 'Razorpay (Test Mode)',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      audit_steps_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mandates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      max_amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      valid_duration_seconds INTEGER NOT NULL,
      issued_at INTEGER NOT NULL,
      valid_until INTEGER NOT NULL,
      nonce TEXT NOT NULL,
      token TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details_json TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_mandates_user ON mandates(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  await exec(schemaSql);
  console.log('[DB] Relational schema tables initialized successfully.');
}

// Auto-initialize schema
initSchema().catch((err) => {
  console.error('[DB] Schema initialization error:', err);
});

module.exports = {
  db,
  run,
  get,
  all,
  exec,
  initSchema
};
