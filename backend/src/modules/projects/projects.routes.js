const express = require('express');
const { queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, generateCode, parsePagination } = require('../../utils/helpers');
const { ROLES, PROJECT_STATUS } = require('../../config/constants');

const router = express.Router();

/**
 * GET /api/projects
 * List all projects with filtering and search
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, state, district, search } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (state) {
      params.push(state);
      conditions.push(`p.state = $${params.length}`);
    }
    if (district) {
      params.push(district);
      conditions.push(`p.district = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      const i = params.length;
      conditions.push(`(p.name ILIKE $${i} OR p.project_code ILIKE $${i} OR p.implementing_agency ILIKE $${i})`);
    }

    // Role-based jurisdiction filtering
    if ((req.user.role === ROLES.DLAO || req.user.role === ROLES.FRO) && req.user.district) {
      params.push(req.user.district);
      conditions.push(`p.district = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(
      `SELECT COUNT(*) AS count FROM projects p ${where}`,
      params
    );

    const listParams = [...params, limit, offset];
    const projects = await queryRows(
      `SELECT p.id, p.project_code, p.name, p.description, p.project_type, p.implementing_agency,
              p.state, p.district, p.taluk, p.total_area_required, p.total_area_acquired,
              p.status, p.start_date, p.expected_end_date, p.created_by,
              p.corridor_width_m, p.created_at, p.updated_at,
              u.full_name AS creator_name,
              ROUND((p.total_area_acquired / NULLIF(p.total_area_required, 0)) * 100, 2) AS acquisition_progress_pct,
              (p.corridor IS NOT NULL) AS has_corridor,
              r.score AS risk_score, r.risk_level, r.factors AS risk_factors
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         LEFT JOIN LATERAL (
           SELECT score, risk_level, factors
           FROM risk_scores
           WHERE project_id = p.id
           ORDER BY calculated_at DESC
           LIMIT 1
         ) r ON true
         ${where}
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: projects,
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
 * POST /api/projects
 * Create a new land acquisition project (Restricted to PIA, ADMIN)
 */
