const crypto = require('crypto');
const config = require('../config');

// In-Memory Nonce store for anti-replay verification
const usedNonces = new Set();
const activeMandates = new Map();

/**
 * Mandate Service - Modeled on NPCI Unified Agentic Payments (UAP) & Google AP2 Protocol
 * Enforces cryptographic proof of delegation from the user to the autonomous agent.
 */
class MandateService {
  constructor() {
    this.secret = config.HMAC_SECRET;
  }

  /**
   * Helper: Encode base64url
   */
  base64UrlEncode(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Helper: Decode base64url
   */
  base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
  }

  /**
   * Generates a signed cryptographic mandate token (HMAC-SHA256 JWT format)
   * @param {Object} params
   * @param {string} params.agent_id - Unique identifier of the delegated AI agent
   * @param {number} params.max_amount - Maximum spending ceiling authorized (in INR)
   * @param {string} params.category - Authorized spending category (e.g., 'electronics', 'coffee', '*')
   * @param {number} params.valid_duration_seconds - Duration in seconds before expiration
   * @param {string} [params.user_id] - Delegating human user / merchant account ID
   * @param {string} [params.custom_nonce] - Optional custom nonce
   * @returns {Object} Signed mandate and raw metadata
   */
  createMandate({
    agent_id = 'agent_growth_01',
    max_amount = 5000,
    category = 'electronics',
    valid_duration_seconds = 300,
    user_id = 'merchant_usr_9921',
    custom_nonce = null
  }) {
    const nonce = custom_nonce || `nonce_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const issued_at = Math.floor(Date.now() / 1000);
    const valid_until = issued_at + valid_duration_seconds;

    const payload = {
      spec: 'NPCI-UAP/1.0-AP2-COMPLIANT',
      user_id,
      agent_id,
      max_amount,
      category,
      issued_at,
      valid_until,
      nonce
    };

    const header = {
      alg: 'HS256',
      typ: 'UAP-MANDATE'
    };

    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const token = `${headerEncoded}.${payloadEncoded}.${signature}`;
    
    // Store in active mandate registry
    activeMandates.set(token, {
      ...payload,
      token,
      status: 'ACTIVE'
    });

    return {
      token,
      payload,
      formatted_details: {
        spec: payload.spec,
        agent: payload.agent_id,
        authorized_limit: `₹${payload.max_amount.toLocaleString('en-IN')}`,
        category: payload.category,
        expires_at: new Date(payload.valid_until * 1000).toISOString(),
        nonce: payload.nonce
      }
    };
  }

  /**
   * Cryptographically verifies mandate token and enforces scope constraints
   * @param {string} token - Signed HMAC mandate token
   * @param {number} requestedAmount - Amount the agent is attempting to charge
   * @param {string} requestedCategory - Category of the requested item/action
   * @returns {Object} Verification result with detailed reason
   */
  verifyAndConsumeMandate(token, requestedAmount, requestedCategory) {
    if (!token) {
      return {
        valid: false,
        code: 'MANDATE_MISSING',
        reason: 'No cryptographic delegation mandate presented with agent tool call.',
        protocol: 'NPCI-UAP/AP2'
      };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        code: 'MANDATE_MALFORMED',
        reason: 'Mandate format is invalid or corrupted (expected header.payload.signature).',
        protocol: 'NPCI-UAP/AP2'
      };
    }

    const [headerEncoded, payloadEncoded, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // 1. Signature check
    if (signature !== expectedSignature) {
      return {
        valid: false,
        code: 'MANDATE_SIGNATURE_INVALID',
        reason: 'Cryptographic signature mismatch. Token was tampered with or issued by untrusted authority.',
        protocol: 'NPCI-UAP/AP2'
      };
    }

    let payload;
    try {
      payload = JSON.parse(this.base64UrlDecode(payloadEncoded));
    } catch (e) {
      return {
        valid: false,
        code: 'MANDATE_PAYLOAD_PARSE_ERROR',
        reason: 'Failed to decode mandate claims payload.',
        protocol: 'NPCI-UAP/AP2'
      };
    }

    const now = Math.floor(Date.now() / 1000);

    // 2. Expiration check
    if (payload.valid_until < now) {
      return {
        valid: false,
        code: 'MANDATE_EXPIRED',
        reason: `Mandate expired at ${new Date(payload.valid_until * 1000).toISOString()} (Current: ${new Date(now * 1000).toISOString()}).`,
        payload,
        protocol: 'NPCI-UAP/AP2'
      };
    }

    // 3. Replay check (Nonce store)
    if (usedNonces.has(payload.nonce)) {
      return {
        valid: false,
        code: 'MANDATE_NONCE_REUSED',
        reason: `Anti-replay violation: Nonce "${payload.nonce}" was already consumed by a prior transaction.`,
        payload,
        protocol: 'NPCI-UAP/AP2'
      };
    }

    // 4. Amount scope check
    if (requestedAmount > payload.max_amount) {
      return {
        valid: false,
        code: 'MANDATE_AMOUNT_EXCEEDED',
        reason: `Requested transaction amount ₹${requestedAmount.toLocaleString('en-IN')} exceeds authorized ceiling of ₹${payload.max_amount.toLocaleString('en-IN')}.`,
        payload,
        protocol: 'NPCI-UAP/AP2'
      };
    }

    // 5. Category scope check
    if (payload.category !== '*' && payload.category !== requestedCategory) {
      return {
        valid: false,
        code: 'MANDATE_CATEGORY_MISMATCH',
        reason: `Transaction category "${requestedCategory}" falls outside authorized mandate category "${payload.category}".`,
        payload,
        protocol: 'NPCI-UAP/AP2'
      };
    }

    // Commit nonce to replay store upon successful validation
    usedNonces.add(payload.nonce);
    
    // Update active mandate status
    if (activeMandates.has(token)) {
      const stored = activeMandates.get(token);
      stored.status = 'CONSUMED';
      stored.consumed_at = new Date().toISOString();
    }

    return {
      valid: true,
      code: 'MANDATE_AUTHORIZED',
      reason: 'Mandate cryptographically valid, within spending limit & category bounds, nonce recorded.',
      payload,
      protocol: 'NPCI-UAP/AP2'
    };
  }

  /**
   * Returns list of used nonces for inspection
   */
  getUsedNonces() {
    return Array.from(usedNonces);
  }

  /**
   * Reset nonce store for test resets
   */
  clearNonces() {
    usedNonces.clear();
  }
}

module.exports = new MandateService();
