const express = require('express');
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { apiResponse, logAudit, generateId, parsePagination } = require('../../utils/helpers');

const router = express.Router();

/**
 * Common SELECT columns for compensation joined with parcels and projects
 */
const COMPENSATION_SELECT = `
  c.id,
  c.parcel_id,
  COALESCE(c.owner_name, p.owner_name) AS owner_name,
  c.assessed_amount,
  c.paid_amount,
  c.payment_status,
  c.payment_date,
  c.remarks,
  c.created_at,
  c.updated_at,
  p.parcel_code,
  p.survey_number,
  p.village,
  p.taluk,
  p.district,
  p.state,
  p.area_acres,
  p.acquisition_status,
  pr.id AS project_id,
  pr.name AS project_name,
  pr.project_code,
  pr.implementing_agency
`;

/**
 * GET /api/compensation
 * List all compensation records with parcel and project joins,
 * optional filters (project_id, payment_status, search), and summary aggregates.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { project_id, payment_status, search } = req.query;
    const { limit, offset, page } = parsePagination(req.query);

    const conditions = [];
    const params = [];

    if (project_id) {
      params.push(project_id);
      conditions.push(`(p.project_id::text = $${params.length})`);
    }

    if (payment_status) {
      params.push(payment_status);
      conditions.push(`c.payment_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const i = params.length;
      conditions.push(
        `(p.parcel_code ILIKE $${i} OR p.survey_number ILIKE $${i} OR COALESCE(c.owner_name, p.owner_name) ILIKE $${i} OR p.village ILIKE $${i} OR c.remarks ILIKE $${i})`
      );
    }

    // Role-based jurisdiction filtering
    if ((req.user.role === 'DLAO' || req.user.role === 'FRO') && req.user.district) {
      params.push(req.user.district);
      conditions.push(`pr.district = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for current query filter
    const countRow = await queryOne(
      `SELECT COUNT(*) AS count
         FROM compensation c
         JOIN parcels p ON c.parcel_id = p.id
         LEFT JOIN projects pr ON p.project_id = pr.id
         ${whereClause}`,
      params
    );

    // Filtered list
    const records = await queryRows(
      `SELECT ${COMPENSATION_SELECT}
         FROM compensation c
         JOIN parcels p ON c.parcel_id = p.id
         LEFT JOIN projects pr ON p.project_id = pr.id
         ${whereClause}
         ORDER BY c.created_at DESC, p.parcel_code ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // Summary calculated over current filter
    const summaryRow = await queryOne(
      `SELECT 
         COALESCE(SUM(c.assessed_amount), 0) AS total_assessed,
         COALESCE(SUM(c.paid_amount), 0) AS total_paid,
         COUNT(*) AS total_records,
         COUNT(CASE WHEN c.payment_status = 'Fully Paid' THEN 1 END) AS fully_paid_count,
         COUNT(CASE WHEN c.payment_status = 'Partially Paid' THEN 1 END) AS partially_paid_count,
         COUNT(CASE WHEN c.payment_status = 'Pending' THEN 1 END) AS pending_count
       FROM compensation c
       JOIN parcels p ON c.parcel_id = p.id
       LEFT JOIN projects pr ON p.project_id = pr.id
       ${whereClause}`,
      params
    );

    const totalAssessed = parseFloat(summaryRow?.total_assessed || 0);
    const totalPaid = parseFloat(summaryRow?.total_paid || 0);
    const totalPending = Math.max(0, totalAssessed - totalPaid);
    const percentageComplete = totalAssessed > 0 ? Number(((totalPaid / totalAssessed) * 100).toFixed(1)) : 0;

    return apiResponse(res, {
      status: 200,
      success: true,
      data: records,
      meta: {
        total: parseInt(countRow.count, 10),
        page,
        limit,
        totalPages: Math.ceil(countRow.count / limit),
        summary: {
          total_assessed: totalAssessed,
          total_paid: totalPaid,
          total_pending: totalPending,
          percentage_complete: parseFloat(percentageComplete),
          total_records: parseInt(summaryRow?.total_records || 0, 10),
          fully_paid_count: parseInt(summaryRow?.fully_paid_count || 0, 10),
          partially_paid_count: parseInt(summaryRow?.partially_paid_count || 0, 10),
          pending_count: parseInt(summaryRow?.pending_count || 0, 10),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/compensation/:parcelId
 * Fetch compensation detail by parcel ID (or by compensation record ID)
 */
