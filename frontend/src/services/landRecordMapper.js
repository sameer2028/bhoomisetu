/**
 * landRecordMapper.js
 *
 * Frontend-only mapping layer that transforms backend entity data
 * into a unified "Land Record" structure for simplified UI display.
 *
 * NO backend changes. NO API contract changes.
 * This is purely a presentation-layer transformation.
 */

/**
 * Convert a parcel_code like "P-101" into a Land Reference like "LR-2026-001".
 * Deterministic — same input always produces same output.
 */
export function toLandReference(input) {
  if (!input) return null;
  
  let code = input;
  let yearStr = '2026';
  
  // Support both old string signature and new object signature { parcelCode, year, ... }
  if (typeof input === 'object') {
    if (!input.parcelCode) return null;
    code = String(input.parcelCode);
    if (input.year) yearStr = input.year;
  } else {
    code = String(input);
  }

  const match = code.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return `LR-${yearStr}-${String(num).padStart(3, '0')}`;
}

/**
 * Map a backend parcel response into a unified LandRecord shape.
 *
 * @param {Object} parcel - Backend parcel object (from GET /api/parcels/:id)
 * @param {Object} [options] - Additional related data
 * @param {Array}  [options.cases] - Related acquisition cases
 * @param {Array}  [options.families] - Related affected families
 * @param {Array}  [options.fieldVerifications] - Related field verifications
 * @returns {Object} Unified LandRecord
 */
export function mapParcelToLandRecord(parcel, options = {}) {
  if (!parcel) return null;

  const landReference = toLandReference(parcel.parcel_code);

  return {
    landReference,

    land: {
      id: parcel.id,
      parcelCode: parcel.parcel_code,
      surveyNumber: parcel.survey_number || null,
      village: parcel.village || null,
      taluk: parcel.taluk || null,
      district: parcel.district || null,
      state: parcel.state || null,
      area: parcel.area_acres ? `${parcel.area_acres} Acres` : null,
      areaAcres: parcel.area_acres || null,
      ownerName: parcel.owner_name || null,
      ownerContact: parcel.owner_contact || null,
      latitude: parcel.latitude || null,
      longitude: parcel.longitude || null,
      geometrySource: parcel.geometry_source || null,
      hasGeometry: parcel.has_geometry || false,
    },

    project: parcel.project_id
      ? {
          id: parcel.project_id,
          name: parcel.project_name || null,
          code: parcel.project_code || null,
        }
      : null,

    acquisition: {
      status: parcel.acquisition_status || null,
      statusLabel: formatAcquisitionStatus(parcel.acquisition_status),
    },

    families: options.families || [],
    cases: options.cases || [],
    fieldVerifications: options.fieldVerifications || [],
  };
}

/**
 * Map a backend case response into a LandRecord shape.
 * Cases always link back to a parcel.
 */
export function mapCaseToLandRecord(caseData) {
  if (!caseData) return null;

  const landReference = toLandReference(caseData.parcel_code);

  return {
    landReference,

    land: {
      id: caseData.parcel_id || null,
      parcelCode: caseData.parcel_code || null,
      surveyNumber: caseData.survey_number || null,
      village: caseData.village || null,
      ownerName: caseData.owner_name || null,
    },

    project: caseData.project_id
      ? {
          id: caseData.project_id,
          name: caseData.project_name || null,
          code: caseData.project_code || null,
        }
      : null,

    acquisition: {
      caseId: caseData.id,
      caseCode: caseData.case_code || null,
      stage: caseData.current_stage || null,
      stageLabel: formatStageLabel(caseData.current_stage),
      status: caseData.status || null,
      priority: caseData.priority || null,
      assignedTo: caseData.assigned_officer_name || null,
      dueDate: caseData.due_date || null,
      isOverdue: caseData.overdue || caseData.is_overdue || false,
    },

    families: [],
    cases: [caseData],
    fieldVerifications: [],
  };
}

/**
 * Map a backend family response into a LandRecord shape.
 */
export function mapFamilyToLandRecord(family) {
  if (!family) return null;

  return {
    landReference: toLandReference(family.parcel_code) || null,

    land: {
      id: family.parcel_id || null,
      parcelCode: family.parcel_code || null,
      surveyNumber: family.survey_number || null,
      village: family.village || null,
    },

    project: family.project_id
      ? {
          id: family.project_id,
          name: family.project_name || null,
          code: family.project_code || null,
        }
      : null,

    acquisition: {
      status: null,
      statusLabel: null,
    },

    families: [family],
    cases: [],
    fieldVerifications: [],
  };
}

/**
 * Generate a human-readable "Land Story" from a LandRecord.
 */
export function generateLandStory(record) {
  if (!record) return '';

  const parts = [];
  const ref = record.landReference || 'This land record';

  // Identity
  if (record.land?.areaAcres && record.land?.village && record.land?.surveyNumber) {
    parts.push(
      `${ref} is a ${record.land.areaAcres}-acre land parcel in ${record.land.village} identified by Survey No. ${record.land.surveyNumber}`
    );
  } else if (record.land?.village && record.land?.surveyNumber) {
    parts.push(
      `${ref} is a land parcel in ${record.land.village} identified by Survey No. ${record.land.surveyNumber}`
    );
  } else if (record.land?.surveyNumber) {
    parts.push(`${ref} is identified by Survey No. ${record.land.surveyNumber}`);
  } else {
    parts.push(`${ref} is a tracked land parcel`);
  }

  // Project
  if (record.project?.name) {
    parts.push(`affected by the ${record.project.name} project`);
  }

  // Acquisition
  if (record.acquisition?.statusLabel) {
    parts.push(`The acquisition status is currently ${record.acquisition.statusLabel}`);
  } else if (record.acquisition?.stageLabel) {
    parts.push(`The acquisition is currently at the ${record.acquisition.stageLabel} stage`);
  }

  // Field verification
  if (record.land?.geometrySource === 'FIELD_GPS') {
    parts.push('and field verification has been completed');
  }

  // Families
  if (record.families?.length === 1) {
    const name = record.families[0].head_of_family;
    if (name) parts.push(`The affected landholder is ${name}`);
  } else if (record.families?.length > 1) {
    parts.push(`${record.families.length} families are affected`);
  }

  // Owner fallback
  if (record.families?.length === 0 && record.land?.ownerName) {
    parts.push(`The registered owner is ${record.land.ownerName}`);
  }

  return parts.join('. ') + '.';
}

// ─── Formatting Helpers ─────────────────────────────────────────────

const ACQUISITION_STATUS_LABELS = {
  PROPOSED: 'Proposed',
  NOTIFIED: 'Notified',
  UNDER_ACQUISITION: 'Under Acquisition',
  ACQUIRED: 'Acquired',
  POSSESSION_TAKEN: 'Possession Taken',
  RR_ISSUE: 'R&R Flagged',
};

const STAGE_LABELS = {
  PROJECT_PROPOSAL: 'Project Proposal',
  LAND_IDENTIFICATION: 'Land Identification',
  VERIFICATION: 'Verification',
  APPROVAL: 'Approval',
  NOTIFICATION: 'Notification',
  COMPENSATION: 'Compensation',
  AWARD: 'Award',
  PAYMENT: 'Payment',
  POSSESSION: 'Possession',
  RR: 'R&R',
  CLOSURE: 'Closure',
};

export function formatAcquisitionStatus(status) {
  return ACQUISITION_STATUS_LABELS[status] || status || null;
}

export function formatStageLabel(stage) {
  return STAGE_LABELS[stage] || stage || null;
}
