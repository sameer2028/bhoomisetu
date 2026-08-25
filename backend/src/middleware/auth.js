const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { queryOne } = require('../config/database');

const USER_COLUMNS = 'id, email, full_name, role, state, district, phone, is_active';

/**
 * Authentication middleware — verifies JWT token from Authorization header.
 * Attaches user object to req.user on success.
 */
async function authenticate(req, res, next) {
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
    const user = await queryOne(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [decoded.userId]
    );

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
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await queryOne(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [decoded.userId]
    );
    if (user && user.is_active) {
      req.user = user;
    }
  } catch (err) {
    // Token invalid, continue without user
  }

  next();
}

module.exports = { authenticate, optionalAuth };
