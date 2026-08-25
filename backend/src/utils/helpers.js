const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../config/database');

/**
 * Generate a new UUID
 */
function generateId() {
  return uuidv4();
}

/**
 * Log an action to the audit trail.
 * Audit logging must never break the request it is recording, so failures are
 * logged to the console instead of being thrown.
 */
async function logAudit({ entityType, entityId, action, performedBy, oldValues, newValues, ipAddress }) {
  try {
    const id = generateId();
    await query(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, performed_by, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        entityType,
        entityId,
        action,
        performedBy || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ]
    );
    return id;
  } catch (err) {
    console.error('[AUDIT] Failed to write audit entry:', err.message);
    return null;
  }
}

/**
 * Generate a sequential code like PRJ-2026-001
 */
async function generateCode(prefix, tableName, codeColumn = 'project_code') {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = await queryOne(
    `SELECT ${codeColumn} AS code FROM ${tableName}
     WHERE ${codeColumn} LIKE $1
     ORDER BY ${codeColumn} DESC LIMIT 1`,
    [pattern]
  );

  let nextNum = 1;
  if (row && row.code) {
    const parts = row.code.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }

  return `${prefix}-${year}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Standard API response wrapper
 */
function apiResponse(res, { status = 200, success = true, data = null, message = null, error = null, meta = null }) {
  const response = { success };
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;
  if (meta) response.meta = meta;
  return res.status(status).json(response);
}

/**
 * Parse pagination params from query
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { generateId, logAudit, generateCode, apiResponse, parsePagination };
