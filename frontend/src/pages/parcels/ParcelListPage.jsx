import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
} from 'lucide-react';

export default function ParcelListPage() {
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

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
  }, [fetchProjects]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

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

      {/* Filter & Search Controls */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by survey no. (e.g. 123/2), owner name, village, or parcel code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input form-input-search text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Project Filter */}
          <select
            value={projectIdFilter}
            onChange={(e) => setProjectIdFilter(e.target.value)}
            className="form-select text-xs w-full sm:w-60"
          >
            <option value="">All Associated Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.project_code}] {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select text-xs w-full sm:w-48"
          >
            <option value="">All Acquisition Statuses</option>
            <option value="PROPOSED">Proposed</option>
            <option value="NOTIFIED">Notified</option>
            <option value="UNDER_ACQUISITION">Under Acquisition</option>
            <option value="ACQUIRED">Acquired</option>
            <option value="POSSESSION_TAKEN">Possession Taken</option>
            <option value="RR_ISSUE">R&amp;R Flagged</option>
          </select>
        </div>
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
                  <th>Parcel Code</th>
                  <th>Survey No.</th>
                  <th>Village &amp; District</th>
                  <th>Area</th>
                  <th>Owner Name</th>
                  <th>Associated Project</th>
                  <th>Acquisition Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="font-mono font-bold text-blue-900 text-xs">{parcel.parcel_code}</td>
                    <td className="font-bold text-slate-900 text-xs">{parcel.survey_number}</td>
                    <td>
                      <div className="font-semibold text-slate-800 text-xs">{parcel.village}</div>
                      <div className="text-[10.5px] text-slate-400">{parcel.district}, {parcel.state}</div>
                    </td>
                    <td className="font-extrabold text-slate-900 text-xs">{parcel.area_acres} Acres</td>
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

