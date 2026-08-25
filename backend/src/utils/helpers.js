const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

/**
 * Generate a new UUID
 */
function generateId() {
  return uuidv4();
}

/**
 * Log an action to the audit trail
 */
function logAudit({ entityType, entityId, action, performedBy, oldValues, newValues, ipAddress }) {
  const db = getDb();
  const id = generateId();
  db.prepare(`
    INSERT INTO audit_log (id, entity_type, entity_id, action, performed_by, old_values, new_values, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entityType,
    entityId,
    action,
    performedBy,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ipAddress || null
  );
  return id;
}

/**
 * Generate a sequential code like PRJ-2026-001
 */
function generateCode(prefix, tableName, codeColumn = 'project_code') {
  const db = getDb();
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const row = db.prepare(`SELECT ${codeColumn} FROM ${tableName} WHERE ${codeColumn} LIKE ? ORDER BY ${codeColumn} DESC LIMIT 1`).get(pattern);

  let nextNum = 1;
  if (row) {
    const parts = row[codeColumn].split('-');
    nextNum = parseInt(parts[parts.length - 1]) + 1;
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
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { generateId, logAudit, generateCode, apiResponse, parsePagination };
