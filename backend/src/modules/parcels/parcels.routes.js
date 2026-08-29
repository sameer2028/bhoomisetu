const express = require('express');
const { queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, parsePagination } = require('../../utils/helpers');
const { ROLES, ACQUISITION_STATUS } = require('../../config/constants');

const router = express.Router();

/**
 * Non-spatial parcel columns. Raw geometry is never sent through this module —
 * GeoJSON is served by the GIS module (/api/gis) instead.
 */
const PARCEL_COLUMNS = `
  p.id, p.parcel_code, p.project_id, p.survey_number, p.village, p.taluk,
  p.district, p.state, p.area_acres, p.owner_name, p.owner_contact,
  p.acquisition_status, p.latitude, p.longitude, p.geometry_source,
  p.geometry_updated_at, p.created_at, p.updated_at,
  (p.geometry IS NOT NULL) AS has_geometry,
  (SELECT COUNT(*) FROM ai_mismatches WHERE parcel_id = p.id AND status IN ('DETECTED', 'UNDER_REVIEW')) AS open_mismatches_count
`;

/**
 * Generate sequential parcel code like P-106
 */
async function generateParcelCode() {
  const row = await queryOne(
    `SELECT parcel_code FROM parcels
      WHERE parcel_code ~ '^P-[0-9]+$'
      ORDER BY CAST(SUBSTRING(parcel_code FROM 3) AS INTEGER) DESC
      LIMIT 1`
  );

  let nextNum = 101;
  if (row && row.parcel_code) {
    const numPart = parseInt(row.parcel_code.replace('P-', ''), 10);
    if (!Number.isNaN(numPart)) nextNum = numPart + 1;
  }
  return `P-${nextNum}`;
}

/**
 * GET /api/parcels
 * List parcels with filtering, searching, and pagination
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { project_id, acquisition_status, village, district, search } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (project_id) {
      params.push(project_id);
      conditions.push(`p.project_id::text = $${params.length}`);
    }
    if (acquisition_status) {
      params.push(acquisition_status);
      conditions.push(`p.acquisition_status = $${params.length}`);
    }
    if (village) {
      params.push(`%${village.trim()}%`);
      conditions.push(`p.village ILIKE $${params.length}`);
    }
    if (district) {
      params.push(district);
      conditions.push(`p.district = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      const i = params.length;
      conditions.push(
        `(p.survey_number ILIKE $${i} OR p.owner_name ILIKE $${i} OR p.parcel_code ILIKE $${i} OR p.village ILIKE $${i})`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(`SELECT COUNT(*) AS count FROM parcels p ${where}`, params);

    const parcels = await queryRows(
      `SELECT ${PARCEL_COLUMNS},
              pr.name AS project_name, pr.project_code, pr.implementing_agency
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
         ${where}
         ORDER BY p.parcel_code ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: parcels,
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
 * POST /api/parcels
 * Create a new parcel record (Restricted to DLAO, PIA, ADMIN)
 *
 * When latitude/longitude are supplied, a cadastral-style parcel polygon sized
 * to the recorded acreage is generated in PostGIS so the parcel appears on the
 * GIS map immediately.
 */
router.post('/', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const {
      project_id,
      survey_number,
      village,
      taluk,
      district,
      state,
      area_acres,
      owner_name,
      owner_contact,
      latitude,
      longitude,
    } = req.body;

    if (!survey_number || !village || !area_acres) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Survey number, village, and area (acres) are required.',
      });
    }

    const id = generateId();
    const parcel_code = await generateParcelCode();

    let targetProject = null;
    if (project_id) {
      targetProject = await queryOne('SELECT * FROM projects WHERE id::text = $1', [project_id]);
    }

    const area = parseFloat(area_acres);
    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null;

    await queryOne(
      `INSERT INTO parcels (
         id, parcel_code, project_id, survey_number, village, taluk, district, state,
         area_acres, owner_name, owner_contact, acquisition_status, latitude, longitude,
         geometry, geometry_source, geometry_updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                 nla_square_parcel($14::double precision, $13::double precision, $9::numeric), $15,
                 CASE WHEN $13::double precision IS NULL OR $14::double precision IS NULL THEN NULL ELSE now() END)
       RETURNING id`,
      [
        id,
        parcel_code,
        project_id || null,
        survey_number.trim(),
        village.trim(),
        taluk ? taluk.trim() : (targetProject ? targetProject.taluk : null),
        district ? district.trim() : (targetProject ? targetProject.district : 'Lucknow'),
        state ? state.trim() : (targetProject ? targetProject.state : 'Uttar Pradesh'),
        area,
        owner_name ? owner_name.trim() : 'Sample Owner',
        owner_contact ? owner_contact.trim() : null,
        ACQUISITION_STATUS.PROPOSED,
        lat,
        lng,
        'MANUAL_DRAW',
      ]
    );

    const createdParcel = await queryOne(
      `SELECT ${PARCEL_COLUMNS}, pr.name AS project_name, pr.project_code
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.id = $1`,
      [id]
    );

    await logAudit({
      entityType: 'parcel',
      entityId: id,
      action: 'CREATE_PARCEL',
      performedBy: req.user.id,
      newValues: createdParcel,
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      message: 'Parcel created successfully',
      data: createdParcel,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/parcels/:id
 * Get single parcel details with linked project, compensation, possession info
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const parcel = await queryOne(
      `SELECT ${PARCEL_COLUMNS},
              pr.name AS project_name, pr.project_code, pr.implementing_agency,
              nla_acres(p.geometry) AS gis_measured_acres,
              (SELECT COUNT(*) FROM documents WHERE parcel_id = p.id) AS total_documents,
              (SELECT COUNT(*) FROM acquisition_cases WHERE parcel_id = p.id) AS total_cases,
              (SELECT COUNT(*) FROM families WHERE parcel_id = p.id) AS total_families
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.id::text = $1 OR p.parcel_code = $1`,
      [req.params.id]
    );

    if (!parcel) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Parcel not found',
      });
    }

    const compensation = await queryOne('SELECT * FROM compensation WHERE parcel_id = $1', [parcel.id]);
    const possession = await queryOne('SELECT * FROM possession WHERE parcel_id = $1', [parcel.id]);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        ...parcel,
        compensation: compensation || null,
        possession: possession || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/parcels/:id
 * Update parcel attributes & acquisition status.
 *
 * If the centroid or acreage changes and the existing geometry was generated
 * (not captured in the field or imported), the polygon is regenerated so the
 * map stays consistent with the record.
 */
