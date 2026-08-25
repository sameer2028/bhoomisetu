const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getDb } = require('../config/database');

/**
 * Authentication middleware — verifies JWT token from Authorization header.
 * Attaches user object to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name, role, state, district, phone, is_active FROM users WHERE id = ?').get(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
    });
  }
}

/**
 * Optional authentication — attaches user if token present, continues without if not.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const db = getDb();
    const user = db.prepare('SELECT id, email, full_name, role, state, district, phone, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (user && user.is_active) {
      req.user = user;
    }
  } catch (err) {
    // Token invalid, continue without user
  }

  next();
}

module.exports = { authenticate, optionalAuth };
