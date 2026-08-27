const { query, queryOne, queryRows } = require('../config/database');
const { generateId } = require('../utils/helpers');

/**
 * Seed synthetic system & statutory alerts.
 * Idempotent — skips if alerts table already has data.
 */
async function seedAlerts() {
  const { count } = await queryOne('SELECT COUNT(*) AS count FROM alerts');

  if (parseInt(count, 10) > 0) {
    return;
  }

  const projects = await queryRows('SELECT id, name FROM projects LIMIT 3');
  const cases = await queryRows('SELECT id, case_code FROM acquisition_cases LIMIT 3');
  const parcels = await queryRows('SELECT id, survey_number FROM parcels LIMIT 3');

  console.log('[SEED] Seeding system & statutory alerts...');

  const sampleAlerts = [
    {
      type: 'DEADLINE_APPROACHING',
      title: 'Section 19 Declaration Deadline Approaching',
      message: 'Jewar Airport Link Expressway parcel survey #88/3 requires Sec 19 final declaration within 5 days.',
      priority: 'HIGH',
      project_id: projects[0]?.id || null,
      case_id: cases[0]?.id || null,
      parcel_id: parcels[0]?.id || null,
    },
    {
      type: 'DATA_MISMATCH',
      title: 'AI Document Mismatch Detected',
      message: 'Land record area mismatch detected in Parcel Survey #126/A (Extracted: 4.2 Acres vs Official: 4.8 Acres).',
      priority: 'CRITICAL',
      project_id: projects[1]?.id || null,
      case_id: cases[1]?.id || null,
      parcel_id: parcels[1]?.id || null,
    },
    {
      type: 'OVERDUE',
      title: 'R&R Housing Allotment Overdue',
      message: 'Resettlement plot allotment for displaced family (FAM-2026-004) is 12 days past scheduled target date.',
      priority: 'HIGH',
      project_id: projects[0]?.id || null,
      case_id: cases[2]?.id || null,
      parcel_id: parcels[2]?.id || null,
    },
    {
      type: 'MISSING_DOC',
      title: 'Environmental Clearance (FRO) Pending',
      message: 'Forest department NOC document for Purvanchal Freight Corridor parcel survey #44/2 is pending upload.',
      priority: 'MEDIUM',
      project_id: projects[2]?.id || null,
      case_id: cases[0]?.id || null,
      parcel_id: parcels[0]?.id || null,
    },
  ];

  for (const a of sampleAlerts) {
    const alertId = generateId();
    await query(
      `INSERT INTO alerts (id, type, title, message, priority, project_id, case_id, parcel_id, is_read, is_acknowledged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE)`,
      [alertId, a.type, a.title, a.message, a.priority, a.project_id, a.case_id, a.parcel_id]
    );
  }

  console.log('[SEED] Alerts seeded successfully.');
}

module.exports = seedAlerts;
