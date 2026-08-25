# Build the National Land Acquisition & Management System — SIH 2026

You are the **lead product architect, senior full-stack engineer, GIS engineer, AI engineer, and UI/UX designer** for our SIH 2026 project.

I have attached a document named **“National Land Acquisition & Management System — Complete Problem Understanding, Solution Design and SIH Implementation Blueprint.”**

Treat the attached document as the **primary source of truth for the project requirements and MVP scope**.

Do NOT blindly implement every possible feature described in the document. Follow its explicit SIH MVP boundary and prioritize a **working end-to-end prototype over feature quantity**.

---

## 1. Understand the product first

We are building a centralized **National Land Acquisition & Management System** that digitizes and monitors the land acquisition lifecycle:

**Project Proposal → Land Identification → GIS Mapping → Verification → Approval → Notification → Compensation → Award → Payment → Possession → R&R → Closure**

The core product principle is:

> **One platform should connect projects, land parcels, documents, workflow, compensation, possession and R&R, while GIS and AI help officers identify inconsistencies, risks and delays.**

This is a government workflow and monitoring platform, NOT a generic website and NOT an AI chatbot.

---

# 2. Primary users

Implement role-based access for at least these users:

### District Land Acquisition Officer
Needs:
- Assigned cases
- Parcel verification
- Documents
- Workflow actions
- Deadlines
- Compensation
- Possession
- R&R
- Alerts

### Project Implementing Agency
Needs:
- Create/submit projects
- Define land requirements
- View acquisition progress
- Monitor pending parcels

### Senior Government Authority
Needs:
- State/project comparison
- National/state/district dashboards
- Delayed projects
- High-risk projects
- Compensation and R&R overview

### Field / Revenue Officer
Needs:
- Assigned parcels
- Parcel lookup
- GPS/field verification
- Photos/evidence
- Remarks
- Issue flags

The architecture should allow additional roles later.

---

# 3. Core MVP

The MVP MUST have these working end-to-end:

1. Role-based login
2. Project creation/viewing
3. Small sample parcel dataset
4. Interactive GIS map
5. Parcel detail page/panel
6. Acquisition workflow
7. Document upload
8. Document metadata/version example
9. AI/document mismatch detection
10. Compensation tracking
11. Possession tracking
12. R&R tracking
13. Dashboard with filters and drill-down
14. Deadline alerts
15. Audit trail
16. Mock government API integration
17. One meaningful AI/risk feature

Do NOT overbuild.

Do not spend time creating:
- Huge microservice architecture
- Generic AI chatbot
- Blockchain
- Dozens of unfinished dashboards
- Fake live government integrations
- Complex ML models without useful data
- Nationwide real-time GIS integration

---

# 4. GIS MODULE — VERY IMPORTANT

The GIS module is a core part of the product.

Build an interactive map similar to a professional government land-management GIS application.

Use:

**PostgreSQL + PostGIS + Leaflet or MapLibre**

The map should support:

- Zoom
- Pan
- Project selection
- State/district/village filtering
- Parcel search
- Survey number search
- Parcel polygons
- Project corridor
- Status-based visualization
- Parcel selection
- Parcel details
- Map legend

Parcel statuses should include:

- Proposed
- Notified
- Under Acquisition
- Acquired
- Possession Taken
- R&R / Issue

Clicking a parcel should open its details.

Example:

```text
Parcel ID: P-101
Survey No: 123/2
Village: Sarai Khas
Area: 2.50 acres
Owner: Example Owner
Status: Under Acquisition

Compensation:
Assessed: ₹18,50,000
Paid: ₹15,00,000
Status: Partial Paid

Possession:
Pending

R&R:
2 / 3 families completed

Documents:
Land Record
Survey Report
Award Order

Issues:
Area mismatch detected
```

The GIS should not be a decorative map. It must connect to the underlying parcel/project/workflow data.

---

# 5. AI FEATURE — DOCUMENT MISMATCH DETECTION

This should be one of the strongest features in the prototype.

Example:

Official land record:

```text
Survey No: 123/2
Area: 2.50 acres
Village: ABC
```

Uploaded survey document:

```text
Survey No: 123/2
Area: 2.30 acres
Village: ABC
```

The system should:

1. Accept PDF/image document
2. OCR/extract relevant fields
3. Convert extracted information into structured data
4. Compare extracted values with official parcel records
5. Detect inconsistencies
6. Display the exact mismatch
7. Explain why it was flagged
8. Create a verification case
9. Assign the case to an officer
10. Set a deadline
11. Record the action in the audit trail

Display:

