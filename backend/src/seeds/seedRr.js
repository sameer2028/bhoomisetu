const { query, queryOne, queryRows } = require('../config/database');
const { generateId, generateCode } = require('../utils/helpers');

/**
 * Seed synthetic Rehabilitation & Resettlement (R&R) families and activities.
 * Idempotent — skips if families table already has data.
 */
async function seedRr() {
  const { count } = await queryOne('SELECT COUNT(*) AS count FROM families');

  if (count > 0) {
    console.log('[SEED] Families table already has data. Skipping R&R seed.');
    return;
  }

  const projects = await queryRows('SELECT id, name, project_code FROM projects ORDER BY project_code LIMIT 4');
  const parcels = await queryRows('SELECT id, parcel_code, survey_number, village, project_id FROM parcels ORDER BY parcel_code LIMIT 8');
  const users = await queryRows("SELECT id, full_name, role FROM users WHERE role IN ('DLAO','FRO','PIA') LIMIT 4");
  const documents = await queryRows('SELECT id FROM documents LIMIT 5');

  if (projects.length === 0) {
    console.log('[SEED] No projects found. Skipping R&R seed.');
    return;
  }

  const dlao = users.find(u => u.role === 'DLAO') || users[0];
  const fro = users.find(u => u.role === 'FRO') || users[0];
  const pia = users.find(u => u.role === 'PIA') || users[0];

  console.log('[SEED] Seeding Rehabilitation & Resettlement (R&R) families and activities...');

  const sampleFamilies = [
    {
      head: 'Ramesh Kumar Sharma',
      members: 5,
      category: 'DISPLACED',
      entitlement: 'Constructed House Allotment (Category B) + ₹50,000 Resettlement Grant + 12 Months Subsistence Allowance under RFCTLARR Act 2013 (First Schedule).',
      contact: '+91 98765 43210',
      projectIdx: 0,
      parcelIdx: 0,
      activities: [
        {
          type: 'Housing Site Allocation',
          description: 'Allotment of 120 sq. yard residential plot in Sector 4 Resettlement Colony',
          authority: dlao.id,
          dueDate: '2026-06-30',
          completionDate: '2026-06-25',
          status: 'COMPLETED',
          evidenceDocId: documents[0]?.id || null,
        },
        {
          type: 'One-Time Resettlement Grant',
          description: 'Direct Bank Transfer of ₹50,000 one-time resettlement & shifting allowance',
          authority: dlao.id,
          dueDate: '2026-07-15',
          completionDate: '2026-07-10',
          status: 'COMPLETED',
          evidenceDocId: documents[1]?.id || null,
        },
        {
          type: 'Vocational Skill Training',
          description: 'Enrollment of 2 adult family members in National Skill Development Corporation (NSDC) welding & electrician certification',
          authority: fro.id,
          dueDate: '2026-09-30',
          completionDate: null,
          status: 'IN_PROGRESS',
        },
        {
          type: 'Monthly Subsistence Allowance',
          description: 'Disbursement of ₹3,000 monthly allowance for 12 months post displacement',
          authority: pia.id,
          dueDate: '2026-10-15',
          completionDate: null,
          status: 'PENDING',
        },
      ],
    },
    {
      head: 'Sunita Devi Patel',
      members: 4,
      category: 'AFFECTED',
      entitlement: 'Livelihood Assistance Grant ₹75,000 + Priority Employment Scheme for 1 adult member + Agricultural Equipment Subsidy.',
      contact: '+91 98123 87654',
      projectIdx: 0,
      parcelIdx: 1,
      activities: [
        {
          type: 'Livelihood Rehabilitation Grant',
          description: 'Assessment & approval of ₹75,000 non-farm livelihood restoration grant',
          authority: dlao.id,
          dueDate: '2026-05-20',
          completionDate: '2026-05-18',
          status: 'COMPLETED',
          evidenceDocId: documents[2]?.id || null,
        },
        {
          type: 'Priority Job Opportunity',
          description: 'Registration with Project Implementing Agency for security & administrative roles in NHAI maintenance depot',
          authority: pia.id,
          dueDate: '2026-08-01',
          completionDate: null,
          status: 'DELAYED',
          pendingReason: 'Awaiting agency roster approval from State Transport Department',
        },
      ],
    },
    {
      head: 'Harpreet Singh Gill',
      members: 6,
      category: 'DISPLACED',
      entitlement: 'Constructed House Allotment (Category A) + Cattle Shed Shifting Grant ₹25,000 + Transport Allowance ₹30,000.',
      contact: '+91 94112 33445',
      projectIdx: 1,
      parcelIdx: 2,
      activities: [
        {
          type: 'Cattle Shed Shifting Grant',
          description: 'Sanction and disbursement of ₹25,000 for livestock relocation to village periphery',
          authority: fro.id,
          dueDate: '2026-07-01',
          completionDate: '2026-06-28',
          status: 'COMPLETED',
          evidenceDocId: documents[3]?.id || null,
        },
        {
          type: 'Housing Construction Assistance',
          description: 'Phase-1 tranche payment (30%) for self-construction of house on allotted plot',
          authority: dlao.id,
          dueDate: '2026-09-01',
          completionDate: null,
          status: 'IN_PROGRESS',
        },
        {
          type: 'Transport & Shifting Assistance',
          description: 'Provision of Govt heavy transport truck for household belongings relocation',
          authority: fro.id,
          dueDate: '2026-09-15',
          completionDate: null,
          status: 'PENDING',
        },
      ],
    },
    {
      head: 'Mohammad Alim Qureshi',
      members: 7,
      category: 'DISPLACED',
      entitlement: 'Urban Flat Allotment (EWS Housing Board Scheme) + Artisanal Rehabilitation Grant ₹60,000 + Commercial Shop Site Allotment.',
      contact: '+91 97654 12309',
      projectIdx: 1,
      parcelIdx: 3,
      activities: [
        {
          type: 'Commercial Shop Site Allotment',
          description: 'Allotment of 150 sq. ft kiosk space in Railway Station Plaza Commercial Zone',
          authority: pia.id,
          dueDate: '2026-06-15',
          completionDate: null,
          status: 'DELAYED',
          pendingReason: 'Land demarcation dispute pending resolution with Municipal Corporation',
        },
        {
          type: 'Artisanal Rehabilitation Grant',
          description: 'Grant for leathercraft tools & raw material procurement',
          authority: dlao.id,
          dueDate: '2026-08-10',
          completionDate: '2026-08-05',
          status: 'COMPLETED',
          evidenceDocId: documents[4]?.id || null,
        },
      ],
    },
    {
      head: 'Lakshmi Bai Naik',
      members: 3,
      category: 'AFFECTED',
      entitlement: 'Agricultural Land-for-Land Compensation Option B (1.2 Acres replacement land) + Tube-well Borehole Installation Allowance.',
      contact: '+91 99887 76655',
      projectIdx: 2,
      parcelIdx: 4,
      activities: [
        {
          type: 'Replacement Agricultural Land Allocation',
          description: 'Identification & allotment of 1.2 acres fertile canal-fed land in Survey No 89/1',
          authority: dlao.id,
          dueDate: '2026-10-01',
          completionDate: null,
          status: 'IN_PROGRESS',
        },
        {
          type: 'Irrigation Borehole Subsidy',
          description: 'Release of ₹1,20,000 subsidy for tube-well drilling & solar pump installation',
          authority: fro.id,
          dueDate: '2026-11-15',
          completionDate: null,
          status: 'PENDING',
        },
      ],
    },
    {
      head: 'Venkatesh Rao Kulkarni',
      members: 5,
      category: 'DISPLACED',
      entitlement: 'Resettlement Colony Plot Allotment + One-time Shifting Allowance ₹50,000 + Senior Citizen Healthcare Insurance (Ayushman Card).',
      contact: '+91 91234 56789',
      projectIdx: 2,
      parcelIdx: 5,
      activities: [
        {
          type: 'Resettlement Plot Handover',
          description: 'Physical possession certificate and demarcation of Plot No 42, Green Enclave',
          authority: fro.id,
          dueDate: '2026-07-20',
          completionDate: '2026-07-15',
          status: 'COMPLETED',
          evidenceDocId: documents[0]?.id || null,
        },
        {
          type: 'Healthcare Scheme Enrollment',
          description: 'Issuance of Ayushman Bharat Health Cards for 5 family members',
          authority: dlao.id,
          dueDate: '2026-08-15',
          completionDate: '2026-08-12',
          status: 'COMPLETED',
        },
      ],
    },
  ];

  for (let i = 0; i < sampleFamilies.length; i++) {
    const fData = sampleFamilies[i];
    const famId = generateId();
    const famCode = `FAM-2026-${String(i + 1).padStart(3, '0')}`;
    const proj = projects[fData.projectIdx % projects.length];
    const parc = parcels[fData.parcelIdx % parcels.length];

    await query(
      `INSERT INTO families
         (id, family_code, project_id, parcel_id, head_of_family, members_count, category, entitlement, contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (family_code) DO NOTHING`,
      [famId, famCode, proj.id, parc?.id || null, fData.head, fData.members, fData.category, fData.entitlement, fData.contact]
    );

    for (const act of fData.activities) {
      const actId = generateId();
      await query(
        `INSERT INTO rr_activities
           (id, family_id, activity_type, description, responsible_authority, due_date, completion_date, status, pending_reason, evidence_document_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          actId,
          famId,
          act.type,
          act.description,
          act.authority,
          act.dueDate,
          act.completionDate,
          act.status,
          act.pendingReason || null,
          act.evidenceDocId || null,
        ]
      );
    }
  }

  console.log(`[SEED] Seeded ${sampleFamilies.length} R&R families with corresponding activities successfully.`);
}

module.exports = { seedRr };
