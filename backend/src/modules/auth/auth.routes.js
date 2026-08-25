const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../../config/database');
const env = require('../../config/env');
const { authenticate } = require('../../middleware/auth');
const { apiResponse, logAudit } = require('../../utils/helpers');

const router = express.Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Email and password are required.',
      });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);

    if (!user) {
      return apiResponse(res, {
        status: 401,
        success: false,
        error: 'Invalid email or password.',
      });
    }

    if (!user.is_active) {
      return apiResponse(res, {
        status: 403,
        success: false,
        error: 'Account is deactivated. Please contact administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return apiResponse(res, {
        status: 401,
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      state: user.state,
      district: user.district,
      phone: user.phone,
    };

    // Log audit event
    await logAudit({
      entityType: 'user',
      entityId: user.id,
      action: 'LOGIN',
      performedBy: user.id,
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * User logout (Client clears token, logged in audit trail)
 */
router.post('/logout', authenticate, async (req, res) => {
  await logAudit({
    entityType: 'user',
    entityId: req.user.id,
    action: 'LOGOUT',
    performedBy: req.user.id,
    ipAddress: req.ip,
  });

  return apiResponse(res, {
    status: 200,
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, (req, res) => {
  return apiResponse(res, {
    status: 200,
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = router;
