require('dotenv').config();
const { queryRows, queryOne } = require('../config/database');

async function linkAiDocs() {
  console.log('Linking ai_mismatches to valid documents and parcels...');

  // Get all documents
  const docs = await queryRows('SELECT id, document_code, title, parcel_id FROM documents');
  const parcels = await queryRows('SELECT id, parcel_code, survey_number FROM parcels');

  // Find sample survey doc
  const surveyDoc = docs.find(d => d.document_code === 'DOC-2026-002') || docs[1] || docs[0];
  const sec11Doc = docs.find(d => d.document_code === 'DOC-2026-009') || docs[0];
  const rorDoc = docs.find(d => d.document_code === 'DOC-2026-003') || docs[2] || docs[0];
  const possDoc = docs.find(d => d.document_code === 'DOC-2026-007') || docs[0];

  // Update P-101 mismatches to link to DOC-2026-002 (Joint Measurement Survey 123/2) and DOC-2026-009
  const p101 = parcels.find(p => p.parcel_code === 'P-101');
  if (p101 && surveyDoc) {
    await queryOne(
      `UPDATE ai_mismatches 
          SET document_id = $1 
        WHERE parcel_id = $2 AND document_id IS NULL`,
      [surveyDoc.id, p101.id]
    );
    console.log(`Updated P-101 mismatches to document: ${surveyDoc.title}`);
  }

  // Ensure any remaining NULL document_ids are linked to appropriate documents
  const remaining = await queryRows('SELECT id, parcel_id FROM ai_mismatches WHERE document_id IS NULL');
  for (const m of remaining) {
    const matchedDoc = docs.find(d => d.parcel_id === m.parcel_id) || sec11Doc || docs[0];
    if (matchedDoc) {
      await queryOne('UPDATE ai_mismatches SET document_id = $1 WHERE id = $2', [matchedDoc.id, m.id]);
    }
  }

  console.log('All ai_mismatches now have valid linked documents!');
}

linkAiDocs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
