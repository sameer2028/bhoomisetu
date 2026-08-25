# BhoomiSetu — National Land Acquisition & Management System (SIH 2026)

> Centralized, GIS-enabled platform that digitizes the complete land acquisition lifecycle, automates inter-department workflows, tracks every parcel and affected family, and uses analytics and AI to identify risks, inconsistencies, and delays.

---

## 📖 Setup Instructions

For step-by-step instructions on setting up and running the project locally, please read **[SETUP.md](./SETUP.md)**.

### Quick Start:

```bash
# 1. Start Backend (Terminal 1)
cd backend
npm install
npm run dev

# 2. Start Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔑 Pre-Configured Demo Accounts (Password: `password123`)

- **District Land Acquisition Officer (DLAO)**: `dlao@nla.gov.in`
- **Project Implementing Agency (PIA)**: `pia@nla.gov.in`
- **Senior Government Authority (SGA)**: `sga@nla.gov.in`
- **Field / Revenue Officer (FRO)**: `fro@nla.gov.in`
- **System Administrator**: `admin@nla.gov.in`

---

## 🌟 Key Modules Implemented

- **Phase 1: Project Foundation** — Express backend, React+Vite frontend, SQLite/PostgreSQL schema, design system.
- **Phase 2: Authentication & RBAC** — 5 system roles (`DLAO`, `PIA`, `SGA`, `FRO`, `ADMIN`), JWT authentication, user profile management.
- **Phase 3: Project Management** — Project creation modal, catalog view, status filtering, acquisition progress bars, detail dashboards.
- **Phase 4: Parcel Management** — Survey numbers, village/district tags, owner records, parcel creation modal, parcel detail dashboard.
- **Phase 5: GIS Module** — Leaflet map, PostGIS/GeoJSON polygon rendering, status-based color coding, corridor overlays, survey search, and database-linked parcel details panel.

---

For detailed setup instructions, refer to **[SETUP.md](./SETUP.md)**.
