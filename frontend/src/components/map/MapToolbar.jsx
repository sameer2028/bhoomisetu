import { useEffect, useRef, useState } from 'react';
import { Search, X, Maximize2, SlidersHorizontal, Loader2, MapPinned } from 'lucide-react';
import { getStatusStyle } from './mapConstants';

/**
 * Map toolbar — Phase 5
 *
 * Project selection, cascading state/district/village filters, survey-number
 * search with jump-to-parcel, and zoom-to-extent. All option lists come from
 * /api/gis/filters, i.e. from live parcel data.
 */
export default function MapToolbar({
  projects,
  filters,
  filterOptions,
  onChangeFilter,
  onResetFilters,
  onZoomToExtent,
  onSearchSelect,
  searchFn,
  activeCount,
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Debounced survey-number search
  useEffect(() => {
    if (term.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchFn(term.trim());
        if (!cancelled) {
          setResults(found);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, searchFn]);

  // Close the result dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePick = (result) => {
    onSearchSelect(result);
    setOpen(false);
    setTerm(result.parcel_code);
  };

  const hasActiveFilters =
    filters.projectId || filters.state || filters.district || filters.village ||
    filters.statuses.length > 0 || filters.withinCorridor;

  return (
    <div className="bg-white border-b border-neutral-200 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 flex-shrink-0">
      {/* Survey number / parcel search */}
      <div ref={boxRef} className="relative w-full lg:w-[290px] flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search survey no. / parcel / owner"
          className="form-input !py-1.5 !pl-8 !pr-8 !text-xs"
        />
        {searching ? (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />
        ) : term ? (
          <button
            onClick={() => { setTerm(''); setResults([]); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl z-[1200] max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-400 text-center">
                No parcel matches "{term}"
              </p>
            ) : (
              <ul>
                {results.map((r) => {
                  const style = getStatusStyle(r.acquisition_status);
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => handlePick(r)}
                        disabled={!r.has_geometry}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-neutral-100 last:border-0 disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm border flex-shrink-0"
                            style={{ backgroundColor: style.fill, borderColor: style.stroke }}
                          />
                          <span className="text-[11px] font-mono font-bold text-neutral-900">
                            {r.parcel_code}
                          </span>
                          <span className="text-[11px] text-neutral-600">
                            Survey {r.survey_number}
                          </span>
                          {!r.has_geometry && (
                            <span className="text-[9px] text-amber-600 font-semibold">
                              NOT MAPPED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate pl-4.5">
                          {r.owner_name} &middot; {r.village}, {r.district}
                          {r.project_code ? ` \u00b7 ${r.project_code}` : ''}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Cascading filters */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <select
          value={filters.projectId}
          onChange={(e) => onChangeFilter({ projectId: e.target.value })}
          className="form-select !py-1.5 !text-xs w-full sm:w-[220px]"
          title="Filter by project"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.project_code}] {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.state}
          onChange={(e) => onChangeFilter({ state: e.target.value, district: '', village: '' })}
          className="form-select !py-1.5 !text-xs w-full sm:w-[150px]"
          title="Filter by state"
        >
          <option value="">All States</option>
          {(filterOptions.states || []).map((s) => (
            <option key={s.value} value={s.value}>
              {s.value} ({s.parcel_count})
            </option>
          ))}
        </select>

        <select
          value={filters.district}
          onChange={(e) => onChangeFilter({ district: e.target.value, village: '' })}
          className="form-select !py-1.5 !text-xs w-full sm:w-[150px]"
          title="Filter by district"
        >
          <option value="">All Districts</option>
          {(filterOptions.districts || []).map((d) => (
            <option key={d.value} value={d.value}>
              {d.value} ({d.parcel_count})
            </option>
          ))}
        </select>

        <select
          value={filters.village}
          onChange={(e) => onChangeFilter({ village: e.target.value })}
          className="form-select !py-1.5 !text-xs w-full sm:w-[150px]"
          title="Filter by village"
        >
          <option value="">All Villages</option>
          {(filterOptions.villages || []).map((v) => (
            <option key={v.value} value={v.value}>
              {v.value} ({v.parcel_count})
            </option>
          ))}
        </select>

        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white cursor-pointer hover:border-neutral-400 transition-colors"
          title="Spatial query: only parcels whose boundary intersects the project corridor"
        >
          <input
            type="checkbox"
            checked={filters.withinCorridor}
            onChange={(e) => onChangeFilter({ withinCorridor: e.target.checked })}
            className="w-3 h-3 accent-blue-900"
          />
          <span className="text-[11px] font-medium text-neutral-700 whitespace-nowrap">
            In corridor only
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-neutral-500 whitespace-nowrap flex items-center gap-1">
          <MapPinned className="w-3.5 h-3.5 text-emerald-600" />
          <strong className="text-neutral-800">{activeCount}</strong> mapped
        </span>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] flex items-center gap-1"
            title="Clear all filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Reset
          </button>
        )}

        <button
          onClick={onZoomToExtent}
          className="btn btn-secondary !py-1.5 !px-2.5 !text-[11px] flex items-center gap-1"
          title="Zoom to the extent of the filtered parcels"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Fit
        </button>
      </div>
    </div>
  );
}