router.get('/:parcelId', authenticate, async (req, res, next) => {
  try {
    const { parcelId } = req.params;

    const record = await queryOne(
      `SELECT ${COMPENSATION_SELECT}
         FROM compensation c
         JOIN parcels p ON c.parcel_id = p.id
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE c.parcel_id::text = $1 OR c.id::text = $1
        LIMIT 1`,
      [parcelId]
    );

    if (!record) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Compensation record not found for the specified parcel / ID',
      });
    }

    return apiResponse(res, {
      status: 200,
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/compensation
 * Add new compensation assessment record
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      parcel_id,
      owner_name,
      assessed_amount,
      paid_amount = 0,
      payment_status = 'Pending',
      payment_date = null,
      remarks = null,
    } = req.body;

    if (!parcel_id) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'parcel_id is required',
      });
    }

    if (assessed_amount === undefined || assessed_amount === null || isNaN(Number(assessed_amount))) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Valid assessed_amount is required',
      });
    }

    // Verify parcel exists
    const parcel = await queryOne('SELECT id, owner_name FROM parcels WHERE id = $1', [parcel_id]);
    if (!parcel) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Selected land parcel not found',
      });
    }

    // Smart validation for payment_status vs amounts
    const finalAssessed = parseFloat(assessed_amount);
    const finalPaid = parseFloat(paid_amount) || 0;

    if (finalPaid < 0) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Paid amount cannot be negative',
      });
    }

    if (finalPaid > finalAssessed) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: `Paid amount (₹${finalPaid.toLocaleString('en-IN')}) cannot exceed assessed amount (₹${finalAssessed.toLocaleString('en-IN')})`,
      });
    }

    // Determine / validate status consistency
    let finalStatus = payment_status;
    if (finalPaid === 0) {
      finalStatus = 'Pending';
    } else if (finalPaid >= finalAssessed && finalAssessed > 0) {
      finalStatus = 'Fully Paid';
    } else if (finalPaid > 0 && finalPaid < finalAssessed) {
      if (payment_status === 'Fully Paid') {
        return apiResponse(res, {
          status: 400,
          success: false,
          error: `Cannot mark status as 'Fully Paid' when Paid Amount (₹${finalPaid.toLocaleString('en-IN')}) is less than Assessed Amount (₹${finalAssessed.toLocaleString('en-IN')}). Please select 'Partially Paid'.`,
        });
      }
      finalStatus = 'Partially Paid';
    }

    const finalOwnerName = owner_name ? owner_name.trim() : parcel.owner_name;
    const finalPaymentDate = payment_date || (finalPaid > 0 ? new Date().toISOString().split('T')[0] : null);

    const id = generateId();

    await query(
      `INSERT INTO compensation (
         id, parcel_id, owner_name, assessed_amount, paid_amount, payment_status, payment_date, remarks, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [id, parcel_id, finalOwnerName, finalAssessed, finalPaid, finalStatus, finalPaymentDate, remarks]
    );

    const createdRecord = await queryOne(
      `SELECT ${COMPENSATION_SELECT}
         FROM compensation c
         JOIN parcels p ON c.parcel_id = p.id
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE c.id = $1`,
      [id]
    );

    await logAudit({
      entityType: 'COMPENSATION',
      entityId: id,
      action: 'CREATE_COMPENSATION',
      performedBy: req.user?.id,
      newValues: createdRecord,
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 201,
      success: true,
      data: createdRecord,
      message: 'Compensation assessment recorded successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/compensation/:id
 * Update paid_amount, payment_status, payment_date, remarks, and optionally assessed_amount
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      paid_amount,
      payment_status,
      payment_date,
      remarks,
      assessed_amount,
      owner_name,
    } = req.body;

    const existing = await queryOne('SELECT * FROM compensation WHERE id = $1', [id]);
    if (!existing) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Compensation record not found',
      });
    }

    const finalAssessed = assessed_amount !== undefined && !isNaN(Number(assessed_amount))
      ? parseFloat(assessed_amount)
      : parseFloat(existing.assessed_amount || 0);

    const finalPaid = paid_amount !== undefined && !isNaN(Number(paid_amount))
      ? parseFloat(paid_amount)
      : parseFloat(existing.paid_amount || 0);

    if (finalPaid < 0) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Paid amount cannot be negative',
      });
    }

    if (finalPaid > finalAssessed && finalAssessed > 0) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: `Paid amount (₹${finalPaid.toLocaleString('en-IN')}) cannot exceed assessed amount (₹${finalAssessed.toLocaleString('en-IN')})`,
      });
    }

    // Determine consistent payment status
    let resolvedStatus = payment_status !== undefined ? payment_status : existing.payment_status;
    if (finalPaid === 0) {
      resolvedStatus = 'Pending';
    } else if (finalPaid >= finalAssessed && finalAssessed > 0) {
      resolvedStatus = 'Fully Paid';
    } else if (finalPaid > 0 && finalPaid < finalAssessed) {
      if (payment_status === 'Fully Paid') {
        return apiResponse(res, {
          status: 400,
          success: false,
          error: `Cannot mark status as 'Fully Paid' when Paid Amount (₹${finalPaid.toLocaleString('en-IN')}) is less than Assessed Amount (₹${finalAssessed.toLocaleString('en-IN')}). Please select 'Partially Paid'.`,
        });
      }
      resolvedStatus = 'Partially Paid';
    }

    const updates = [];
    const params = [];

    params.push(finalPaid);
    updates.push(`paid_amount = $${params.length}`);

    params.push(finalAssessed);
    updates.push(`assessed_amount = $${params.length}`);

    params.push(resolvedStatus);
    updates.push(`payment_status = $${params.length}`);

    if (payment_date !== undefined) {
      params.push(payment_date || null);
      updates.push(`payment_date = $${params.length}`);
    } else if (finalPaid > 0 && !existing.payment_date) {
      params.push(new Date().toISOString().split('T')[0]);
      updates.push(`payment_date = $${params.length}`);
    }

    if (remarks !== undefined) {
      params.push(remarks);
      updates.push(`remarks = $${params.length}`);
    }

    if (owner_name !== undefined) {
      params.push(owner_name.trim());
      updates.push(`owner_name = $${params.length}`);
    }

    if (updates.length === 0) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'No fields provided for update',
      });
    }

    updates.push(`updated_at = now()`);

    params.push(id);
    await query(
      `UPDATE compensation SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    const updatedRecord = await queryOne(
      `SELECT ${COMPENSATION_SELECT}
         FROM compensation c
         JOIN parcels p ON c.parcel_id = p.id
         LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE c.id = $1`,
      [id]
    );

    await logAudit({
      entityType: 'COMPENSATION',
      entityId: id,
      action: 'UPDATE_COMPENSATION',
      performedBy: req.user?.id,
      oldValues: existing,
      newValues: updatedRecord,
      ipAddress: req.ip,
    });

    return apiResponse(res, {
      status: 200,
      success: true,
      data: updatedRecord,
      message: 'Compensation record updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
