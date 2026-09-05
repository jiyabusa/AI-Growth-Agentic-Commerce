const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT Authentication Middleware
 * Extracts token from httpOnly cookie 'revify_token' or 'Authorization: Bearer <token>' header.
 * Attaches verified user payload to req.user.
 */
function authMiddleware(req, res, next) {
  let token = null;

  // 1. Check httpOnly cookie
  if (req.cookies && req.cookies.revify_token) {
    token = req.cookies.revify_token;
  }
  // 2. Fallback to Authorization Header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No valid session found.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET || 'revify-jwt-super-secret-key-2026');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' 
        ? 'Session expired. Please log in again.' 
        : 'Invalid session token. Please log in.'
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches req.user if valid token present, but does not block if unauthenticated.
 */
function optionalAuthMiddleware(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.revify_token) {
    token = req.cookies.revify_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7).trim();
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET || 'revify-jwt-super-secret-key-2026');
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
