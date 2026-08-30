const express = require('express');
const { queryOne } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse } = require('../../utils/helpers');
const { ROLES } = require('../../config/constants');

const router = express.Router();

/**
 * Helper to fetch aggregated dashboard KPIs using a safe CTE query
 * @param {string|null} state 
 * @param {string|null} district 
 * @param {string|null} projectId 
 */
const getDashboardStats = async (state = null, district = null, projectId = null) => {
  const sql = `
    WITH p_scope AS (
      SELECT id FROM projects
      WHERE ($1::text IS NULL OR state = $1)
        AND ($2::text IS NULL OR district = $2)
        AND ($3::uuid IS NULL OR id = $3)
    )
    SELECT 
      (SELECT COUNT(*) FROM projects WHERE id IN (SELECT id FROM p_scope)) AS total_projects,
      (SELECT COALESCE(SUM(total_area_required), 0) FROM projects WHERE id IN (SELECT id FROM p_scope)) AS land_proposed,
      (SELECT COALESCE(SUM(area_acres), 0) FROM parcels WHERE acquisition_status IN ('ACQUIRED', 'POSSESSION_TAKEN') AND project_id IN (SELECT id FROM p_scope)) AS land_acquired,
      (SELECT COALESCE(SUM(assessed_amount), 0) FROM compensation WHERE parcel_id IN (SELECT id FROM parcels WHERE project_id IN (SELECT id FROM p_scope))) AS compensation_assessed,
      (SELECT COALESCE(SUM(paid_amount), 0) FROM compensation WHERE parcel_id IN (SELECT id FROM parcels WHERE project_id IN (SELECT id FROM p_scope))) AS compensation_paid,
      (SELECT COUNT(*) FROM families WHERE project_id IN (SELECT id FROM p_scope)) AS affected_families,
      (SELECT COUNT(*) FROM families WHERE category = 'DISPLACED' AND project_id IN (SELECT id FROM p_scope)) AS displaced_families,
      (SELECT COUNT(*) FROM rr_activities WHERE family_id IN (SELECT id FROM families WHERE project_id IN (SELECT id FROM p_scope))) AS rr_total,
      (SELECT COUNT(*) FROM rr_activities WHERE status = 'COMPLETED' AND family_id IN (SELECT id FROM families WHERE project_id IN (SELECT id FROM p_scope))) AS rr_completed,
      (SELECT COUNT(*) FROM acquisition_cases WHERE status IN ('PENDING', 'IN_PROGRESS') AND project_id IN (SELECT id FROM p_scope)) AS pending_cases,
      (SELECT COUNT(*) FROM acquisition_cases WHERE is_overdue = true AND project_id IN (SELECT id FROM p_scope)) AS overdue_cases,
      (SELECT COUNT(*) FROM risk_scores WHERE risk_level IN ('HIGH', 'CRITICAL') AND project_id IN (SELECT id FROM p_scope)) AS high_risk_projects,
      (SELECT COUNT(*) FROM parcels WHERE project_id IN (SELECT id FROM p_scope)) AS total_parcels,
      (SELECT COUNT(*) FROM documents WHERE project_id IN (SELECT id FROM p_scope)) AS total_documents,
      (SELECT COUNT(*) FROM ai_mismatches WHERE status IN ('DETECTED', 'UNDER_REVIEW') AND parcel_id IN (SELECT id FROM parcels WHERE project_id IN (SELECT id FROM p_scope))) AS open_mismatches
  `;
  
  const stats = await queryOne(sql, [state, district, projectId]);
  return stats;
};

/**
 * GET /api/dashboard/national
 * National KPIs (Requires SGA or ADMIN, but we can allow others to view limited scope, or just rely on the controller)
 */
router.get('/national', authenticate, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(null, null, null);
    return apiResponse(res, { status: 200, success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/state/:state
 * State-level KPIs
 */
router.get('/state/:state', authenticate, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.params.state, null, null);
    return apiResponse(res, { status: 200, success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/district/:district
 * District-level KPIs
 */
router.get('/district/:district', authenticate, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(null, req.params.district, null);
    return apiResponse(res, { status: 200, success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/project/:projectId
 * Project-level KPIs
 */
router.get('/project/:projectId', authenticate, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(null, null, req.params.projectId);
    return apiResponse(res, { status: 200, success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
