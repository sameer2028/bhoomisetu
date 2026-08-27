-- ============================================================================
--  NATIONAL LAND ACQUISITION & MANAGEMENT SYSTEM — SIH 2026
--  Canonical database schema: PostgreSQL 16 + PostGIS 3.4
--
--  This file is idempotent and is executed by the backend on every startup
--  (see backend/src/config/database.js -> initializeDatabase).
--
--  Spatial reference system: EPSG:4326 (WGS 84) — the standard for web maps.
--  Geodesic measurements (area/length in metres) are computed by casting to
--  ::geography, e.g. ST_Area(geometry::geography).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
--  Shared trigger: keep updated_at accurate without relying on app code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
--  Spatial helper functions
--
--  These keep geodesic maths inside PostGIS so that the API layer never has to
--  approximate areas or buffers in JavaScript.
-- ---------------------------------------------------------------------------

-- Geodesic area of any geometry, expressed in acres (1 acre = 4046.8564224 m2).
CREATE OR REPLACE FUNCTION nla_acres(geom geometry)
RETURNS numeric AS $$
  SELECT CASE
           WHEN geom IS NULL THEN NULL
           ELSE ROUND((ST_Area(geom::geography) / 4046.8564224)::numeric, 4)
         END;
$$ LANGUAGE sql IMMUTABLE;

-- Build a cadastral-style square parcel polygon of a given acreage, centred on
-- a lon/lat point. The half-side is converted from metres to degrees with a
-- latitude correction on longitude, so the resulting geodesic area matches the
-- requested acreage closely.
--
-- area_acres is numeric (matching parcels.area_acres) so that the same query
-- parameter can feed both the column and this function without a type clash.
CREATE OR REPLACE FUNCTION nla_square_parcel(lng double precision,
                                             lat double precision,
                                             area_acres numeric)
RETURNS geometry AS $$
DECLARE
  area_m2     double precision;
  half_side_m double precision;
  d_lat       double precision;
  d_lng       double precision;
BEGIN
  IF lng IS NULL OR lat IS NULL OR area_acres IS NULL OR area_acres <= 0 THEN
    RETURN NULL;
  END IF;

  area_m2 := area_acres::double precision * 4046.8564224;
  half_side_m := sqrt(area_m2) / 2.0;
  d_lat := half_side_m / 111320.0;
  d_lng := half_side_m / (111320.0 * cos(radians(lat)));

  RETURN ST_SetSRID(
    ST_MakePolygon(ST_MakeLine(ARRAY[
      ST_MakePoint(lng - d_lng, lat - d_lat),
      ST_MakePoint(lng + d_lng, lat - d_lat),
      ST_MakePoint(lng + d_lng, lat + d_lat),
      ST_MakePoint(lng - d_lng, lat + d_lat),
      ST_MakePoint(lng - d_lng, lat - d_lat)
    ])), 4326);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Build an acquisition corridor polygon by geodesically buffering a project
-- centreline by half of the corridor width.
CREATE OR REPLACE FUNCTION nla_corridor(centerline geometry, width_m double precision)
RETURNS geometry AS $$
  SELECT CASE
           WHEN centerline IS NULL OR width_m IS NULL OR width_m <= 0 THEN NULL
           ELSE ST_Multi(ST_SetSRID(
                  ST_Buffer(centerline::geography, width_m / 2.0)::geometry, 4326))
         END;
$$ LANGUAGE sql IMMUTABLE;


-- ---------------------------------------------------------------------------
--  users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  full_name      VARCHAR(255) NOT NULL,
  role           VARCHAR(20)  NOT NULL CHECK (role IN ('DLAO','PIA','SGA','FRO','ADMIN')),
  state          VARCHAR(100),
  district       VARCHAR(100),
  phone          VARCHAR(30),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  projects
