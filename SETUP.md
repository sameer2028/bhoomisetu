# BhoomiSetu — National Land Acquisition & Management System (SIH 2026)
## Developer Setup & AI Service Configuration Guide

This comprehensive guide walks you through setting up and running the complete **BhoomiSetu** platform on your local development environment:
1. **Node.js Express Backend** (`http://localhost:5000`)
2. **Python FastAPI AI Microservice** (`http://localhost:8000`)
3. **React + Vite Frontend Dashboard** (`http://localhost:5173`)
4. **PostgreSQL + PostGIS Spatial Database**

---

## 📋 System Prerequisites

Before starting, ensure you have the following installed:

| Tool | Recommended Version | Purpose |
|------|-------------------|---------|
| **Node.js** | v18.x or v20.x | Backend API & Frontend Tooling |
| **Python** | v3.10 or v3.11 | AI OCR & Discrepancy Microservice |
| **Git** | Latest | Version Control |
| **Tesseract OCR** | v5.x | Document Optical Character Recognition |
| **Docker Desktop** | Latest *(Optional)* | Local PostgreSQL + PostGIS & AI container |

---

## 🚀 Quick Start (3-Terminal Setup)

### Step 1: Clone Repository

```bash
git clone https://github.com/sameer2028/bhoomisetu.git
cd bhoomisetu
```

---

### Step 2: Database Setup (Choose One)

#### Option A: Neon Cloud PostgreSQL (Fastest — No Local DB Needed)
1. Create a free PostgreSQL database at [neon.tech](https://neon.tech).
2. Run `CREATE EXTENSION IF NOT EXISTS postgis;` in Neon's SQL Editor.
3. Copy your connection URL and paste into `backend/.env` and `ai-service/.env` as `DATABASE_URL`.

#### Option B: Local Docker Database
```bash
docker compose up -d db
```
Connection URL: `postgresql://nla_user:nla_dev_password@localhost:5432/nla_db`

---

### Step 3: Backend Setup (Terminal 1)

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
JWT_SECRET=nla-sih-2026-jwt-secret-key-dev
JWT_EXPIRES_IN=24h
DATABASE_URL=postgresql://nla_user:nla_dev_password@localhost:5432/nla_db
AI_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=./uploads
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```
> The backend will automatically execute schema migrations and seed synthetic government project, parcel, compensation, and workflow data.

---

### Step 4: Python AI Microservice Setup (Terminal 2)

The AI Microservice provides **OCR document digitization, structured cadastral entity extraction, automated cadastral discrepancy comparison, and multi-factor project risk scoring**.

#### 1. Install Tesseract OCR Engine (System Level)

- **Windows**:
  - Download the official Windows installer from [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).
  - Install to default location: `C:\Program Files\Tesseract-OCR`.
  - Add `C:\Program Files\Tesseract-OCR` to your system `PATH` environment variable.
  - *Or install via Chocolatey*: `choco install tesseract`
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt-get update
  sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin poppler-utils libgl1
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install tesseract poppler
  ```

#### 2. Create Python Virtual Environment

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment:
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On Linux/macOS:
source venv/bin/activate
```

#### 3. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Configure AI Environment (`ai-service/.env`)

Create or verify `ai-service/.env`:
```env
PORT=8000
DATABASE_URL=postgresql://nla_user:nla_dev_password@localhost:5432/nla_db
GEMINI_API_KEY=your_gemini_api_key_here
```

#### 5. Start the AI Microservice

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```text
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

#### 6. Verify AI Endpoints

- **Interactive Swagger Documentation**: Open [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health) -> `{"status":"healthy","database":"connected"}`
- **AI Capabilities Status**: [http://localhost:8000/api/ai/status](http://localhost:8000/api/ai/status)

---

### Step 5: Frontend Dashboard Setup (Terminal 3)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Government Login Accounts

All demo accounts use password: **`password123`**

| Role | Email | Name | Key Capabilities |
|------|-------|------|------------------|
| **District Land Acquisition Officer (DLAO)** | `dlao@nla.gov.in` | Rajesh Sharma (Lucknow) | Case workflow, compensation disbursement, R&R, verification |
| **Project Implementing Agency (PIA)** | `pia@nla.gov.in` | NHAI Authority | Project proposal, land requisition, corridor monitoring |
| **Senior Government Authority (SGA)** | `sga@nla.gov.in` | Dr. Vikramaditya Singh | Inter-departmental dashboard, statewide risk analytics, escalations |
| **Field / Revenue Officer (FRO)** | `fro@nla.gov.in` | Amit Kumar Verma | Joint measurement surveys, field verification, photo geotagging |
| **System Administrator (ADMIN)** | `admin@nla.gov.in` | System Administrator | User management, audit logs, system-wide configuration |

---

## 🧠 AI Microservice Capabilities & Architecture

```mermaid
flowchart LR
    A[Scanned Document / PDF] --> B[pytesseract / pdfplumber]
    B --> C[Extractor: 5 Cadastral Fields]
    C --> D[Comparator vs PostGIS RoR Ground Truth]
    D --> E[ai_mismatches Discrepancy Table]
    E --> F[4-Factor Risk Engine]
    F --> G[DLAO / SGA Real-time Dashboard]
```

### Key AI Features:
1. **Multi-Engine Document OCR** (`app/ocr.py`):
   - Native digital PDF parsing via `pdfplumber`.
   - High-accuracy scanned Gazette/Deed OCR via `pytesseract` (`--psm 6`).
2. **Cadastral Entity Extraction** (`app/extractor.py`):
   - Extracts `survey_number`, `village`, `district`, `land_area`, `owner_name` with per-field confidence scores.
3. **Ground-Truth Comparison** (`app/comparator.py`):
   - Exact & phonetic/fuzzy matching on landholder names (`RapidFuzz`).
   - Area unit conversion (Hectares, Acres, Sq. Meters, Bigha, Biswa) with automatic tolerance thresholds (±2%).
4. **4-Factor Weighted Project Risk Engine** (`app/risk.py`):
   - Discrepancy Risk ($W=0.35$)
   - Statutory Delay Risk ($W=0.25$)
   - Compensation Disbursal Risk ($W=0.25$)
   - R&R Rehabilitation Risk ($W=0.15$)

---

## 🐳 Running Complete Stack with Docker Compose

To start both the Spatial Database and the AI Service inside Docker containers:

```bash
docker compose up -d --build
```

Services started:
- **PostgreSQL + PostGIS**: `localhost:5432`
- **AI Microservice**: `localhost:8000`

---

## 🛠️ Troubleshooting

### 1. `tesseract is not installed or it's not in your PATH`
- Ensure Tesseract is installed on your operating system.
- On Windows, verify `C:\Program Files\Tesseract-OCR` is added to your Environment `PATH`, or set `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` in `ai-service/.env`.

### 2. AI Service shows `"database": "disconnected"`
- Check if your `DATABASE_URL` in `ai-service/.env` is accessible and points to an active database.

### 3. Port `8000`, `5000`, or `5173` already in use
- Kill lingering processes on Windows PowerShell:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

---

## 🎯 Verification Checklist

- [x] Backend responds on `http://localhost:5000/api/health`
- [x] AI Microservice responds on `http://localhost:8000/health` & `http://localhost:8000/docs`
- [x] Frontend dashboard loads on `http://localhost:5173`
- [x] AI Document Mismatch page (`/ai/mismatch`) displays detected discrepancies with interactive side-by-side verification modal.
