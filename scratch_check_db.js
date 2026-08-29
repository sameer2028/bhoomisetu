require('dotenv').config({ path: './backend/.env' });
const { queryRows } = require('./backend/src/config/database');

async function check() {
  const mismatches = await queryRows('SELECT id, parcel_id, document_id, field_name FROM ai_mismatches LIMIT 10');
  console.log('Mismatches:', mismatches);

  const parcels = await queryRows('SELECT id, parcel_code, project_id FROM parcels LIMIT 10');
  console.log('Parcels:', parcels);

  const docs = await queryRows('SELECT id, document_code, title, parcel_id, file_path FROM documents LIMIT 10');
  console.log('Docs:', docs);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
