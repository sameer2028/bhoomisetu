import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';

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

const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-200',
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  SENT_BACK: 'bg-orange-50 text-orange-800 border-orange-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
};

export default function CaseListPage() {
  const { hasRole } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [meta, setMeta] = useState({ total: 0 });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (stageFilter) params.current_stage = stageFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (overdueOnly) params.is_overdue = 'true';

      const res = await api.get('/workflow/cases', { params });
      setCases(res.data.data || []);
      setMeta(res.data.meta || { total: 0 });
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, statusFilter, priorityFilter, overdueOnly]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const canCreate = hasRole('DLAO', 'PIA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-700" /> Statutory Acquisition Workflow
          </h1>
          <p className="page-subtitle">
            Track and manage land acquisition cases through the 11-stage statutory pipeline
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Create New Case
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Cases</p>
          <p className="text-2xl font-extrabold text-slate-900">{meta.total}</p>
        </div>
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">In Progress</p>
          <p className="text-2xl font-extrabold text-indigo-700">
            {cases.filter(c => c.status === 'IN_PROGRESS').length}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Action</p>
          <p className="text-2xl font-extrabold text-amber-600">
            {cases.filter(c => c.status === 'PENDING' || c.status === 'SENT_BACK').length}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Overdue Cases</p>
          <p className="text-2xl font-extrabold text-rose-600">
            {cases.filter(c => c.overdue).length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by case code (e.g. CAS-...), project name, parcel, or assigned officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input form-input-search text-xs"
            />
          </div>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`btn btn-sm flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${
              overdueOnly ? 'bg-rose-50 text-rose-800 border border-rose-300' : 'btn-secondary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Only
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="form-select text-xs w-auto min-w-[160px]"
          >
            <option value="">All 11 Stages</option>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
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
            <option value="SENT_BACK">Sent Back</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-select text-xs w-auto min-w-[130px]"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading acquisition cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <GitBranch className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Cases Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || stageFilter || statusFilter || priorityFilter || overdueOnly
              ? 'No statutory cases match your active filters. Try clearing your filters.'
              : 'No acquisition cases exist in the workflow yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="card hover:border-blue-300 transition-all group flex flex-col overflow-hidden"
            >
              <div className="card-body flex-1">
                {/* Top row: code + badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {c.case_code}
                    </span>
                    <span className={`badge ${PRIORITY_STYLES[c.priority] || ''}`}>
                      {c.priority}
                    </span>
                    {c.overdue && (
                      <span className="badge bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> OVERDUE
                      </span>
                    )}
                  </div>
                  <span className={`badge ${STATUS_STYLES[c.status] || ''}`}>
                    {c.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Stage indicator */}
                <div className="mb-3.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Current Stage</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
                    {STAGE_LABELS[c.current_stage] || c.current_stage}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <FolderKanban className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.project_name || 'No project'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.parcel_code || 'No parcel linked'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.assigned_officer_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className={c.overdue ? 'text-rose-600 font-bold' : ''}>
                      {c.due_date ? new Date(c.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  {c.project_code}
                </span>
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Case Pipeline <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateOpen && (
        <CreateCaseModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            fetchCases();
          }}
        />
      )}
    </div>
  );
}

// ─── Create Case Modal ──────────────────────────────────────────────
function CreateCaseModal({ onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    parcel_id: '',
    priority: 'MEDIUM',
    due_date: '',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects?limit=100').then(res => setProjects(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      api.get(`/parcels?project_id=${formData.project_id}&limit=100`)
        .then(res => setParcels(res.data.data || []))
        .catch(() => {});
    } else {
      setParcels([]);
    }
  }, [formData.project_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) {
      setError('Please select a project.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        project_id: formData.project_id,
        parcel_id: formData.parcel_id || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        remarks: formData.remarks || undefined,
      };
      await api.post('/workflow/cases', payload);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-floating border border-slate-200/90 w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-700" /> Create Acquisition Case
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Project *</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value, parcel_id: '' })}
              className="form-select text-xs"
              required
            >
              <option value="">Select a project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Parcel (Optional)</label>
            <select
              value={formData.parcel_id}
              onChange={(e) => setFormData({ ...formData, parcel_id: e.target.value })}
              className="form-select text-xs"
              disabled={!formData.project_id}
            >
              <option value="">No specific parcel</option>
              {parcels.map(p => (
                <option key={p.id} value={p.id}>{p.parcel_code} — {p.survey_number} ({p.village})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="form-select text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="form-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="form-input text-xs"
              rows={3}
              placeholder="Describe the acquisition purpose..."
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary text-xs font-semibold">
              {submitting ? <span className="spinner !border-white/30 !border-t-white" /> : <Plus className="w-4 h-4" />}
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