--  Spatial columns:
--    centerline — project alignment (highway/rail/canal centre line)
--    corridor   — acquisition corridor polygon (centerline buffered by width)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code         VARCHAR(50) UNIQUE NOT NULL,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  project_type         VARCHAR(100),
  implementing_agency  VARCHAR(255),
  state                VARCHAR(100),
  district             VARCHAR(100),
  taluk                VARCHAR(100),
  total_area_required  NUMERIC(12,4),
  total_area_acquired  NUMERIC(12,4) DEFAULT 0,
  status               VARCHAR(20) NOT NULL DEFAULT 'PROPOSED'
                         CHECK (status IN ('PROPOSED','APPROVED','IN_PROGRESS','COMPLETED','CLOSED')),
  start_date           DATE,
  expected_end_date    DATE,
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  centerline           geometry(LineString, 4326),
  corridor             geometry(MultiPolygon, 4326),
  corridor_width_m     INTEGER DEFAULT 60,
  geometry_source      VARCHAR(40) DEFAULT 'SEEDED_SYNTHETIC'
                         CHECK (geometry_source IN ('SEEDED_SYNTHETIC','IMPORTED_ALIGNMENT','MANUAL_DRAW')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  parcels
--  Spatial columns:
--    geometry — cadastral parcel boundary polygon
--    latitude / longitude — cached centroid, kept for non-spatial consumers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_code         VARCHAR(50) UNIQUE NOT NULL,
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  survey_number       VARCHAR(50),
  village             VARCHAR(100),
  taluk               VARCHAR(100),
  district            VARCHAR(100),
  state               VARCHAR(100),
  area_acres          NUMERIC(10,4),
  owner_name          VARCHAR(255),
  owner_contact       VARCHAR(255),
  acquisition_status  VARCHAR(30) NOT NULL DEFAULT 'PROPOSED'
                        CHECK (acquisition_status IN ('PROPOSED','NOTIFIED','UNDER_ACQUISITION',
                                                      'ACQUIRED','POSSESSION_TAKEN','RR_ISSUE')),
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  geometry            geometry(Polygon, 4326),
  geometry_source     VARCHAR(40) DEFAULT 'SEEDED_SYNTHETIC'
                        CHECK (geometry_source IN ('SEEDED_SYNTHETIC','FIELD_GPS','IMPORTED_CADASTRAL','MANUAL_DRAW')),
  geometry_updated_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  acquisition_cases  (workflow engine — Phase 6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acquisition_cases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code      VARCHAR(50) UNIQUE NOT NULL,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id      UUID REFERENCES parcels(id) ON DELETE SET NULL,
  current_stage  VARCHAR(40) NOT NULL DEFAULT 'PROJECT_PROPOSAL',
  assigned_to    UUID REFERENCES users(id) ON DELETE SET NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','SENT_BACK','REJECTED')),
  due_date       DATE,
  is_overdue     BOOLEAN NOT NULL DEFAULT FALSE,
  remarks        TEXT,
  priority       VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                   CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  workflow_events  (audit trail of every workflow transition — Phase 6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID REFERENCES acquisition_cases(id) ON DELETE CASCADE,
  from_stage    VARCHAR(40),
  to_stage      VARCHAR(40),
  action        VARCHAR(20) CHECK (action IN ('APPROVE','FORWARD','SEND_BACK','REJECT','COMPLETE','CREATE')),
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  documents / document_versions  (Phase 7)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code  VARCHAR(50),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id      UUID REFERENCES parcels(id) ON DELETE CASCADE,
  case_id        UUID REFERENCES acquisition_cases(id) ON DELETE CASCADE,
  document_type  VARCHAR(40) CHECK (document_type IN ('LAND_RECORD','SURVEY_REPORT','NOTIFICATION',
                                                      'AWARD_ORDER','COMPENSATION_DOC','POSSESSION_DOC',
                                                      'RR_EVIDENCE','OTHER')),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  file_path      VARCHAR(500),
  file_name      VARCHAR(255),
  file_size      INTEGER,
  mime_type      VARCHAR(100),
  version        INTEGER NOT NULL DEFAULT 1,
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  access_level   VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'
                   CHECK (access_level IN ('PUBLIC','RESTRICTED','CONFIDENTIAL')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES documents(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  file_path     VARCHAR(500),
  file_name     VARCHAR(255),
  file_size     INTEGER,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  change_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  compensation / possession  (Phase 9) — deliberately separate concerns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compensation (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id          UUID REFERENCES parcels(id) ON DELETE CASCADE,
  owner_name         TEXT,
  assessed_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_status     VARCHAR(30) NOT NULL DEFAULT 'Pending'
                       CHECK (payment_status IN ('Pending','Partially Paid','Fully Paid')),
  payment_date       DATE,
  remarks            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS possession (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id              UUID REFERENCES parcels(id) ON DELETE CASCADE,
  case_id                UUID REFERENCES acquisition_cases(id) ON DELETE SET NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'NOT_TAKEN'
                           CHECK (status IN ('NOT_TAKEN','PARTIAL','TAKEN')),
  possession_date        DATE,
  evidence_document_id   UUID REFERENCES documents(id) ON DELETE SET NULL,
  remarks                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  families / rr_activities  (Phase 10)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS families (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code     VARCHAR(50) UNIQUE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id       UUID REFERENCES parcels(id) ON DELETE SET NULL,
  head_of_family  VARCHAR(255),
  members_count   INTEGER DEFAULT 1,
  category        VARCHAR(20) CHECK (category IN ('AFFECTED','DISPLACED')),
  entitlement     TEXT,
  contact         VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rr_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             UUID REFERENCES families(id) ON DELETE CASCADE,
  activity_type         VARCHAR(100),
  description           TEXT,
  responsible_authority UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date              DATE,
  completion_date       DATE,
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','DELAYED')),
  pending_reason        TEXT,
  evidence_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  ai_mismatches / risk_scores  (Phase 8 / 13)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_mismatches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID REFERENCES documents(id) ON DELETE CASCADE,
  parcel_id             UUID REFERENCES parcels(id) ON DELETE CASCADE,
  field_name            VARCHAR(100),
  official_value        VARCHAR(255),
  extracted_value       VARCHAR(255),
  difference            VARCHAR(255),
  severity              VARCHAR(20) CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  explanation           TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'DETECTED'
                          CHECK (status IN ('DETECTED','UNDER_REVIEW','RESOLVED','FALSE_POSITIVE')),
  verification_case_id  UUID REFERENCES acquisition_cases(id) ON DELETE SET NULL,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  score          NUMERIC(5,2),
  risk_level     VARCHAR(20) CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  factors        JSONB,
  model_version  VARCHAR(50),
  calculated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  alerts  (Phase 12)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             VARCHAR(30) CHECK (type IN ('DEADLINE_APPROACHING','DEADLINE_MISSED','OVERDUE',
                                               'MISSING_DOC','DATA_MISMATCH','ESCALATION','HIGH_RISK')),
  title            VARCHAR(255),
  message          TEXT,
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  case_id          UUID REFERENCES acquisition_cases(id) ON DELETE CASCADE,
  parcel_id        UUID REFERENCES parcels(id) ON DELETE CASCADE,
  target_user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  is_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  priority         VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                     CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
--  audit_log  (every significant action, all phases)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50),
  entity_id     VARCHAR(100),
  action        VARCHAR(60),
  performed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    VARCHAR(60),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  mock_gov_sync_log  (Phase 13 — clearly labelled MOCK integration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mock_gov_sync_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_number      VARCHAR(50),
  request_data       JSONB,
  response_data      JSONB,
  validation_result  VARCHAR(20) CHECK (validation_result IN ('MATCH','MISMATCH','ERROR')),
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
--  Schema reconciliation
--
--  CREATE TABLE IF NOT EXISTS will not alter a table that already exists, so
--  columns and geometry types introduced by later phases are reconciled here.
--  Every statement is a no-op on a database created from the current schema.
-- ---------------------------------------------------------------------------

-- Phase 5 added the spatial layer to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS centerline       geometry(LineString, 4326);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS corridor         geometry(MultiPolygon, 4326);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS corridor_width_m INTEGER DEFAULT 60;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS geometry_source  VARCHAR(40) DEFAULT 'SEEDED_SYNTHETIC';

-- Phase 5 added geometry provenance to parcels
ALTER TABLE parcels  ADD COLUMN IF NOT EXISTS geometry            geometry(Polygon, 4326);
ALTER TABLE parcels  ADD COLUMN IF NOT EXISTS geometry_source     VARCHAR(40) DEFAULT 'SEEDED_SYNTHETIC';
ALTER TABLE parcels  ADD COLUMN IF NOT EXISTS geometry_updated_at TIMESTAMPTZ;

-- A corridor produced by a geodesic buffer is a MultiPolygon; widen the column
-- if an earlier revision created it as a plain Polygon.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM geometry_columns
              WHERE f_table_name = 'projects'
                AND f_geometry_column = 'corridor'
                AND type = 'POLYGON') THEN
    ALTER TABLE projects
      ALTER COLUMN corridor TYPE geometry(MultiPolygon, 4326) USING ST_Multi(corridor);
    RAISE NOTICE 'projects.corridor widened to MultiPolygon';
  END IF;
END $$;

-- Phase 9 reconciliation for compensation table
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS owner_name      TEXT;
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS assessed_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS paid_amount     NUMERIC(15,2) DEFAULT 0;
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS payment_date    DATE;
ALTER TABLE compensation ADD COLUMN IF NOT EXISTS remarks         TEXT;

-- Reconcile payment_status check constraint to support 'Pending', 'Partially Paid', 'Fully Paid'
ALTER TABLE compensation DROP CONSTRAINT IF EXISTS compensation_payment_status_check;
ALTER TABLE compensation ADD CONSTRAINT compensation_payment_status_check
  CHECK (payment_status IN ('Pending', 'Partially Paid', 'Fully Paid', 'NOT_ASSESSED', 'ASSESSED', 'APPROVED', 'PARTIALLY_PAID', 'FULLY_PAID'));

-- ---------------------------------------------------------------------------
--  Attribute indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_parcels_project        ON parcels(project_id);
CREATE INDEX IF NOT EXISTS idx_parcels_status         ON parcels(acquisition_status);
CREATE INDEX IF NOT EXISTS idx_parcels_code           ON parcels(parcel_code);
CREATE INDEX IF NOT EXISTS idx_parcels_survey         ON parcels(survey_number);
CREATE INDEX IF NOT EXISTS idx_parcels_geo_admin      ON parcels(state, district, village);
CREATE INDEX IF NOT EXISTS idx_projects_code          ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_geo_admin     ON projects(state, district);
CREATE INDEX IF NOT EXISTS idx_cases_project          ON acquisition_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_cases_parcel           ON acquisition_cases(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned         ON acquisition_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status           ON acquisition_cases(status);
CREATE INDEX IF NOT EXISTS idx_documents_project      ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_parcel       ON documents(parcel_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_case   ON workflow_events(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user            ON alerts(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity           ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_families_project       ON families(project_id);
CREATE INDEX IF NOT EXISTS idx_compensation_parcel    ON compensation(parcel_id);
CREATE INDEX IF NOT EXISTS idx_possession_parcel      ON possession(parcel_id);

-- ---------------------------------------------------------------------------
--  Spatial (GIST) indexes — required for fast ST_Intersects / bbox queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_parcels_geometry_gist     ON parcels  USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_projects_corridor_gist    ON projects USING GIST (corridor);
CREATE INDEX IF NOT EXISTS idx_projects_centerline_gist  ON projects USING GIST (centerline);

-- ---------------------------------------------------------------------------
--  updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['users','projects','parcels','acquisition_cases','documents',
                         'compensation','possession','families','rr_activities'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;
