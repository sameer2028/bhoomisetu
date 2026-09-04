const express = require('express');
const router = express.Router();
const { queryRows, queryOne } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { apiResponse } = require('../../utils/helpers');

// ─── GET /api/audit or /api/audit-trail ────────────────────────
/**
 * Query paginated audit events with rich filters:
 * - entity_type (project/parcel/case/document/compensation/rr/alert/etc)
 * - action / event_type (CREATE, UPDATE, APPROVE, REJECT, ESCALATE, etc)
 * - actor_id / performed_by
 * - from_date & to_date (YYYY-MM-DD or ISO timestamp)
 * - full-text search across descriptions, actor names, entity IDs
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      entity_type,
      entity_id,
      action,
      event_type, // alias for action
      performed_by,
      actor_id,   // alias for performed_by
      from_date,
      to_date,
      limit = 50,
      offset = 0,
      search,
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (entity_type && entity_type !== 'ALL') {
      conditions.push(`UPPER(a.entity_type) = $${paramIdx++}`);
      params.push(entity_type.toUpperCase());
    }

    if (entity_id) {
      conditions.push(`a.entity_id = $${paramIdx++}`);
      params.push(entity_id);
    }

    const effectiveAction = action || event_type;
    if (effectiveAction && effectiveAction !== 'ALL') {
      conditions.push(`a.action = $${paramIdx++}`);
      params.push(effectiveAction);
    }

    const effectiveActor = performed_by || actor_id;
    if (effectiveActor) {
      conditions.push(`a.performed_by = $${paramIdx++}`);
      params.push(effectiveActor);
    }

    if (from_date) {
      conditions.push(`a.created_at >= $${paramIdx++}::TIMESTAMPTZ`);
      params.push(from_date);
    }

    if (to_date) {
      conditions.push(`a.created_at <= ($${paramIdx++}::TIMESTAMPTZ + INTERVAL '1 day')`);
      params.push(to_date);
    }

    if (search) {
      conditions.push(`(
        a.entity_type ILIKE $${paramIdx} OR
        a.action ILIKE $${paramIdx} OR
        u.full_name ILIKE $${paramIdx} OR
        u.email ILIKE $${paramIdx} OR
        a.entity_id ILIKE $${paramIdx} OR
        a.ip_address ILIKE $${paramIdx}
      )`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM audit_log a
      LEFT JOIN users u ON a.performed_by = u.id
      ${whereClause}
    `;
    const countRow = await queryOne(countSql, params);
    const total = parseInt(countRow?.total, 10) || 0;

    const dataSql = `
      SELECT
        a.id,
        a.entity_type,
        a.entity_id,
        a.action AS event_type,
        a.action,
        a.performed_by AS actor_id,
        u.full_name AS actor_name,
        u.role AS actor_role,
        u.email AS actor_email,
        a.old_values,
        a.new_values,
        a.ip_address,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON a.performed_by = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(parseInt(limit, 10) || 50);
    params.push(parseInt(offset, 10) || 0);

    const rows = await queryRows(dataSql, params);

    // Get stats summary for audit
    const statsSql = `
      SELECT
        COUNT(*) AS total_events,
        COUNT(DISTINCT a.entity_type) AS entity_types_count,
        COUNT(DISTINCT a.performed_by) AS active_users_count,
        COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '24 HOURS' THEN 1 END) AS events_last_24h
      FROM audit_log a
    `;
    const stats = await queryOne(statsSql);

    apiResponse(res, {
      status: 200,
      success: true,
      data: rows,
      meta: {
        total,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0,
        stats: {
          totalEvents: parseInt(stats?.total_events, 10) || 0,
          entityTypesCount: parseInt(stats?.entity_types_count, 10) || 0,
          activeUsersCount: parseInt(stats?.active_users_count, 10) || 0,
          eventsLast24h: parseInt(stats?.events_last_24h, 10) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/audit/entities ──────────────────────────────────
router.get('/entities', authenticate, async (req, res, next) => {
  try {
    const entityTypes = await queryRows(`
      SELECT DISTINCT entity_type
      FROM audit_log
      WHERE entity_type IS NOT NULL
      ORDER BY entity_type ASC
    `);

    const actions = await queryRows(`
      SELECT DISTINCT action
      FROM audit_log
      WHERE action IS NOT NULL
      ORDER BY action ASC
    `);

    apiResponse(res, {
      status: 200,
      success: true,
      data: {
        entityTypes: entityTypes.map((r) => r.entity_type),
        actions: actions.map((r) => r.action),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/audit/export ────────────────────────────────────
/**
 * Export tamper-evident statutory audit log as CSV
 */
router.get('/export', authenticate, async (req, res, next) => {
  try {
    const logs = await queryRows(`
      SELECT
        a.id,
        a.created_at,
        a.entity_type,
        a.entity_id,
        a.action,
        u.full_name AS actor_name,
        u.role AS actor_role,
        u.email AS actor_email,
        a.ip_address,
        a.old_values,
        a.new_values
      FROM audit_log a
      LEFT JOIN users u ON a.performed_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 1000
    `);

    const header = [
      'Audit Event ID',
      'Timestamp (UTC)',
      'Entity Type',
      'Entity ID',
      'Action / Mutation',
      'Performed By Officer',
      'Officer Role',
      'Officer Email',
      'Origin IP',
      'Previous State (old_values)',
      'New State (new_values)'
    ].join(',');

    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.created_at).toISOString()}"`,
      `"${l.entity_type || ''}"`,
      `"${l.entity_id || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.actor_name || 'SYSTEM').replace(/"/g, '""')}"`,
      `"${l.actor_role || 'SYSTEM'}"`,
      `"${l.actor_email || ''}"`,
      `"${l.ip_address || '127.0.0.1'}"`,
      `"${l.old_values ? JSON.stringify(l.old_values).replace(/"/g, '""') : ''}"`,
      `"${l.new_values ? JSON.stringify(l.new_values).replace(/"/g, '""') : ''}"`
    ].join(','));

    const csvContent = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="BhoomiSetu_Statutory_Audit_Log_${new Date().toISOString().slice(0,10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

