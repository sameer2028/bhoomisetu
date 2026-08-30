# BhoomiSetu — National Land Acquisition & Management System (SIH 2026)

> Centralized, GIS-enabled platform that digitizes the complete land acquisition lifecycle, automates inter-departmental statutory workflows, tracks every parcel and affected family, and uses an AI verification microservice to identify cadastral discrepancies, document inconsistencies, and project delay risks.

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

For full step-by-step instructions, see **[SETUP.md](./SETUP.md)**.

### 1. Database (Choose One)
- **Neon Cloud (Recommended)**: Create free database on [neon.tech](https://neon.tech), execute `CREATE EXTENSION postgis;`, set `DATABASE_URL` in `.env`.
- **Docker**: Run `docker compose up -d db` in root directory.

### 2. Start Services

```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm install
npm run dev

# Terminal 2: Python AI Microservice (Port 8000)
cd ai-service
python -m venv venv
# Activate virtual environment: .\venv\Scripts\Activate.ps1 (Win) or source venv/bin/activate (Linux/Mac)
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# Terminal 3: Frontend Dashboard (Port 5173)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
AI API Swagger Documentation: `http://localhost:8000/docs`

---

## 🧠 AI Microservice Capabilities

- **Document Ingestion & OCR**: Automated digitization of gazette notifications, survey sheets, and ownership deeds using `pdfplumber` and `pytesseract`.
- **Cadastral Entity Extraction**: Extracts Survey Number, Village, District, Land Area, and Owner Name with per-field confidence scoring.
- **Ground-Truth Comparison**: Cross-verifies extracted document data against official PostGIS Record of Rights (RoR) records using fuzzy string matching and area unit normalizers.
- **4-Factor Weighted Risk Scoring**: Computes real-time project risk indices combining Discrepancies ($35\%$), Statutory Timeline Delays ($25\%$), Compensation Bottlenecks ($25\%$), and R&R Pending Tasks ($15\%$).

---

## 🔑 Pre-Configured Demo Accounts (Password: `password123`)

| Role | Email | Jurisdiction / Authority |
|------|-------|--------------------------|
| **District Land Acquisition Officer (DLAO)** | `dlao@nla.gov.in` | Lucknow District |
| **Project Implementing Agency (PIA)** | `pia@nla.gov.in` | NHAI National Authority |
| **Senior Government Authority (SGA)** | `sga@nla.gov.in` | Statewide Oversight |
| **Field / Revenue Officer (FRO)** | `fro@nla.gov.in` | Field Verification Division |
| **System Administrator (ADMIN)** | `admin@nla.gov.in` | System Configuration |

---

## 🌟 Key Modules Implemented

- **Phase 1: Project Foundation** — Express backend, React+Vite dashboard, PostgreSQL schema, design system.
- **Phase 2: Authentication & RBAC** — 5 system roles with granular permission guards and JWT authentication.
- **Phase 3: Project Management** — Project proposals, acquisition progress meters, and timeline tracking.
- **Phase 4: Parcel Management** — Geo-referenced survey plots, ownership records, and acquisition status tags.
- **Phase 5: GIS Module** — Leaflet interactive map, PostGIS polygon rendering, corridor overlays, and survey search.
- **Phase 6: 11-Stage Statutory Workflow** — End-to-end RFCTLARR Act 2013 case pipeline with transition enforcement.
- **Phase 7: Statutory Documents** — Secure document repository with PDF preview and access controls.
- **Phase 8: AI Verification Engine** — Automated discrepancy detection with side-by-side interactive document diffing.
- **Phase 9: Compensation Management** — Award estimation, solatium calculation, and direct bank disbursement tracking.
- **Phase 10: Rehabilitation & Resettlement (R&R)** — Displaced/affected family tracking and entitlement package execution.

---

For in-depth setup guidelines, please refer to **[SETUP.md](./SETUP.md)**.