```text
⚠ AREA MISMATCH

Official Record: 2.50 acres
Document:        2.30 acres
Difference:      0.20 acres

Reason:
Area in uploaded survey document differs from
the official parcel record.

Action:
[Send for Manual Verification]
```

IMPORTANT:

AI must NOT declare:

- Fraud
- Illegal ownership
- Legal guilt
- Final acquisition decisions

AI is **decision support**.

It should surface inconsistencies and risks for authorized human review.

---

# 6. WORKFLOW ENGINE

The system must understand where a case currently is.

Example:

```text
Case ID: LA-2026-001

Current Stage:
COMPENSATION ASSESSMENT

Assigned To:
District Land Acquisition Officer

Due Date:
30-Aug-2026

Status:
PENDING
```

Actions:

- Approve / Forward
- Send Back
- Reject
- Complete

The workflow should support:

- Required fields
- Assignment
- Deadlines
- Status
- Remarks
- Escalation
- Audit history

The system must answer:

> Who is responsible for this case?
> What is the next action?
> When is it due?
> Why is it delayed?

---

# 7. DASHBOARD

Create a professional government dashboard.

It should show KPIs such as:

- Total Projects
- Land Proposed
- Land Acquired
- Compensation Assessed
- Compensation Paid
- Affected Families
- Displaced Families
- R&R Progress
- Pending Cases
- Overdue Cases
- High-Risk Projects

Important drill-down:

**National → State → District → Project → Parcel → Case/Family → Document/Event**

Every major dashboard number should lead to useful detail.

---

# 8. DOCUMENT MANAGEMENT

Documents should not simply be uploaded and forgotten.

Support:

- Upload
- Document type
- Project/parcel/case association
- Version
- Uploading user
- Timestamp
- Access permissions
- Audit history
- Search

Example document types:

- Land Record
- Survey Report
- Notification
- Award Order
- Compensation Document
- Possession Document
- R&R Evidence

---

# 9. COMPENSATION

Keep these separate:

```text
Assessed
Approved
Paid
Pending
```

Do not use a single boolean like:

```text
compensationPaid = true
```

because the project needs to represent partial/pending compensation.

---

# 10. POSSESSION

Track:

- Not Taken
- Partial
- Taken
- Possession date
- Supporting evidence

A parcel can be:

**Acquired = Yes**

while:

**Possession = Pending**

Do not incorrectly combine these states.

---

# 11. R&R MODULE

Track affected/displaced families separately from land acquisition.

For each family/case:

- Family ID
- Affected/Displaced status
- Entitlement
- R&R action
- Responsible authority
- Due date
- Completion date
- Pending reason
- Evidence

Dashboard should show:

```text
Affected Families: 127
Displaced Families: 34
R&R Completed: 26
R&R Pending: 8
```

---

# 12. ALERTS

Build useful alerts.

Examples:

### Deadline approaching
Reminder to responsible officer.

### Deadline missed
Mark case overdue.

### Repeated delay
Escalate to higher authority.

### Missing document
Prevent workflow completion and notify responsible user.

### Data mismatch
Create verification flag.

### High-risk project
Show on risk dashboard.

---

# 13. AI / RISK ANALYTICS

If implementing a second AI feature, prioritize a transparent risk score.

Possible factors:

- Pending cases
- Age of pending cases
- Compensation pending
- Affected/displaced families
- R&R completion
- Historical delays
- Data inconsistencies

Show WHY a project is high risk.

Example:

```text
HIGH RISK — 71%

Factors:
• 18 overdue cases
• 32% compensation pending
• 8 unresolved data mismatches
• R&R completion below target
• Historical project delays
```

Do not create an unexplained black-box score.

---

# 14. DATA MODEL

Use a relational architecture.

Important entities:

```text
User
Project
Parcel
AcquisitionCase
Notification
Award
Compensation
Possession
Family
RRActivity
Document
WorkflowEvent
RiskScore
```

A Parcel should contain spatial geometry using PostGIS.

A case should connect:

```text
Project
   ↓
Parcel
   ↓
Acquisition Case
   ↓
Documents
   ↓
Workflow Events
   ↓
Compensation
   ↓
Possession
   ↓
R&R
```

---

# 15. TECHNOLOGY

Use a practical SIH-friendly stack.

Preferred:

### Frontend
React / Next.js
TypeScript
Tailwind CSS

### Backend
Node.js + Express or NestJS

### Database
PostgreSQL
PostGIS

### GIS
Leaflet or MapLibre

### AI
Python + FastAPI

### ML
Scikit-learn / XGBoost if needed

