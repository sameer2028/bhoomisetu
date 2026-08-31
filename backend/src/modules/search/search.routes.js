const express = require('express');
const router = express.Router();
const { queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { apiResponse } = require('../../utils/helpers');

// ─── GET /api/search ──────────────────────────────────────────────
/**
 * Unified global search across projects, parcels, workflow cases, & R&R families
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return apiResponse(res, {
        status: 200,
        success: true,
        data: { projects: [], parcels: [], cases: [], families: [] },
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const projects = await queryRows(
      `SELECT id, name, project_code, status, state, district
       FROM projects
       WHERE name ILIKE $1 OR project_code ILIKE $1 OR district ILIKE $1
       ORDER BY created_at DESC LIMIT 5`,
      [searchTerm]
    );

    const parcels = await queryRows(
      `SELECT pc.id, pc.parcel_code, pc.survey_number, pc.village, pc.area_acres, p.name AS project_name, pc.created_at
       FROM parcels pc
       LEFT JOIN projects p ON p.id = pc.project_id
       WHERE pc.survey_number ILIKE $1 OR pc.parcel_code ILIKE $1 OR pc.village ILIKE $1
       ORDER BY pc.created_at DESC LIMIT 5`,
      [searchTerm]
    );

    const cases = await queryRows(
      `SELECT c.id, c.case_code, c.current_stage AS stage, c.status, p.name AS project_name, 
              pc.parcel_code, pc.survey_number, pc.village, c.created_at
       FROM acquisition_cases c
       LEFT JOIN projects p ON p.id = c.project_id
       LEFT JOIN parcels pc ON pc.id = c.parcel_id
       WHERE c.case_code ILIKE $1 OR c.current_stage ILIKE $1 OR c.status ILIKE $1
       ORDER BY c.updated_at DESC LIMIT 5`,
      [searchTerm]
    );

    const families = await queryRows(
      `SELECT f.id, f.family_code, f.head_of_family, f.category, f.members_count, p.name AS project_name,
              pc.parcel_code, pc.survey_number, pc.village, f.created_at
       FROM families f
       LEFT JOIN projects p ON p.id = f.project_id
       LEFT JOIN parcels pc ON pc.id = f.parcel_id
       WHERE f.head_of_family ILIKE $1 OR f.family_code ILIKE $1 OR f.contact ILIKE $1
       ORDER BY f.created_at DESC LIMIT 5`,
      [searchTerm]
    );

    apiResponse(res, {
      status: 200,
      success: true,
      data: {
        projects,
        parcels,
        cases,
        families,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
