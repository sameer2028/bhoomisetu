/**
 * GIS map constants — Phase 5
 *
 * Single source of truth for acquisition-status styling so the map polygons,
 * the legend and the detail panel can never disagree with each other.
 */

export const PARCEL_STATUS_STYLES = {
  PROPOSED: {
    label: 'Proposed',
    description: 'Identified as required, no notification issued',
    fill: '#facc15',
    stroke: '#a16207',
    swatchClass: 'bg-yellow-400 border-yellow-700',
    badgeClass: 'badge-proposed',
  },
  NOTIFIED: {
    label: 'Notified',
    description: 'Acquisition notification recorded against the parcel',
    fill: '#fb923c',
    stroke: '#c2410c',
    swatchClass: 'bg-orange-400 border-orange-700',
    badgeClass: 'badge-notified',
  },
  UNDER_ACQUISITION: {
    label: 'Under Acquisition',
    description: 'Active case in progress — verification to award',
    fill: '#3b82f6',
    stroke: '#1d4ed8',
    swatchClass: 'bg-blue-500 border-blue-700',
    badgeClass: 'badge-under-acquisition',
  },
  ACQUIRED: {
    label: 'Acquired',
    description: 'Award declared; land vested with the government',
    fill: '#22c55e',
    stroke: '#15803d',
    swatchClass: 'bg-green-500 border-green-700',
    badgeClass: 'badge-acquired',
  },
  POSSESSION_TAKEN: {
    label: 'Possession Taken',
    description: 'Physical possession recorded with evidence',
    fill: '#047857',
    stroke: '#064e3b',
    swatchClass: 'bg-emerald-700 border-emerald-900',
    badgeClass: 'badge-possession-taken',
  },
  RR_ISSUE: {
    label: 'R&R / Issue',
    description: 'Flagged for rehabilitation, objection or data issue',
    fill: '#ef4444',
    stroke: '#b91c1c',
    swatchClass: 'bg-red-500 border-red-700',
    badgeClass: 'badge-rr-issue',
  },
};

export const PARCEL_STATUS_ORDER = [
  'PROPOSED',
  'NOTIFIED',
  'UNDER_ACQUISITION',
  'ACQUIRED',
  'POSSESSION_TAKEN',
  'RR_ISSUE',
];

const FALLBACK_STYLE = {
  label: 'Unknown',
  description: 'Status not recognised',
  fill: '#94a3b8',
  stroke: '#475569',
  swatchClass: 'bg-neutral-400 border-neutral-600',
  badgeClass: 'bg-neutral-100 text-neutral-700',
};

export function getStatusStyle(status) {
  return PARCEL_STATUS_STYLES[status] || FALLBACK_STYLE;
}

/** Leaflet path options for a parcel polygon. */
export function parcelPathOptions(status, { selected = false, dimmed = false } = {}) {
  const style = getStatusStyle(status);
  return {
    color: selected ? '#0f172a' : style.stroke,
    weight: selected ? 3 : 1.2,
    opacity: dimmed ? 0.35 : 1,
    fillColor: style.fill,
    fillOpacity: dimmed ? 0.15 : selected ? 0.8 : 0.6,
    dashArray: selected ? '4 3' : null,
  };
}

/** Corridor polygon (acquisition right-of-way). */
export const CORRIDOR_STYLE = {
  color: '#1e3a8a',
  weight: 1.5,
  opacity: 0.9,
  fillColor: '#1e40af',
  fillOpacity: 0.08,
  dashArray: '6 4',
};

/** Project alignment centreline. */
export const CENTERLINE_STYLE = {
  color: '#1e3a8a',
  weight: 2.5,
  opacity: 0.85,
  dashArray: '10 6',
};

/** Available base maps. */
export const BASE_LAYERS = [
  {
    id: 'osm',
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'topo',
    label: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap (CC-BY-SA), &copy; OpenStreetMap contributors',
    maxZoom: 17,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
];

/** Fallback view: Uttar Pradesh, where all synthetic demo data is located. */
export const DEFAULT_CENTER = [26.8467, 80.9462];
export const DEFAULT_ZOOM = 13;

/** Human-readable label for a geometry provenance code. */
export const GEOMETRY_SOURCE_LABELS = {
  SEEDED_SYNTHETIC: 'Synthetic demo data',
  FIELD_GPS: 'Captured in field (GPS)',
  IMPORTED_CADASTRAL: 'Imported cadastral record',
  MANUAL_DRAW: 'Drawn / entered manually',
  IMPORTED_ALIGNMENT: 'Imported alignment survey',
};

export function formatAcres(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ac`;
}
