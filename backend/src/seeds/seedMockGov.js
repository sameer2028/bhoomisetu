const { queryOne, queryRows } = require('../config/database');

/**
 * Seed initial synthetic sync logs for Mock Gov API if table is empty.
 */
async function seedMockGov() {
  try {
    const { count } = await queryOne('SELECT COUNT(*) AS count FROM mock_gov_sync_log');
    if (parseInt(count, 10) > 0) {
      return;
    }

    console.log('[SEED] Seeding mock government API synchronization logs...');

    const parcels = await queryRows('SELECT id, parcel_code, survey_number, owner_name, village, area_acres FROM parcels LIMIT 3');

    if (parcels.length === 0) return;

    const sampleLogs = [
      {
        survey_number: parcels[0]?.survey_number || '142/1',
        validation_result: 'MATCH',
        request_data: {
          survey_number: parcels[0]?.survey_number || '142/1',
          state: 'Uttar Pradesh',
          district: 'Lucknow',
          registry_id: 'UP_BHULEKH',
          requested_by: 'sga@nla.gov.in',
        },
        response_data: {
          response_code: 'NIC_ROR_200_SUCCESS',
          registry_name: 'UP Bhulekh (Uttar Pradesh Land Records Portal)',
          khasra_survey_no: parcels[0]?.survey_number || '142/1',
          khatauni_no: 'KH-4921/2024',
          recorded_owners: [{ name: parcels[0]?.owner_name || 'Rameshwar Prasad Sharma', share: '1/1' }],
          total_area_acres: parcels[0]?.area_acres || 2.45,
          mutation_status: 'Approved & Mutated',
        },
        synced_at: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      },
      {
        survey_number: parcels[1]?.survey_number || '89/3',
        validation_result: 'MISMATCH',
        request_data: {
          survey_number: parcels[1]?.survey_number || '89/3',
          state: 'Uttar Pradesh',
          district: 'Lucknow',
          registry_id: 'UP_BHULEKH',
          requested_by: 'dlao@nla.gov.in',
        },
        response_data: {
          response_code: 'NIC_ROR_200_SUCCESS',
          registry_name: 'UP Bhulekh (Uttar Pradesh Land Records Portal)',
          khasra_survey_no: parcels[1]?.survey_number || '89/3',
          khatauni_no: 'KH-8102/2024',
          recorded_owners: [{ name: parcels[1]?.owner_name || 'Vijay Maurya', share: '1/1' }],
          total_area_acres: (parseFloat(parcels[1]?.area_acres || 3.1) * 1.08).toFixed(4),
          mutation_status: 'Disputed Title (Stay by Civil Court)',
        },
        synced_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
    ];

    for (const log of sampleLogs) {
      await queryOne(
        `INSERT INTO mock_gov_sync_log (survey_number, request_data, response_data, validation_result, synced_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [log.survey_number, JSON.stringify(log.request_data), JSON.stringify(log.response_data), log.validation_result, log.synced_at]
      );
    }
  } catch (err) {
    console.warn('[SEED] Error seeding mock gov logs:', err.message);
  }
}

module.exports = { seedMockGov };
