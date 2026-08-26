import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Map as MapIcon,
  AlertCircle,
  Route,
  Ruler,
  Landmark,
  Info,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import ParcelMap, { extentToBounds, featureBounds } from '../../components/map/ParcelMap';
import MapLegend from '../../components/map/MapLegend';
import MapToolbar from '../../components/map/MapToolbar';
import ParcelDetailPanel from '../../components/map/ParcelDetailPanel';
import { formatAcres } from '../../components/map/mapConstants';
import {
  fetchCorridor,
  fetchGisExtent,
  fetchGisFilters,
  fetchGisProjects,
  fetchGisStats,
  fetchParcelFeature,
  fetchParcelLayer,
  searchParcels,
} from '../../services/gisService';

const EMPTY_FILTERS = {
  projectId: '',
  state: '',
  district: '',
  village: '',
  statuses: [],
  withinCorridor: false,
};

/**
 * GIS screen — Phase 5
 *
 * A professional land-management GIS view: project corridor + cadastral parcel
 * polygons served as GeoJSON from PostGIS, coloured by acquisition status,
 * filterable by project/geography/status, searchable by survey number, and
 * wired so that selecting a polygon opens that parcel's real database record.
 */
export default function GisPage() {
  // Supports both /gis?projectId=... and /projects/:id/gis
  const { id: routeProjectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    projectId: routeProjectId || searchParams.get('projectId') || '',
  });

  const [projects, setProjects] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ states: [], districts: [], villages: [] });
  const [parcelLayer, setParcelLayer] = useState(null);
  const [corridorLayer, setCorridorLayer] = useState(null);
  const [corridorMeta, setCorridorMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [bounds, setBounds] = useState(null);

  const [selectedParcelId, setSelectedParcelId] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [baseLayerId, setBaseLayerId] = useState('osm');
  const [showCorridor, setShowCorridor] = useState(true);
  const [showCenterline, setShowCenterline] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // ── Project index (loaded once) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchGisProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setError('Could not load the project layer index.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Cascading filter options ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await fetchGisFilters({
          state: filters.state,
          district: filters.district,
          projectId: filters.projectId,
        });
        if (!cancelled) setFilterOptions(opts);
      } catch {
        /* filter options are non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [filters.state, filters.district, filters.projectId]);

  // ── Parcel layer + stats (re-fetched whenever filters change) ──────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const [layer, statResult] = await Promise.all([
          fetchParcelLayer(filters),
          fetchGisStats(filters),
        ]);
        if (cancelled) return;
        setParcelLayer(layer);
        setStats(statResult);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load the parcel map layer.');
          setParcelLayer(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filters]);

  // ── Corridor layer for the selected project ────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (!filters.projectId) {
      setCorridorLayer(null);
      setCorridorMeta(null);
      return undefined;
    }

    (async () => {
      try {
        const res = await fetchCorridor(filters.projectId);
        if (cancelled) return;
        setCorridorLayer(res.data);
        setCorridorMeta(res.meta);
      } catch {
        if (!cancelled) {
          setCorridorLayer(null);
          setCorridorMeta(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [filters.projectId]);

  // ── Fit the map to the filtered extent ─────────────────────────────
  const zoomToExtent = useCallback(async () => {
    try {
      const extent = await fetchGisExtent(filters);
      const next = extentToBounds(extent);
      if (next) setBounds(next);
    } catch {
      /* keep the current view if the extent cannot be resolved */
    }
  }, [filters]);

  // Auto-fit on filter change (geography/project scope), not on every render
  useEffect(() => {
    zoomToExtent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.projectId, filters.state, filters.district, filters.village, filters.withinCorridor]);

  // ── Load the clicked parcel's database record ──────────────────────
  const handleSelectParcel = useCallback(async (parcelId) => {
    setSelectedParcelId(parcelId);
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      const feature = await fetchParcelFeature(parcelId);
      setSelectedFeature(feature);
    } catch (err) {
      setSelectedFeature(null);
      setError(err.response?.data?.error || 'Could not load that parcel record.');
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const handleChangeFilter = useCallback((patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // Keep the URL shareable when the project scope changes
      if ('projectId' in patch && !routeProjectId) {
        const params = new URLSearchParams(searchParams);
        if (next.projectId) params.set('projectId', next.projectId);
        else params.delete('projectId');
        setSearchParams(params, { replace: true });
      }
      return next;
    });
  }, [routeProjectId, searchParams, setSearchParams]);

  const handleToggleStatus = useCallback((status) => {
    setFilters((prev) => {
      const active = prev.statuses;
      // Empty array means "all statuses"; the first click isolates one status
      if (active.length === 0) return { ...prev, statuses: [status] };
      if (active.includes(status)) {
        const remaining = active.filter((s) => s !== status);
        return { ...prev, statuses: remaining };
      }
      const added = [...active, status];
      return { ...prev, statuses: added.length === 6 ? [] : added };
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS, projectId: routeProjectId || '' });
    if (!routeProjectId) setSearchParams({}, { replace: true });
  }, [routeProjectId, setSearchParams]);

  const handleSearchSelect = useCallback((result) => {
    const next = featureBounds(result);
    if (next) setBounds(next);
    handleSelectParcel(result.id);
  }, [handleSelectParcel]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === filters.projectId) || null,
    [projects, filters.projectId]
  );

  const mappedCount = parcelLayer?.features?.length || 0;
  const totals = stats?.totals;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          {routeProjectId && (
            <Link
              to={`/projects/${routeProjectId}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Overview
            </Link>
          )}
          <h1 className="page-title flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-blue-700" /> Cadastral &amp; Alignment GIS Map
          </h1>
          <p className="page-subtitle">
            {activeProject
              ? `Corridor Scope: [${activeProject.project_code}] ${activeProject.name}`
              : 'PostGIS spatial parcel boundaries, corridor overlays & real-time acquisition status'}
          </p>
        </div>

        {/* Spatial summary strip */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-card">
            <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-widest block">
              Mapped Parcels
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {mappedCount}
              {totals && totals.parcel_count !== mappedCount && (
                <span className="text-[10.5px] font-medium text-slate-400"> / {totals.parcel_count}</span>
              )}
            </span>
          </div>

          <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-card">
            <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-widest block">
              Recorded Area
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatAcres(totals?.area_acres)}
            </span>
          </div>

          {corridorMeta?.has_corridor && (
            <>
              <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-card">
                <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-widest block flex items-center gap-1">
                  <Route className="w-3 h-3 text-blue-600" /> Corridor Length
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {corridorMeta.corridor_length_km} km
                  <span className="text-[10.5px] font-medium text-slate-400">
                    {' '}@ {corridorMeta.corridor_width_m} m ROW
                  </span>
                </span>
              </div>
              <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/90 shadow-card">
                <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-widest block flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-indigo-600" /> ROW Extent
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatAcres(corridorMeta.corridor_area_acres)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" /> {error}
        </div>
      )}

      {/* Map workspace */}
      <div className="card !p-0 overflow-hidden shadow-floating border border-slate-200/90">
        <MapToolbar
          projects={projects}
          filters={filters}
          filterOptions={filterOptions}
          onChangeFilter={handleChangeFilter}
          onResetFilters={handleResetFilters}
          onZoomToExtent={zoomToExtent}
          onSearchSelect={handleSearchSelect}
          searchFn={searchParcels}
          activeCount={mappedCount}
        />

        <div className="flex" style={{ height: 'calc(100vh - 300px)', minHeight: '520px' }}>
          {/* Map */}
          <div className="relative flex-1 min-w-0">
            <ParcelMap
              parcelLayer={parcelLayer}
              corridorLayer={corridorLayer}
              selectedParcelId={selectedParcelId}
              onSelectParcel={handleSelectParcel}
              bounds={bounds}
              baseLayerId={baseLayerId}
              showCorridor={showCorridor}
              showCenterline={showCenterline}
              showLabels={showLabels}
              resizeTrigger={panelOpen}
            />

            {loading && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-white/95 backdrop-blur-md rounded-full border border-slate-200 shadow-floating flex items-center gap-2.5">
                <span className="spinner !w-3.5 !h-3.5 !border-blue-600 !border-t-transparent" />
                <span className="text-xs font-semibold text-slate-700">
                  Loading spatial GeoJSON layer...
                </span>
              </div>
            )}

            {!loading && mappedCount === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] max-w-xs px-5 py-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-floating text-center">
                <Info className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No mapped parcels in view</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug font-medium">
                  No parcel boundaries match the current filter selection.
                  {activeProject && activeProject.parcel_count === 0 &&
                    ' This project does not have parcels registered yet.'}
                </p>
              </div>
            )}

            {/* Synthetic-data disclosure — required honesty for the prototype */}
            <div className="absolute top-3 left-3 z-[1000] px-3 py-1 bg-amber-50/95 backdrop-blur-sm border border-amber-200/90 rounded-lg shadow-xs">
              <span className="text-[9.5px] font-bold text-amber-900 uppercase tracking-wider">
                PostGIS Synthetic Demo Layers
              </span>
            </div>

            <MapLegend
              stats={stats}
              activeStatuses={filters.statuses}
              onToggleStatus={handleToggleStatus}
              onShowAllStatuses={() => setFilters((p) => ({ ...p, statuses: [] }))}
              showCorridor={showCorridor}
              onToggleCorridor={() => setShowCorridor((v) => !v)}
              showCenterline={showCenterline}
              onToggleCenterline={() => setShowCenterline((v) => !v)}
              showLabels={showLabels}
              onToggleLabels={() => setShowLabels((v) => !v)}
              baseLayerId={baseLayerId}
              onChangeBaseLayer={setBaseLayerId}
              hasCorridor={!!corridorMeta?.has_corridor}
            />
          </div>

          {/* Detail panel */}
          {panelOpen && (
            <ParcelDetailPanel
              feature={selectedFeature}
              loading={panelLoading}
              onClose={() => {
                setPanelOpen(false);
                setSelectedParcelId(null);
                setSelectedFeature(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-slate-500 font-medium flex items-start gap-1.5 leading-relaxed">
        <Landmark className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
        Cadastral parcel polygons and linear corridor alignments are computed via PostGIS (EPSG:4326 spatial engine) and rendered through GeoJSON vector layers.
      </p>
    </div>
  );
}

