const express = require('express');
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, parsePagination } = require('../../utils/helpers');
const { ROLES } = require('../../config/constants');

const router = express.Router();

/**
 * GET /api/field/metrics
 * Summary statistics for Field Officer dashboard
 */
router.get('/metrics', authenticate, async (req, res, next) => {
  try {
    const statsSql = `
      SELECT 
        COUNT(*) AS total_assigned,
        COUNT(*) FILTER (WHERE geometry_source = 'FIELD_GPS' OR acquisition_status IN ('NOTIFIED', 'ACQUIRED', 'POSSESSION_TAKEN')) AS total_verified,
        COUNT(*) FILTER (WHERE geometry_source != 'FIELD_GPS' AND acquisition_status = 'PROPOSED') AS pending_inspection,
        COUNT(*) FILTER (WHERE acquisition_status = 'RR_ISSUE' OR (SELECT COUNT(*) FROM ai_mismatches WHERE parcel_id = parcels.id AND status IN ('DETECTED', 'UNDER_REVIEW')) > 0) AS flagged_issues
      FROM parcels;
    `;
    const stats = await queryOne(statsSql);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        total_assigned: parseInt(stats.total_assigned, 10) || 0,
        total_verified: parseInt(stats.total_verified, 10) || 0,
        pending_inspection: parseInt(stats.pending_inspection, 10) || 0,
        flagged_issues: parseInt(stats.flagged_issues, 10) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/field/assigned-parcels
 * List parcels assigned for Joint Measurement Survey & field inspection
 */
router.get('/assigned-parcels', authenticate, async (req, res, next) => {
  try {
    const { status, search, village, project_id } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (village) {
      params.push(`%${village}%`);
      conditions.push(`p.village ILIKE $${params.length}`);
    }

    if (project_id) {
      params.push(project_id);
      conditions.push(`p.project_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.survey_number ILIKE $${params.length} OR p.parcel_code ILIKE $${params.length} OR p.owner_name ILIKE $${params.length} OR p.village ILIKE $${params.length})`);
    }

    if (status === 'PENDING') {
      conditions.push(`(p.geometry_source != 'FIELD_GPS' AND p.acquisition_status = 'PROPOSED')`);
    } else if (status === 'VERIFIED') {
      conditions.push(`(p.geometry_source = 'FIELD_GPS' OR p.acquisition_status != 'PROPOSED')`);
    } else if (status === 'FLAGGED') {
      conditions.push(`(p.acquisition_status = 'RR_ISSUE')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM parcels p ${whereClause}`;
    const countResult = await queryOne(countSql, params);
    const total = parseInt(countResult.count, 10);

    const sql = `
      SELECT 
        p.id, p.parcel_code, p.project_id, p.survey_number, p.village, p.taluk, p.district,
        p.area_acres, p.owner_name, p.owner_contact, p.acquisition_status,
        p.latitude, p.longitude, p.geometry_source, p.geometry_updated_at,
        pr.name AS project_name, pr.project_code,
        ac.id AS case_id, ac.case_code, ac.current_stage, ac.status AS case_status, ac.due_date,
        (SELECT COUNT(*) FROM documents WHERE parcel_id = p.id) AS document_count,
        (SELECT COUNT(*) FROM ai_mismatches WHERE parcel_id = p.id AND status IN ('DETECTED', 'UNDER_REVIEW')) AS mismatch_count
      FROM parcels p
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN acquisition_cases ac ON ac.parcel_id = p.id
      ${whereClause}
      ORDER BY 
        CASE WHEN p.geometry_source = 'FIELD_GPS' THEN 1 ELSE 0 END ASC,
        p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const parcels = await queryRows(sql, [...params, limit, offset]);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: parcels,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/field/parcels/:id/checklist
 * Fetch full parcel inspection checklist and case details
 */
router.get('/parcels/:id/checklist', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const parcelSql = `
      SELECT 
        p.*,
        pr.name AS project_name, pr.project_code, pr.implementing_agency,
        ac.id AS case_id, ac.case_code, ac.current_stage, ac.status AS case_status, ac.due_date
      FROM parcels p
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN acquisition_cases ac ON ac.parcel_id = p.id
      WHERE p.id = $1
    `;
    const parcel = await queryOne(parcelSql, [id]);

    if (!parcel) {
      return apiResponse(res, { status: 404, success: false, error: 'Parcel not found.' });
    }

    const documentsSql = `
      SELECT id, title, document_type, file_name, file_size, created_at
      FROM documents
      WHERE parcel_id = $1
      ORDER BY created_at DESC
    `;
    const documents = await queryRows(documentsSql, [id]);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        parcel,
        documents,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/field/parcels/:id/submit-report
 * Submit on-site field verification survey report with GPS coords, checklist, and audit trail
 */
router.post(
  '/parcels/:id/submit-report',
  authenticate,
  rbac([ROLES.FRO, ROLES.DLAO, ROLES.ADMIN]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        gps_coordinates,
        checklist = {},
        action = 'VERIFY_AND_APPROVE',
        remarks = '',
        issue_type = '',
      } = req.body;

      const parcel = await queryOne('SELECT * FROM parcels WHERE id = $1', [id]);
      if (!parcel) {
        return apiResponse(res, { status: 404, success: false, error: 'Parcel not found.' });
      }

      // ── AI Mismatch Blocking Gate (blocks VERIFY_AND_APPROVE only) ──
      if (action === 'VERIFY_AND_APPROVE') {
        const openMismatches = await queryRows(
          `SELECT id, field_name, official_value, extracted_value, severity, status
             FROM ai_mismatches
            WHERE parcel_id = $1
              AND status IN ('DETECTED', 'UNDER_REVIEW')
            ORDER BY severity DESC`,
          [id]
        );

        if (openMismatches.length > 0) {
          return apiResponse(res, {
            status: 409,
            success: false,
            error: `Field inspection approval BLOCKED: This parcel has ${openMismatches.length} unresolved AI document discrepancy(ies). DLAO must resolve all mismatches before field verification can be approved.`,
            data: {
              blocked_by: 'AI_MISMATCH_GATE',
              open_mismatches: openMismatches,
            },
          });
        }
      }

      const lat = gps_coordinates?.latitude ? parseFloat(gps_coordinates.latitude) : parcel.latitude || 26.8467;
      const lng = gps_coordinates?.longitude ? parseFloat(gps_coordinates.longitude) : parcel.longitude || 80.9462;

      let newStatus = parcel.acquisition_status;
      let updateSql = '';

      if (action === 'VERIFY_AND_APPROVE') {
        newStatus = parcel.acquisition_status === 'PROPOSED' ? 'NOTIFIED' : parcel.acquisition_status;

        updateSql = `
          UPDATE parcels
             SET latitude = $1,
                 longitude = $2,
                 geometry = COALESCE(nla_square_parcel($2, $1, area_acres), geometry),
                 geometry_source = 'FIELD_GPS',
                 geometry_updated_at = now(),
                 acquisition_status = $3,
                 updated_at = now()
           WHERE id = $4
          RETURNING *
        `;
      } else {
        // Flag Issue
        newStatus = 'RR_ISSUE';
        updateSql = `
          UPDATE parcels
             SET latitude = $1,
                 longitude = $2,
                 geometry_source = 'FIELD_GPS',
                 geometry_updated_at = now(),
                 acquisition_status = 'RR_ISSUE',
                 updated_at = now()
           WHERE id = $3
          RETURNING *
        `;
      }

      const updatedParcel = action === 'VERIFY_AND_APPROVE'
        ? await queryOne(updateSql, [lat, lng, newStatus, id])
        : await queryOne(updateSql, [lat, lng, id]);

      // Check linked acquisition case and advance workflow if in VERIFICATION stage
      const linkedCase = await queryOne(
        'SELECT * FROM acquisition_cases WHERE parcel_id = $1 LIMIT 1',
        [id]
      );

      let updatedCase = null;
      if (linkedCase) {
        if (action === 'VERIFY_AND_APPROVE' && linkedCase.current_stage === 'VERIFICATION') {
          // Advance case from VERIFICATION to APPROVAL
          const nextStage = 'APPROVAL';
          updatedCase = await queryOne(
            `UPDATE acquisition_cases
                SET current_stage = $1,
                    status = 'IN_PROGRESS',
                    remarks = $2,
                    updated_at = now()
              WHERE id = $3
             RETURNING *`,
            [nextStage, `Field Verification completed by Revenue Officer. ${remarks}`, linkedCase.id]
          );

          // Log workflow event
          await query(
            `INSERT INTO workflow_events (case_id, from_stage, to_stage, action, performed_by, remarks, created_at)
             VALUES ($1, 'VERIFICATION', 'APPROVAL', 'FORWARD', $2, $3, now())`,
            [linkedCase.id, req.user?.id, `JMS survey completed on-site. GPS coordinates confirmed.`]
          );
        }
      }

      if (action === 'FLAG_ISSUE') {
        // Create alert for DLAO and State Officer
        await query(
          `INSERT INTO alerts (type, title, message, project_id, case_id, parcel_id, priority, is_read, is_acknowledged, created_at)
           VALUES ('HIGH_RISK', 'Field Inspection Issue Flagged', $1, $2, $3, $4, 'HIGH', false, false, now())`,
          [
            `Field Officer flagged issue for parcel survey #${parcel.survey_number}: ${issue_type || remarks}`,
            parcel.project_id,
            linkedCase ? linkedCase.id : null,
            parcel.id,
          ]
        );
      }

      // Log to immutable audit_log
      await logAudit({
        entityType: 'PARCEL',
        entityId: id,
        action: action === 'VERIFY_AND_APPROVE' ? 'FIELD_INSPECTION_VERIFIED' : 'FIELD_INSPECTION_ISSUE_FLAGGED',
        performedBy: req.user?.id,
        oldValues: {
          acquisition_status: parcel.acquisition_status,
          geometry_source: parcel.geometry_source,
        },
        newValues: {
          acquisition_status: updatedParcel.acquisition_status,
          geometry_source: updatedParcel.geometry_source,
          latitude: lat,
          longitude: lng,
          checklist,
          action,
          remarks,
        },
        req,
      });

      return apiResponse(res, {
        status: 200,
        success: true,
        message: action === 'VERIFY_AND_APPROVE'
          ? 'Field verification survey successfully submitted and approved.'
          : 'Field issue flagged and recorded.',
        data: {
          parcel: updatedParcel,
          case: updatedCase || linkedCase,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
