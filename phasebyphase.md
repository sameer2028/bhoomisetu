# CRITICAL: BUILD PHASE BY PHASE

Do NOT attempt to build the entire application in one operation.

You must develop the project **strictly phase by phase**.

For every phase:

1. First inspect the existing codebase.
2. Identify what is already implemented.
3. Plan only the current phase.
4. Implement only the current phase.
5. Run/build/test the application.
6. Fix errors introduced by the current phase.
7. Verify that previously working functionality still works.
8. Summarize exactly what was implemented.
9. STOP and wait for my instruction before starting the next phase.

**Never automatically continue to the next phase.**

Do not make large unrelated changes to future modules.

---

## PHASE 0 — PROJECT ANALYSIS & ARCHITECTURE

Do NOT write application code yet.

Analyze the attached blueprint and define:

* Product architecture
* User roles
* Frontend routes/pages
* Backend modules
* Database entities and relationships
* GIS data model
* Workflow states
* API structure
* Document architecture
* AI pipeline
* Dashboard structure
* MVP boundaries
* Development dependencies

Also inspect the existing repository before making architectural decisions.

At the end, provide:

* Proposed folder structure
* Database schema
* API structure
* Development roadmap
* Important assumptions

Then STOP.

---

## PHASE 1 — FOUNDATION

Implement ONLY the project foundation.

Build:

* Frontend setup
* Backend setup
* Database connection
* Environment configuration
* Base application layout
* Design system/components
* Basic routing
* Error handling
* Basic API structure

Do NOT implement GIS, AI, workflow, compensation or R&R yet.

Run the application and verify it works.

Then STOP.

---

## PHASE 2 — AUTHENTICATION & RBAC

Implement ONLY:

* Login
* Logout
* User model
* Roles
* Role-based permissions
* Protected routes
* Basic user profile

Roles:

* District Land Acquisition Officer
* Project Implementing Agency
* Senior Government Authority
* Field / Revenue Officer

Test each role.

Do NOT build the other modules yet.

Then STOP.

---

## PHASE 3 — PROJECT MANAGEMENT

Implement:

* Project creation
* Project list
* Project details
* Project status
* Project geography
* Land requirement
* Responsible authorities
* Project timeline

Use realistic synthetic SIH data.

Connect projects to users/roles where appropriate.

Test create → view → update.

Then STOP.

---

## PHASE 4 — PARCEL MANAGEMENT

Implement:

* Parcel model
* Parcel CRUD
* Survey number
* Village
* District
* Area
* Owner/sample owner data
* Acquisition status
* Project association
* Parcel detail page

Create a small realistic dataset.

Do NOT implement advanced GIS yet.

First make sure the parcel database and APIs work correctly.

Then STOP.

---

## PHASE 5 — GIS

Now implement the GIS module.

Use:

* PostgreSQL
* PostGIS
* Leaflet or MapLibre

Implement:

* Project map
* Parcel polygons
* Project corridor
* Zoom/pan
* Parcel selection
* Status-based parcel visualization
* Map legend
* State/district/project filters
* Survey number search
* Parcel detail panel

Clicking a parcel must open its actual database record.

Do NOT create a decorative/static map disconnected from the database.

Test:

Project → GIS → Parcel → Parcel Details.

Then STOP.

---

## PHASE 6 — ACQUISITION WORKFLOW

Implement the workflow engine.

Stages:

PROJECT PROPOSAL
→ LAND IDENTIFICATION
→ VERIFICATION
→ APPROVAL
→ NOTIFICATION
→ COMPENSATION
→ AWARD
→ PAYMENT
→ POSSESSION
→ R&R
→ CLOSURE

Implement:

* Current stage
* Assigned officer
* Due date
* Status
* Remarks
* Approve/Forward
* Send Back
* Reject
* Deadline
* Overdue state
* Audit events

Test one complete case from proposal to possession.

Then STOP.

---

## PHASE 7 — DOCUMENT MANAGEMENT

Implement:

* Document upload
* Document metadata
* Project/parcel/case association
* Document types
* Version history
* Access control
* Audit history
* Document preview/download

Use synthetic documents for the prototype.

Do NOT implement AI yet.

Verify documents correctly connect to projects, parcels and cases.

Then STOP.

