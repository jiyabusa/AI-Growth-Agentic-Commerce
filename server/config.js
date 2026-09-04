const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  HMAC_SECRET: process.env.HMAC_SECRET || 'agentic-commerce-uap-ap2-secret-key-2026',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_agentic_key',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_agentic_secret',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret',
  
  // FRM Risk Engine Thresholds
  FRM_CONFIG: {
    HOLD_THRESHOLD_SCORE: 50,     // Transactions >= 50 risk score are placed in HOLD queue
    REJECT_THRESHOLD_SCORE: 80,   // Transactions >= 80 risk score are auto-rejected
    VELOCITY_WINDOW_SECONDS: 60,  // Check burst velocity in rolling 60 seconds
    MAX_TX_PER_WINDOW: 3,         // Max permitted transactions per window before flagging
    HISTORICAL_AVG_AMOUNT: 3500,  // Benchmark average spend (in INR)
    HISTORICAL_MULTIPLIER_FLAG: 2.5, // 2.5x historical average flags unusual amount
    ODD_HOURS_START: 1,           // 01:00
    ODD_HOURS_END: 5,             // 05:00
    BLOCKED_CATEGORIES: ['gambling', 'crypto_derivatives', 'unverified_pharma', 'weapons'],
    BLOCKED_BUYER_IDS: ['fraudster_99', 'blacklisted_bot_007']
  },

  // Progressive Trust Tiers
  TRUST_TIERS: {
    1: { name: 'Tier 1 (Strict Confirmation)', autonomousLimit: 1000, requiredCleanTx: 0 },
    2: { name: 'Tier 2 (Established Agent)', autonomousLimit: 5000, requiredCleanTx: 3 },
    3: { name: 'Tier 3 (Trusted Autonomous)', autonomousLimit: 25000, requiredCleanTx: 6 }
  }
};
