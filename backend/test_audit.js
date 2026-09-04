require('dotenv').config();
const { queryRows } = require('./src/config/database');
async function run() {
  try {
    const rows = await queryRows("SELECT * FROM audit_log WHERE UPPER(entity_type) = 'AI_MISMATCH' ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(rows, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