---

## PHASE 8 — AI DOCUMENT MISMATCH DETECTION

Now implement the primary AI feature.

Flow:

UPLOAD DOCUMENT
→ OCR
→ STRUCTURED EXTRACTION
→ COMPARE WITH OFFICIAL RECORD
→ DETECT MISMATCH
→ EXPLAIN MISMATCH
→ CREATE VERIFICATION CASE

Example:

Official:

Survey No: 123/2
Area: 2.50 acres

Document:

Survey No: 123/2
Area: 2.30 acres

Output:

Area mismatch:
0.20 acres

Do NOT allow AI to make legal/fraud determinations.

AI is decision support only.

Test the complete flow.

Then STOP.

---

## PHASE 9 — COMPENSATION & POSSESSION

Implement:

### Compensation

* Assessed
* Approved
* Paid
* Pending
* Payment status
* Supporting documents

### Possession

* Not Taken
* Partial
* Taken
* Possession date
* Evidence

Keep acquisition, compensation and possession as separate states.

Test parcel-level tracking.

Then STOP.

---

## PHASE 10 — R&R

Implement:

* Affected families
* Displaced families
* Entitlements
* R&R activities
* Responsible authority
* Due date
* Completion
* Pending reason
* Evidence
* Project-level R&R progress

Test family → R&R activity → completion.

Then STOP.

---

## PHASE 11 — DASHBOARD & ANALYTICS

Now build the decision-maker dashboard.

Include:

* Total projects
* Land proposed
* Land acquired
* Compensation assessed
* Compensation paid
* Affected families
* Displaced families
* R&R progress
* Pending cases
* Overdue cases
* High-risk projects

Implement drill-down:

NATIONAL
→ STATE
→ DISTRICT
→ PROJECT
→ PARCEL
→ CASE
→ DOCUMENT/EVENT

Dashboard numbers must come from actual application data.

Do NOT hard-code KPI numbers except for clearly marked demo/synthetic data.

Then STOP.

---

## PHASE 12 — ALERTS & ESCALATION

Implement:

* Deadline approaching
* Deadline missed
* Overdue case
* Missing document
* Data mismatch
* Escalation
* High-risk alert

Connect alerts to the workflow system.

Then STOP.

---

## PHASE 13 — MOCK GOVERNMENT API

Implement a clearly labelled MOCK integration.

Demonstrate:

Application
→ Land Records API
→ Request
→ Response
→ Validation
→ Database synchronization
→ Sync log

Do NOT claim this is a live government integration.

Then STOP.

---

## PHASE 14 — FIELD / MOBILE EXPERIENCE

If time permits, implement a responsive field interface supporting:

* Assigned parcels
* Parcel lookup
* GPS-ready structure
* Photo/evidence upload
* Verification checklist
* Remarks
* Issue flags

Do not let this phase delay the core web application.

Then STOP.

---

## PHASE 15 — FINAL INTEGRATION & DEMO

Only after all previous phases are individually working:

Test the complete SIH demo:

LOGIN
→ PROJECT
→ GIS
→ PARCEL
→ DOCUMENT
→ AI MISMATCH
→ WORKFLOW
→ COMPENSATION
→ POSSESSION
→ R&R
→ DASHBOARD
→ ALERT
→ AUDIT TRAIL

Fix integration problems.

Do not add new major features during this phase.

Then STOP.

---

# STRICT AGENT BEHAVIOR

You are working with a human developer.

Therefore:

* Do not silently skip phases.
* Do not implement future phases early.
* Do not rewrite working modules unnecessarily.
* Do not replace the architecture without explaining why.
* Do not introduce new technologies without justification.
* Do not create placeholder features and claim they are complete.
* Do not generate fake live government data.
* Do not create a generic chatbot unless explicitly requested.
* Do not over-engineer.

At the end of every phase, report:

### Completed

What was actually implemented.

### Files Changed

Which files were created/modified.

### Database Changes

Any schema/migration changes.

### APIs Added

Endpoints added or modified.

### Tests

What was tested.

### Known Issues

Anything remaining.

### Next Phase

State the next phase, but **DO NOT START IT**.

Then wait for my instruction.

**The highest priority is a stable, working end-to-end prototype—not maximum code generation.**
