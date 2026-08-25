const { query, queryOne } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { ACQUISITION_STATUS } = require('../config/constants');

/**
 * Synthetic SIH parcel dataset (Phase 4).
 *
 * Coordinates are the recorded parcel centroids. The cadastral polygon itself is
 * generated in PostGIS from the centroid + recorded acreage via
 * nla_square_parcel(), so every parcel is map-ready on first boot.
 */
async function seedParcels() {
  const { count } = await queryOne('SELECT COUNT(*) AS count FROM parcels');

  if (count > 0) {
    console.log('[SEED] Parcels table already has data. Skipping parcel seed.');
    return;
  }

  console.log('[SEED] Seeding synthetic SIH parcel dataset...');

  const prj1 = await queryOne("SELECT id FROM projects WHERE project_code = 'PRJ-2026-001'");
  const prj2 = await queryOne("SELECT id FROM projects WHERE project_code = 'PRJ-2026-002'");
  const prj3 = await queryOne("SELECT id FROM projects WHERE project_code = 'PRJ-2026-003'");

  const demoParcels = [
    {
      parcel_code: 'P-101',
      project_id: prj1 ? prj1.id : null,
      survey_number: '123/2',
      village: 'Sarai Khas',
      taluk: 'Sarojini Nagar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      area_acres: 2.50,
      owner_name: 'Rameshwar Prasad Sharma',
      owner_contact: '+91 98390 12345',
      acquisition_status: ACQUISITION_STATUS.UNDER_ACQUISITION,
      latitude: 26.8467,
      longitude: 80.9462,
    },
    {
      parcel_code: 'P-102',
      project_id: prj1 ? prj1.id : null,
      survey_number: '124/1',
      village: 'Sarai Khas',
      taluk: 'Sarojini Nagar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      area_acres: 1.80,
      owner_name: 'Sita Devi & Om Prakash',
      owner_contact: '+91 98390 23456',
      acquisition_status: ACQUISITION_STATUS.NOTIFIED,
      latitude: 26.8475,
      longitude: 80.9480,
    },
    {
      parcel_code: 'P-103',
      project_id: prj1 ? prj1.id : null,
      survey_number: '125/3',
      village: 'Bani',
      taluk: 'Sarojini Nagar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      area_acres: 3.20,
      owner_name: 'Kalyan Singh Yadav',
      owner_contact: '+91 98390 34567',
      acquisition_status: ACQUISITION_STATUS.ACQUIRED,
      latitude: 26.8490,
      longitude: 80.9500,
    },
    {
      parcel_code: 'P-104',
      project_id: prj1 ? prj1.id : null,
      survey_number: '126/A',
      village: 'Bani',
      taluk: 'Sarojini Nagar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      area_acres: 4.10,
      owner_name: 'Mahesh Chandra Gupta',
      owner_contact: '+91 98390 45678',
      acquisition_status: ACQUISITION_STATUS.POSSESSION_TAKEN,
      latitude: 26.8510,
      longitude: 80.9525,
    },
    {
      parcel_code: 'P-105',
      project_id: prj1 ? prj1.id : null,
      survey_number: '127/B',
      village: 'Sarojini Nagar',
      taluk: 'Sarojini Nagar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      area_acres: 1.25,
      owner_name: 'Suresh Tripathi',
      owner_contact: '+91 98390 56789',
      acquisition_status: ACQUISITION_STATUS.RR_ISSUE,
      latitude: 26.8530,
      longitude: 80.9550,
    },
    {
      parcel_code: 'P-201',
      project_id: prj2 ? prj2.id : null,
      survey_number: '45/1A',
      village: 'Bikapur',
      taluk: 'Bikapur',
      district: 'Ayodhya',
      state: 'Uttar Pradesh',
      area_acres: 5.50,
      owner_name: 'Ram Avatar Maurya',
      owner_contact: '+91 98390 67890',
      acquisition_status: ACQUISITION_STATUS.ACQUIRED,
      latitude: 26.7980,
      longitude: 82.1990,
    },
    {
      parcel_code: 'P-202',
      project_id: prj2 ? prj2.id : null,
      survey_number: '46/2',
      village: 'Bikapur',
      taluk: 'Bikapur',
      district: 'Ayodhya',
      state: 'Uttar Pradesh',
      area_acres: 3.75,
      owner_name: 'Vikram Singh & Family',
      owner_contact: '+91 98390 78901',
      acquisition_status: ACQUISITION_STATUS.UNDER_ACQUISITION,
      latitude: 26.8000,
      longitude: 82.2010,
    },
    {
      parcel_code: 'P-301',
      project_id: prj3 ? prj3.id : null,
      survey_number: '88/3',
      village: 'Pindra',
      taluk: 'Pindra',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      area_acres: 2.10,
      owner_name: 'Harishankar Patel',
      owner_contact: '+91 98390 89012',
      acquisition_status: ACQUISITION_STATUS.PROPOSED,
      latitude: 25.4500,
      longitude: 82.8500,
    },
  ];

  for (const p of demoParcels) {
    await query(
      `INSERT INTO parcels (
         id, parcel_code, project_id, survey_number, village, taluk, district, state,
         area_acres, owner_name, owner_contact, acquisition_status, latitude, longitude,
         geometry, geometry_source, geometry_updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                 nla_square_parcel($14::double precision, $13::double precision, $9::numeric),
                 'SEEDED_SYNTHETIC', now())
       ON CONFLICT (parcel_code) DO NOTHING`,
      [
        generateId(), p.parcel_code, p.project_id, p.survey_number, p.village, p.taluk,
        p.district, p.state, p.area_acres, p.owner_name, p.owner_contact,
        p.acquisition_status, p.latitude, p.longitude,
      ]
    );
  }

  console.log(`[SEED] Successfully seeded ${demoParcels.length} synthetic SIH land parcels.`);
}

module.exports = { seedParcels };
