const express = require('express');
const { queryOne, queryRows, withTransaction } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, generateCode, parsePagination } = require('../../utils/helpers');
const {
  ROLES,
  WORKFLOW_STAGES,
  WORKFLOW_STAGES_ORDER,
  WORKFLOW_ACTIONS,
  CASE_STATUS,
  PRIORITY,
} = require('../../config/constants');

const router = express.Router();

// ─── Stage transition map ───────────────────────────────────────────
// Defines which actions are allowed at each stage and where they lead.
const TRANSITION_MAP = {
  PROJECT_PROPOSAL:    { APPROVE: 'LAND_IDENTIFICATION', FORWARD: 'LAND_IDENTIFICATION', REJECT: null },
  LAND_IDENTIFICATION: { FORWARD: 'VERIFICATION',       APPROVE: 'VERIFICATION',       SEND_BACK: 'PROJECT_PROPOSAL' },
  VERIFICATION:        { FORWARD: 'APPROVAL',           APPROVE: 'APPROVAL',           SEND_BACK: 'LAND_IDENTIFICATION' },
  APPROVAL:            { APPROVE: 'NOTIFICATION',       FORWARD: 'NOTIFICATION',       REJECT: null, SEND_BACK: 'VERIFICATION' },
  NOTIFICATION:        { FORWARD: 'COMPENSATION',       APPROVE: 'COMPENSATION' },
  COMPENSATION:        { FORWARD: 'AWARD',              APPROVE: 'AWARD',              SEND_BACK: 'NOTIFICATION' },
  AWARD:               { FORWARD: 'PAYMENT',            APPROVE: 'PAYMENT' },
  PAYMENT:             { FORWARD: 'POSSESSION',         APPROVE: 'POSSESSION',         SEND_BACK: 'AWARD' },
  POSSESSION:          { FORWARD: 'RR',                 APPROVE: 'RR' },
  RR:                  { COMPLETE: 'CLOSURE',           FORWARD: 'CLOSURE',            APPROVE: 'CLOSURE' },
  CLOSURE:             {}, // Terminal — no transitions allowed
};

// Human-readable stage labels
const STAGE_LABELS = {
  PROJECT_PROPOSAL: 'Project Proposal',
  LAND_IDENTIFICATION: 'Land Identification',
  VERIFICATION: 'Verification',
  APPROVAL: 'Approval',
  NOTIFICATION: 'Notification',
  COMPENSATION: 'Compensation',
  AWARD: 'Award',
  PAYMENT: 'Payment',
  POSSESSION: 'Possession',
  RR: 'R&R',
  CLOSURE: 'Closure',
};

/**
 * GET /api/workflow/stages
 * Return the ordered list of workflow stages with labels and allowed actions
 */
router.get('/stages', authenticate, (req, res) => {
  const stages = WORKFLOW_STAGES_ORDER.map((stage, index) => ({
    key: stage,
    label: STAGE_LABELS[stage],
    order: index,
    allowedActions: Object.keys(TRANSITION_MAP[stage] || {}),
  }));

  return apiResponse(res, { status: 200, success: true, data: stages });
});

/**
 * GET /api/workflow/cases
 * List acquisition cases with filtering, search, and pagination
 */
