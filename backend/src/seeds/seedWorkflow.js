const { query, queryOne, queryRows } = require('../config/database');
const { generateId, generateCode } = require('../utils/helpers');
const { WORKFLOW_STAGES, CASE_STATUS, PRIORITY } = require('../config/constants');

/**
 * Seed synthetic acquisition cases and workflow events.
 * Idempotent — skips if data already exists.
 */
async function seedWorkflow() {
  const { count } = await queryOne('SELECT COUNT(*) AS count FROM acquisition_cases');

  if (count > 0) {
    console.log('[SEED] Acquisition cases table already has data. Skipping workflow seed.');
    return;
  }

  // Fetch existing projects and parcels to link cases
  const projects = await queryRows('SELECT id, name, project_code FROM projects ORDER BY project_code LIMIT 4');
  const parcels = await queryRows('SELECT id, parcel_code, project_id FROM parcels ORDER BY parcel_code LIMIT 8');
  const users = await queryRows("SELECT id, full_name, role FROM users WHERE role IN ('DLAO','SGA','FRO') LIMIT 3");

  if (projects.length === 0) {
    console.log('[SEED] No projects found. Skipping workflow seed.');
    return;
  }

  const dlao = users.find(u => u.role === 'DLAO') || users[0];
  const sga = users.find(u => u.role === 'SGA') || users[0];
  const fro = users.find(u => u.role === 'FRO') || users[0];

  console.log('[SEED] Seeding acquisition workflow cases...');

  // ─── Case 1: In VERIFICATION stage (mid-pipeline) ────────────────
  const case1Id = generateId();
  const case1Code = await generateCode('LA', 'acquisition_cases', 'case_code');
  const case1Parcel = parcels.find(p => p.project_id === projects[0]?.id) || parcels[0];

  await query(
    `INSERT INTO acquisition_cases
       (id, case_code, project_id, parcel_id, current_stage, assigned_to, status,
        due_date, priority, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (case_code) DO NOTHING`,
    [
      case1Id, case1Code, projects[0].id, case1Parcel?.id || null,
      WORKFLOW_STAGES.VERIFICATION, dlao.id, CASE_STATUS.IN_PROGRESS,
      '2026-09-15', PRIORITY.HIGH,
      'Highway corridor requires field verification of survey records',
    ]
  );

  // Audit trail for Case 1
  const case1Events = [
    { from: null, to: 'PROJECT_PROPOSAL', action: 'CREATE', by: dlao, remarks: 'Acquisition case initiated for highway corridor parcel', daysAgo: 14 },
    { from: 'PROJECT_PROPOSAL', to: 'LAND_IDENTIFICATION', action: 'APPROVE', by: sga, remarks: 'Project proposal reviewed and approved. Proceed with land identification.', daysAgo: 10 },
    { from: 'LAND_IDENTIFICATION', to: 'VERIFICATION', action: 'FORWARD', by: dlao, remarks: 'Land parcels identified. Forwarding for field verification by revenue officer.', daysAgo: 5 },
  ];

  for (const evt of case1Events) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - evt.daysAgo);
    await query(
      `INSERT INTO workflow_events (id, case_id, from_stage, to_stage, action, performed_by, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [generateId(), case1Id, evt.from, evt.to, evt.action, evt.by.id, evt.remarks, eventDate.toISOString()]
    );
  }

  // ─── Case 2: In COMPENSATION stage (advanced) ────────────────────
  const case2Id = generateId();
  const case2Code = await generateCode('LA', 'acquisition_cases', 'case_code');
  const case2Parcel = parcels.length > 1 ? parcels[1] : parcels[0];

  await query(
    `INSERT INTO acquisition_cases
       (id, case_code, project_id, parcel_id, current_stage, assigned_to, status,
        due_date, priority, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (case_code) DO NOTHING`,
    [
      case2Id, case2Code,
      projects.length > 1 ? projects[1].id : projects[0].id,
      case2Parcel?.id || null,
      WORKFLOW_STAGES.COMPENSATION, dlao.id, CASE_STATUS.IN_PROGRESS,
      '2026-10-01', PRIORITY.MEDIUM,
      'Compensation assessment underway for residential parcels',
    ]
  );

  const case2Events = [
    { from: null, to: 'PROJECT_PROPOSAL', action: 'CREATE', by: dlao, remarks: 'Case created for canal widening project', daysAgo: 30 },
    { from: 'PROJECT_PROPOSAL', to: 'LAND_IDENTIFICATION', action: 'APPROVE', by: sga, remarks: 'Approved by Senior Authority', daysAgo: 25 },
    { from: 'LAND_IDENTIFICATION', to: 'VERIFICATION', action: 'FORWARD', by: dlao, remarks: 'Parcels identified along canal alignment', daysAgo: 20 },
    { from: 'VERIFICATION', to: 'APPROVAL', action: 'FORWARD', by: fro, remarks: 'Field verification completed. All survey records match.', daysAgo: 15 },
    { from: 'APPROVAL', to: 'NOTIFICATION', action: 'APPROVE', by: sga, remarks: 'Acquisition approved. Issue Section 11 notification.', daysAgo: 10 },
    { from: 'NOTIFICATION', to: 'COMPENSATION', action: 'FORWARD', by: dlao, remarks: 'Notification published. Proceeding to compensation assessment.', daysAgo: 5 },
  ];

  for (const evt of case2Events) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - evt.daysAgo);
    await query(
      `INSERT INTO workflow_events (id, case_id, from_stage, to_stage, action, performed_by, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [generateId(), case2Id, evt.from, evt.to, evt.action, evt.by.id, evt.remarks, eventDate.toISOString()]
    );
  }

  // ─── Case 3: OVERDUE case at APPROVAL (sent back once) ──────────
  const case3Id = generateId();
  const case3Code = await generateCode('LA', 'acquisition_cases', 'case_code');
  const case3Parcel = parcels.length > 3 ? parcels[3] : parcels[0];

  await query(
    `INSERT INTO acquisition_cases
       (id, case_code, project_id, parcel_id, current_stage, assigned_to, status,
        due_date, is_overdue, priority, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (case_code) DO NOTHING`,
    [
      case3Id, case3Code,
      projects.length > 2 ? projects[2].id : projects[0].id,
      case3Parcel?.id || null,
      WORKFLOW_STAGES.APPROVAL, dlao.id, CASE_STATUS.SENT_BACK,
      '2026-08-20', true, PRIORITY.CRITICAL,
      'Sent back for re-verification due to survey number discrepancy',
    ]
  );

  const case3Events = [
    { from: null, to: 'PROJECT_PROPOSAL', action: 'CREATE', by: dlao, remarks: 'Urgent acquisition for railway overbridge', daysAgo: 45 },
    { from: 'PROJECT_PROPOSAL', to: 'LAND_IDENTIFICATION', action: 'APPROVE', by: sga, remarks: 'Approved under fast-track scheme', daysAgo: 40 },
    { from: 'LAND_IDENTIFICATION', to: 'VERIFICATION', action: 'FORWARD', by: dlao, remarks: 'Parcels identified', daysAgo: 35 },
    { from: 'VERIFICATION', to: 'APPROVAL', action: 'FORWARD', by: fro, remarks: 'Verification complete', daysAgo: 25 },
    { from: 'APPROVAL', to: 'VERIFICATION', action: 'SEND_BACK', by: sga, remarks: 'Survey number mismatch detected. Re-verify parcel boundaries with updated records.', daysAgo: 15 },
    { from: 'VERIFICATION', to: 'APPROVAL', action: 'FORWARD', by: fro, remarks: 'Re-verified with corrected survey records. Updated boundary confirmed.', daysAgo: 8 },
  ];

  for (const evt of case3Events) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - evt.daysAgo);
    await query(
      `INSERT INTO workflow_events (id, case_id, from_stage, to_stage, action, performed_by, remarks, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [generateId(), case3Id, evt.from, evt.to, evt.action, evt.by.id, evt.remarks, eventDate.toISOString()]
    );
  }

  // ─── Case 4: Fresh case at PROJECT_PROPOSAL ──────────────────────
  const case4Id = generateId();
  const case4Code = await generateCode('LA', 'acquisition_cases', 'case_code');

  await query(
    `INSERT INTO acquisition_cases
       (id, case_code, project_id, parcel_id, current_stage, assigned_to, status,
        due_date, priority, remarks)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (case_code) DO NOTHING`,
    [
      case4Id, case4Code,
      projects.length > 3 ? projects[3].id : projects[0].id,
      null,
      WORKFLOW_STAGES.PROJECT_PROPOSAL, dlao.id, CASE_STATUS.PENDING,
      '2026-11-30', PRIORITY.LOW,
      'New acquisition proposal for smart city infrastructure',
    ]
  );

  await query(
    `INSERT INTO workflow_events (id, case_id, from_stage, to_stage, action, performed_by, remarks)
     VALUES ($1, $2, NULL, $3, $4, $5, $6)`,
    [generateId(), case4Id, 'PROJECT_PROPOSAL', 'CREATE', dlao.id, 'New acquisition proposal for smart city infrastructure']
  );

  console.log(`[SEED] Successfully seeded 4 acquisition cases with workflow history.`);
}

module.exports = { seedWorkflow };
