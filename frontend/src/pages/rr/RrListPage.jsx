import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  GitBranch,
  Plus,
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  Clock,
  User,
  FolderKanban,
  MapPin,
  Calendar,
  X,
  Layers,
  CheckCircle2,
  Users as UsersIcon,
  Home,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  HeartHandshake,
  Shield,
  Trash2
} from 'lucide-react';

const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-200',
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  DELAYED: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
};

const CATEGORY_BADGES = {
  DISPLACED: 'bg-indigo-50 text-indigo-900 border-indigo-200 font-semibold',
  AFFECTED: 'bg-blue-50 text-blue-900 border-blue-200 font-semibold',
};

export default function RrListPage() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project_id') || '');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Lookups
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createForm, setCreateForm] = useState({
    project_id: '',
    parcel_id: '',
    head_of_family: '',
    members_count: 4,
    category: 'DISPLACED',
    entitlement: '',
    contact: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/rr/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch R&R stats:', err);
    }
  };

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (projectFilter) params.project_id = projectFilter;
      if (overdueOnly) params.delayed_only = 'true';

      const res = await api.get('/rr/families', { params });
      let data = res.data.data || [];

      if (statusFilter) {
        data = data.filter((f) => {
          const total = parseInt(f.total_activities, 10) || 0;
          const comp = parseInt(f.completed_activities, 10) || 0;
          if (statusFilter === 'COMPLETED') return total > 0 && comp === total;
          if (statusFilter === 'IN_PROGRESS') return total > 0 && comp < total;
          if (statusFilter === 'PENDING') return total === 0;
          return true;
        });
      }

      if (overdueOnly) {
        data = data.filter((f) => {
          const delayed = parseInt(f.delayed_activities, 10) || 0;
          return delayed > 0;
        });
      }

      setFamilies(data);
      setMeta({ total: data.length });
    } catch (err) {
      console.error('Failed to fetch R&R families:', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, projectFilter, statusFilter, overdueOnly]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects', { params: { limit: 100 } });
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleProjectSelect = async (projectId) => {
    setCreateForm((prev) => ({ ...prev, project_id: projectId, parcel_id: '' }));
    if (!projectId) {
      setParcels([]);
      return;
    }
    try {
      const res = await api.get('/parcels', { params: { project_id: projectId, limit: 100 } });
      setParcels(res.data.data || []);
    } catch (err) {
      console.error('Failed to load parcels:', err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/rr/families', createForm);
      setIsCreateOpen(false);
      setCreateForm({
        project_id: '',
        parcel_id: '',
        head_of_family: '',
        members_count: 4,
        category: 'DISPLACED',
        entitlement: '',
        contact: '',
      });
      fetchFamilies();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create family record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/rr/families/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchFamilies();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete family record');
    } finally {
      setDeleting(false);
    }
  };

  const canCreate = hasRole('DLAO', 'PIA', 'SGA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Executive Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-blue-700" />
            Statutory Rehabilitation & Resettlement (R&R)
          </h1>
          <p className="page-subtitle">
            Track and manage affected & displaced families, statutory entitlement packages, and R&R activity execution
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Register New R&R Family
          </button>
        )}
      </div>

      {/* Professional Executive KPI Stats Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total R&R Cases</p>
          <p className="text-2xl font-extrabold text-slate-900">{stats?.families?.total || meta.total || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            👨‍👩‍👧‍👦 {stats?.families?.totalPersons || 22} Dependents Covered
          </p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Displaced Families</p>
          <p className="text-2xl font-extrabold text-indigo-700">{stats?.families?.displaced || 0}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Housing Plot Allotments</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Activities Settled</p>
          <p className="text-2xl font-extrabold text-emerald-600">
            {stats?.activities?.completed || 0}
            <span className="text-xs text-slate-400 font-normal ml-1">({stats?.activities?.overallProgressPercentage || 0}%)</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Second Schedule Completed</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Delayed Tasks</p>
          <p className={`text-2xl font-extrabold ${stats?.activities?.delayed > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats?.activities?.delayed || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending Action</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search family head, code, contact, survey number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input text-xs pl-9 w-full"
            />
          </div>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`btn btn-sm flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${
              overdueOnly ? 'bg-rose-50 text-rose-800 border border-rose-300' : 'btn-secondary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Delayed Only
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select text-xs w-auto min-w-[160px]"
          >
            <option value="">All Categories</option>
            <option value="DISPLACED">Displaced Families</option>
            <option value="AFFECTED">Affected Families</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select text-xs w-auto min-w-[130px]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="form-select text-xs w-auto min-w-[160px]"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* R&R Cases Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading statutory R&R cases...</p>
        </div>
      ) : families.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <UsersIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No R&R Cases Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || categoryFilter || projectFilter
              ? 'No R&R family records match your active filters. Try clearing your filters.'
              : 'No R&R cases exist in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {families.map((f) => {
            const totalAct = parseInt(f.total_activities, 10) || 0;
            const compAct = parseInt(f.completed_activities, 10) || 0;
            const pct = totalAct > 0 ? Math.round((compAct / totalAct) * 100) : 0;
            const isFinished = totalAct > 0 && compAct === totalAct;
            const statusKey = isFinished ? 'COMPLETED' : totalAct > 0 ? 'IN_PROGRESS' : 'PENDING';

            return (
              <Link
                key={f.id}
                to={`/rr/families/${f.id}`}
                className="card hover:border-blue-300 transition-all group flex flex-col overflow-hidden relative"
              >
                {/* Subtle Sleek Top Line */}
                <div className="h-[3px] w-full bg-slate-200 group-hover:bg-blue-600 transition-colors" />

                <div className="card-body flex-1">
                  {/* Top row: code + badges + delete button */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {f.family_code}
                      </span>
                      <span className={`badge ${CATEGORY_BADGES[f.category] || ''}`}>
                        {f.category}
                      </span>
                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200">
                        👨‍👩‍👧‍👦 {f.members_count} Members
                      </span>
                      {parseInt(f.delayed_activities, 10) > 0 && (
                        <span className="badge bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {f.delayed_activities} Delayed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${STATUS_STYLES[statusKey] || ''}`}>
                        {statusKey.replace('_', ' ')}
                      </span>

                      {canCreate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTarget(f);
                          }}
                          title="Delete Family Record"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current Stage Indicator Box */}
                  <div className="mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block flex items-center justify-between">
                      <span>Current R&R Milestone</span>
                      <span className="text-slate-500 font-semibold">{pct}% Done</span>
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
                      {compAct === 0 ? 'Entitlement Allocation & Housing Sanction' : compAct < totalAct ? 'Activity Implementation & Grant Disbursement' : 'R&R Settled & Closed'}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{f.project_name || 'No project'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {f.survey_number ? `Survey #${f.survey_number} (${f.village || ''})` : 'No parcel linked'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-semibold text-slate-800">{f.head_of_family}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{compAct}/{totalAct} Tasks Done</span>
                    </div>
                  </div>

                  {/* Professional Statutory Entitlement Banner */}
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-md text-[11px] text-slate-800 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5 truncate text-slate-700">
                      <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{f.entitlement ? f.entitlement.split('+')[0] : 'Statutory Housing & Grant Package'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300 flex-shrink-0 ml-2">
                      Sec 31 RFCTLARR
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono font-medium">
                    {f.project_code || 'PRJ-2026-001'}
                  </span>
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View R&R Pipeline <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md bg-white p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete Family Record
              </h3>
              <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the R&R record for{' '}
              <strong className="text-slate-900">{deleteTarget.head_of_family}</strong> ({deleteTarget.family_code})?
              All associated tasks will be removed.
            </p>

            <div className="flex justify-end gap-3 border-t pt-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFamily}
                disabled={deleting}
                className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New Family */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg bg-white p-6 rounded-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-700" /> Register Affected/Displaced Family
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Project *</label>
                <select
                  required
                  value={createForm.project_id}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>
                  ))}
                </select>
              </div>

              {parcels.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Associated Parcel (Optional)</label>
                  <select
                    value={createForm.parcel_id}
                    onChange={(e) => setCreateForm({ ...createForm, parcel_id: e.target.value })}
                    className="form-select w-full"
                  >
                    <option value="">-- Select Parcel --</option>
                    {parcels.map((pc) => (
                      <option key={pc.id} value={pc.id}>
                        Survey #{pc.survey_number} ({pc.village}) - {pc.parcel_code}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Head of Family Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar Sharma"
                    value={createForm.head_of_family}
                    onChange={(e) => setCreateForm({ ...createForm, head_of_family: e.target.value })}
                    className="form-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Family Members Count *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.members_count}
                    onChange={(e) => setCreateForm({ ...createForm, members_count: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="form-select w-full"
                  >
                    <option value="DISPLACED">DISPLACED (Physical Relocation)</option>
                    <option value="AFFECTED">AFFECTED (Livelihood Impact)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={createForm.contact}
                    onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Statutory Entitlement Package</label>
                <textarea
                  rows={3}
                  placeholder="Specify entitlements under RFCTLARR Act 2013 (housing plot, grant, training)..."
                  value={createForm.entitlement}
                  onChange={(e) => setCreateForm({ ...createForm, entitlement: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary text-xs font-semibold">
                  {submitting ? 'Registering...' : 'Register Family'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
