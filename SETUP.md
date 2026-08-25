# National Land Acquisition & Management System (SIH 2026) — Developer Setup Guide

This guide will help you set up and run the **National Land Acquisition & Management System (BhoomiSetu)** on your local development environment from scratch.

---

## 📋 Prerequisites

Before starting, ensure you have the following software installed on your computer:

1. **Node.js** (v18.0.0 or higher) — [Download Node.js](https://nodejs.org/)
2. **Git** — [Download Git](https://git-scm.com/)
3. **Docker Desktop** *(Optional — required only if running PostgreSQL + PostGIS in a container)* — [Download Docker](https://www.docker.com/products/docker-desktop/)

---

## 🚀 Quick Start Setup (5 Minutes)

### Step 1: Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/sameer2028/bhoomisetu.git
cd bhoomisetu
```

---

### Step 2: Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create the environment file `.env` in the `backend` directory:
   ```env
   PORT=5000
   JWT_SECRET=nla-sih-2026-jwt-secret-key-dev
   JWT_EXPIRES_IN=24h
   DB_PATH=./database.sqlite
   UPLOAD_DIR=./uploads
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

   *(Note: The database tables and synthetic demo data for Users, Projects, Parcels & GIS will auto-seed automatically on your first boot!)*

   You should see:
   ```text
   [DB] All tables initialized
   [SEED] Successfully seeded demo users, projects, parcels, and GIS data.
   Server running on http://localhost:5000
   ```

---

### Step 3: Frontend Setup

Open a **new terminal window** in the project root directory (`bhoomisetu`):

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your web browser and navigate to:
   ```text
   http://localhost:5173
   ```

---

## 🔑 Demo Login Accounts

You can log in with any of the following pre-configured role accounts. Password for all demo accounts is **`password123`**.

| Role | Email | Name | Key Capabilities |
|------|-------|------|------------------|
| **District Land Acquisition Officer (DLAO)** | `dlao@nla.gov.in` | Rajesh Sharma | Full case workflow, parcel verification, compensation, R&R |
| **Project Implementing Agency (PIA)** | `pia@nla.gov.in` | NHAI Authority | Create & submit projects, define land requirements, monitor timeline |
| **Senior Government Authority (SGA)** | `sga@nla.gov.in` | Dr. Vikramaditya Singh | Dashboards, high-risk project analytics, inter-departmental oversight |
| **Field / Revenue Officer (FRO)** | `fro@nla.gov.in` | Amit Kumar Verma | Assigned parcels, GPS field verification, photo evidence |
| **System Administrator** | `admin@nla.gov.in` | System Admin | Full system configuration & audit trail inspection |

*Quick Tip: On the login page, you can click any of the "Demo Accounts" quick-fill buttons to auto-populate credentials instantly!*

---

## 🏗️ Project Architecture & Tech Stack

```text
bhoomisetu/
├── frontend/               # React (Vite) + Tailwind CSS + Leaflet GIS
│   ├── src/
│   │   ├── components/     # Reusable Layout, Forms & GIS Map components
│   │   ├── pages/          # Auth, Dashboard, Projects, Parcels, GIS
│   │   ├── services/       # Axios API client & GIS service
│   │   └── contexts/       # Auth & User state context
│   └── vite.config.js      # Proxy configured to http://127.0.0.1:5000
│
├── backend/                # Node.js + Express + SQLite / PostgreSQL
│   ├── src/
│   │   ├── config/         # DB connection & Constants
│   │   ├── middleware/     # JWT Auth & RBAC
│   │   ├── modules/        # Auth, Users, Projects, Parcels, GIS routes
│   │   └── seeds/          # Auto-seeding scripts for synthetic SIH data
│   └── app.js              # Express app entry point
```

---

## 🐳 Docker & PostgreSQL + PostGIS Setup & Access

This project includes a `docker-compose.yml` file pre-configured with **PostgreSQL 16 + PostGIS 3.4** for spatial data storage and GIS spatial queries.

### 1. Start the Docker Spatial Database Container

Ensure Docker Desktop is open and running on your computer, then execute:

```bash
# Start PostgreSQL + PostGIS container in background
docker compose up -d
```

Check that the container is running healthy:
```bash
docker compose ps
```

---

### 2. Database Connection Credentials

| Property | Value |
|----------|-------|
| **Host** | `localhost` or `127.0.0.1` |
| **Port** | `5432` |
| **Database Name** | `nla_db` |
| **Username** | `nla_user` |
| **Password** | `nla_dev_password` |
| **Connection URL** | `postgresql://nla_user:nla_dev_password@localhost:5432/nla_db` |

---

### 3. Connect Backend to Docker Database

In `backend/.env`, set the `DATABASE_URL`:

```env
DATABASE_URL=postgresql://nla_user:nla_dev_password@localhost:5432/nla_db
```

When you launch the backend (`cd backend && npm run dev`), Express will connect to the Docker container, run `database/init.sql` automatically, and seed all spatial parcel polygons & corridors!

---

### 4. How to Access the Database directly

#### Option A: Command Line (`psql` inside Docker container)
```bash
docker exec -it nla_postgis psql -U nla_user -d nla_db
```

Common psql commands once connected:
- `\dt` — List all tables (`users`, `projects`, `parcels`, etc.)
- `SELECT parcel_code, survey_number, ST_AsText(geometry) FROM parcels;` — Inspect GIS spatial geometries
- `\q` — Exit psql

#### Option B: Database GUI (pgAdmin, DBeaver, VSCode Extension)
Connect your favorite database GUI using:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `nla_db`
- **User**: `nla_user`
- **Password**: `nla_dev_password`

---

### 5. Useful Docker Commands

| Action | Command |
|--------|---------|
| View database logs | `docker compose logs -f db` |
| Stop container (preserve data) | `docker compose down` |
| Reset database & delete all data volume | `docker compose down -v` |

---

## 🛠️ Troubleshooting

### Issue: Proxy `ECONNREFUSED` error on login
- **Solution**: Make sure the backend server (`cd backend && npm run dev`) is running on port `5000` before opening the frontend.

### Issue: Port 5000 or 5173 is already in use
- **Windows Solution**:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

---

## 🎯 Verification Checklist

After running both servers, verify the following features:
- [x] Login page loads with government tricolor branding & demo buttons.
- [x] Login as DLAO (`dlao@nla.gov.in` / `password123`) redirects to `/dashboard`.
- [x] Navigate to **Projects** (`/projects`) — View 4+ synthetic SIH projects with progress bars.
- [x] Navigate to **Parcels** (`/parcels`) — View 8+ surveyed land plot records with owner data.
- [x] Navigate to **GIS Map** (`/gis`) — View Leaflet interactive map with color-coded status polygons, corridor overlay, map legend, and click-to-view parcel side panel.

Enjoy building & exploring **BhoomiSetu**! 🚀
