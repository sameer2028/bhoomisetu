const express = require('express');
const { queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit } = require('../../utils/helpers');
const { ROLES, ACQUISITION_STATUS } = require('../../config/constants');

const router = express.Router();

const VALID_STATUSES = Object.values(ACQUISITION_STATUS);

/**
 * Build the WHERE clause shared by the parcel map layer, the statistics
 * endpoint and the extent endpoint, so every one of them answers for exactly
 * the same set of parcels.
 *
 * Supported filters: project_id, state, district, village, status (CSV),
 * search (survey number / parcel code / owner / village), bbox
 * (minLng,minLat,maxLng,maxLat), and within_corridor.
 */
function buildParcelFilter(queryParams, { requireGeometry = true } = {}) {
  const conditions = [];
  const params = [];

  if (requireGeometry) {
    conditions.push('p.geometry IS NOT NULL');
  }

  if (queryParams.project_id) {
    params.push(queryParams.project_id);
    conditions.push(`p.project_id::text = $${params.length}`);
  }
  if (queryParams.state) {
    params.push(queryParams.state);
    conditions.push(`p.state = $${params.length}`);
  }
  if (queryParams.district) {
    params.push(queryParams.district);
    conditions.push(`p.district = $${params.length}`);
  }
  if (queryParams.village) {
    params.push(queryParams.village);
    conditions.push(`p.village = $${params.length}`);
  }

  // status=ACQUIRED,NOTIFIED  (unknown values are ignored rather than erroring)
  if (queryParams.status) {
    const requested = String(queryParams.status)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => VALID_STATUSES.includes(s));

    if (requested.length > 0) {
      params.push(requested);
      conditions.push(`p.acquisition_status = ANY($${params.length}::text[])`);
    }
  }

  if (queryParams.search) {
    params.push(`%${String(queryParams.search).trim()}%`);
    const i = params.length;
    conditions.push(
      `(p.survey_number ILIKE $${i} OR p.parcel_code ILIKE $${i} OR p.owner_name ILIKE $${i} OR p.village ILIKE $${i})`
    );
  }

  // Spatial filter: only parcels whose polygon intersects the viewport
  if (queryParams.bbox) {
    const parts = String(queryParams.bbox).split(',').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      params.push(minLng, minLat, maxLng, maxLat);
      const n = params.length;
      conditions.push(
        `ST_Intersects(p.geometry, ST_MakeEnvelope($${n - 3}, $${n - 2}, $${n - 1}, $${n}, 4326))`
      );
    }
  }

  // Spatial filter: only parcels that actually fall inside the project corridor
  if (queryParams.within_corridor === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM projects cp
       WHERE cp.id = p.project_id
         AND cp.corridor IS NOT NULL
         AND ST_Intersects(p.geometry, cp.corridor)
    )`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * GET /api/gis/parcels
 * Parcel polygons as a GeoJSON FeatureCollection, ready for Leaflet.
 * Every feature carries the acquisition attributes needed to style and label it.
 */
router.get('/parcels', authenticate, async (req, res, next) => {
  try {
    const { where, params } = buildParcelFilter(req.query);

    const rows = await queryRows(
      `SELECT p.id,
              p.parcel_code,
              p.survey_number,
              p.village,
              p.taluk,
              p.district,
              p.state,
              p.area_acres,
              p.owner_name,
              p.acquisition_status,
              p.project_id,
              p.geometry_source,
              pr.project_code,
              pr.name AS project_name,
              nla_acres(p.geometry)                        AS gis_measured_acres,
              ST_Y(ST_Centroid(p.geometry))                AS centroid_lat,
              ST_X(ST_Centroid(p.geometry))                AS centroid_lng,
              ST_AsGeoJSON(p.geometry)::json               AS geometry
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
         ${where}
         ORDER BY p.parcel_code ASC`,
      params
    );

    const features = rows.map((row) => {
      const { geometry, ...properties } = row;
      return { type: 'Feature', id: row.id, geometry, properties };
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      data: { type: 'FeatureCollection', features },
      meta: { count: features.length, srid: 4326 },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/parcels/:id
 * A single parcel as a GeoJSON Feature, enriched with the full database record:
 * project link, compensation, possession, document/case/family counts and the
 * spatial relationship to the project corridor.
 *
 * This is what the map's detail panel renders — it is the actual DB record, not
 * map-only metadata.
 */
router.get('/parcels/:id', authenticate, async (req, res, next) => {
  try {
    const parcel = await queryOne(
      `SELECT p.id, p.parcel_code, p.project_id, p.survey_number, p.village, p.taluk,
              p.district, p.state, p.area_acres, p.owner_name, p.owner_contact,
              p.acquisition_status, p.latitude, p.longitude, p.geometry_source,
              p.geometry_updated_at, p.created_at, p.updated_at,
              pr.project_code, pr.name AS project_name, pr.implementing_agency,
              pr.corridor_width_m,
              nla_acres(p.geometry) AS gis_measured_acres,
              ST_Y(ST_Centroid(p.geometry)) AS centroid_lat,
              ST_X(ST_Centroid(p.geometry)) AS centroid_lng,
              ST_AsGeoJSON(p.geometry)::json AS geometry,
              ST_AsGeoJSON(ST_Envelope(p.geometry))::json AS bbox_geometry,
              -- Spatial relationship between the parcel and the acquisition corridor
              CASE WHEN pr.corridor IS NULL OR p.geometry IS NULL THEN NULL
                   ELSE ST_Intersects(p.geometry, pr.corridor) END AS intersects_corridor,
              CASE WHEN pr.corridor IS NULL OR p.geometry IS NULL THEN NULL
                   ELSE nla_acres(ST_Intersection(p.geometry, pr.corridor)) END AS acres_inside_corridor,
              (SELECT COUNT(*) FROM documents        WHERE parcel_id = p.id) AS total_documents,
              (SELECT COUNT(*) FROM acquisition_cases WHERE parcel_id = p.id) AS total_cases,
              (SELECT COUNT(*) FROM families         WHERE parcel_id = p.id) AS total_families
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.id::text = $1 OR p.parcel_code = $1`,
      [req.params.id]
    );

    if (!parcel) {
      return apiResponse(res, { status: 404, success: false, error: 'Parcel not found' });
    }

    const compensation = await queryOne(
      `SELECT amount_assessed, amount_approved, amount_paid, payment_status,
              payment_date, payment_reference
         FROM compensation WHERE parcel_id = $1`,
      [parcel.id]
    );

    const possession = await queryOne(
      'SELECT status, possession_date, remarks FROM possession WHERE parcel_id = $1',
      [parcel.id]
    );

    const documents = await queryRows(
      `SELECT id, document_type, title, version, created_at
         FROM documents WHERE parcel_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [parcel.id]
    );

    const { geometry, bbox_geometry, ...properties } = parcel;

    // Percentage of the parcel that falls within the acquisition corridor
    const overlapPct =
      properties.acres_inside_corridor != null && properties.gis_measured_acres > 0
        ? Math.round((properties.acres_inside_corridor / properties.gis_measured_acres) * 1000) / 10
        : null;

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        type: 'Feature',
        id: parcel.id,
        geometry,
        bbox_geometry,
        properties: {
          ...properties,
          corridor_overlap_pct: overlapPct,
          compensation: compensation || null,
          possession: possession || null,
          documents,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/projects
 * Lightweight project layer index for the map's project selector: extent,
 * corridor availability, parcel counts and mapped acreage per project.
 */
router.get('/projects', authenticate, async (req, res, next) => {
  try {
    const projects = await queryRows(
      `SELECT pr.id,
              pr.project_code,
              pr.name,
              pr.project_type,
              pr.status,
              pr.state,
              pr.district,
              pr.taluk,
              pr.implementing_agency,
              pr.total_area_required,
              pr.total_area_acquired,
              pr.corridor_width_m,
              (pr.corridor IS NOT NULL) AS has_corridor,
              ROUND((ST_Length(pr.centerline::geography) / 1000.0)::numeric, 2) AS corridor_length_km,
              nla_acres(pr.corridor) AS corridor_area_acres,
              COUNT(p.id)                        AS parcel_count,
              COUNT(p.geometry)                  AS mapped_parcel_count,
              COALESCE(SUM(p.area_acres), 0)     AS parcel_area_acres,
              -- Combined extent of the corridor and all parcel polygons
              ST_AsGeoJSON(ST_Envelope(
                ST_Collect(ARRAY_REMOVE(ARRAY[pr.corridor::geometry, ST_Collect(p.geometry)], NULL))
              ))::json AS extent
         FROM projects pr
         LEFT JOIN parcels p ON p.project_id = pr.id
         GROUP BY pr.id
         ORDER BY pr.project_code ASC`
    );

    return apiResponse(res, { status: 200, success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/corridors/:projectId
 * The project corridor layer: the acquisition corridor polygon plus the
 * alignment centreline, as a GeoJSON FeatureCollection.
 */
router.get('/corridors/:projectId', authenticate, async (req, res, next) => {
  try {
    const project = await queryOne(
      `SELECT id, project_code, name, project_type, status, corridor_width_m, geometry_source,
              ST_AsGeoJSON(corridor)::json   AS corridor,
              ST_AsGeoJSON(centerline)::json AS centerline,
              ST_AsGeoJSON(ST_Envelope(COALESCE(corridor::geometry, centerline)))::json AS extent,
              nla_acres(corridor) AS corridor_area_acres,
              ROUND((ST_Length(centerline::geography) / 1000.0)::numeric, 2) AS corridor_length_km
         FROM projects
        WHERE id::text = $1 OR project_code = $1`,
      [req.params.projectId]
    );

    if (!project) {
      return apiResponse(res, { status: 404, success: false, error: 'Project not found' });
    }

    const features = [];

    if (project.corridor) {
      features.push({
        type: 'Feature',
        id: `${project.id}:corridor`,
        geometry: project.corridor,
        properties: {
          layer: 'CORRIDOR',
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.name,
          corridor_width_m: project.corridor_width_m,
          corridor_area_acres: project.corridor_area_acres,
          data_source: project.geometry_source,
        },
      });
    }

    if (project.centerline) {
      features.push({
        type: 'Feature',
        id: `${project.id}:centerline`,
        geometry: project.centerline,
        properties: {
          layer: 'CENTERLINE',
          project_id: project.id,
          project_code: project.project_code,
          project_name: project.name,
          corridor_length_km: project.corridor_length_km,
          data_source: project.geometry_source,
        },
      });
    }

    return apiResponse(res, {
      status: 200,
      success: true,
      data: { type: 'FeatureCollection', features },
      meta: {
        project_id: project.id,
        project_code: project.project_code,
        project_name: project.name,
        corridor_width_m: project.corridor_width_m,
        corridor_length_km: project.corridor_length_km,
        corridor_area_acres: project.corridor_area_acres,
        extent: project.extent,
        has_corridor: !!project.corridor,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/stats
 * Status breakdown for the currently filtered map view — drives the legend
 * counts and the map summary strip. Uses the same filter as /gis/parcels.
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { where, params } = buildParcelFilter(req.query, { requireGeometry: false });

    const byStatus = await queryRows(
      `SELECT p.acquisition_status AS status,
              COUNT(*)                        AS parcel_count,
              COUNT(p.geometry)               AS mapped_count,
              COALESCE(SUM(p.area_acres), 0)  AS area_acres
         FROM parcels p
         ${where}
         GROUP BY p.acquisition_status`,
      params
    );

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r]));

    const breakdown = VALID_STATUSES.map((status) => ({
      status,
      parcel_count: statusMap[status] ? statusMap[status].parcel_count : 0,
      mapped_count: statusMap[status] ? statusMap[status].mapped_count : 0,
      area_acres: statusMap[status] ? statusMap[status].area_acres : 0,
    }));

    const totals = await queryOne(
      `SELECT COUNT(*)                          AS parcel_count,
              COUNT(p.geometry)                 AS mapped_count,
              COALESCE(SUM(p.area_acres), 0)    AS area_acres,
              COALESCE(SUM(nla_acres(p.geometry)), 0) AS gis_measured_acres,
              COUNT(DISTINCT p.village)         AS village_count,
              COUNT(DISTINCT p.district)        AS district_count,
              COUNT(DISTINCT p.project_id)      AS project_count
         FROM parcels p
         ${where}`,
      params
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: { totals, by_status: breakdown },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/extent
 * Bounding box of the currently filtered parcels, so the map can zoom to fit
 * whatever the user has filtered to.
 */
router.get('/extent', authenticate, async (req, res, next) => {
  try {
    const { where, params } = buildParcelFilter(req.query);

    const row = await queryOne(
      `SELECT ST_AsGeoJSON(ST_Envelope(ST_Collect(p.geometry)))::json AS extent,
              ST_XMin(ST_Collect(p.geometry)) AS min_lng,
              ST_YMin(ST_Collect(p.geometry)) AS min_lat,
              ST_XMax(ST_Collect(p.geometry)) AS max_lng,
              ST_YMax(ST_Collect(p.geometry)) AS max_lat,
              COUNT(*) AS feature_count
         FROM parcels p
         ${where}`,
      params
    );

    return apiResponse(res, { status: 200, success: true, data: row });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/filters
 * Cascading filter options (state -> district -> village) plus the project list,
 * derived from live parcel data rather than a hard-coded list.
 */
router.get('/filters', authenticate, async (req, res, next) => {
  try {
    const { state, district, project_id } = req.query;

    const states = await queryRows(
      `SELECT state AS value, COUNT(*) AS parcel_count
         FROM parcels WHERE state IS NOT NULL
         GROUP BY state ORDER BY state`
    );

    const districtParams = [];
    let districtWhere = 'WHERE district IS NOT NULL';
    if (state) {
      districtParams.push(state);
      districtWhere += ` AND state = $${districtParams.length}`;
    }
    if (project_id) {
      districtParams.push(project_id);
      districtWhere += ` AND project_id::text = $${districtParams.length}`;
    }
    const districts = await queryRows(
      `SELECT district AS value, state, COUNT(*) AS parcel_count
         FROM parcels ${districtWhere}
         GROUP BY district, state ORDER BY district`,
      districtParams
    );

    const villageParams = [];
    let villageWhere = 'WHERE village IS NOT NULL';
    if (state) {
      villageParams.push(state);
      villageWhere += ` AND state = $${villageParams.length}`;
    }
    if (district) {
      villageParams.push(district);
      villageWhere += ` AND district = $${villageParams.length}`;
    }
    if (project_id) {
      villageParams.push(project_id);
      villageWhere += ` AND project_id::text = $${villageParams.length}`;
    }
    const villages = await queryRows(
      `SELECT village AS value, district, state, COUNT(*) AS parcel_count
         FROM parcels ${villageWhere}
         GROUP BY village, district, state ORDER BY village`,
      villageParams
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: { states, districts, villages, statuses: VALID_STATUSES },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gis/search?q=123/2
 * Survey-number / parcel-code / owner / village search that returns a map
 * target (centroid + bounding box) so the map can fly straight to the result.
 */
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    if (q.length < 1) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Search term (q) is required.',
      });
    }

    const results = await queryRows(
      `SELECT p.id, p.parcel_code, p.survey_number, p.village, p.district, p.state,
              p.area_acres, p.owner_name, p.acquisition_status, p.project_id,
              pr.project_code, pr.name AS project_name,
              (p.geometry IS NOT NULL) AS has_geometry,
              ST_Y(ST_Centroid(p.geometry)) AS centroid_lat,
              ST_X(ST_Centroid(p.geometry)) AS centroid_lng,
              ST_XMin(p.geometry) AS min_lng, ST_YMin(p.geometry) AS min_lat,
              ST_XMax(p.geometry) AS max_lng, ST_YMax(p.geometry) AS max_lat,
              -- Exact survey-number matches rank first
              CASE WHEN p.survey_number ILIKE $1 THEN 0
                   WHEN p.parcel_code   ILIKE $1 THEN 1
                   ELSE 2 END AS match_rank
         FROM parcels p
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.survey_number ILIKE $2
           OR p.parcel_code   ILIKE $2
           OR p.owner_name    ILIKE $2
           OR p.village       ILIKE $2
        ORDER BY match_rank, p.parcel_code
        LIMIT 25`,
      [q, `%${q}%`]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: results,
      meta: { query: q, count: results.length },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/gis/parcels/:id/geometry
 * Replace a parcel's cadastral boundary with a supplied GeoJSON Polygon
 * (map drawing, or a boundary captured in the field).
 *
 * The centroid is recomputed in PostGIS and cached back onto latitude/longitude,
 * and the change is written to the audit trail.
 */
router.put(
  '/parcels/:id/geometry',
  authenticate,
  rbac(ROLES.DLAO, ROLES.FRO, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { geometry, geometry_source } = req.body;

      if (!geometry || geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates)) {
        return apiResponse(res, {
          status: 400,
          success: false,
          error: 'A GeoJSON Polygon geometry is required (type: "Polygon").',
        });
      }

      const source = ['FIELD_GPS', 'IMPORTED_CADASTRAL', 'MANUAL_DRAW'].includes(geometry_source)
        ? geometry_source
        : 'MANUAL_DRAW';

      const existing = await queryOne(
        `SELECT id, parcel_code, area_acres, geometry_source, nla_acres(geometry) AS gis_measured_acres
           FROM parcels WHERE id::text = $1 OR parcel_code = $1`,
        [req.params.id]
      );

      if (!existing) {
        return apiResponse(res, { status: 404, success: false, error: 'Parcel not found' });
      }

      // Reject self-intersecting / otherwise invalid rings before storing them
      const validity = await queryOne(
        `SELECT ST_IsValid(g) AS is_valid, ST_IsValidReason(g) AS reason
           FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g) AS s`,
        [JSON.stringify(geometry)]
      );

      if (!validity.is_valid) {
        return apiResponse(res, {
          status: 400,
          success: false,
          error: `Invalid parcel geometry: ${validity.reason}`,
        });
      }

      const updated = await queryOne(
        `UPDATE parcels
            SET geometry            = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
                latitude            = ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))),
                longitude           = ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))),
                geometry_source     = $2,
                geometry_updated_at = now()
          WHERE id = $3
        RETURNING id, parcel_code, latitude, longitude, area_acres, geometry_source,
                  geometry_updated_at, nla_acres(geometry) AS gis_measured_acres`,
        [JSON.stringify(geometry), source, existing.id]
      );

      await logAudit({
        entityType: 'parcel',
        entityId: existing.id,
        action: 'UPDATE_PARCEL_GEOMETRY',
        performedBy: req.user.id,
        oldValues: {
          geometry_source: existing.geometry_source,
          gis_measured_acres: existing.gis_measured_acres,
        },
        newValues: {
          geometry_source: updated.geometry_source,
          gis_measured_acres: updated.gis_measured_acres,
        },
        ipAddress: req.ip,
      });

      return apiResponse(res, {
        status: 200,
        success: true,
        message: 'Parcel boundary updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
