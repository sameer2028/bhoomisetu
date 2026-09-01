const readline = require('readline');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_A4etUuqzx8Ep@ep-steep-hat-ayxde6gt-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runQuery(sql) {
  const trimmed = sql.trim().replace(/;+$/, '');
  if (!trimmed) return;

  let querySql = trimmed;
  if (trimmed === '\\dt' || trimmed.toLowerCase() === 'show tables') {
    querySql = "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;";
  } else if (trimmed.startsWith('\\d ')) {
    const tbl = trimmed.split(' ')[1];
    querySql = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tbl}' ORDER BY ordinal_position;`;
  }

  try {
    const res = await pool.query(querySql);
    if (res.rows && res.rows.length > 0) {
      console.table(res.rows);
      console.log(`(${res.rows.length} row${res.rows.length === 1 ? '' : 's'})\n`);
    } else if (res.rows) {
      console.log('(0 rows)\n');
    } else {
      console.log('Query executed successfully.\n');
    }
  } catch (err) {
    console.error('SQL Error:', err.message, '\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const sql = args.join(' ');
    await runQuery(sql);
    await pool.end();
    return;
  }

  console.log('============================================================');
  console.log(' Connected to BhoomiSetu Neon PostgreSQL Database');
  console.log(" Type SQL queries, \\dt (list tables), \\d <table_name>, or 'exit'");
  console.log('============================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'bhoomisetu-db> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const cmd = line.trim();
    if (cmd.toLowerCase() === 'exit' || cmd.toLowerCase() === 'quit' || cmd === '\\q') {
      rl.close();
      return;
    }
    if (cmd) {
      await runQuery(cmd);
    }
    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Exiting database shell.');
    await pool.end();
    process.exit(0);
  });
}

main();
