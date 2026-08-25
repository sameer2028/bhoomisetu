const { getDb } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { PROJECT_STATUS } = require('../config/constants');

async function seedProjects() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;

  if (count > 0) {
    console.log('[SEED] Projects table already has data. Skipping project seed.');
    return;
  }

  console.log('[SEED] Seeding synthetic SIH project data...');

  // Find PIA user for created_by
  const piaUser = db.prepare("SELECT id FROM users WHERE role = 'PIA' LIMIT 1").get();
  const createdById = piaUser ? piaUser.id : null;

  const demoProjects = [
    {
      id: generateId(),
      project_code: 'PRJ-2026-001',
      name: 'Lucknow-Kanpur Highway Expansion',
      description: 'Widening of 6-lane Greenfield Access Controlled Highway connecting Lucknow to Kanpur industrial hub.',
      project_type: 'National Highway',
      implementing_agency: 'National Highways Authority of India (NHAI)',
      state: 'Uttar Pradesh',
      district: 'Lucknow',
      taluk: 'Sarojini Nagar',
      total_area_required: 450.50,
      total_area_acquired: 185.20,
      status: PROJECT_STATUS.IN_PROGRESS,
      start_date: '2025-04-01',
      expected_end_date: '2027-03-31',
      created_by: createdById,
    },
    {
      id: generateId(),
      project_code: 'PRJ-2026-002',
      name: 'Purvanchal Freight Corridor',
      description: 'Dedicated rail freight corridor linking Eastern UP logistics nodes to industrial freight hubs.',
      project_type: 'Railways Infrastructure',
      implementing_agency: 'Dedicated Freight Corridor Corporation of India (DFCCIL)',
      state: 'Uttar Pradesh',
      district: 'Ayodhya',
      taluk: 'Sadar',
      total_area_required: 750.00,
      total_area_acquired: 510.00,
      status: PROJECT_STATUS.IN_PROGRESS,
      start_date: '2024-11-15',
      expected_end_date: '2026-12-31',
      created_by: createdById,
    },
    {
      id: generateId(),
      project_code: 'PRJ-2026-003',
      name: 'Ganga Canal Feeder Extension',
      description: 'Sub-surface irrigation canal feeder pipeline for agricultural drought resilience.',
      project_type: 'Irrigation & Waterways',
      implementing_agency: 'UP Irrigation & Water Resources Department',
      state: 'Uttar Pradesh',
      district: 'Varanasi',
      taluk: 'Pindra',
      total_area_required: 280.00,
      total_area_acquired: 0.00,
      status: PROJECT_STATUS.PROPOSED,
      start_date: '2026-09-01',
      expected_end_date: '2028-06-30',
      created_by: createdById,
    },
    {
      id: generateId(),
      project_code: 'PRJ-2026-004',
      name: 'Jewar Airport Link Expressway',
      description: 'Direct 8-lane expressway connecting Noida International Airport to Yamuna Expressway.',
      project_type: 'Expressway',
      implementing_agency: 'Yamuna Expressway Industrial Development Authority (YEIDA)',
      state: 'Uttar Pradesh',
      district: 'Gautam Buddha Nagar',
      taluk: 'Jewar',
      total_area_required: 620.00,
      total_area_acquired: 620.00,
      status: PROJECT_STATUS.COMPLETED,
      start_date: '2023-01-10',
      expected_end_date: '2025-10-30',
      created_by: createdById,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO projects (
      id, project_code, name, description, project_type, implementing_agency,
      state, district, taluk, total_area_required, total_area_acquired,
      status, start_date, expected_end_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((projects) => {
    for (const p of projects) {
      stmt.run(
        p.id, p.project_code, p.name, p.description, p.project_type, p.implementing_agency,
        p.state, p.district, p.taluk, p.total_area_required, p.total_area_acquired,
        p.status, p.start_date, p.expected_end_date, p.created_by
      );
    }
  });

  insertMany(demoProjects);
  console.log(`[SEED] Successfully seeded ${demoProjects.length} synthetic SIH projects.`);
}

module.exports = { seedProjects };