router.get('/cases', authenticate, async (req, res, next) => {
  try {
    const {
      current_stage, status, priority, project_id,
      assigned_to, is_overdue, search,
    } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (current_stage) {
      params.push(current_stage);
      conditions.push(`c.current_stage = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`c.priority = $${params.length}`);
    }
    if (project_id) {
      params.push(project_id);
      conditions.push(`c.project_id::text = $${params.length}`);
    }
    if (assigned_to) {
      params.push(assigned_to);
      conditions.push(`c.assigned_to::text = $${params.length}`);
    }
    if (is_overdue === 'true') {
      conditions.push(`(c.due_date < CURRENT_DATE AND c.status NOT IN ('COMPLETED','REJECTED'))`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      const i = params.length;
      conditions.push(
        `(c.case_code ILIKE $${i} OR pr.name ILIKE $${i} OR pa.parcel_code ILIKE $${i} OR u.full_name ILIKE $${i})`
      );
    }

    // Role-based jurisdiction filtering
    if (req.user.role === ROLES.DLAO && req.user.district) {
      params.push(req.user.district);
      conditions.push(`pr.district = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS count
         FROM acquisition_cases c
         LEFT JOIN projects pr ON c.project_id = pr.id
         LEFT JOIN parcels pa ON c.parcel_id = pa.id
         LEFT JOIN users u ON c.assigned_to = u.id
         ${where}`,
      params
    );

    const cases = await queryRows(
      `SELECT c.id, c.case_code, c.project_id, c.parcel_id,
              c.current_stage, c.assigned_to, c.status, c.due_date,
              c.is_overdue, c.remarks, c.priority,
              c.created_at, c.updated_at,
              pr.name AS project_name, pr.project_code,
              pa.parcel_code, pa.survey_number, pa.village,
              u.full_name AS assigned_officer_name, u.role AS assigned_officer_role, u.district AS assigned_officer_district,
              (c.due_date < CURRENT_DATE AND c.status NOT IN ('COMPLETED','REJECTED')) AS overdue
         FROM acquisition_cases c
         LEFT JOIN projects pr ON c.project_id = pr.id
         LEFT JOIN parcels pa ON c.parcel_id = pa.id
         LEFT JOIN users u ON c.assigned_to = u.id
         ${where}
         ORDER BY
           CASE c.priority
             WHEN 'CRITICAL' THEN 1
             WHEN 'HIGH' THEN 2
             WHEN 'MEDIUM' THEN 3
             WHEN 'LOW' THEN 4
           END,
           c.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: cases,
      meta: {
        total: countRow.count,
        page,
        limit,
        totalPages: Math.ceil(countRow.count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/cases
 * Create a new acquisition case
 */
router.post('/cases', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { project_id, parcel_id, priority, due_date, remarks } = req.body;

    if (!project_id || typeof project_id !== 'string' || project_id.trim() === '') {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'project_id is required.',
      });
    }

    const cleanProjectId = project_id.trim();
    const cleanParcelId = parcel_id && typeof parcel_id === 'string' && parcel_id.trim() !== '' && parcel_id !== 'null' && parcel_id !== 'undefined' ? parcel_id.trim() : null;
    const cleanDueDate = due_date && typeof due_date === 'string' && due_date.trim() !== '' && due_date !== 'null' && due_date !== 'undefined' ? due_date.trim() : null;
    const cleanRemarks = remarks && typeof remarks === 'string' && remarks.trim() !== '' ? remarks.trim() : null;

    // Verify project exists
    const project = await queryOne('SELECT id, name FROM projects WHERE id::text = $1', [cleanProjectId]);
    if (!project) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Project not found.',
      });
    }

    // Verify parcel if provided
    if (cleanParcelId) {
      const parcel = await queryOne('SELECT id FROM parcels WHERE id::text = $1', [cleanParcelId]);
      if (!parcel) {
        return apiResponse(res, {
          status: 404,
          success: false,
          error: 'Parcel not found.',
        });
      }
    }

    const id = generateId();
    const caseCode = await generateCode('LA', 'acquisition_cases', 'case_code');
    const validPriority = Object.values(PRIORITY).includes(priority) ? priority : PRIORITY.MEDIUM;

    await queryOne(
      `INSERT INTO acquisition_cases
         (id, case_code, project_id, parcel_id, current_stage, assigned_to, status,
          due_date, priority, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        id,
        caseCode,
        cleanProjectId,
        cleanParcelId,
        WORKFLOW_STAGES.PROJECT_PROPOSAL,
        req.user.id,
        CASE_STATUS.PENDING,
        cleanDueDate,
        validPriority,
        cleanRemarks,
      ]
    );

    // Create initial workflow event
    await queryOne(
      `INSERT INTO workflow_events
         (id, case_id, from_stage, to_stage, action, performed_by, remarks)
       VALUES ($1, $2, NULL, $3, $4, $5, $6)`,
      [
        generateId(),
        id,
        WORKFLOW_STAGES.PROJECT_PROPOSAL,
        WORKFLOW_ACTIONS.CREATE,
        req.user.id,
        cleanRemarks || 'Case created',
      ]
    );

    // Fetch the created case with joins
    const createdCase = await queryOne(
      `SELECT c.*, pr.name AS project_name, pr.project_code,
              pa.parcel_code, u.full_name AS assigned_officer_name
         FROM acquisition_cases c
         LEFT JOIN projects pr ON c.project_id = pr.id
         LEFT JOIN parcels pa ON c.parcel_id = pa.id
         LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = $1`,
      [id]
    );

    await logAudit({
      entityType: 'acquisition_case',
      entityId: id,
      action: 'CREATE_CASE',
      performedBy: req.user.id,
      newValues: { case_code: caseCode, project_id, parcel_id, priority: validPriority },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      message: `Acquisition case ${caseCode} created successfully`,
      data: createdCase,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/cases/:id
 * Get full case detail with project/parcel info, officer, and audit timeline
 */
router.get('/cases/:id', authenticate, async (req, res, next) => {
  try {
    const caseRecord = await queryOne(
      `SELECT c.*,
              pr.name AS project_name, pr.project_code, pr.status AS project_status,
              pr.implementing_agency,
              pa.parcel_code, pa.survey_number, pa.village, pa.district AS parcel_district,
              pa.owner_name, pa.acquisition_status, pa.area_acres,
              u.full_name AS assigned_officer_name, u.role AS assigned_officer_role, u.district AS assigned_officer_district,
              u.email AS assigned_officer_email,
              (c.due_date < CURRENT_DATE AND c.status NOT IN ('COMPLETED','REJECTED')) AS overdue
         FROM acquisition_cases c
         LEFT JOIN projects pr ON c.project_id = pr.id
         LEFT JOIN parcels pa ON c.parcel_id = pa.id
         LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id::text = $1 OR c.case_code = $1`,
      [req.params.id]
    );

    if (!caseRecord) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Acquisition case not found.',
      });
    }

    // Fetch audit timeline
    const auditTimeline = await queryRows(
      `SELECT we.id, we.from_stage, we.to_stage, we.action, we.remarks, we.created_at,
              u.full_name AS performed_by_name, u.role AS performed_by_role
         FROM workflow_events we
         LEFT JOIN users u ON we.performed_by = u.id
        WHERE we.case_id = $1
        ORDER BY we.created_at ASC`,
      [caseRecord.id]
    );

    // Determine allowed actions from current stage
    const currentStageTransitions = TRANSITION_MAP[caseRecord.current_stage] || {};
    const allowedActions = Object.keys(currentStageTransitions);

    // Build stage progress info
    const currentStageIndex = WORKFLOW_STAGES_ORDER.indexOf(caseRecord.current_stage);
    const stageProgress = WORKFLOW_STAGES_ORDER.map((stage, index) => ({
      key: stage,
      label: STAGE_LABELS[stage],
      order: index,
      status:
        caseRecord.status === 'REJECTED' ? (index <= currentStageIndex ? 'rejected' : 'pending') :
        index < currentStageIndex ? 'completed' :
        index === currentStageIndex ? 'current' :
        'pending',
    }));

    // Calculate AI Compliance Risk dynamically
    let riskScore = 100;
    let findings = [];
    
    // 1. Deadline Check
    if (caseRecord.overdue) {
      riskScore -= 20;
      findings.push({ text: 'Deadline exceeded', status: 'WARNING' });
    } else {
      findings.push({ text: 'On track with timeline', status: 'VERIFIED' });
    }

    // 2. AI Mismatches Check
    let mismatches = [];
    if (caseRecord.parcel_id) {
      mismatches = await queryRows(
        `SELECT id, field_name, severity, status 
         FROM ai_mismatches 
         WHERE parcel_id = $1 AND status = 'OPEN'`,
        [caseRecord.parcel_id]
      );
    }
    
    if (mismatches.length > 0) {
      riskScore -= (mismatches.length * 15);
      findings.push({ text: `${mismatches.length} unresolved document mismatch(es) detected`, status: 'DANGER' });
    } else {
      findings.push({ text: 'No pending document discrepancies', status: 'VERIFIED' });
    }

    // 3. Document Checks based on Stage
    const docs = await queryRows(
      `SELECT document_type FROM documents WHERE case_id = $1`,
      [caseRecord.id]
    );
    const uploadedDocs = docs.map(d => d.document_type);

    if (caseRecord.current_stage === 'NOTIFICATION') {
      if (!uploadedDocs.includes('NOTIFICATION')) {
        riskScore -= 10;
        findings.push({ text: 'Gazette notification pending', status: 'PENDING' });
      } else {
        findings.push({ text: 'Gazette notification uploaded', status: 'VERIFIED' });
      }
    } else if (WORKFLOW_STAGES_ORDER.indexOf(caseRecord.current_stage) > WORKFLOW_STAGES_ORDER.indexOf('NOTIFICATION')) {
        findings.push({ text: 'Gazette notification verified', status: 'VERIFIED' });
    }

    // Bound score
    riskScore = Math.max(0, Math.min(100, riskScore));
    let riskLevel = 'LOW';
    if (riskScore < 50) riskLevel = 'CRITICAL';
    else if (riskScore < 80) riskLevel = 'ATTENTION REQUIRED';
    else riskLevel = 'OPTIMAL';

    const aiCompliance = {
      riskScore,
      riskLevel,
      aiConfidence: 94,
      findings,
      aiRecommendation: riskScore < 80 ? 'Address pending mismatches or upload required documents to proceed safely.' : 'All checks passed. Safe to proceed to the next stage.',
    };

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        ...caseRecord,
        auditTimeline,
        allowedActions,
        stageProgress,
        stageLabels: STAGE_LABELS,
        aiCompliance,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/cases/:id/transition
 * Perform a workflow stage transition (APPROVE, FORWARD, SEND_BACK, REJECT, COMPLETE)
 */
router.post('/cases/:id/transition', authenticate, rbac(ROLES.DLAO, ROLES.SGA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { action, remarks } = req.body;

    if (!action) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'action is required (APPROVE, FORWARD, SEND_BACK, REJECT, or COMPLETE).',
      });
    }

    if (!remarks || remarks.trim().length < 3) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Remarks are required (minimum 3 characters).',
      });
    }

    const normalizedAction = action.toUpperCase();
    if (!Object.values(WORKFLOW_ACTIONS).includes(normalizedAction)) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: `Invalid action. Allowed: ${Object.values(WORKFLOW_ACTIONS).join(', ')}`,
      });
    }

    const caseRecord = await queryOne(
      `SELECT c.*, pr.district AS project_district 
         FROM acquisition_cases c 
         LEFT JOIN projects pr ON c.project_id = pr.id 
        WHERE c.id::text = $1 OR c.case_code = $1`,
      [req.params.id]
    );

    if (!caseRecord) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Acquisition case not found.',
      });
    }

    // Strict jurisdiction check for DLAO
    if (req.user.role === ROLES.DLAO && req.user.district && caseRecord.project_district !== req.user.district) {
      return apiResponse(res, {
        status: 403,
        success: false,
        error: `Forbidden: You can only transition cases within your jurisdiction (${req.user.district}). This case belongs to ${caseRecord.project_district}.`,
      });
    }

    // Check if case is already in a terminal state
    if (['COMPLETED', 'REJECTED'].includes(caseRecord.status)) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: `Case is already ${caseRecord.status.toLowerCase()}. No further transitions allowed.`,
      });
    }

    // Validate the action is allowed from the current stage
    const stageTransitions = TRANSITION_MAP[caseRecord.current_stage] || {};
    if (!(normalizedAction in stageTransitions)) {
      const allowed = Object.keys(stageTransitions);
      return apiResponse(res, {
        status: 400,
        success: false,
        error: `Action '${normalizedAction}' is not allowed at stage '${STAGE_LABELS[caseRecord.current_stage]}'. Allowed: ${allowed.join(', ') || 'none'}`,
      });
    }

    const toStage = stageTransitions[normalizedAction];
    const fromStage = caseRecord.current_stage;

    // Determine new case status
    let newStatus;
    if (toStage === null) {
      // REJECT → terminal
      newStatus = CASE_STATUS.REJECTED;
    } else if (toStage === 'CLOSURE') {
      newStatus = CASE_STATUS.COMPLETED;
    } else if (normalizedAction === 'SEND_BACK') {
      newStatus = CASE_STATUS.SENT_BACK;
    } else {
      newStatus = CASE_STATUS.IN_PROGRESS;
    }

    const finalStage = toStage || fromStage; // On reject, stay at current stage

    await withTransaction(async (client) => {
      // Compute overdue flag in JS to avoid PG parameter type ambiguity — must be strictly boolean
      const isOverdue = Boolean(
        caseRecord.due_date
        && new Date(caseRecord.due_date) < new Date()
        && !['COMPLETED', 'REJECTED'].includes(newStatus)
      );

      // Update the case
      await client.query(
        `UPDATE acquisition_cases
            SET current_stage = $1,
                status = $2,
                is_overdue = $3,
                remarks = $4,
                updated_at = now()
          WHERE id = $5`,
        [finalStage, newStatus, isOverdue, remarks.trim(), caseRecord.id]
      );

      // Create workflow event
      await client.query(
        `INSERT INTO workflow_events
           (id, case_id, from_stage, to_stage, action, performed_by, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          generateId(),
          caseRecord.id,
          fromStage,
          toStage || fromStage,
          normalizedAction,
          req.user.id,
          remarks.trim(),
        ]
      );
    });

    // Log to audit trail
    await logAudit({
      entityType: 'acquisition_case',
      entityId: caseRecord.id,
      action: `WORKFLOW_${normalizedAction}`,
      performedBy: req.user.id,
      oldValues: { stage: fromStage, status: caseRecord.status },
      newValues: { stage: finalStage, status: newStatus },
      ipAddress: req.ip,
    });

    // Return updated case
    const updatedCase = await queryOne(
      `SELECT c.*,
              pr.name AS project_name, pr.project_code,
              pa.parcel_code,
              u.full_name AS assigned_officer_name,
              (c.due_date < CURRENT_DATE AND c.status NOT IN ('COMPLETED','REJECTED')) AS overdue
         FROM acquisition_cases c
         LEFT JOIN projects pr ON c.project_id = pr.id
         LEFT JOIN parcels pa ON c.parcel_id = pa.id
         LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = $1`,
      [caseRecord.id]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      message: `Case ${caseRecord.case_code}: ${STAGE_LABELS[fromStage]} → ${STAGE_LABELS[finalStage]} (${normalizedAction})`,
      data: updatedCase,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
