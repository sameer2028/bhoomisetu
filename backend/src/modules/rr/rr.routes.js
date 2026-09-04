const express = require('express');
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, generateCode, parsePagination } = require('../../utils/helpers');

const router = express.Router();

// ─── GET /api/rr/stats ──────────────────────────────────────────────
/**
 * R&R Summary statistics & project progress breakdown
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const familyCounts = await queryOne(`
      SELECT
        COUNT(*) AS total_families,
        COUNT(*) FILTER (WHERE category = 'AFFECTED') AS affected_families,
        COUNT(*) FILTER (WHERE category = 'DISPLACED') AS displaced_families,
        COALESCE(SUM(members_count), 0) AS total_affected_persons
      FROM families
    `);

    const activityCounts = await queryOne(`
      SELECT
        COUNT(*) AS total_activities,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_activities,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_activities,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_activities,
        COUNT(*) FILTER (WHERE status = 'DELAYED') AS delayed_activities
      FROM rr_activities
    `);

    const projectProgress = await queryRows(`
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.project_code,
        COUNT(DISTINCT f.id) AS families_count,
        COUNT(ra.id) AS total_activities,
        COUNT(ra.id) FILTER (WHERE ra.status = 'COMPLETED') AS completed_activities,
        CASE
          WHEN COUNT(ra.id) > 0 THEN
            ROUND((COUNT(ra.id) FILTER (WHERE ra.status = 'COMPLETED')::numeric / COUNT(ra.id)::numeric) * 100, 1)
          ELSE 0
        END AS progress_percentage
      FROM projects p
      LEFT JOIN families f ON f.project_id = p.id
      LEFT JOIN rr_activities ra ON ra.family_id = f.id
      GROUP BY p.id, p.name, p.project_code
      HAVING COUNT(DISTINCT f.id) > 0
      ORDER BY families_count DESC
    `);

    const totalAct = parseInt(activityCounts.total_activities, 10) || 0;
    const compAct = parseInt(activityCounts.completed_activities, 10) || 0;
    const overallProgress = totalAct > 0 ? Math.round((compAct / totalAct) * 100) : 0;

    apiResponse(res, {
      status: 200,
      success: true,
      data: {
        families: {
          total: parseInt(familyCounts.total_families, 10) || 0,
          affected: parseInt(familyCounts.affected_families, 10) || 0,
          displaced: parseInt(familyCounts.displaced_families, 10) || 0,
          totalPersons: parseInt(familyCounts.total_affected_persons, 10) || 0,
        },
        activities: {
          total: totalAct,
          completed: compAct,
          inProgress: parseInt(activityCounts.in_progress_activities, 10) || 0,
          pending: parseInt(activityCounts.pending_activities, 10) || 0,
          delayed: parseInt(activityCounts.delayed_activities, 10) || 0,
          overallProgressPercentage: overallProgress,
        },
        projectProgress,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rr/families ───────────────────────────────────────────
/**
 * List R&R families with filters & pagination
 */
