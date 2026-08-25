const Database = require('better-sqlite3');
const path = require('path');
const env = require('./env');

const dbPath = path.resolve(__dirname, '..', '..', env.dbPath);
let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log(`[DB] Connected to SQLite at ${dbPath}`);
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Connection closed');
  }
}

function initializeDatabase() {
  const database = getDb();

  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('DLAO','PIA','SGA','FRO','ADMIN')),
      state TEXT,
      district TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      project_type TEXT,
      implementing_agency TEXT,
      state TEXT,
      district TEXT,
      taluk TEXT,
      total_area_required REAL,
      total_area_acquired REAL DEFAULT 0,
      status TEXT DEFAULT 'PROPOSED' CHECK(status IN ('PROPOSED','APPROVED','IN_PROGRESS','COMPLETED','CLOSED')),
      start_date TEXT,
      expected_end_date TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Parcels table
    CREATE TABLE IF NOT EXISTS parcels (
      id TEXT PRIMARY KEY,
      parcel_code TEXT UNIQUE NOT NULL,
      project_id TEXT REFERENCES projects(id),
      survey_number TEXT,
      village TEXT,
      taluk TEXT,
      district TEXT,
      state TEXT,
      area_acres REAL,
      owner_name TEXT,
      owner_contact TEXT,
      acquisition_status TEXT DEFAULT 'PROPOSED' CHECK(acquisition_status IN ('PROPOSED','NOTIFIED','UNDER_ACQUISITION','ACQUIRED','POSSESSION_TAKEN','RR_ISSUE')),
      latitude REAL,
      longitude REAL,
      geometry_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Acquisition Cases table
    CREATE TABLE IF NOT EXISTS acquisition_cases (
      id TEXT PRIMARY KEY,
      case_code TEXT UNIQUE NOT NULL,
      project_id TEXT REFERENCES projects(id),
      parcel_id TEXT REFERENCES parcels(id),
      current_stage TEXT DEFAULT 'PROJECT_PROPOSAL',
      assigned_to TEXT REFERENCES users(id),
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','SENT_BACK','REJECTED')),
      due_date TEXT,
      is_overdue INTEGER DEFAULT 0,
      remarks TEXT,
      priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Workflow Events (audit trail)
    CREATE TABLE IF NOT EXISTS workflow_events (
      id TEXT PRIMARY KEY,
      case_id TEXT REFERENCES acquisition_cases(id),
      from_stage TEXT,
      to_stage TEXT,
      action TEXT CHECK(action IN ('APPROVE','FORWARD','SEND_BACK','REJECT','COMPLETE','CREATE')),
      performed_by TEXT REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Documents table
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      document_code TEXT,
      project_id TEXT REFERENCES projects(id),
      parcel_id TEXT REFERENCES parcels(id),
      case_id TEXT REFERENCES acquisition_cases(id),
      document_type TEXT CHECK(document_type IN ('LAND_RECORD','SURVEY_REPORT','NOTIFICATION','AWARD_ORDER','COMPENSATION_DOC','POSSESSION_DOC','RR_EVIDENCE','OTHER')),
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      version INTEGER DEFAULT 1,
      uploaded_by TEXT REFERENCES users(id),
      access_level TEXT DEFAULT 'PUBLIC' CHECK(access_level IN ('PUBLIC','RESTRICTED','CONFIDENTIAL')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Document Versions
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id),
      version INTEGER,
      file_path TEXT,
      file_name TEXT,
      file_size INTEGER,
      uploaded_by TEXT REFERENCES users(id),
      change_notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Compensation table
    CREATE TABLE IF NOT EXISTS compensation (
      id TEXT PRIMARY KEY,
      parcel_id TEXT REFERENCES parcels(id),
      case_id TEXT REFERENCES acquisition_cases(id),
      amount_assessed REAL,
      amount_approved REAL,
      amount_paid REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'NOT_ASSESSED' CHECK(payment_status IN ('NOT_ASSESSED','ASSESSED','APPROVED','PARTIALLY_PAID','FULLY_PAID')),
      payment_date TEXT,
      payment_reference TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Possession table
    CREATE TABLE IF NOT EXISTS possession (
      id TEXT PRIMARY KEY,
      parcel_id TEXT REFERENCES parcels(id),
      case_id TEXT REFERENCES acquisition_cases(id),
      status TEXT DEFAULT 'NOT_TAKEN' CHECK(status IN ('NOT_TAKEN','PARTIAL','TAKEN')),
      possession_date TEXT,
      evidence_document_id TEXT REFERENCES documents(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Families table
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      family_code TEXT UNIQUE,
      project_id TEXT REFERENCES projects(id),
      parcel_id TEXT REFERENCES parcels(id),
      head_of_family TEXT,
      members_count INTEGER DEFAULT 1,
      category TEXT CHECK(category IN ('AFFECTED','DISPLACED')),
      entitlement TEXT,
      contact TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- R&R Activities
    CREATE TABLE IF NOT EXISTS rr_activities (
      id TEXT PRIMARY KEY,
      family_id TEXT REFERENCES families(id),
      activity_type TEXT,
      description TEXT,
      responsible_authority TEXT REFERENCES users(id),
      due_date TEXT,
      completion_date TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','DELAYED')),
      pending_reason TEXT,
      evidence_document_id TEXT REFERENCES documents(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- AI Mismatches
    CREATE TABLE IF NOT EXISTS ai_mismatches (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id),
      parcel_id TEXT REFERENCES parcels(id),
      field_name TEXT,
      official_value TEXT,
      extracted_value TEXT,
      difference TEXT,
      severity TEXT CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      explanation TEXT,
      status TEXT DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','UNDER_REVIEW','RESOLVED','FALSE_POSITIVE')),
      verification_case_id TEXT REFERENCES acquisition_cases(id),
      detected_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    -- Risk Scores
    CREATE TABLE IF NOT EXISTS risk_scores (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      score REAL,
      risk_level TEXT CHECK(risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      factors TEXT,
      calculated_at TEXT DEFAULT (datetime('now'))
    );

    -- Alerts
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('DEADLINE_APPROACHING','DEADLINE_MISSED','OVERDUE','MISSING_DOC','DATA_MISMATCH','ESCALATION','HIGH_RISK')),
      title TEXT,
      message TEXT,
      project_id TEXT REFERENCES projects(id),
      case_id TEXT REFERENCES acquisition_cases(id),
      parcel_id TEXT REFERENCES parcels(id),
      target_user_id TEXT REFERENCES users(id),
      is_read INTEGER DEFAULT 0,
      is_acknowledged INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
      created_at TEXT DEFAULT (datetime('now')),
      acknowledged_at TEXT
    );

    -- Audit Log
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT,
      entity_id TEXT,
      action TEXT,
      performed_by TEXT REFERENCES users(id),
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Mock Government Sync Log
    CREATE TABLE IF NOT EXISTS mock_gov_sync_log (
      id TEXT PRIMARY KEY,
      survey_number TEXT,
      request_data TEXT,
      response_data TEXT,
      validation_result TEXT CHECK(validation_result IN ('MATCH','MISMATCH','ERROR')),
      synced_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_parcels_project ON parcels(project_id);
    CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(acquisition_status);
    CREATE INDEX IF NOT EXISTS idx_cases_project ON acquisition_cases(project_id);
    CREATE INDEX IF NOT EXISTS idx_cases_assigned ON acquisition_cases(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON acquisition_cases(status);
    CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_documents_parcel ON documents(parcel_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_events_case ON workflow_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_families_project ON families(project_id);
    CREATE INDEX IF NOT EXISTS idx_compensation_parcel ON compensation(parcel_id);
    CREATE INDEX IF NOT EXISTS idx_possession_parcel ON possession(parcel_id);
  `);

  console.log('[DB] All tables initialized');
  // Auto-seed users & projects
  const { seedUsers } = require('../seeds/seedUsers');
  const { seedProjects } = require('../seeds/seedProjects');
  seedUsers()
    .then(() => seedProjects())
    .catch(err => console.error('[SEED] Error seeding data:', err));
  return database;
}

module.exports = { getDb, closeDb, initializeDatabase };
