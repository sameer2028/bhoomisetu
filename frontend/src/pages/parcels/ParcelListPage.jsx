import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toLandReference } from '../../services/landRecordMapper';
import api from '../../services/api';
import ParcelCreateModal from './ParcelCreateModal';
import {
  MapPin,
  Plus,
  Search,
  Building2,
  ChevronRight,
  Filter,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Map as MapIcon,
  Flag,
} from 'lucide-react';

export default function ParcelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  const highlightId = searchParams.get('highlight');
  const [highlightActive, setHighlightActive] = useState(!!highlightId);
  const highlightRef = useRef(null);

  const { hasRole } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState(initialProjectId);
  const [projects, setProjects] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects?limit=100');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects dropdown:', err);
    }
  }, []);

  const fetchParcels = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.acquisition_status = statusFilter;
      if (projectIdFilter) params.project_id = projectIdFilter;

      const res = await api.get('/parcels', { params });
      setParcels(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch parcels:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, projectIdFilter]);

  useEffect(() => {
    fetchProjects();
    fetchParcels();
  }, [fetchProjects, fetchParcels]);

  // Auto-scroll and highlight the target parcel from alerts
  useEffect(() => {
    if (highlightId && !loading && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      const timer = setTimeout(() => {
        setHighlightActive(false);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('highlight');
          return next;
        }, { replace: true });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, loading, setSearchParams]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROPOSED':
        return <span className="badge badge-proposed"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Proposed</span>;
      case 'NOTIFIED':
        return <span className="badge badge-notified"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Notified</span>;
      case 'UNDER_ACQUISITION':
        return <span className="badge badge-under-acquisition"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Under Acquisition</span>;
      case 'ACQUIRED':
        return <span className="badge badge-acquired"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Acquired</span>;
      case 'POSSESSION_TAKEN':
        return <span className="badge badge-possession-taken"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />Possession Taken</span>;
      case 'RR_ISSUE':
        return <span className="badge badge-rr-issue"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />R&amp;R Flagged</span>;
      default:
        return <span className="badge bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const canCreate = hasRole('DLAO', 'PIA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" /> Cadastral Land Parcels
          </h1>
          <p className="page-subtitle">Parcel-level Land Acquisition Status &amp; Land Revenue Records</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Link
            to={projectIdFilter ? `/gis?projectId=${projectIdFilter}` : '/gis'}
            className="btn btn-secondary text-xs font-semibold flex items-center gap-2"
            title="Open these parcels on the GIS map"
          >
            <MapIcon className="w-4 h-4" /> View on GIS Map
          </Link>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-success text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Land Parcel
            </button>
          )}
        </div>
      </div>

      {/* Modern Compact Horizontal Enterprise Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-3 flex flex-wrap lg:flex-nowrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] w-full lg:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by survey no. (e.g. 123/2), owner name, village, or parcel code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input form-input-search text-xs w-full"
          />
        </div>

        {/* Dropdowns & Controls */}
        <select
          value={projectIdFilter}
          onChange={(e) => setProjectIdFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[180px]"
        >
          <option value="">All Associated Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.project_code}] {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[160px]"
        >
          <option value="">All Acquisition Statuses</option>
          <option value="PROPOSED">Proposed</option>
          <option value="NOTIFIED">Notified</option>
          <option value="UNDER_ACQUISITION">Under Acquisition</option>
          <option value="ACQUIRED">Acquired</option>
          <option value="POSSESSION_TAKEN">Possession Taken</option>
          <option value="RR_ISSUE">R&amp;R Flagged</option>
        </select>

        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer select-none text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors flex-shrink-0">
          <input
            type="checkbox"
            checked={statusFilter === 'RR_ISSUE'}
            onChange={(e) => setStatusFilter(e.target.checked ? 'RR_ISSUE' : '')}
            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
          />
          <Flag className={`w-3.5 h-3.5 ${statusFilter === 'RR_ISSUE' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className={statusFilter === 'RR_ISSUE' ? 'text-rose-700 font-bold' : ''}>Flagged Only</span>
        </label>

        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setProjectIdFilter(''); }}
          className="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
        </button>
      </div>

      {/* Parcels Table / Card List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading cadastral land parcels...</p>
        </div>
      ) : parcels.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <MapPin className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Land Parcels Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter || projectIdFilter
              ? 'No land parcels match your selected filters. Try clearing or adjusting filters.'
              : 'No land parcels have been registered in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-card border border-slate-200/90">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Land Ref.</th>
                  <th>Land Details</th>
                  <th>Owner / Titleholder</th>
                  <th>Associated Project</th>
                  <th>Acquisition Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.map((parcel) => (
                  <tr
                    key={parcel.id}
                    ref={highlightId === parcel.id ? highlightRef : null}
                    className={`transition-colors ${
                      highlightActive && highlightId === parcel.id
                        ? 'bg-amber-50 ring-2 ring-amber-400 ring-inset shadow-lg shadow-amber-200/50 animate-pulse'
                        : 'hover:bg-blue-50/40'
                    }`}
                  >
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-blue-900 text-xs">
                          {toLandReference({
                            parcelCode: parcel.parcel_code,
                            surveyNumber: parcel.survey_number,
                            village: parcel.village,
                            year: parcel.created_at ? new Date(parcel.created_at).getFullYear() : '2026'
                          })}
                        </span>
                        {Number(parcel.open_mismatches_count) > 0 && (
                          <Link
                            to={`/ai/mismatch?search=${parcel.parcel_code}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold hover:bg-rose-200 transition-colors w-max"
                            title={`${parcel.open_mismatches_count} open discrepancy flag(s) — Click to inspect in AI Verification`}
                          >
                            <Flag className="w-2.5 h-2.5 fill-rose-600 text-rose-600" />
                            <span>{parcel.open_mismatches_count} Discrepancies</span>
                          </Link>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-slate-900 text-xs">Survey No. {parcel.survey_number}</div>
                      <div className="text-[10.5px] text-slate-500 font-medium">{parcel.village}, {parcel.district}</div>
                      <div className="text-[10px] text-slate-400">{parcel.area_acres} Acres</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{parcel.owner_name || 'Sample Owner'}</span>
                      </div>
                    </td>
                    <td>
                      {parcel.project_code ? (
                        <Link
                          to={`/projects/${parcel.project_id}`}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[170px]">[{parcel.project_code}] {parcel.project_name}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td>{getStatusBadge(parcel.acquisition_status)}</td>
                    <td className="text-right">
                      <Link
                        to={`/parcels/${parcel.id}`}
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        View Record <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ParcelCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchParcels()}
        defaultProjectId={projectIdFilter}
      />
    </div>
  );
}

