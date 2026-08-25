const express = require('express');
const { getDb } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, generateCode, parsePagination } = require('../../utils/helpers');
const { ROLES, PROJECT_STATUS } = require('../../config/constants');

const router = express.Router();

/**
 * GET /api/projects
 * List all projects with filtering and search
 */
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, state, district, search } = req.query;
    const { limit, offset, page } = parsePagination(req.query);
    const db = getDb();

    let query = `
      SELECT p.*, u.full_name as creator_name,
        ROUND((p.total_area_acquired / NULLIF(p.total_area_required, 0)) * 100, 2) as acquisition_progress_pct
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    // Filter by geography
    if (state) {
      query += ' AND p.state = ?';
      params.push(state);
    }
    if (district) {
      query += ' AND p.district = ?';
      params.push(district);
    }

    // Search term matching name, code, agency
    if (search) {
      query += ' AND (p.name LIKE ? OR p.project_code LIKE ? OR p.implementing_agency LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Count total query
    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).count;

    // Append order and pagination
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const projects = db.prepare(query).all(...params);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: projects,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
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
router.post('/', authenticate, rbac(ROLES.PIA, ROLES.ADMIN), (req, res, next) => {
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

    const db = getDb();
    const id = generateId();
    const project_code = generateCode('PRJ', 'projects', 'project_code');

    const areaRequired = parseFloat(total_area_required);

    db.prepare(`
      INSERT INTO projects (
        id, project_code, name, description, project_type, implementing_agency,
        state, district, taluk, total_area_required, total_area_acquired,
        status, start_date, expected_end_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
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
      req.user.id
    );

    const createdProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    logAudit({
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
 * Get single project details by ID
 */
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const db = getDb();
    const project = db.prepare(`
      SELECT p.*, u.full_name as creator_name, u.email as creator_email,
        ROUND((p.total_area_acquired / NULLIF(p.total_area_required, 0)) * 100, 2) as acquisition_progress_pct,
        (SELECT COUNT(*) FROM parcels WHERE project_id = p.id) as total_parcels,
        (SELECT COUNT(*) FROM acquisition_cases WHERE project_id = p.id) as total_cases,
        (SELECT COUNT(*) FROM families WHERE project_id = p.id) as total_families
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ? OR p.project_code = ?
    `).get(req.params.id, req.params.id);

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
router.put('/:id', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.SGA, ROLES.ADMIN), (req, res, next) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

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
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    const updatedType = project_type !== undefined ? project_type.trim() : existing.project_type;
    const updatedAgency = implementing_agency !== undefined ? implementing_agency.trim() : existing.implementing_agency;
    const updatedState = state !== undefined ? state.trim() : existing.state;
    const updatedDistrict = district !== undefined ? district.trim() : existing.district;
    const updatedTaluk = taluk !== undefined ? taluk.trim() : existing.taluk;
    const updatedReqArea = total_area_required !== undefined ? parseFloat(total_area_required) : existing.total_area_required;
    const updatedAcqArea = total_area_acquired !== undefined ? parseFloat(total_area_acquired) : existing.total_area_acquired;
    const updatedStatus = status !== undefined ? status.toUpperCase() : existing.status;
    const updatedStart = start_date !== undefined ? start_date : existing.start_date;
    const updatedEnd = expected_end_date !== undefined ? expected_end_date : existing.expected_end_date;

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, project_type = ?, implementing_agency = ?,
          state = ?, district = ?, taluk = ?, total_area_required = ?,
          total_area_acquired = ?, status = ?, start_date = ?, expected_end_date = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updatedName, updatedDesc, updatedType, updatedAgency,
      updatedState, updatedDistrict, updatedTaluk, updatedReqArea,
      updatedAcqArea, updatedStatus, updatedStart, updatedEnd,
      req.params.id
    );

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    logAudit({
      entityType: 'project',
      entityId: req.params.id,
      action: 'UPDATE_PROJECT',
      performedBy: req.user.id,
      oldValues: existing,
      newValues: updatedProject,
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
