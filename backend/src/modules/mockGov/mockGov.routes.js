const express = require('express');
const { query, queryOne, queryRows } = require('../../config/database');
const { authenticate } = require('../../middleware/auth');
const { rbac } = require('../../middleware/rbac');
const { apiResponse, logAudit, parsePagination } = require('../../utils/helpers');
const { ROLES } = require('../../config/constants');

const router = express.Router();

/**
 * Available Mock State Land Registry Providers
 */
const MOCK_REGISTRIES = [
  {
    id: 'UP_BHULEKH',
    name: 'UP Bhulekh (Uttar Pradesh Land Records Portal)',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    apiUrl: 'https://mock.upbhulekh.gov.in/api/v2/ror/fetch',
    status: 'ONLINE',
    avgLatencyMs: 140,
    authority: 'Board of Revenue, Government of Uttar Pradesh',
  },
  {
    id: 'MP_BHUABHILEKH',
    name: 'MP Bhu-Abhilekh (Madhya Pradesh Land Registry)',
    state: 'Madhya Pradesh',
    stateCode: 'MP',
    apiUrl: 'https://mock.landrecords.mp.gov.in/api/khasra/query',
    status: 'ONLINE',
    avgLatencyMs: 180,
    authority: 'Commissioner of Land Records & Settlement, MP',
  },
  {
    id: 'BHOOMI_KA',
    name: 'Bhoomi Portal (Karnataka Revenue Department)',
    state: 'Karnataka',
    stateCode: 'KA',
    apiUrl: 'https://mock.bhoomi.karnataka.gov.in/api/v1/rtc/search',
    status: 'ONLINE',
    avgLatencyMs: 115,
    authority: 'Revenue Department, Government of Karnataka',
  },
  {
    id: 'MAHABHULEKH',
    name: 'MahaBhulekh (Maharashtra 7/12 Extract Portal)',
    state: 'Maharashtra',
    stateCode: 'MH',
    apiUrl: 'https://mock.bhulekh.mahabhumi.gov.in/api/7-12/extract',
    status: 'ONLINE',
    avgLatencyMs: 160,
    authority: 'Revenue & Forest Department, Maharashtra',
  },
];

/**
 * GET /api/mock-gov/registries
 * List simulated state land record databases
 */
