# BhoomiSetu — National Land Acquisition & Management System (SIH 2026)

> **BhoomiSetu (भूमिसेतु)** is a centralized, GIS-enabled digital governance platform that digitizes the end-to-end statutory land acquisition lifecycle under the **RFCTLARR Act 2013**. It automates inter-departmental workflows, tracks every parcel and project-affected family, and leverages an AI verification microservice to detect cadastral discrepancies, extract gazette data, and forecast project delay risks.

---

## 🏛️ System Architecture

```text
bhoomisetu/
├── frontend/               # React (Vite) + Tailwind CSS + Leaflet GIS (Port 5173)
├── backend/                # Node.js + Express + PostgreSQL/PostGIS (Port 5000)
├── ai-service/             # Python FastAPI + Tesseract OCR + Cadastral Engine (Port 8000)
├── database/               # PostGIS spatial schemas & SQL migrations
└── docker-compose.yml      # Multi-container orchestration (DB + AI)
```

---

## 🚀 Quick Start (3-Terminal Setup)

For full step-by-step instructions and environment variable configurations, see **[SETUP.md](./SETUP.md)**.

### 1. Database (Choose One)
- **Neon Cloud (Recommended)**: Create a free database on [neon.tech](https://neon.tech), execute `CREATE EXTENSION IF NOT EXISTS postgis;`, and set `DATABASE_URL` in `.env`.
- **Docker**: Run `docker compose up -d db` in the project root directory.

### 2. Start Services

```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm install
npm run dev

# Terminal 2: Python AI Microservice (Port 8000)
cd ai-service
python -m venv venv
# Activate virtual environment:
# Windows (PowerShell): .\venv\Scripts\Activate.ps1
# Windows (CMD):        .\venv\Scripts\activate.bat
# Linux / macOS:        source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# Terminal 3: Frontend Dashboard (Port 5173)
cd frontend
npm install
npm run dev
```

- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **AI Microservice Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 Pre-Configured Demo Accounts (Password: `password123`)

*All demo accounts come pre-seeded with realistic government projects, cases, and parcels.*

| Role | Email | Authority / Jurisdiction | Primary Capabilities |
|------|-------|--------------------------|----------------------|
| **Senior Government Authority (SGA)** | `sga@nla.gov.in` | Statewide Oversight | Inter-departmental analytics, statewide risk heatmaps, escalation tracking |
| **District Land Acquisition Officer (DLAO)** | `dlao@nla.gov.in` | Lucknow District | Statutory workflow approvals, gazette notifications, compensation disbursement |
| **Project Implementing Agency (PIA)** | `pia@nla.gov.in` | NHAI National Authority | Project proposals, land requisitions, highway corridor alignment tracking |
| **Field / Revenue Officer (FRO)** | `fro@nla.gov.in` | Field Verification Division | Joint measurement surveys, on-site boundary verification, geo-tagged photo evidence |
| **System Administrator (ADMIN)** | `admin@nla.gov.in` | System Configuration | User management, security governance, immutable audit trail inspection |

---

## 🧠 AI Microservice Capabilities

- **Document Ingestion & OCR**: Automated digitization of gazette notifications, survey sheets, and ownership deeds using `pdfplumber` and `pytesseract`.
- **Cadastral Entity Extraction**: Extracts Survey Number, Village, District, Land Area, and Owner Name with per-field confidence scoring.
- **Ground-Truth Comparison**: Cross-verifies extracted document data against official PostGIS Record of Rights (RoR) records using fuzzy string matching (`RapidFuzz`) and area unit normalizers (Hectares, Acres, Bigha, Biswa, Sq.m).
- **4-Factor Weighted Risk Scoring**: Computes real-time project risk indices combining Discrepancies ($35\%$), Statutory Timeline Delays ($25\%$), Compensation Bottlenecks ($25\%$), and R&R Pending Tasks ($15\%$).

---

## 📜 11-Stage Statutory Workflow Engine (RFCTLARR Act 2013)

```text
[PROJECT_PROPOSAL] ➔ [LAND_IDENTIFICATION] ➔ [VERIFICATION] ➔ [APPROVAL]
       ➔ [NOTIFICATION (Sec 11)] ➔ [COMPENSATION (Sec 26-30)] ➔ [AWARD (Sec 23/31)]
       ➔ [PAYMENT (Sec 77)] ➔ [POSSESSION (Sec 38)] ➔ [RR (Sec 31-42)] ➔ [CLOSURE]
```

Every transition enforces role permissions, captures forward/send-back remarks, checks statutory deadlines, and records an immutable entry in `workflow_events`.

---

## 📋 Implementation Roadmap & Phase Status

| Phase | Milestone | Status | Description |
|:-----:|:----------|:------:|:------------|
| **Phase 0** | **Analysis & Architecture** | ✅ Done | PostGIS schema design, REST API specifications, and role matrix. |
| **Phase 1** | **Foundation** | ✅ Done | Express backend, React+Vite UI, PostgreSQL connection pool, design tokens. |
| **Phase 2** | **Authentication & RBAC** | ✅ Done | 5 system roles with JWT auth, route guards, and 1-click login quick fill. |
| **Phase 3** | **Project Management** | ✅ Done | Project proposals, land requisitions, corridor geometries, and timeline tracking. |
| **Phase 4** | **Parcel Management** | ✅ Done | Cadastral plots, ownership records, acquisition status tagging, and survey numbers. |
| **Phase 5** | **Interactive GIS Module** | ✅ Done | Leaflet map with PostGIS spatial polygons, corridor overlays, and survey search. |
| **Phase 6** | **Statutory Workflow** | ✅ Done | End-to-end 11-stage RFCTLARR Act 2013 case pipeline with deadline alerts. |
| **Phase 7** | **Document Management** | ✅ Done | Document repository with versioning, PDF preview, and metadata indexing. |
| **Phase 8** | **AI Mismatch Detection** | ✅ Done | Automated discrepancy detection with interactive side-by-side diffing modal. |
| **Phase 9** | **Compensation & Possession** | ✅ Done | Solatium (100%), market value calculations, bank disbursement, possession orders. |
| **Phase 10** | **Rehabilitation & Resettlement** | ✅ Done | Affected/displaced family tracking, 2nd Schedule entitlement execution. |
| **Phase 11** | **Decision-Maker Dashboard** | ✅ Done | Multi-tier KPI drilldowns (National ➔ State ➔ District ➔ Project) with risk meters. |
| **Phase 12** | **Alerts & Immutable Audit** | ✅ Done | Automated statutory deadline alerts and append-only database audit logging. |
| **Phase 13** | **Mock Government API** | ✅ Done | Simulated Land Records / Bhulekh API query, validation & sync engine. |
| **Phase 14** | **Field / Mobile Experience** | ✅ Done | Responsive field officer verification interface with GPS and photo capture. |
| **Phase 15** | **Final Integration & Polish** | 🔄 Next | End-to-end multi-role demonstration journey and final verification. |

---

For in-depth developer setup guidelines and troubleshooting, please refer to **[SETUP.md](./SETUP.md)**.