router.post('/', authenticate, rbac(ROLES.PIA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const {
      name,
      description,
      project_type,
      implementing_agency,
      state,
      district,
      taluk,
      total_area_required,
      start_date,
      expected_end_date,
    } = req.body;

    if (!name || !total_area_required) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Project name and total area required are required fields.',
      });
    }

    const id = generateId();
    const project_code = await generateCode('PRJ', 'projects', 'project_code');
    const areaRequired = parseFloat(total_area_required);

    const createdProject = await queryOne(
      `INSERT INTO projects (
         id, project_code, name, description, project_type, implementing_agency,
         state, district, taluk, total_area_required, total_area_acquired,
         status, start_date, expected_end_date, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13,$14)
       RETURNING *`,
      [
        id,
        project_code,
        name.trim(),
        description ? description.trim() : null,
        project_type ? project_type.trim() : 'Infrastructure',
        implementing_agency ? implementing_agency.trim() : req.user.full_name,
        state ? state.trim() : req.user.state || 'Uttar Pradesh',
        district ? district.trim() : req.user.district || 'Lucknow',
        taluk ? taluk.trim() : null,
        areaRequired,
        PROJECT_STATUS.PROPOSED,
        start_date || null,
        expected_end_date || null,
        req.user.id,
      ]
    );

    await logAudit({
      entityType: 'project',
      entityId: id,
      action: 'CREATE_PROJECT',
      performedBy: req.user.id,
      newValues: createdProject,
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      message: 'Project created successfully',
      data: createdProject,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id
 * Get single project details by ID or project code
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await queryOne(
      `SELECT p.id, p.project_code, p.name, p.description, p.project_type, p.implementing_agency,
              p.state, p.district, p.taluk, p.total_area_required, p.total_area_acquired,
              p.status, p.start_date, p.expected_end_date, p.created_by,
              p.corridor_width_m, p.geometry_source, p.created_at, p.updated_at,
              u.full_name AS creator_name, u.email AS creator_email,
              ROUND((p.total_area_acquired / NULLIF(p.total_area_required, 0)) * 100, 2) AS acquisition_progress_pct,
              (SELECT COUNT(*) FROM parcels WHERE project_id = p.id) AS total_parcels,
              (SELECT COUNT(*) FROM acquisition_cases WHERE project_id = p.id) AS total_cases,
              (SELECT COUNT(*) FROM families WHERE project_id = p.id) AS total_families,
              (p.corridor IS NOT NULL) AS has_corridor,
              ROUND((ST_Length(p.centerline::geography) / 1000.0)::numeric, 2) AS corridor_length_km,
              r.score AS risk_score, r.risk_level, r.factors AS risk_factors
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         LEFT JOIN LATERAL (
           SELECT score, risk_level, factors
           FROM risk_scores
           WHERE project_id = p.id
           ORDER BY calculated_at DESC
           LIMIT 1
         ) r ON true
        WHERE p.id::text = $1 OR p.project_code = $1`,
      [req.params.id]
    );

    if (!project) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Project not found',
      });
    }

    return apiResponse(res, {
      status: 200,
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:id
 * Update project details or status
 */
router.put('/:id', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.SGA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM projects WHERE id::text = $1', [req.params.id]);

    if (!existing) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Project not found',
      });
    }

    const {
      name,
      description,
      project_type,
      implementing_agency,
      state,
      district,
      taluk,
      total_area_required,
      total_area_acquired,
      status,
      start_date,
      expected_end_date,
    } = req.body;

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;
    const updatedType = project_type !== undefined ? project_type.trim() : existing.project_type;
    const updatedAgency = implementing_agency !== undefined ? implementing_agency.trim() : existing.implementing_agency;
    const updatedState = state !== undefined ? state.trim() : existing.state;
    const updatedDistrict = district !== undefined ? district.trim() : existing.district;
    const updatedTaluk = taluk !== undefined ? (taluk ? taluk.trim() : null) : existing.taluk;
    const updatedReqArea = total_area_required !== undefined ? parseFloat(total_area_required) : existing.total_area_required;
    const updatedAcqArea = total_area_acquired !== undefined ? parseFloat(total_area_acquired) : existing.total_area_acquired;
    const updatedStatus = status !== undefined ? status.toUpperCase() : existing.status;
    const updatedStart = start_date !== undefined ? (start_date || null) : existing.start_date;
    const updatedEnd = expected_end_date !== undefined ? (expected_end_date || null) : existing.expected_end_date;

    const updatedProject = await queryOne(
      `UPDATE projects
          SET name = $1, description = $2, project_type = $3, implementing_agency = $4,
              state = $5, district = $6, taluk = $7, total_area_required = $8,
              total_area_acquired = $9, status = $10, start_date = $11, expected_end_date = $12
        WHERE id = $13
      RETURNING id, project_code, name, description, project_type, implementing_agency,
                state, district, taluk, total_area_required, total_area_acquired,
                status, start_date, expected_end_date, created_by, corridor_width_m,
                created_at, updated_at`,
      [
        updatedName, updatedDesc, updatedType, updatedAgency,
        updatedState, updatedDistrict, updatedTaluk, updatedReqArea,
        updatedAcqArea, updatedStatus, updatedStart, updatedEnd,
        existing.id,
      ]
    );

    await logAudit({
      entityType: 'project',
      entityId: existing.id,
      action: 'UPDATE_PROJECT',
      performedBy: req.user.id,
      oldValues: { name: existing.name, status: existing.status, total_area_acquired: existing.total_area_acquired },
      newValues: { name: updatedName, status: updatedStatus, total_area_acquired: updatedAcqArea },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      message: 'Project updated successfully',
      data: updatedProject,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