router.get('/families', authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { project_id, parcel_id, category, search, delayed_only, overdue_only } = req.query;
    const isDelayedOnly = delayed_only === 'true' || overdue_only === 'true';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (project_id) {
      conditions.push(`f.project_id = $${paramIdx++}`);
      params.push(project_id);
    }

    if (parcel_id) {
      conditions.push(`f.parcel_id = $${paramIdx++}`);
      params.push(parcel_id);
    }

    if (category) {
      conditions.push(`f.category = $${paramIdx++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(f.head_of_family ILIKE $${paramIdx} OR f.family_code ILIKE $${paramIdx} OR f.contact ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }


    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const havingClause = isDelayedOnly
      ? `HAVING COUNT(ra.id) FILTER (WHERE ra.status = 'DELAYED' OR (ra.status != 'COMPLETED' AND ra.due_date IS NOT NULL AND ra.due_date < CURRENT_DATE)) > 0`
      : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total 
       FROM families f 
       LEFT JOIN projects p ON f.project_id = p.id 
       ${whereClause}`,
      params
    );
    const total = parseInt(countRow.total, 10) || 0;

    const querySql = `
      SELECT
        f.*,
        p.name AS project_name,
        p.project_code,
        pc.parcel_code,
        pc.survey_number,
        pc.village,
        COUNT(ra.id) AS total_activities,
        COUNT(ra.id) FILTER (WHERE ra.status = 'COMPLETED') AS completed_activities,
        COUNT(ra.id) FILTER (WHERE ra.status = 'DELAYED' OR (ra.status != 'COMPLETED' AND ra.due_date IS NOT NULL AND ra.due_date < CURRENT_DATE)) AS delayed_activities
      FROM families f
      LEFT JOIN projects p ON p.id = f.project_id
      LEFT JOIN parcels pc ON pc.id = f.parcel_id
      LEFT JOIN rr_activities ra ON ra.family_id = f.id
      ${whereClause}
      GROUP BY f.id, p.name, p.project_code, pc.parcel_code, pc.survey_number, pc.village
      ${havingClause}
      ORDER BY f.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(limit, offset);
    const rows = await queryRows(querySql, params);

    apiResponse(res, {
      status: 200,
      success: true,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rr/families ──────────────────────────────────────────
/**
 * Register a new affected or displaced family
 */
router.post('/families', authenticate, rbac('DLAO', 'PIA', 'SGA', 'ADMIN'), async (req, res, next) => {
  try {
    const { project_id, parcel_id, head_of_family, members_count, category, entitlement, contact } = req.body;

    if (!project_id || !head_of_family || !category) {
      return apiResponse(res, { status: 400, success: false, error: 'project_id, head_of_family, and category are required.' });
    }

    const familyId = generateId();
    const familyCode = await generateCode('FAM', 'families', 'family_code');

    const newFamily = await queryOne(
      `INSERT INTO families
         (id, family_code, project_id, parcel_id, head_of_family, members_count, category, entitlement, contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [familyId, familyCode, project_id, parcel_id || null, head_of_family, parseInt(members_count, 10) || 1, category, entitlement || null, contact || null]
    );

    await logAudit({
      entityType: 'families',
      entityId: familyId,
      action: 'CREATE_FAMILY',
      performedBy: req.user.id,
      newValues: newFamily,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 201, success: true, data: newFamily, message: 'Family record registered successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rr/families/:id ───────────────────────────────────────
/**
 * Get detailed family profile and all associated R&R activities
 */
router.get('/families/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const family = await queryOne(
      `SELECT
         f.*,
         p.name AS project_name,
         p.project_code,
         p.district AS project_district,
         pc.parcel_code,
         pc.survey_number,
         pc.village,
         pc.area_acres,
         pc.acquisition_status,
         pc.geometry_source,
         (pc.geometry IS NOT NULL) AS has_geometry,
         ac.id AS case_id,
         ac.case_code,
         ac.current_stage AS acquisition_stage
       FROM families f
       LEFT JOIN projects p ON p.id = f.project_id
       LEFT JOIN parcels pc ON pc.id = f.parcel_id
       LEFT JOIN LATERAL (
         SELECT id, case_code, current_stage
         FROM acquisition_cases
         WHERE parcel_id = f.parcel_id OR (parcel_id IS NULL AND project_id = f.project_id)
         ORDER BY created_at DESC
         LIMIT 1
       ) ac ON true
       WHERE f.id = $1`,
      [id]
    );

    if (!family) {
      return apiResponse(res, { status: 404, success: false, error: 'Family record not found.' });
    }

    const activities = await queryRows(
      `SELECT
         ra.*,
         u.full_name AS authority_name,
         u.role AS authority_role,
         d.title AS evidence_document_title,
         d.file_name AS evidence_file_name,
         du.full_name AS doc_uploader_name,
         du.role AS doc_uploader_role
       FROM rr_activities ra
       LEFT JOIN users u ON u.id = ra.responsible_authority
       LEFT JOIN documents d ON d.id = ra.evidence_document_id
       LEFT JOIN users du ON du.id = d.uploaded_by
       WHERE ra.family_id = $1
       ORDER BY ra.due_date ASC NULLS LAST, ra.created_at ASC`,
      [id]
    );

    apiResponse(res, {
      status: 200,
      success: true,
      data: {
        ...family,
        activities,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/rr/families/:id ───────────────────────────────────────
/**
 * Update family record
 */
router.put('/families/:id', authenticate, rbac('DLAO', 'PIA', 'SGA', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { head_of_family, members_count, category, entitlement, contact, parcel_id } = req.body;

    const existing = await queryOne('SELECT * FROM families WHERE id = $1', [id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'Family record not found.' });
    }

    const cleanParcelId = parcel_id && String(parcel_id).trim() !== '' ? parcel_id : null;

    const updated = await queryOne(
      `UPDATE families
       SET head_of_family = COALESCE($1, head_of_family),
           members_count  = COALESCE($2, members_count),
           category        = COALESCE($3, category),
           entitlement     = COALESCE($4, entitlement),
           contact         = COALESCE($5, contact),
           parcel_id       = COALESCE($6, parcel_id),
           updated_at      = now()
       WHERE id = $7
       RETURNING *`,
      [head_of_family || null, members_count ? parseInt(members_count, 10) : null, category || null, entitlement || null, contact || null, cleanParcelId, id]
    );

    await logAudit({
      entityType: 'families',
      entityId: id,
      action: 'UPDATE_FAMILY',
      performedBy: req.user.id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 200, success: true, data: updated, message: 'Family details updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/rr/families/:id ────────────────────────────────────
/**
 * Delete family record
 */
router.delete('/families/:id', authenticate, rbac('DLAO', 'SGA', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await queryOne('SELECT * FROM families WHERE id = $1', [id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'Family record not found.' });
    }

    await query('DELETE FROM families WHERE id = $1', [id]);
    await logAudit({
      entityType: 'families',
      entityId: id,
      action: 'DELETE_FAMILY',
      performedBy: req.user.id,
      oldValues: existing,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 200, success: true, data: null, message: 'Family record deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/rr/activities ─────────────────────────────────────────
/**
 * List R&R activities with filtering & search
 */
router.get('/activities', authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { family_id, project_id, status, search } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (family_id) {
      conditions.push(`ra.family_id = $${paramIdx++}`);
      params.push(family_id);
    }

    if (project_id) {
      conditions.push(`f.project_id = $${paramIdx++}`);
      params.push(project_id);
    }

    if (status) {
      conditions.push(`ra.status = $${paramIdx++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(ra.activity_type ILIKE $${paramIdx} OR ra.description ILIKE $${paramIdx} OR f.head_of_family ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Role-based jurisdiction filtering
    if ((req.user.role === 'DLAO' || req.user.role === 'FRO') && req.user.district) {
      conditions.push(`p.district = $${paramIdx++}`);
      params.push(req.user.district);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total 
       FROM rr_activities ra 
       LEFT JOIN families f ON f.id = ra.family_id 
       LEFT JOIN projects p ON p.id = f.project_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRow.total, 10) || 0;

    const querySql = `
      SELECT
        ra.*,
        f.family_code,
        f.head_of_family,
        f.category AS family_category,
        p.name AS project_name,
        p.project_code,
        u.full_name AS authority_name,
        u.role AS authority_role,
        d.title AS evidence_document_title
      FROM rr_activities ra
      JOIN families f ON f.id = ra.family_id
      LEFT JOIN projects p ON p.id = f.project_id
      LEFT JOIN users u ON u.id = ra.responsible_authority
      LEFT JOIN documents d ON d.id = ra.evidence_document_id
      ${whereClause}
      ORDER BY ra.due_date ASC NULLS LAST, ra.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(limit, offset);
    const rows = await queryRows(querySql, params);

    apiResponse(res, {
      status: 200,
      success: true,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/rr/activities ────────────────────────────────────────
/**
 * Create a new R&R activity for a family
 */
router.post('/activities', authenticate, rbac('DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'), async (req, res, next) => {
  try {
    const { family_id, activity_type, description, responsible_authority, due_date, status, pending_reason, evidence_document_id } = req.body;

    if (!family_id || !activity_type) {
      return apiResponse(res, { status: 400, success: false, error: 'family_id and activity_type are required.' });
    }

    const actId = generateId();
    const isCompleted = status === 'COMPLETED';
    const completionDate = isCompleted ? (req.body.completion_date || new Date().toISOString().split('T')[0]) : null;

    const newActivity = await queryOne(
      `INSERT INTO rr_activities
         (id, family_id, activity_type, description, responsible_authority, due_date, completion_date, status, pending_reason, evidence_document_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        actId,
        family_id,
        activity_type,
        description || null,
        responsible_authority || null,
        due_date || null,
        completionDate,
        status || 'PENDING',
        pending_reason || null,
        evidence_document_id || null,
      ]
    );

    await logAudit({
      entityType: 'rr_activities',
      entityId: actId,
      action: 'CREATE_RR_ACTIVITY',
      performedBy: req.user.id,
      newValues: newActivity,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 201, success: true, data: newActivity, message: 'R&R Activity added successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/rr/activities/:id ─────────────────────────────────────
/**
 * Update R&R activity status, completion date, or evidence document
 */
router.put('/activities/:id', authenticate, rbac('DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activity_type, description, responsible_authority, due_date, completion_date, status, pending_reason, evidence_document_id } = req.body;

    const existing = await queryOne('SELECT * FROM rr_activities WHERE id = $1', [id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'R&R Activity not found.' });
    }

    const cleanAuthority = responsible_authority && String(responsible_authority).trim() !== '' ? responsible_authority : null;
    const cleanDocId = evidence_document_id && String(evidence_document_id).trim() !== '' ? evidence_document_id : null;
    const cleanDueDate = due_date && String(due_date).trim() !== '' ? due_date : null;
    const cleanReason = pending_reason && String(pending_reason).trim() !== '' ? pending_reason : null;

    let finalCompletionDate = completion_date && String(completion_date).trim() !== '' ? completion_date : null;
    if (status === 'COMPLETED' && !finalCompletionDate) {
      finalCompletionDate = existing.completion_date || new Date().toISOString().split('T')[0];
    } else if (status && status !== 'COMPLETED' && !completion_date) {
      finalCompletionDate = null;
    }

    const updated = await queryOne(
      `UPDATE rr_activities
       SET activity_type         = COALESCE($1, activity_type),
           description           = COALESCE($2, description),
           responsible_authority = COALESCE($3, responsible_authority),
           due_date              = COALESCE($4, due_date),
           completion_date       = $5,
           status                = COALESCE($6, status),
           pending_reason        = $7,
           evidence_document_id  = COALESCE($8, evidence_document_id),
           updated_at            = now()
       WHERE id = $9
       RETURNING *`,
      [
        activity_type || null,
        description || null,
        cleanAuthority,
        cleanDueDate,
        finalCompletionDate,
        status || null,
        cleanReason || (status === 'DELAYED' ? existing.pending_reason : null),
        cleanDocId,
        id,
      ]
    );

    await logAudit({
      entityType: 'rr_activities',
      entityId: id,
      action: 'UPDATE_RR_ACTIVITY',
      performedBy: req.user.id,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 200, success: true, data: updated, message: 'R&R Activity updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/rr/activities/:id ──────────────────────────────────
/**
 * Delete R&R activity
 */
router.delete('/activities/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await queryOne(`
      SELECT ra.*, 
             COALESCE(u.role, du.role) as uploader_role
      FROM rr_activities ra
      LEFT JOIN users u ON u.id = ra.responsible_authority
      LEFT JOIN documents d ON d.id = ra.evidence_document_id
      LEFT JOIN users du ON du.id = d.uploaded_by
      WHERE ra.id = $1
    `, [id]);
    
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'R&R Activity not found.' });
    }

    // If uploader_role is known and doesn't match the user (and not ADMIN), deny.
    // If it is null (seeded dummy data), allow it.
    if (existing.uploader_role && existing.uploader_role !== req.user.role && req.user.role !== 'ADMIN') {
      return apiResponse(res, { status: 403, success: false, error: 'Access Denied: Only the role that uploaded this proof can delete it.' });
    }

    await query('DELETE FROM rr_activities WHERE id = $1', [id]);
    await logAudit({
      entityType: 'rr_activities',
      entityId: id,
      action: 'DELETE_RR_ACTIVITY',
      performedBy: req.user.id,
      oldValues: existing,
      ipAddress: req.ip,
    });

    apiResponse(res, { status: 200, success: true, data: null, message: 'R&R Activity deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
