const express = require('express');
const router = express.Router();
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { apiResponse } = require('../../utils/helpers');

// Helper to log audit events
async function logAudit(entityType, entityId, action, performedBy, oldVals, newVals, req) {
  try {
    const ip = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    await query(
      `INSERT INTO audit_log (entity_type, entity_id, action, performed_by, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entityType,
        String(entityId),
        action,
        performedBy,
        oldVals ? JSON.stringify(oldVals) : null,
        newVals ? JSON.stringify(newVals) : null,
        ip,
      ]
    );
  } catch (e) {
    console.error('[AuditLog Error]', e.message);
  }
}

// ─── Auto-Scan Function (Reusable for startup & API triggers) ────
async function runSystemAlertScanner(reqUser = null, req = null) {
  let generatedCount = 0;

  try {
    // 1. OVERDUE WORKFLOW CASES
    const overdueCases = await queryRows(`
      SELECT c.*, p.name AS project_name, pr.survey_number, pr.parcel_code
      FROM acquisition_cases c
      JOIN projects p ON c.project_id = p.id
      LEFT JOIN parcels pr ON c.parcel_id = pr.id
      WHERE c.status NOT IN ('CLOSED', 'CLOSURE', 'COMPLETED')
        AND c.due_date < CURRENT_DATE
    `);

    for (const c of overdueCases) {
      const daysOverdue = Math.ceil((new Date() - new Date(c.due_date)) / (1000 * 60 * 60 * 24));
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE case_id = $1 AND type IN ('OVERDUE', 'DEADLINE_MISSED') AND is_acknowledged = FALSE`,
        [c.id]
      );

      if (!existing) {
        await query(
          `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, target_user_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'OVERDUE',
            `SLA Overdue: Case ${c.case_code} (${c.current_stage || 'Acquisition'})`,
            `Workflow stage "${c.current_stage || 'Acquisition'}" is overdue by ${daysOverdue} days (Deadline was ${new Date(c.due_date).toLocaleDateString('en-IN')}). Immediate statutory compliance review required.`,
            c.project_id,
            c.id,
            c.parcel_id,
            c.assigned_to,
            daysOverdue > 10 ? 'CRITICAL' : 'HIGH',
          ]
        );
        generatedCount++;
      }

      // Auto-escalation for long-overdue cases (> 14 days)
      if (daysOverdue >= 14) {
        const existingEscalation = await queryOne(
          `SELECT id FROM alerts WHERE case_id = $1 AND type = 'ESCALATION' AND is_acknowledged = FALSE`,
          [c.id]
        );
        if (!existingEscalation) {
          const seniorUser = await queryOne(`SELECT id FROM users WHERE role IN ('SGA', 'DLAO') ORDER BY role DESC LIMIT 1`);
          await query(
            `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, target_user_id, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              'ESCALATION',
              `Tier-2 Escalation: Overdue Case ${c.case_code}`,
              `Statutory SLA exceeded by ${daysOverdue} days in stage "${c.current_stage || 'Acquisition'}". Escalated to Senior Authority oversight.`,
              c.project_id,
              c.id,
              c.parcel_id,
              seniorUser?.id || c.assigned_to,
              'CRITICAL',
            ]
          );
          generatedCount++;
        }
      }
    }

    // 2. UPCOMING STATUTORY DEADLINES (Within 7 days)
    const approachingCases = await queryRows(`
      SELECT c.*, p.name AS project_name
      FROM acquisition_cases c
      JOIN projects p ON c.project_id = p.id
      WHERE c.status NOT IN ('CLOSED', 'CLOSURE', 'COMPLETED')
        AND c.due_date >= CURRENT_DATE
        AND c.due_date <= CURRENT_DATE + INTERVAL '7 days'
    `);

    for (const c of approachingCases) {
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE case_id = $1 AND type = 'DEADLINE_APPROACHING' AND is_acknowledged = FALSE`,
        [c.id]
      );
      if (!existing) {
        const daysLeft = Math.max(1, Math.ceil((new Date(c.due_date) - new Date()) / (1000 * 60 * 60 * 24)));
        await query(
          `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, target_user_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'DEADLINE_APPROACHING',
            `Deadline in ${daysLeft} days: Case ${c.case_code}`,
            `Statutory deadline for stage "${c.current_stage || 'Acquisition'}" expires on ${new Date(c.due_date).toLocaleDateString('en-IN')}. Verify all reports before submission.`,
            c.project_id,
            c.id,
            c.parcel_id,
            c.assigned_to,
            daysLeft <= 3 ? 'HIGH' : 'MEDIUM',
          ]
        );
        generatedCount++;
      }
    }

    // 3. AI MISMATCH HIGH-SEVERITY FLAGS
    const aiMismatches = await queryRows(`
      SELECT m.*, pr.survey_number, pr.project_id
      FROM ai_mismatches m
      JOIN parcels pr ON m.parcel_id = pr.id
      WHERE m.status IN ('DETECTED', 'UNDER_REVIEW')
    `);

    for (const m of aiMismatches) {
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE parcel_id = $1 AND type = 'DATA_MISMATCH' AND is_acknowledged = FALSE`,
        [m.parcel_id]
      );
      if (!existing) {
        await query(
          `INSERT INTO alerts (type, title, message, project_id, parcel_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'DATA_MISMATCH',
            `AI Data Mismatch: Survey #${m.survey_number}`,
            `Discrepancy detected in field "${m.field_name}": Official Record [${m.official_value}] vs Extracted [${m.extracted_value}]. Severity: ${m.severity}.`,
            m.project_id,
            m.parcel_id,
            m.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          ]
        );
        generatedCount++;
      }
    }

    // 4. PENDING COMPENSATION DISBURSEMENT
    const pendingDisbursements = await queryRows(`
      SELECT comp.*, pr.survey_number, pr.project_id, pr.parcel_code
      FROM compensation comp
      JOIN parcels pr ON comp.parcel_id = pr.id
      WHERE (comp.payment_status IN ('Pending', 'Partially Paid', 'PENDING', 'PARTIALLY_PAID')
             OR (comp.assessed_amount > 0 AND comp.paid_amount < comp.assessed_amount))
    `);

    for (const comp of pendingDisbursements) {
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE parcel_id = $1 AND type = 'HIGH_RISK' AND title LIKE '%Pending Compensation Disbursement%' AND is_acknowledged = FALSE`,
        [comp.parcel_id]
      );
      if (!existing) {
        const remainingAmount = (Number(comp.assessed_amount) || 0) - (Number(comp.paid_amount) || 0);
        await query(
          `INSERT INTO alerts (type, title, message, project_id, parcel_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'HIGH_RISK',
            `Pending Compensation Disbursement: Survey #${comp.survey_number}`,
            `Compensation payment status is "${comp.payment_status}" with remaining ₹${remainingAmount.toLocaleString('en-IN')} pending disbursement for owner ${comp.owner_name || 'beneficiary'}.`,
            comp.project_id,
            comp.parcel_id,
            comp.payment_status === 'Partially Paid' ? 'HIGH' : 'MEDIUM',
          ]
        );
        generatedCount++;
      }
    }

    // 5. R&R MILESTONE DELAYS
    const delayedRr = await queryRows(`
      SELECT act.*, f.family_code, f.head_of_family, f.project_id, f.parcel_id
      FROM rr_activities act
      JOIN families f ON act.family_id = f.id
      WHERE act.status = 'DELAYED'
         OR (act.status = 'PENDING' AND act.due_date < CURRENT_DATE)
    `);

    for (const act of delayedRr) {
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE project_id = $1 AND type = 'OVERDUE' AND title LIKE '%R&R Milestone Delay%' AND is_acknowledged = FALSE`,
        [act.project_id]
      );
      if (!existing) {
        await query(
          `INSERT INTO alerts (type, title, message, project_id, parcel_id, target_user_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'OVERDUE',
            `R&R Milestone Delay: ${act.activity_type || 'Rehabilitation'}`,
            `R&R activity for family ${act.head_of_family} (${act.family_code}) is delayed beyond target date (${act.due_date ? new Date(act.due_date).toLocaleDateString('en-IN') : 'N/A'}). Reason: ${act.pending_reason || 'Pending land handover'}.`,
            act.project_id,
            act.parcel_id,
            act.responsible_authority,
            'HIGH',
          ]
        );
        generatedCount++;
      }
    }

    // 6. NEW RESTRICTED DOCUMENT UPLOADS PENDING SIGN-OFF
    const pendingDocs = await queryRows(`
      SELECT d.*, p.name AS project_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.access_level = 'RESTRICTED'
    `);

    for (const doc of pendingDocs) {
      const existing = await queryOne(
        `SELECT id FROM alerts WHERE project_id = $1 AND type = 'MISSING_DOC' AND title LIKE '%Document Sign-Off Pending%' AND is_acknowledged = FALSE`,
        [doc.project_id]
      );
      if (!existing) {
        await query(
          `INSERT INTO alerts (type, title, message, project_id, parcel_id, priority)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'MISSING_DOC',
            `Document Sign-Off Pending: ${doc.title || doc.document_type}`,
            `Restricted statutory document "${doc.title || doc.file_name}" uploaded recently requires authorization and verification.`,
            doc.project_id,
            doc.parcel_id,
            'MEDIUM',
          ]
        );
        generatedCount++;
      }
    }

    if (reqUser && req) {
      await logAudit('ALERT_ENGINE', 'SCAN', 'RUN_DIAGNOSTIC_SCAN', reqUser.id, null, { generatedCount }, req);
    }
  } catch (err) {
    console.error('[Scanner Error]', err.message);
  }

  return generatedCount;
}

// ─── GET /api/alerts/stats ─────────────────────────────────────
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const statsSql = `
      SELECT
        COUNT(*) AS total_alerts,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) AS unread_count,
        COUNT(CASE WHEN is_acknowledged = FALSE THEN 1 END) AS pending_action_count,
        COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) AS critical_count,
        COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) AS high_count,
        COUNT(CASE WHEN type IN ('DEADLINE_APPROACHING', 'DEADLINE_MISSED', 'OVERDUE') THEN 1 END) AS deadline_alerts,
        COUNT(CASE WHEN type = 'MISSING_DOC' THEN 1 END) AS missing_doc_alerts,
        COUNT(CASE WHEN type = 'DATA_MISMATCH' THEN 1 END) AS mismatch_alerts,
        COUNT(CASE WHEN type = 'ESCALATION' THEN 1 END) AS escalation_alerts,
        COUNT(CASE WHEN type = 'HIGH_RISK' THEN 1 END) AS high_risk_alerts
      FROM alerts
    `;
    let row = await queryOne(statsSql);

    if (parseInt(row?.total_alerts, 10) === 0) {
      await runSystemAlertScanner(req.user, req);
      row = await queryOne(statsSql);
    }

    apiResponse(res, {
      status: 200,
      success: true,
      data: {
        totalAlerts: parseInt(row?.total_alerts, 10) || 0,
        unreadCount: parseInt(row?.unread_count, 10) || 0,
        pendingActionCount: parseInt(row?.pending_action_count, 10) || 0,
        criticalCount: parseInt(row?.critical_count, 10) || 0,
        highCount: parseInt(row?.high_count, 10) || 0,
        deadlineAlerts: parseInt(row?.deadline_alerts, 10) || 0,
        missingDocAlerts: parseInt(row?.missing_doc_alerts, 10) || 0,
        mismatchAlerts: parseInt(row?.mismatch_alerts, 10) || 0,
        escalationAlerts: parseInt(row?.escalation_alerts, 10) || 0,
        highRiskAlerts: parseInt(row?.high_risk_alerts, 10) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/alerts ──────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      type,
      priority,
      severity,
      status,
      is_read,
      is_acknowledged,
      project_id,
      search,
      sort,
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Filter by type
    if (type && type !== 'ALL') {
      if (type === 'DEADLINE_ALL') {
        conditions.push(`a.type IN ('DEADLINE_APPROACHING', 'DEADLINE_MISSED', 'OVERDUE')`);
      } else {
        conditions.push(`a.type = $${paramIdx++}`);
        params.push(type);
      }
    }

    // Filter by priority / severity
    const effectivePriority = priority || severity;
    if (effectivePriority && effectivePriority !== 'ALL') {
      conditions.push(`a.priority = $${paramIdx++}`);
      params.push(effectivePriority.toUpperCase());
    }

    // Filter by status parameter
    if (status) {
      if (status === 'UNREAD') {
        conditions.push(`a.is_read = FALSE`);
      } else if (status === 'PENDING' || status === 'PENDING_ACTION') {
        conditions.push(`a.is_acknowledged = FALSE`);
      } else if (status === 'RESOLVED' || status === 'ACKNOWLEDGED') {
        conditions.push(`a.is_acknowledged = TRUE`);
      }
    }

    if (is_read !== undefined && is_read !== '' && is_read !== 'ALL') {
      conditions.push(`a.is_read = $${paramIdx++}`);
      params.push(is_read === 'true');
    }

    if (is_acknowledged !== undefined && is_acknowledged !== '' && is_acknowledged !== 'ALL') {
      conditions.push(`a.is_acknowledged = $${paramIdx++}`);
      params.push(is_acknowledged === 'true');
    }

    if (project_id) {
      conditions.push(`a.project_id = $${paramIdx++}`);
      params.push(project_id);
    }

    if (search) {
      conditions.push(`(a.title ILIKE $${paramIdx} OR a.message ILIKE $${paramIdx} OR p.name ILIKE $${paramIdx} OR pr.survey_number ILIKE $${paramIdx} OR c.case_code ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM alerts a
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN parcels pr ON a.parcel_id = pr.id
      LEFT JOIN acquisition_cases c ON a.case_id = c.id
      ${whereClause}
    `;
    let countRow = await queryOne(countSql, params);
    let total = parseInt(countRow?.total, 10) || 0;

    // If alerts table is empty on initial fetch, run scanner automatically
    if (total === 0 && !type && !priority && !status && !search) {
      await runSystemAlertScanner(req.user, req);
      countRow = await queryOne(countSql, params);
      total = parseInt(countRow?.total, 10) || 0;
    }

    const unreadRow = await queryOne('SELECT COUNT(*) AS unread FROM alerts WHERE is_read = FALSE');
    const unreadCount = parseInt(unreadRow?.unread, 10) || 0;

    const orderClause = (sort === 'newest' || sort === 'latest')
      ? 'ORDER BY a.created_at DESC'
      : `ORDER BY
          CASE a.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          a.created_at DESC`;

    const querySql = `
      SELECT
        a.*,
        a.priority AS severity,
        a.message AS description,
        p.name AS project_name,
        p.project_code,
        pr.survey_number,
        pr.parcel_code,
        pr.village,
        pr.district AS parcel_district,
        c.case_code,
        c.case_code AS case_number,
        c.current_stage AS case_stage,
        c.due_date AS case_due_date,
        c.status AS case_status,
        u.full_name AS target_user_name,
        u.role AS target_user_role
      FROM alerts a
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN parcels pr ON a.parcel_id = pr.id
      LEFT JOIN acquisition_cases c ON a.case_id = c.id
      LEFT JOIN users u ON a.target_user_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(parseInt(limit, 10) || 50);
    params.push(parseInt(offset, 10) || 0);

    const rows = await queryRows(querySql, params);

    apiResponse(res, {
      status: 200,
      success: true,
      data: rows,
      meta: {
        unreadCount,
        total,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/alerts (Direct Officer-to-Officer Notification) ───
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      title,
      message,
      priority = 'HIGH',
      type = 'ESCALATION',
      target_role,
      target_user_id,
      project_id,
      case_id,
      parcel_id,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }

    let finalTargetUserId = target_user_id || null;
    let recipientName = null;

    if (!finalTargetUserId && target_role) {
      const targetUser = await queryOne(
        'SELECT id, full_name, role FROM users WHERE role = $1 ORDER BY id LIMIT 1',
        [target_role]
      );
      if (targetUser) {
        finalTargetUserId = targetUser.id;
        recipientName = targetUser.full_name;
      }
    } else if (finalTargetUserId) {
      const targetUser = await queryOne('SELECT full_name, role FROM users WHERE id = $1', [finalTargetUserId]);
      if (targetUser) recipientName = targetUser.full_name;
    }

    const senderTitle = req.user?.full_name ? `From ${req.user.full_name} (${req.user.role || 'Officer'}): ` : '';
    const formattedTitle = title.startsWith('From ') || title.startsWith('Notification') || title.startsWith('Alert') ? title : `${senderTitle}${title}`;

    const newAlert = await queryOne(
      `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, target_user_id, priority, is_read, is_acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, NOW())
       RETURNING *`,
      [
        type || 'ESCALATION',
        formattedTitle,
        message,
        project_id || null,
        case_id || null,
        parcel_id || null,
        finalTargetUserId,
        priority || 'HIGH',
      ]
    );

    await logAudit(
      'ALERT',
      newAlert.id,
      'DISPATCH_OFFICER_ALERT',
      req.user?.id,
      null,
      {
        title: formattedTitle,
        target_role,
        target_user_id: finalTargetUserId,
        recipientName,
        priority,
      },
      req
    );

    apiResponse(res, {
      status: 201,
      success: true,
      message: `Statutory notification alert dispatched successfully to ${recipientName || target_role || 'designated authority'}.`,
      data: newAlert,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/alerts/scan ────────────────────────────────────
router.post('/scan', authenticate, async (req, res, next) => {
  try {
    const generatedCount = await runSystemAlertScanner(req.user, req);

    apiResponse(res, {
      status: 200,
      success: true,
      message: `Diagnostic SLA scan complete. ${generatedCount} new alerts generated or refreshed.`,
      data: { generatedCount },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/alerts/:id (Update status/read/acknowledged) ───
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_read, is_resolved, is_acknowledged, remarks } = req.body;

    const currentAlert = await queryOne('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!currentAlert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updates = [];
    const params = [id];
    let idx = 2;

    if (is_read !== undefined) {
      updates.push(`is_read = $${idx++}`);
      params.push(is_read);
    }

    const resolvedVal = is_resolved !== undefined ? is_resolved : is_acknowledged;
    if (resolvedVal !== undefined) {
      updates.push(`is_acknowledged = $${idx++}`);
      params.push(resolvedVal);
      if (resolvedVal) {
        updates.push(`acknowledged_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return apiResponse(res, { status: 200, success: true, data: currentAlert });
    }

    const updateSql = `UPDATE alerts SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const updated = await queryOne(updateSql, params);

    await logAudit(
      'ALERT',
      id,
      resolvedVal ? 'RESOLVE_ALERT' : 'UPDATE_ALERT',
      req.user?.id,
      { is_read: currentAlert.is_read, is_acknowledged: currentAlert.is_acknowledged },
      { is_read: updated.is_read, is_acknowledged: updated.is_acknowledged, remarks },
      req
    );

    apiResponse(res, {
      status: 200,
      success: true,
      message: 'Alert updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/alerts/mark-all-read ─────────────────────────────
router.put('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE alerts SET is_read = TRUE WHERE is_read = FALSE');
    await logAudit('ALERTS', 'ALL', 'MARK_ALL_READ', req.user?.id, null, { is_read: true }, req);

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

// ─── PUT /api/alerts/:id/acknowledge ───────────────────────────
router.put('/:id/acknowledge', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const currentAlert = await queryOne('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!currentAlert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updated = await queryOne(
      `UPDATE alerts
       SET is_acknowledged = TRUE,
           acknowledged_at = NOW(),
           is_read = TRUE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await logAudit(
      'ALERT',
      id,
      'ACKNOWLEDGE_ALERT',
      req.user?.id,
      { is_acknowledged: currentAlert.is_acknowledged },
      { is_acknowledged: true, remarks },
      req
    );

    apiResponse(res, {
      status: 200,
      success: true,
      message: 'Alert statutory acknowledgement recorded.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/alerts/:id/escalate ─────────────────────────────
router.post('/:id/escalate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { escalation_reason, target_role = 'SGA' } = req.body;

    const currentAlert = await queryOne('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!currentAlert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const recipient = await queryOne('SELECT id, full_name, role FROM users WHERE role = $1 LIMIT 1', [target_role]);

    const newEscalation = await queryOne(
      `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, target_user_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        'ESCALATION',
        `MANUAL ESCALATION: ${currentAlert.title}`,
        `Escalated by ${req.user?.full_name || 'Officer'}: "${escalation_reason || 'Requires immediate senior intervention'}". Original Issue: ${currentAlert.message}`,
        currentAlert.project_id,
        currentAlert.case_id,
        currentAlert.parcel_id,
        recipient?.id || null,
        'CRITICAL',
      ]
    );

    await query(`UPDATE alerts SET priority = 'CRITICAL' WHERE id = $1`, [id]);

    await logAudit(
      'ALERT',
      id,
      'MANUAL_ESCALATION',
      req.user?.id,
      { priority: currentAlert.priority },
      { escalated_to: recipient?.full_name, reason: escalation_reason },
      req
    );

    apiResponse(res, {
      status: 201,
      success: true,
      message: `Alert escalated to ${recipient?.full_name || target_role} with CRITICAL priority.`,
      data: newEscalation,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/alerts/bulk-action ─────────────────────────────
/**
 * Bulk action on multiple alerts: acknowledge, read, escalate
 */
router.post('/bulk-action', authenticate, async (req, res, next) => {
  try {
    const { alert_ids, action, remarks } = req.body;

    if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'alert_ids must be a non-empty array.' });
    }

    if (action === 'ACKNOWLEDGE') {
      await query(
        `UPDATE alerts
         SET is_acknowledged = TRUE, acknowledged_at = NOW(), is_read = TRUE
         WHERE id = ANY($1::uuid[])`,
        [alert_ids]
      );
      await logAudit('ALERTS', 'BULK', 'BULK_ACKNOWLEDGE', req.user?.id, null, { count: alert_ids.length, remarks }, req);
    } else if (action === 'MARK_READ') {
      await query(
        `UPDATE alerts SET is_read = TRUE WHERE id = ANY($1::uuid[])`,
        [alert_ids]
      );
      await logAudit('ALERTS', 'BULK', 'BULK_MARK_READ', req.user?.id, null, { count: alert_ids.length }, req);
    } else if (action === 'ESCALATE') {
      await query(
        `UPDATE alerts SET priority = 'CRITICAL' WHERE id = ANY($1::uuid[])`,
        [alert_ids]
      );
      await logAudit('ALERTS', 'BULK', 'BULK_ESCALATE', req.user?.id, null, { count: alert_ids.length, remarks }, req);
    }

    apiResponse(res, {
      status: 200,
      success: true,
      message: `Bulk ${action} executed successfully on ${alert_ids.length} alerts.`,
      data: { count: alert_ids.length },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/alerts/export ────────────────────────────────────
/**
 * Export statutory compliance alerts as CSV
 */
router.get('/export', authenticate, async (req, res, next) => {
  try {
    const alerts = await queryRows(`
      SELECT
        a.id,
        a.priority,
        a.type,
        a.title,
        a.message,
        p.name AS project_name,
        p.project_code,
        pr.survey_number,
        pr.village,
        pr.district,
        c.case_code,
        c.current_stage,
        a.is_acknowledged,
        a.created_at,
        a.acknowledged_at
      FROM alerts a
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN parcels pr ON a.parcel_id = pr.id
      LEFT JOIN acquisition_cases c ON a.case_id = c.id
      ORDER BY a.created_at DESC
    `);

    const header = [
      'Alert ID',
      'Priority',
      'Alert Type',
      'Title',
      'Description',
      'Project',
      'Survey No',
      'Village',
      'District',
      'Case Code',
      'Workflow Stage',
      'Acknowledged',
      'Created Date',
      'Acknowledged Date'
    ].join(',');

    const rows = alerts.map(a => [
      `"${a.id}"`,
      `"${a.priority}"`,
      `"${a.type}"`,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${(a.message || '').replace(/"/g, '""')}"`,
      `"${(a.project_name || '').replace(/"/g, '""')}"`,
      `"${a.survey_number || ''}"`,
      `"${a.village || ''}"`,
      `"${a.district || ''}"`,
      `"${a.case_code || ''}"`,
      `"${a.current_stage || ''}"`,
      a.is_acknowledged ? 'YES' : 'NO',
      `"${new Date(a.created_at).toISOString()}"`,
      a.acknowledged_at ? `"${new Date(a.acknowledged_at).toISOString()}"` : '""'
    ].join(','));

    const csvContent = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="BhoomiSetu_Statutory_Alerts_${new Date().toISOString().slice(0,10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