router.put('/:id', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.FRO, ROLES.ADMIN), async (req, res, next) => {
  try {
    const existing = await queryOne(
      `SELECT id, parcel_code, project_id, survey_number, village, taluk, district, state,
              area_acres, owner_name, owner_contact, acquisition_status, latitude, longitude,
              geometry_source, (geometry IS NOT NULL) AS has_geometry
         FROM parcels WHERE id::text = $1 OR parcel_code = $1`,
      [req.params.id]
    );

    if (!existing) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Parcel not found',
      });
    }

    const {
      project_id,
      survey_number,
      village,
      taluk,
      district,
      state,
      area_acres,
      owner_name,
      owner_contact,
      acquisition_status,
      latitude,
      longitude,
    } = req.body;

    const updatedProjId = project_id !== undefined ? (project_id || null) : existing.project_id;
    const updatedSurvey = survey_number !== undefined ? survey_number.trim() : existing.survey_number;
    const updatedVillage = village !== undefined ? village.trim() : existing.village;
    const updatedTaluk = taluk !== undefined ? (taluk ? taluk.trim() : null) : existing.taluk;
    const updatedDistrict = district !== undefined ? district.trim() : existing.district;
    const updatedState = state !== undefined ? state.trim() : existing.state;
    const updatedArea = area_acres !== undefined ? parseFloat(area_acres) : existing.area_acres;
    const updatedOwner = owner_name !== undefined ? owner_name.trim() : existing.owner_name;
    const updatedContact = owner_contact !== undefined ? (owner_contact ? owner_contact.trim() : null) : existing.owner_contact;
    const updatedStatus = acquisition_status !== undefined ? acquisition_status.toUpperCase() : existing.acquisition_status;
    const updatedLat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : (latitude === '' ? null : existing.latitude);
    const updatedLng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : (longitude === '' ? null : existing.longitude);

    // Only regenerate geometry that the system generated itself. Field-captured
    // (FIELD_GPS) and imported cadastral boundaries are authoritative and kept.
    const geometryIsDerived = !existing.has_geometry ||
      ['SEEDED_SYNTHETIC', 'MANUAL_DRAW'].includes(existing.geometry_source);
    const centroidOrAreaChanged =
      updatedLat !== existing.latitude ||
      updatedLng !== existing.longitude ||
      Number(updatedArea) !== Number(existing.area_acres);
    const regenerateGeometry = geometryIsDerived && centroidOrAreaChanged && updatedLat !== null && updatedLng !== null;

    await queryOne(
      `UPDATE parcels
          SET project_id = $1, survey_number = $2, village = $3, taluk = $4,
              district = $5, state = $6, area_acres = $7, owner_name = $8,
              owner_contact = $9, acquisition_status = $10, latitude = $11, longitude = $12,
              geometry = CASE WHEN $13 THEN nla_square_parcel($12::double precision, $11::double precision, $7::numeric) ELSE geometry END,
              geometry_updated_at = CASE WHEN $13 THEN now() ELSE geometry_updated_at END
        WHERE id = $14
      RETURNING id`,
      [
        updatedProjId, updatedSurvey, updatedVillage, updatedTaluk,
        updatedDistrict, updatedState, updatedArea, updatedOwner,
        updatedContact, updatedStatus, updatedLat, updatedLng,
        regenerateGeometry, existing.id,
      ]
    );

    const updatedParcel = await queryOne(
      `SELECT ${PARCEL_COLUMNS},
              pr.name AS project_name, pr.project_code, pr.implementing_agency,
              nla_acres(p.geometry) AS gis_measured_acres
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.id = $1`,
      [existing.id]
    );

    await logAudit({
      entityType: 'parcel',
      entityId: existing.id,
      action: 'UPDATE_PARCEL',
      performedBy: req.user.id,
      oldValues: {
        acquisition_status: existing.acquisition_status,
        area_acres: existing.area_acres,
        owner_name: existing.owner_name,
      },
      newValues: {
        acquisition_status: updatedStatus,
        area_acres: updatedArea,
        owner_name: updatedOwner,
        geometry_regenerated: regenerateGeometry,
      },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      message: 'Parcel updated successfully',
      data: updatedParcel,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
