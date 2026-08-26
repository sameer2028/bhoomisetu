const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
const env = require('./env');

// ─── Type parsers ───────────────────────────────────────────────────
// node-postgres returns NUMERIC/BIGINT as strings and DATE as a JS Date by
// default. The application (and the React UI) expects plain numbers and
// 'YYYY-MM-DD' date strings, so we normalise those here — once, globally.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(types.builtins.DATE, (v) => v); // keep the raw 'YYYY-MM-DD'

const SCHEMA_FILE = path.resolve(__dirname, '..', '..', '..', 'database', 'init.sql');

let pool;

/**
 * Lazily create the connection pool.
 */
function getPool() {
  if (!pool) {
    const isCloudDb =
      env.databaseUrl.includes('neon.tech') ||
      env.databaseUrl.includes('supabase') ||
      env.databaseUrl.includes('sslmode=require');

    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: isCloudDb ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected idle client error:', err.message);
    });
  }
  return pool;
}

/**
 * Run a parameterised query. Returns the full pg result.
 */
function query(sql, params = []) {
  return getPool().query(sql, params);
}

/**
 * Run a query and return all rows.
 */
async function queryRows(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows;
}

/**
 * Run a query and return the first row, or null.
 */
async function queryOne(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows[0] || null;
}

/**
 * Execute a callback inside a transaction. The callback receives a dedicated
 * client; the transaction is committed on success and rolled back on throw.
 */
async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Wait for the database container to accept connections.
 */
async function waitForDatabase(attempts = 20, delayMs = 1500) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await getPool().query('SELECT 1');
      return;
    } catch (err) {
      if (i === attempts) {
        throw new Error(
          `Could not connect to PostgreSQL after ${attempts} attempts: ${err.message}\n` +
          `Is the spatial database running?  ->  docker compose up -d`
        );
      }
      if (i === 1) {
        console.log('[DB] Waiting for PostgreSQL/PostGIS to become available...');
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Apply the canonical schema (database/init.sql) and seed synthetic demo data.
 * The schema file is idempotent, so this is safe on every boot.
 */
async function initializeDatabase() {
  await waitForDatabase();

  const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  await getPool().query(schemaSql);

  const { rows } = await getPool().query('SELECT PostGIS_Version() AS postgis, version() AS pg');
  console.log(`[DB] Connected to PostgreSQL — ${rows[0].pg.split(',')[0]}`);
  console.log(`[DB] PostGIS ${rows[0].postgis}`);
  console.log('[DB] Schema applied from database/init.sql');

  // Seed synthetic demo data (each seeder is idempotent)
  const { seedUsers } = require('../seeds/seedUsers');
  const { seedProjects } = require('../seeds/seedProjects');
  const { seedParcels } = require('../seeds/seedParcels');
  const { seedGis } = require('../seeds/seedGis');

  await seedUsers();
  await seedProjects();
  await seedParcels();
  await seedGis();
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

module.exports = {
  getPool,
  query,
  queryRows,
  queryOne,
  withTransaction,
  initializeDatabase,
  closeDb,
};
