const { query, queryOne } = require('../config/database');

/**
 * Phase 5 — GIS seed.
 *
 * Adds the spatial layer that the acquisition data hangs off:
 *   • a project centreline (the alignment of the highway / rail / canal)
 *   • an acquisition corridor polygon, produced by geodesically buffering the
 *     centreline by half the corridor width (PostGIS nla_corridor)
 *
 * The centrelines are drawn through the recorded centroids of each project's
 * existing parcels, so no parcel is moved — the corridor is fitted to the
 * cadastral data that already exists, exactly as an alignment survey would be.
 *
 * All geometry here is SYNTHETIC demo data for the SIH prototype. It is not
 * sourced from any government cadastral or alignment dataset.
 */

// Corridor alignments per project. Coordinates are [longitude, latitude].
// Widths are the total right-of-way to be acquired, in metres.
const ALIGNMENTS = {
  'PRJ-2026-001': {
    label: 'Lucknow–Kanpur Highway alignment (6-lane greenfield)',
    width_m: 120,
    // Runs south-west to north-east through the Sarojini Nagar parcels
    coordinates: [
      [80.9435, 26.8455],
      [80.9462, 26.8467],
      [80.9480, 26.8475],
      [80.9500, 26.8490],
      [80.9525, 26.8510],
      [80.9550, 26.8530],
      [80.9578, 26.8548],
    ],
  },
  'PRJ-2026-002': {
    label: 'Purvanchal Freight Corridor alignment (dedicated rail)',
    width_m: 90,
    coordinates: [
      [82.1962, 26.7962],
      [82.1990, 26.7980],
      [82.2010, 26.8000],
      [82.2038, 26.8021],
    ],
  },
  'PRJ-2026-003': {
    label: 'Ganga Canal Feeder alignment (sub-surface pipeline)',
    width_m: 60,
    coordinates: [
      [82.8462, 25.4478],
      [82.8500, 25.4500],
      [82.8538, 25.4523],
    ],
  },
  'PRJ-2026-004': {
    label: 'Jewar Airport Link Expressway alignment (8-lane)',
    width_m: 150,
    coordinates: [
      [77.5540, 28.1155],
      [77.5590, 28.1190],
      [77.5645, 28.1228],
      [77.5700, 28.1262],
    ],
  },
};

async function seedGis() {
  const pending = await queryOne(
    'SELECT COUNT(*) AS count FROM projects WHERE corridor IS NULL'
  );

  if (pending.count === 0) {
    console.log('[SEED] All projects already have GIS corridors. Skipping GIS seed.');
    return;
  }

  console.log('[SEED] Seeding Phase 5 GIS layer (project centrelines + corridors)...');

  let seeded = 0;

  for (const [projectCode, alignment] of Object.entries(ALIGNMENTS)) {
    const geojsonLine = JSON.stringify({
      type: 'LineString',
      coordinates: alignment.coordinates,
    });

    const result = await query(
      `UPDATE projects
          SET centerline       = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
              corridor_width_m = $2::integer,
              corridor         = nla_corridor(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), $3::double precision),
              geometry_source  = 'SEEDED_SYNTHETIC'
        WHERE project_code = $4
          AND corridor IS NULL`,
      [geojsonLine, alignment.width_m, alignment.width_m, projectCode]
    );

    if (result.rowCount > 0) {
      seeded += 1;
      console.log(`[SEED]   ${projectCode} — ${alignment.label} (${alignment.width_m} m ROW)`);
    }
  }

  // Backfill any parcel that still has no polygon (e.g. created before Phase 5)
  const backfill = await query(
    `UPDATE parcels
        SET geometry = nla_square_parcel(longitude, latitude, area_acres),
            geometry_source = COALESCE(geometry_source, 'SEEDED_SYNTHETIC'),
            geometry_updated_at = now()
      WHERE geometry IS NULL
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND area_acres > 0`
  );

  if (backfill.rowCount > 0) {
    console.log(`[SEED]   Backfilled polygons for ${backfill.rowCount} parcel(s)`);
  }

  console.log(`[SEED] GIS layer ready — ${seeded} project corridor(s) generated.`);
}

module.exports = { seedGis };