### OCR
Tesseract or cloud OCR

### Mobile
React Native or Flutter if implemented

### Storage
S3-compatible object storage

### Authentication
JWT/OAuth-compatible authentication + RBAC

### API
REST + OpenAPI/Swagger

### Deployment
Docker

For the SIH prototype, a **modular monolith is preferred over unnecessary microservices**.

---

# 16. UI/UX DIRECTION

Design it as a serious modern government platform.

Do NOT make it look like:
- A generic admin template
- A social media website
- A flashy startup landing page
- A chatbot application

Use:

- Clean typography
- Professional government aesthetic
- Strong information hierarchy
- Responsive layout
- Accessible contrast
- Clear status indicators
- Tables + maps + cards
- Minimal unnecessary decoration

The main dashboard should feel like a **mission-control / decision-support system**.

The GIS screen should feel like a professional land-management system.

---

# 17. DEMO STORY

The final prototype should support this exact judge demonstration:

### 0:00
Login as District Land Acquisition Officer.

### 0:20
Open a fictional highway project.

### 0:40
Open GIS map.

### 1:00
Click Parcel P-101.

Show:
- Survey number
- Area
- Status
- Compensation
- Possession
- Documents

### 1:20
Upload survey document.

### 1:40
AI extracts:

```text
Survey No: 123/2
Area: 2.30 acres
```

### 2:00
System compares against official record:

```text
Official: 2.50 acres
Document: 2.30 acres
```

### 2:10
Show explainable mismatch.

### 2:20
Send case for manual verification.

### 2:30
Show:
- Assigned officer
- Deadline
- Workflow status
- Audit event

### 2:40
Open dashboard.

Show:
- Exception KPI
- Project progress
- Compensation
- R&R
- Overdue cases

### 3:00
Drill down from dashboard → project → parcel → evidence.

The demo should tell ONE coherent story instead of showing disconnected features.

---

# 18. DEVELOPMENT APPROACH

Before writing large amounts of code:

### Phase 1 — Architecture
Define:
- Pages
- Components
- Database schema
- API structure
- Roles
- Workflow states
- GIS data model

### Phase 2 — Core application
Implement:
- Authentication
- Dashboard
- Projects
- Parcels
- GIS
- Database

### Phase 3 — Workflow
Implement:
- Case creation
- Assignment
- Status transitions
- Deadlines
- Audit events

### Phase 4 — Documents + AI
Implement:
- Upload
- OCR
- Extraction
- Comparison
- Mismatch alert

### Phase 5 — Compensation + R&R
Implement:
- Compensation states
- Possession
- Families
- R&R

### Phase 6 — Dashboard + alerts
Implement:
- KPIs
- Filters
- Drill-down
- Alerts
- Risk indicators

### Phase 7 — Polish
Improve:
- UI consistency
- Responsive behavior
- Loading/error states
- Empty states
- Accessibility
- Demo data
- Performance

---

# 19. VERY IMPORTANT RULES

1. Do not invent requirements that contradict the attached blueprint.
2. Do not claim access to real government APIs.
3. Clearly label integrations as MOCK when real access is unavailable.
4. Use synthetic/sample data for the prototype.
5. Do not make legal decisions using AI.
6. Do not build a generic chatbot as the main AI feature.
7. Do not overengineer the architecture.
8. Every important alert should have explainable evidence.
9. Every workflow action should create an audit event.
10. Keep GIS, workflow, documents and parcel data connected.
11. Make the prototype actually runnable.
12. Prioritize a complete working flow over dozens of incomplete features.

---

# 20. What I want from you

First, **analyze the attached blueprint completely**.

Then produce:

### A. Product architecture
Explain the complete system architecture and module relationships.

### B. Database design
Provide the schema/entities, relationships and important fields.

### C. Application structure
Define the frontend pages/routes and reusable components.

### D. Backend API design
Define the important REST endpoints.

### E. GIS implementation
Explain how parcel geometry, project corridors, statuses and parcel selection will work.

### F. AI implementation
Explain the document extraction + mismatch detection pipeline.

### G. Workflow implementation
Define stages, transitions, assignments, deadlines and audit events.

### H. MVP implementation plan
Break the project into concrete development tasks in priority order.

### I. Then BUILD
After the architecture is clear, start implementing the actual application.

Do not stop at wireframes or pseudo-code.

The final result should be a **working SIH prototype**, not merely a design document.

If a requirement is ambiguous, choose the simplest implementation that preserves the intent of the blueprint and clearly state the assumption.

Most importantly:

> **Build one complete, convincing acquisition workflow rather than ten disconnected features.**