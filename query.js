require('dotenv').config({ path: './backend/.env' });
const { queryRows } = require('./backend/src/config/database');
async function test() {
  const r = await queryRows("SELECT DISTINCT entity_type FROM audit_log");
  console.log(r);
  process.exit(0);
}
test();
