const express = require('express');
const { queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit } = require('../../utils/helpers');
const { ROLES } = require('../../config/constants');

const router = express.Router();

/**
 * GET /api/users/profile
 * Get logged in user profile
 */
router.get('/profile', authenticate, (req, res) => {
  return apiResponse(res, {
    status: 200,
    success: true,
    data: req.user,
  });
});

/**
 * PUT /api/users/profile
 * Update logged in user profile details (full_name, phone, state, district)
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { full_name, phone, state, district } = req.body;

    const currentUser = await queryOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!currentUser) {
      return apiResponse(res, { status: 404, success: false, error: 'User not found' });
    }

    const updatedName = full_name ? full_name.trim() : currentUser.full_name;
    const updatedPhone = phone !== undefined ? phone.trim() : currentUser.phone;
    const updatedState = state !== undefined ? state.trim() : currentUser.state;
    const updatedDistrict = district !== undefined ? district.trim() : currentUser.district;

    const updatedUser = await queryOne(
      `UPDATE users
          SET full_name = $1, phone = $2, state = $3, district = $4
        WHERE id = $5
      RETURNING id, email, full_name, role, state, district, phone, is_active`,
      [updatedName, updatedPhone, updatedState, updatedDistrict, req.user.id]
    );

    await logAudit({
      entityType: 'user',
      entityId: req.user.id,
      action: 'UPDATE_PROFILE',
      performedBy: req.user.id,
      oldValues: { full_name: currentUser.full_name, phone: currentUser.phone },
      newValues: { full_name: updatedName, phone: updatedPhone },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users
 * List users (Restricted to DLAO, SGA, ADMIN via RBAC)
 */
router.get('/', authenticate, rbac(ROLES.DLAO, ROLES.SGA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { role, state, district } = req.query;

    let sql = `SELECT id, email, full_name, role, state, district, phone, is_active, created_at
                 FROM users WHERE 1=1`;
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }
    if (district) {
      params.push(district);
      sql += ` AND district = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const users = await queryRows(sql, params);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