router.get('/registries', authenticate, async (req, res, next) => {
  try {
    return apiResponse(res, {
      status: 200,
      success: true,
      data: MOCK_REGISTRIES,
      meta: {
        isMockIntegration: true,
        notice: 'SIMULATED GOVERNMENT API INTEGRATION — For testing and demonstration purposes only.',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mock-gov/query
 * Simulate external REST request to state land registry for a given survey number
 */
router.post('/query', authenticate, async (req, res, next) => {
  try {
    const { registry_id = 'UP_BHULEKH', survey_number, district, village, parcel_id, scenario } = req.body;

    if (!survey_number) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Survey number is required to query land registry.',
      });
    }

    const registry = MOCK_REGISTRIES.find((r) => r.id === registry_id) || MOCK_REGISTRIES[0];

    // Check if parcel exists in local DB to construct intelligent matching/variance mock data
    let localParcel = null;
    if (parcel_id) {
      localParcel = await queryOne('SELECT * FROM parcels WHERE id = $1', [parcel_id]);
    } else {
      localParcel = await queryOne('SELECT * FROM parcels WHERE survey_number ILIKE $1 LIMIT 1', [survey_number]);
    }

    const simTimeMs = Math.floor(Math.random() * 80) + 110;
    const reqId = `REQ-NIC-${registry.stateCode}-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    // Base mock response data
    let mockRecord = null;
    let scenarioType = scenario || 'EXACT_MATCH';

    if (localParcel) {
      const baseArea = parseFloat(localParcel.area_acres) || 2.45;
      const baseOwner = localParcel.owner_name || 'Rameshwar Prasad Sharma';
      const baseVillage = localParcel.village || 'Mohanlalganj';
      const baseDistrict = localParcel.district || 'Lucknow';

      if (scenarioType === 'AREA_VARIANCE') {
        mockRecord = {
          khasra_survey_no: survey_number || localParcel.survey_number,
          khatauni_no: `KH-${Math.floor(Math.random() * 8000 + 1000)}/2024`,
          village_name: baseVillage,
          district_name: baseDistrict,
          state_name: registry.state,
          recorded_owners: [
            {
              name: baseOwner,
              father_husband_name: 'Late Ram Prasad',
              share: '1/1',
              aadhaar_vault_ref: 'VID-9821-XXXX-4412',
            },
          ],
          total_area_acres: parseFloat((baseArea * 1.08).toFixed(4)), // 8% area variance
          total_area_hectares: parseFloat(((baseArea * 1.08) * 0.404686).toFixed(4)),
          land_classification: 'Agricultural — Irrigated (Chahi)',
          encumbrances: [
            {
              type: 'Crop Loan / KCC',
              bank: 'State Bank of India — Rural Branch',
              amount_inr: 125000,
              mortgage_date: '2023-08-14',
            },
          ],
          mutation_status: 'Approved & Mutated (Dakhil Kharij Completed)',
          digital_signature: {
            signed_by: `Tehsildar & Sub-Registrar (${baseDistrict})`,
            pki_cert_serial: 'NIC-CA-2025-UP-9841A',
            signed_at: timestamp,
          },
        };
      } else if (scenarioType === 'OWNER_SPELLING_VARIANCE') {
        mockRecord = {
          khasra_survey_no: survey_number || localParcel.survey_number,
          khatauni_no: `KH-${Math.floor(Math.random() * 8000 + 1000)}/2024`,
          village_name: baseVillage,
          district_name: baseDistrict,
          state_name: registry.state,
          recorded_owners: [
            {
              name: baseOwner.includes(' ') ? `${baseOwner.split(' ')[0]} P. ${baseOwner.split(' ').slice(1).join(' ')}` : `${baseOwner} (Alias)`,
              father_husband_name: 'Late Ram Prasad',
              share: '1/1',
              aadhaar_vault_ref: 'VID-9821-XXXX-4412',
            },
          ],
          total_area_acres: baseArea,
          total_area_hectares: parseFloat((baseArea * 0.404686).toFixed(4)),
          land_classification: 'Agricultural — Irrigated (Nal-Koop)',
          encumbrances: [],
          mutation_status: 'Approved & Mutated',
          digital_signature: {
            signed_by: `Tehsildar & Sub-Registrar (${baseDistrict})`,
            pki_cert_serial: 'NIC-CA-2025-UP-9841A',
            signed_at: timestamp,
          },
        };
      } else {
        // EXACT_MATCH
        mockRecord = {
          khasra_survey_no: survey_number || localParcel.survey_number,
          khatauni_no: `KH-${Math.floor(Math.random() * 8000 + 1000)}/2024`,
          village_name: baseVillage,
          district_name: baseDistrict,
          state_name: registry.state,
          recorded_owners: [
            {
              name: baseOwner,
              father_husband_name: 'Late Ram Prasad',
              share: '1/1',
              aadhaar_vault_ref: 'VID-9821-XXXX-4412',
            },
          ],
          total_area_acres: baseArea,
          total_area_hectares: parseFloat((baseArea * 0.404686).toFixed(4)),
          land_classification: 'Agricultural — Irrigated',
          encumbrances: [],
          mutation_status: 'Approved & Verified',
          digital_signature: {
            signed_by: `Tehsildar & Sub-Registrar (${baseDistrict})`,
            pki_cert_serial: 'NIC-CA-2025-UP-9841A',
            signed_at: timestamp,
          },
        };
      }
    } else {
      // Standalone generated record
      mockRecord = {
        khasra_survey_no: survey_number,
        khatauni_no: `KH-${Math.floor(Math.random() * 8000 + 1000)}/2024`,
        village_name: village || 'Mohanlalganj',
        district_name: district || 'Lucknow',
        state_name: registry.state,
        recorded_owners: [
          {
            name: 'Vijay Kumar Maurya',
            father_husband_name: 'Dinanath Maurya',
            share: '1/1',
            aadhaar_vault_ref: 'VID-7114-XXXX-9124',
          },
        ],
        total_area_acres: 3.25,
        total_area_hectares: 1.3152,
        land_classification: 'Agricultural — Single Crop',
        encumbrances: [],
        mutation_status: 'Approved & Mutated',
        digital_signature: {
          signed_by: 'Sub-Divisional Magistrate / Tehsildar',
          pki_cert_serial: 'NIC-CA-2026-GEN-1029',
          signed_at: timestamp,
        },
      };
    }

    const simulatedRequestPayload = {
      method: 'POST',
      url: registry.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Gov-Gateway-Client': 'BhoomiSetu-NLA-Production',
        'X-Request-ID': reqId,
        'Authorization': 'Bearer gov_mock_token_sih2026_authorized_bearer',
      },
      body: {
        state: registry.state,
        district: district || (localParcel ? localParcel.district : 'Lucknow'),
        village: village || (localParcel ? localParcel.village : 'Mohanlalganj'),
        khasra_survey_no: survey_number,
        search_mode: 'EXACT_KHASRA_LOOKUP',
      },
    };

    const simulatedResponsePayload = {
      status: 200,
      statusText: 'OK',
      headers: {
        'Server': 'NIC-Gov-Application-Server/4.2.0',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Response-Time': `${simTimeMs}ms`,
        'X-Digital-Signature-Valid': 'true',
      },
      data: {
        response_code: 'NIC_ROR_200_SUCCESS',
        registry_id: registry.id,
        registry_name: registry.name,
        timestamp,
        request_id: reqId,
        record: mockRecord,
      },
    };

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        registry,
        scenario: scenarioType,
        simulated_latency_ms: simTimeMs,
        simulated_request: simulatedRequestPayload,
        simulated_response: simulatedResponsePayload,
        local_parcel: localParcel,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mock-gov/validate
 * Compare queried registry record against internal PostgreSQL parcel record
 */
router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const { parcel_id, registry_record } = req.body;

    if (!parcel_id || !registry_record) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Both parcel_id and registry_record are required for validation.',
      });
    }

    const parcel = await queryOne('SELECT * FROM parcels WHERE id = $1', [parcel_id]);
    if (!parcel) {
      return apiResponse(res, {
        status: 404,
        success: false,
        error: 'Parcel not found.',
      });
    }

    const comparisons = [];
    let matchCount = 0;
    let totalChecks = 0;

    // 1. Survey Number Check
    totalChecks++;
    const regSurvey = String(registry_record.khasra_survey_no || '').trim();
    const dbSurvey = String(parcel.survey_number || '').trim();
    const surveyMatch = regSurvey.toLowerCase() === dbSurvey.toLowerCase();
    if (surveyMatch) matchCount++;
    comparisons.push({
      field: 'Survey / Khasra Number',
      db_value: dbSurvey,
      registry_value: regSurvey,
      match: surveyMatch,
      status: surveyMatch ? 'MATCH' : 'MISMATCH',
      severity: surveyMatch ? 'NONE' : 'HIGH',
      description: surveyMatch
        ? 'Survey numbers match perfectly.'
        : `Survey number disparity: Internal (${dbSurvey}) vs State Registry (${regSurvey}).`,
    });

    // 2. Owner Name Check
    totalChecks++;
    const regOwner = (registry_record.recorded_owners?.[0]?.name || '').trim();
    const dbOwner = String(parcel.owner_name || '').trim();
    const ownerExact = regOwner.toLowerCase() === dbOwner.toLowerCase();
    const ownerPartial = !ownerExact && (regOwner.toLowerCase().includes(dbOwner.toLowerCase()) || dbOwner.toLowerCase().includes(regOwner.toLowerCase()));
    
    if (ownerExact) matchCount++;
    else if (ownerPartial) matchCount += 0.5;

    comparisons.push({
      field: 'Primary Landholder Name',
      db_value: dbOwner,
      registry_value: regOwner,
      match: ownerExact,
      status: ownerExact ? 'MATCH' : ownerPartial ? 'VARIANCE' : 'MISMATCH',
      severity: ownerExact ? 'NONE' : ownerPartial ? 'LOW' : 'HIGH',
      description: ownerExact
        ? 'Landholder name exactly matches official revenue record.'
        : ownerPartial
        ? 'Minor naming convention / alias variance detected.'
        : `Owner name discrepancy: DB (${dbOwner}) vs Registry (${regOwner}).`,
    });

    // 3. Land Area Check
    totalChecks++;
    const regArea = parseFloat(registry_record.total_area_acres || 0);
    const dbArea = parseFloat(parcel.area_acres || 0);
    const areaDiff = Math.abs(regArea - dbArea);
    const areaPercentDiff = dbArea > 0 ? (areaDiff / dbArea) * 100 : 0;
    const areaMatch = areaPercentDiff <= 0.01;
    const areaClose = areaPercentDiff <= 2.0;

    if (areaMatch) matchCount++;
    else if (areaClose) matchCount += 0.5;

    comparisons.push({
      field: 'Land Area (Acres)',
      db_value: `${dbArea.toFixed(4)} Acres`,
      registry_value: `${regArea.toFixed(4)} Acres`,
      match: areaMatch,
      status: areaMatch ? 'MATCH' : areaClose ? 'VARIANCE' : 'MISMATCH',
      severity: areaMatch ? 'NONE' : areaClose ? 'MEDIUM' : 'HIGH',
      description: areaMatch
        ? 'Land area matches exactly.'
        : `Area discrepancy of ${areaDiff.toFixed(4)} Acres (${areaPercentDiff.toFixed(2)}% difference).`,
    });

    // 4. Village Check
    totalChecks++;
    const regVillage = String(registry_record.village_name || '').trim();
    const dbVillage = String(parcel.village || '').trim();
    const villageMatch = regVillage.toLowerCase() === dbVillage.toLowerCase();
    if (villageMatch) matchCount++;
    comparisons.push({
      field: 'Village / Revenue Ward',
      db_value: dbVillage,
      registry_value: regVillage,
      match: villageMatch,
      status: villageMatch ? 'MATCH' : 'MISMATCH',
      severity: villageMatch ? 'NONE' : 'MEDIUM',
      description: villageMatch ? 'Village matches official revenue jurisdiction.' : 'Village jurisdiction mismatch.',
    });

    // Overall Result calculation
    const matchScorePct = Math.round((matchCount / totalChecks) * 100);
    let overallResult = 'MATCH';
    if (matchScorePct < 60) overallResult = 'MISMATCH';
    else if (matchScorePct < 95) overallResult = 'MISMATCH'; // or VARIANCE

    return apiResponse(res, {
      status: 200,
      success: true,
      data: {
        parcel_id: parcel.id,
        parcel_code: parcel.parcel_code,
        match_score_pct: matchScorePct,
        overall_result: overallResult,
        comparisons,
        has_encumbrances: (registry_record.encumbrances || []).length > 0,
        encumbrances: registry_record.encumbrances || [],
        mutation_status: registry_record.mutation_status,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mock-gov/sync
 * Synchronize external record into internal parcel data with audit trail and insert sync log
 */
router.post('/sync', authenticate, rbac([ROLES.DLAO, ROLES.SGA, ROLES.ADMIN]), async (req, res, next) => {
  try {
    const {
      parcel_id,
      survey_number,
      registry_record,
      validation_result = 'MATCH',
      sync_fields = ['area_acres', 'owner_name', 'village'],
      remarks,
    } = req.body;

    if (!survey_number || !registry_record) {
      return apiResponse(res, {
        status: 400,
        success: false,
        error: 'Survey number and registry record are required for synchronization.',
      });
    }

    let updatedParcel = null;
    let oldValues = null;

    if (parcel_id) {
      const existing = await queryOne('SELECT * FROM parcels WHERE id = $1', [parcel_id]);
      if (existing) {
        oldValues = {
          owner_name: existing.owner_name,
          area_acres: existing.area_acres,
          village: existing.village,
          district: existing.district,
        };

        const newOwner = sync_fields.includes('owner_name') && registry_record.recorded_owners?.[0]?.name
          ? registry_record.recorded_owners[0].name
          : existing.owner_name;

        const newArea = sync_fields.includes('area_acres') && registry_record.total_area_acres
          ? parseFloat(registry_record.total_area_acres)
          : existing.area_acres;

        const newVillage = sync_fields.includes('village') && registry_record.village_name
          ? registry_record.village_name
          : existing.village;

        const updateSql = `
          UPDATE parcels
             SET owner_name = $1,
                 area_acres = $2,
                 village = $3,
                 geometry_updated_at = now(),
                 updated_at = now()
           WHERE id = $4
          RETURNING *
        `;

        updatedParcel = await queryOne(updateSql, [newOwner, newArea, newVillage, parcel_id]);

        await logAudit({
          entityType: 'PARCEL',
          entityId: parcel_id,
          action: 'MOCK_GOV_SYNC_UPDATE',
          performedBy: req.user?.id,
          oldValues,
          newValues: {
            owner_name: updatedParcel.owner_name,
            area_acres: updatedParcel.area_acres,
            village: updatedParcel.village,
            synced_from_registry: registry_record.khatauni_no,
            remarks,
          },
          req,
        });
      }
    }

    // Insert transaction into mock_gov_sync_log
    const syncLogSql = `
      INSERT INTO mock_gov_sync_log (
        survey_number,
        request_data,
        response_data,
        validation_result,
        synced_at
      ) VALUES ($1, $2, $3, $4, now())
      RETURNING *
    `;

    const requestData = {
      survey_number,
      parcel_id,
      sync_fields,
      requested_by: req.user?.email || 'officer',
      remarks: remarks || 'Manual sync triggered via Mock Gov API Console',
    };

    const responseData = {
      registry_record,
      applied_updates: updatedParcel ? {
        parcel_code: updatedParcel.parcel_code,
        owner_name: updatedParcel.owner_name,
        area_acres: updatedParcel.area_acres,
      } : null,
    };

    const validResult = ['MATCH', 'MISMATCH', 'ERROR'].includes(validation_result) ? validation_result : 'MATCH';

    const logEntry = await queryOne(syncLogSql, [
      survey_number,
      JSON.stringify(requestData),
      JSON.stringify(responseData),
      validResult,
    ]);

    return apiResponse(res, {
      status: 201,
      success: true,
      message: 'State land registry record successfully synchronized and logged.',
      data: {
        sync_log: logEntry,
        updated_parcel: updatedParcel,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/mock-gov/logs
 * Retrieve past sync logs with pagination and filters
 */
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { validation_result, survey_number } = req.query;

    const conditions = [];
    const params = [];

    if (validation_result) {
      params.push(validation_result);
      conditions.push(`validation_result = $${params.length}`);
    }

    if (survey_number) {
      params.push(`%${survey_number}%`);
      conditions.push(`survey_number ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM mock_gov_sync_log ${whereClause}`;
    const countResult = await queryOne(countSql, params);
    const total = parseInt(countResult.count, 10);

    const logsSql = `
      SELECT id, survey_number, request_data, response_data, validation_result, synced_at
        FROM mock_gov_sync_log
       ${whereClause}
       ORDER BY synced_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const logs = await queryRows(logsSql, [...params, parseInt(limit, 10), offset]);

    return apiResponse(res, {
      status: 200,
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
