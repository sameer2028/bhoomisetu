const express = require('express');
const router = express.Router();
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { apiResponse } = require('../../utils/helpers');

// ─── GET /api/alerts ──────────────────────────────────────────
/**
 * List alerts with unread count
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { is_read, limit = 20 } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (is_read !== undefined && is_read !== '') {
      conditions.push(`is_read = $${paramIdx++}`);
      params.push(is_read === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const unreadRow = await queryOne('SELECT COUNT(*) AS unread FROM alerts WHERE is_read = FALSE');
    const unreadCount = parseInt(unreadRow?.unread, 10) || 0;

    const querySql = `
      SELECT *
      FROM alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++}
    `;

    params.push(parseInt(limit, 10) || 20);
    const rows = await queryRows(querySql, params);

    apiResponse(res, {
      status: 200,
      success: true,
      data: rows,
      meta: {
        unreadCount,
        total: rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/alerts/mark-all-read ─────────────────────────────
/**
 * Mark all alerts as read
 */
router.put('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE alerts SET is_read = TRUE WHERE is_read = FALSE');
    apiResponse(res, {
      status: 200,
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/alerts/:id/read ──────────────────────────────────
/**
 * Mark single alert as read
 */
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('UPDATE alerts SET is_read = TRUE WHERE id = $1', [id]);
    apiResponse(res, {
      status: 200,
      success: true,
      message: 'Alert marked as read.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
