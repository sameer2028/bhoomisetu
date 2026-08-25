import api from './api';

/**
 * GIS service — Phase 5
 *
 * Thin wrapper over the /api/gis endpoints. Every response here is derived from
 * PostGIS geometry in the database; nothing on the map is hard-coded.
 */

/** Build a query object from map filter state, dropping empty values. */
function toParams(filters = {}) {
  const params = {};
  if (filters.projectId) params.project_id = filters.projectId;
  if (filters.state) params.state = filters.state;
  if (filters.district) params.district = filters.district;
  if (filters.village) params.village = filters.village;
  if (filters.search) params.search = filters.search;
  if (filters.bbox) params.bbox = filters.bbox;
  if (filters.withinCorridor) params.within_corridor = 'true';
  if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    params.status = filters.statuses.join(',');
  }
  return params;
}

/** Parcel polygons as a GeoJSON FeatureCollection. */
export async function fetchParcelLayer(filters, config = {}) {
  const res = await api.get('/gis/parcels', { params: toParams(filters), ...config });
  return res.data.data;
}

/** Full database record for one parcel, as a GeoJSON Feature. */
export async function fetchParcelFeature(parcelId, config = {}) {
  const res = await api.get(`/gis/parcels/${encodeURIComponent(parcelId)}`, config);
  return res.data.data;
}

/** Project corridor + alignment centreline layers. */
export async function fetchCorridor(projectId, config = {}) {
  const res = await api.get(`/gis/corridors/${encodeURIComponent(projectId)}`, config);
  return res.data;
}

/** Project index for the map's project selector (extent, corridor, counts). */
export async function fetchGisProjects(config = {}) {
  const res = await api.get('/gis/projects', config);
  return res.data.data;
}

/** Status breakdown for the current filter — drives legend counts. */
export async function fetchGisStats(filters, config = {}) {
  const res = await api.get('/gis/stats', { params: toParams(filters), ...config });
  return res.data.data;
}

/** Bounding box of the currently filtered parcels. */
export async function fetchGisExtent(filters, config = {}) {
  const res = await api.get('/gis/extent', { params: toParams(filters), ...config });
  return res.data.data;
}

/** Cascading filter options derived from live parcel data. */
export async function fetchGisFilters({ state, district, projectId } = {}, config = {}) {
  const params = {};
  if (state) params.state = state;
  if (district) params.district = district;
  if (projectId) params.project_id = projectId;
  const res = await api.get('/gis/filters', { params, ...config });
  return res.data.data;
}

/** Survey-number / parcel-code search with map targets. */
export async function searchParcels(q, config = {}) {
  const res = await api.get('/gis/search', { params: { q }, ...config });
  return res.data.data;
}

/** Replace a parcel boundary with a supplied GeoJSON Polygon. */
export async function updateParcelGeometry(parcelId, geometry, geometrySource = 'MANUAL_DRAW') {
  const res = await api.put(`/gis/parcels/${encodeURIComponent(parcelId)}/geometry`, {
    geometry,
    geometry_source: geometrySource,
  });
  return res.data.data;
}
