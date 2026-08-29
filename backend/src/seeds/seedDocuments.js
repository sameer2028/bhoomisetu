const { queryOne, queryRows } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed realistic statutory documents for existing projects, parcels, and cases.
 * Idempotent: skips if documents already exist.
 */
async function seedDocuments() {
  const existing = await queryOne('SELECT COUNT(*) AS count FROM documents');
  if (existing.count > 0) {
    console.log(`[SEED] Documents: ${existing.count} already exist — skipping`);
    return;
  }

  // Fetch existing entities to link documents to
  const projects = await queryRows('SELECT id, project_code, name FROM projects ORDER BY project_code LIMIT 5');
  const parcels = await queryRows('SELECT id, parcel_code, project_id, survey_number, village FROM parcels ORDER BY parcel_code LIMIT 10');
  const cases = await queryRows('SELECT id, case_code, project_id, parcel_id FROM acquisition_cases ORDER BY case_code LIMIT 8');
  const users = await queryRows("SELECT id, full_name, role FROM users WHERE role IN ('DLAO','PIA','FRO','SGA') ORDER BY role");

  if (projects.length === 0 || parcels.length === 0) {
    console.log('[SEED] Documents: No projects/parcels found — skipping');
    return;
  }

  const userMap = {};
  for (const u of users) {
    userMap[u.role] = u.id;
  }

  const year = new Date().getFullYear();
  let docNum = 1;

  function nextCode() {
    return `DOC-${year}-${String(docNum++).padStart(3, '0')}`;
  }

  const docs = [];

  // 1. Gazette Notification (Section 4) for first project
  if (projects[0]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: projects[0].id, parcel_id: null,
      case_id: cases[0]?.id || null,
      document_type: 'NOTIFICATION',
      title: `Section 4(1) Gazette Notification — ${projects[0].name}`,
      description: 'Preliminary notification under Section 4(1) of the Right to Fair Compensation and Transparency in Land Acquisition Act, 2013. Published in the Official Gazette.',
      file_path: '/uploads/sample_gazette_notification_sec4.pdf',
      file_name: 'Gazette_Notification_Sec4_1_Official.pdf',
      file_size: 2457600, // 2.4 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.DLAO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 2. Survey Report for first parcel
  if (parcels[0]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: parcels[0].project_id, parcel_id: parcels[0].id,
      case_id: null,
      document_type: 'SURVEY_REPORT',
      title: `Joint Measurement Survey — ${parcels[0].survey_number}, ${parcels[0].village}`,
      description: 'Joint measurement and survey conducted by the Revenue Department. Includes area calculation, boundary demarcation, and landowner identification.',
      file_path: '/uploads/sample_joint_survey_report.pdf',
      file_name: `JMS_Report_${parcels[0].parcel_code}_Final.pdf`,
      file_size: 1843200, // 1.8 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.FRO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 3. Land Record (ROR) for second parcel
  if (parcels[1]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: parcels[1].project_id, parcel_id: parcels[1].id,
      case_id: null,
      document_type: 'LAND_RECORD',
      title: `Record of Rights (ROR) — Khasra ${parcels[1].survey_number}`,
      description: 'Certified copy of the Record of Rights (Khatauni) from the Revenue Department showing ownership details, area, and incumbrances.',
      file_path: '/uploads/sample_ror_khatauni.pdf',
      file_name: `ROR_Khatauni_${parcels[1].survey_number.replace(/\//g, '_')}.pdf`,
      file_size: 1126400, // 1.1 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.FRO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 4. Award Order for second project
  if (projects[1]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: projects[1].id, parcel_id: parcels[2]?.id || null,
      case_id: cases[1]?.id || null,
      document_type: 'AWARD_ORDER',
      title: `Section 23 Award Order — ${projects[1].name}`,
      description: 'Award made under Section 23 of the Act determining the amount of compensation to be paid for land acquired.',
      file_path: '/uploads/sample_section23_award_order.pdf',
      file_name: 'Section23_Collector_Award_Order.pdf',
      file_size: 3276800, // 3.2 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.DLAO || users[0]?.id,
      access_level: 'RESTRICTED',
    });
  }

  // 5. Compensation document
  if (parcels[3]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: parcels[3].project_id, parcel_id: parcels[3].id,
      case_id: cases[2]?.id || null,
      document_type: 'COMPENSATION_DOC',
      title: `Compensation Disbursement Voucher — ${parcels[3].survey_number}`,
      description: 'Payment voucher for compensation disbursed through Direct Benefit Transfer (DBT) to the landowner bank account.',
      file_path: '/uploads/sample_dbt_disbursement_voucher.pdf',
      file_name: `DBT_Voucher_${parcels[3].parcel_code}.pdf`,
      file_size: 786432, // 768 KB
      mime_type: 'application/pdf',
      uploaded_by: userMap.DLAO || users[0]?.id,
      access_level: 'RESTRICTED',
    });
  }

  // 6. SIA Report for third project
  if (projects[2]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: projects[2].id, parcel_id: null,
      case_id: null,
      document_type: 'SURVEY_REPORT',
      title: `Social Impact Assessment Report — ${projects[2].name}`,
      description: 'Independent Social Impact Assessment (SIA) study conducted as per Section 4(2). Includes socio-economic survey of affected families.',
      file_path: '/uploads/sample_sia_report.pdf',
      file_name: 'SIA_Final_Report_Approved.pdf',
      file_size: 4718592, // 4.5 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.PIA || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 7. Possession certificate
  if (parcels[4]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: parcels[4].project_id, parcel_id: parcels[4].id,
      case_id: cases[3]?.id || null,
      document_type: 'POSSESSION_DOC',
      title: `Possession Certificate — ${parcels[4].survey_number}, ${parcels[4].village}`,
      description: 'Certificate of physical possession taken by the Collector under Section 38. Includes field photographs and GPS coordinates.',
      file_path: '/uploads/sample_possession_certificate.pdf',
      file_name: `Possession_Certificate_${parcels[4].parcel_code}.pdf`,
      file_size: 1572864, // 1.5 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.FRO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 8. R&R Plan
  if (projects[0]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: projects[0].id, parcel_id: null,
      case_id: null,
      document_type: 'RR_EVIDENCE',
      title: `R&R Scheme Document — ${projects[0].name}`,
      description: 'Rehabilitation and Resettlement (R&R) scheme prepared under Section 16 for displaced and affected families.',
      file_path: '/uploads/sample_rr_scheme_document.pdf',
      file_name: 'RR_Approved_Scheme_2026.pdf',
      file_size: 2097152, // 2 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.SGA || users[0]?.id,
      access_level: 'RESTRICTED',
    });
  }

  // 9. Section 11 notification
  if (projects[1]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: projects[1].id, parcel_id: null,
      case_id: cases[4]?.id || null,
      document_type: 'NOTIFICATION',
      title: `Section 11 Declaration — ${projects[1].name}`,
      description: 'Declaration under Section 11 published in the Official Gazette, declaring the intention to acquire land for the project.',
      file_path: '/uploads/sample_section11_declaration.pdf',
      file_name: 'Section11_Gazette_Declaration.pdf',
      file_size: 1929379, // 1.8 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.DLAO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // 10. General document
  if (parcels[5]) {
    docs.push({
      id: uuidv4(), document_code: nextCode(),
      project_id: parcels[5].project_id, parcel_id: parcels[5].id,
      case_id: null,
      document_type: 'OTHER',
      title: `Field Inspection Report — ${parcels[5].survey_number}`,
      description: 'On-site inspection report by the Field Revenue Officer verifying land boundaries, standing crops, and structures.',
      file_path: '/uploads/sample_field_inspection_report.pdf',
      file_name: `Field_Inspection_${parcels[5].parcel_code}.pdf`,
      file_size: 1048576, // 1 MB
      mime_type: 'application/pdf',
      uploaded_by: userMap.FRO || users[0]?.id,
      access_level: 'PUBLIC',
    });
  }

  // Insert all documents
  for (const doc of docs) {
    await queryOne(
      `INSERT INTO documents (id, document_code, project_id, parcel_id, case_id, document_type,
         title, description, file_path, file_name, file_size, mime_type, version, uploaded_by, access_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        doc.id, doc.document_code, doc.project_id, doc.parcel_id, doc.case_id, doc.document_type,
        doc.title, doc.description, doc.file_path, doc.file_name, doc.file_size, doc.mime_type,
        1, doc.uploaded_by, doc.access_level,
      ]
    );
  }

  console.log(`[SEED] Documents: ${docs.length} statutory documents created with complete file metadata`);
}

module.exports = { seedDocuments };
