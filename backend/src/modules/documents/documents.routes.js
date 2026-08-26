const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, generateId, parsePagination } = require('../../utils/helpers');
const { ROLES, DOCUMENT_TYPES } = require('../../config/constants');
const { generateSamplePdfBuffer } = require('../../utils/pdfGenerator');

const router = express.Router();

// ─── Multer Storage Config ──────────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed.`));
    }
  },
});

/**
 * Generate sequential document code like DOC-2026-001
 */
async function generateDocCode() {
  const year = new Date().getFullYear();
  const pattern = `DOC-${year}-%`;
  const row = await queryOne(
    `SELECT document_code FROM documents
     WHERE document_code LIKE $1
     ORDER BY document_code DESC LIMIT 1`,
    [pattern]
  );

  let nextNum = 1;
  if (row && row.document_code) {
    const parts = row.document_code.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `DOC-${year}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Document type labels for display
 */
const DOC_TYPE_LABELS = {
  LAND_RECORD: 'Land Record / ROR',
  SURVEY_REPORT: 'Survey Report',
  NOTIFICATION: 'Gazette Notification',
  AWARD_ORDER: 'Award Order',
  COMPENSATION_DOC: 'Compensation Document',
  POSSESSION_DOC: 'Possession Certificate',
  RR_EVIDENCE: 'R&R Evidence',
  OTHER: 'Other Document',
};

// =====================================================================
//  GET /api/documents — List all documents with filters & pagination
// =====================================================================
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { project_id, parcel_id, case_id, document_type, access_level, search } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (project_id) {
      params.push(project_id);
      conditions.push(`d.project_id::text = $${params.length}`);
    }
    if (parcel_id) {
      params.push(parcel_id);
      conditions.push(`d.parcel_id::text = $${params.length}`);
    }
    if (case_id) {
      params.push(case_id);
      conditions.push(`d.case_id::text = $${params.length}`);
    }
    if (document_type) {
      params.push(document_type);
      conditions.push(`d.document_type = $${params.length}`);
    }
    if (access_level) {
      params.push(access_level);
      conditions.push(`d.access_level = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.trim()}%`);
      const i = params.length;
      conditions.push(
        `(d.title ILIKE $${i} OR d.document_code ILIKE $${i} OR d.description ILIKE $${i} OR d.file_name ILIKE $${i})`
      );
    }

    // CONFIDENTIAL docs are only visible to SGA and ADMIN
    if (req.user.role !== ROLES.SGA && req.user.role !== ROLES.ADMIN) {
      conditions.push(`d.access_level != 'CONFIDENTIAL'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(`SELECT COUNT(*) AS count FROM documents d ${where}`, params);

    const documents = await queryRows(
      `SELECT d.*,
              u.full_name AS uploaded_by_name,
              u.role AS uploaded_by_role,
              pr.name AS project_name, pr.project_code,
              p.survey_number, p.parcel_code, p.village,
              ac.case_code
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN projects pr ON d.project_id = pr.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
         LEFT JOIN acquisition_cases ac ON d.case_id = ac.id
         ${where}
         ORDER BY d.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: documents,
      meta: {
        total: countRow.count,
        page,
        limit,
        totalPages: Math.ceil(countRow.count / limit),
        documentTypes: DOC_TYPE_LABELS,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  GET /api/documents/:id/file — Serve physical file or on-the-fly PDF
// =====================================================================
router.get('/:id/file', async (req, res, next) => {
  try {
    const doc = await queryOne(
      `SELECT d.*,
              u.full_name AS uploaded_by_name,
              pr.name AS project_name,
              p.survey_number, p.parcel_code, p.village
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN projects pr ON d.project_id = pr.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
        WHERE d.id::text = $1 OR d.document_code = $1`,
      [req.params.id]
    );

    if (!doc) {
      return res.status(404).send('Document not found');
    }

    // Check if real physical file exists on disk
    if (doc.file_path) {
      const fullPath = path.resolve(__dirname, '..', '..', '..', doc.file_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }

    // Generate valid sample PDF buffer on the fly for missing or seeded sample files
    const pdfBuffer = generateSamplePdfBuffer({
      title: doc.title,
      document_code: doc.document_code,
      document_type: doc.document_type,
      project_name: doc.project_name,
      parcel_code: doc.parcel_code,
      survey_number: doc.survey_number,
      village: doc.village,
      description: doc.description,
      uploaded_by: doc.uploaded_by_name,
    });

    const safeFilename = (doc.file_name || `${doc.document_code || 'document'}.pdf`).replace(/[^a-zA-Z0-9_.-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  GET /api/documents/:id — Single document detail with version history
// =====================================================================
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await queryOne(
      `SELECT d.*,
              u.full_name AS uploaded_by_name, u.role AS uploaded_by_role,
              pr.name AS project_name, pr.project_code,
              p.survey_number, p.parcel_code, p.village, p.district AS parcel_district,
              ac.case_code, ac.current_stage
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN projects pr ON d.project_id = pr.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
         LEFT JOIN acquisition_cases ac ON d.case_id = ac.id
        WHERE d.id::text = $1 OR d.document_code = $1`,
      [req.params.id]
    );

    if (!doc) {
      return apiResponse(res, { status: 404, success: false, error: 'Document not found' });
    }

    // Access control: CONFIDENTIAL
    if (doc.access_level === 'CONFIDENTIAL' && req.user.role !== ROLES.SGA && req.user.role !== ROLES.ADMIN) {
      return apiResponse(res, { status: 403, success: false, error: 'Access denied. Confidential document.' });
    }

    // Fetch version history
    const versions = await queryRows(
      `SELECT dv.*, u.full_name AS uploaded_by_name
         FROM document_versions dv
         LEFT JOIN users u ON dv.uploaded_by = u.id
        WHERE dv.document_id = $1
        ORDER BY dv.version DESC`,
      [doc.id]
    );

    // Fetch audit trail for this document
    const auditTrail = await queryRows(
      `SELECT al.*, u.full_name AS performed_by_name
         FROM audit_log al
         LEFT JOIN users u ON al.performed_by = u.id
        WHERE al.entity_type = 'document' AND al.entity_id = $1
        ORDER BY al.created_at DESC
        LIMIT 20`,
      [doc.id]
    );

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        ...doc,
        versions,
        auditTrail,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  POST /api/documents — Upload a new document
// =====================================================================
router.post('/', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.FRO, ROLES.SGA, ROLES.ADMIN), upload.single('file'), async (req, res, next) => {
  try {
    const { title, description, document_type, project_id, parcel_id, case_id, access_level } = req.body;

    if (!title) {
      return apiResponse(res, { status: 400, success: false, error: 'Document title is required.' });
    }

    const id = generateId();
    const document_code = await generateDocCode();
    const docType = document_type && Object.keys(DOCUMENT_TYPES).includes(document_type) ? document_type : 'OTHER';
    const accessLvl = access_level && ['PUBLIC', 'RESTRICTED', 'CONFIDENTIAL'].includes(access_level) ? access_level : 'PUBLIC';

    // File info (file is optional — metadata-only records are valid)
    let file_path = null, file_name = null, file_size = null, mime_type = null;
    if (req.file) {
      file_path = `/uploads/${req.file.filename}`;
      file_name = req.file.originalname;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
    }

    await queryOne(
      `INSERT INTO documents (
         id, document_code, project_id, parcel_id, case_id, document_type,
         title, description, file_path, file_name, file_size, mime_type,
         version, uploaded_by, access_level
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        id, document_code,
        project_id || null, parcel_id || null, case_id || null,
        docType, title.trim(), description ? description.trim() : null,
        file_path, file_name, file_size, mime_type,
        1, req.user.id, accessLvl,
      ]
    );

    // Save initial version record
    if (req.file) {
      await queryOne(
        `INSERT INTO document_versions (id, document_id, version, file_path, file_name, file_size, uploaded_by, change_notes)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7)`,
        [generateId(), id, file_path, file_name, file_size, req.user.id, 'Initial upload']
      );
    }

    const created = await queryOne(
      `SELECT d.*, u.full_name AS uploaded_by_name,
              pr.name AS project_name, pr.project_code,
              p.survey_number, p.parcel_code
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN projects pr ON d.project_id = pr.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
        WHERE d.id = $1`,
      [id]
    );

    await logAudit({
      entityType: 'document',
      entityId: id,
      action: 'UPLOAD_DOCUMENT',
      performedBy: req.user.id,
      newValues: { title: title.trim(), document_type: docType, file_name, document_code },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      message: 'Document uploaded successfully',
      data: created,
    });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  PUT /api/documents/:id — Update document metadata
// =====================================================================
router.put('/:id', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.SGA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM documents WHERE id::text = $1 OR document_code = $1', [req.params.id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'Document not found' });
    }

    const { title, description, document_type, project_id, parcel_id, case_id, access_level } = req.body;

    const updTitle = title !== undefined ? title.trim() : existing.title;
    const updDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;
    const updDocType = document_type !== undefined ? document_type : existing.document_type;
    const updProjectId = project_id !== undefined ? (project_id || null) : existing.project_id;
    const updParcelId = parcel_id !== undefined ? (parcel_id || null) : existing.parcel_id;
    const updCaseId = case_id !== undefined ? (case_id || null) : existing.case_id;
    const updAccessLevel = access_level !== undefined ? access_level : existing.access_level;

    await queryOne(
      `UPDATE documents SET
         title = $1, description = $2, document_type = $3,
         project_id = $4, parcel_id = $5, case_id = $6, access_level = $7
       WHERE id = $8 RETURNING id`,
      [updTitle, updDesc, updDocType, updProjectId, updParcelId, updCaseId, updAccessLevel, existing.id]
    );

    const updated = await queryOne(
      `SELECT d.*, u.full_name AS uploaded_by_name,
              pr.name AS project_name, pr.project_code,
              p.survey_number, p.parcel_code
         FROM documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         LEFT JOIN projects pr ON d.project_id = pr.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
        WHERE d.id = $1`,
      [existing.id]
    );

    await logAudit({
      entityType: 'document',
      entityId: existing.id,
      action: 'UPDATE_DOCUMENT',
      performedBy: req.user.id,
      oldValues: { title: existing.title, document_type: existing.document_type, access_level: existing.access_level },
      newValues: { title: updTitle, document_type: updDocType, access_level: updAccessLevel },
      ipAddress: req.ip,
    });

    return apiResponse(res, { status: 200, success: true, message: 'Document updated', data: updated });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  POST /api/documents/:id/versions — Upload a new version of a document
// =====================================================================
router.post('/:id/versions', authenticate, rbac(ROLES.DLAO, ROLES.PIA, ROLES.FRO, ROLES.SGA, ROLES.ADMIN), upload.single('file'), async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM documents WHERE id::text = $1 OR document_code = $1', [req.params.id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'Document not found' });
    }

    if (!req.file) {
      return apiResponse(res, { status: 400, success: false, error: 'File is required for new version.' });
    }

    const newVersion = existing.version + 1;
    const file_path = `/uploads/${req.file.filename}`;
    const file_name = req.file.originalname;
    const file_size = req.file.size;
    const mime_type = req.file.mimetype;
    const change_notes = req.body.change_notes || `Version ${newVersion} uploaded`;

    // Insert version record
    await queryOne(
      `INSERT INTO document_versions (id, document_id, version, file_path, file_name, file_size, uploaded_by, change_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [generateId(), existing.id, newVersion, file_path, file_name, file_size, req.user.id, change_notes]
    );

    // Update main document record to latest file
    await queryOne(
      `UPDATE documents SET
         file_path = $1, file_name = $2, file_size = $3, mime_type = $4, version = $5
       WHERE id = $6 RETURNING id`,
      [file_path, file_name, file_size, mime_type, newVersion, existing.id]
    );

    await logAudit({
      entityType: 'document',
      entityId: existing.id,
      action: 'NEW_VERSION',
      performedBy: req.user.id,
      oldValues: { version: existing.version, file_name: existing.file_name },
      newValues: { version: newVersion, file_name, change_notes },
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      message: `Version ${newVersion} uploaded successfully`,
      data: { version: newVersion, file_name, file_path },
    });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  DELETE /api/documents/:id — Delete a document (SGA/ADMIN only)
// =====================================================================
router.delete('/:id', authenticate, rbac(ROLES.SGA, ROLES.ADMIN), async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM documents WHERE id::text = $1 OR document_code = $1', [req.params.id]);
    if (!existing) {
      return apiResponse(res, { status: 404, success: false, error: 'Document not found' });
    }

    // Delete physical file(s)
    const versions = await queryRows('SELECT file_path FROM document_versions WHERE document_id = $1', [existing.id]);
    for (const v of versions) {
      if (v.file_path) {
        const fullPath = path.join(__dirname, '..', '..', '..', v.file_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
    }
    if (existing.file_path) {
      const fullPath = path.join(__dirname, '..', '..', '..', existing.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await queryOne('DELETE FROM document_versions WHERE document_id = $1', [existing.id]);
    await queryOne('DELETE FROM documents WHERE id = $1', [existing.id]);

    await logAudit({
      entityType: 'document',
      entityId: existing.id,
      action: 'DELETE_DOCUMENT',
      performedBy: req.user.id,
      oldValues: { title: existing.title, document_code: existing.document_code },
      ipAddress: req.ip,
    });

    return apiResponse(res, { status: 200, success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// =====================================================================
//  GET /api/documents/stats/summary — Document statistics
// =====================================================================
router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const stats = await queryOne(`
      SELECT
        COUNT(*) AS total_documents,
        COUNT(DISTINCT project_id) AS linked_projects,
        COUNT(DISTINCT parcel_id) AS linked_parcels,
        COUNT(DISTINCT case_id) AS linked_cases,
        COALESCE(SUM(file_size), 0) AS total_size_bytes,
        COUNT(CASE WHEN access_level = 'CONFIDENTIAL' THEN 1 END) AS confidential_count,
        COUNT(CASE WHEN access_level = 'RESTRICTED' THEN 1 END) AS restricted_count,
        COUNT(CASE WHEN access_level = 'PUBLIC' THEN 1 END) AS public_count
      FROM documents
    `);

    const byType = await queryRows(`
      SELECT document_type, COUNT(*) AS count
        FROM documents
       GROUP BY document_type
       ORDER BY count DESC
    `);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        ...stats,
        byType,
        documentTypeLabels: DOC_TYPE_LABELS,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
