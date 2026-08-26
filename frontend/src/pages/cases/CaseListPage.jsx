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
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SENT_BACK: 'bg-orange-100 text-orange-800',
  REJECTED: 'bg-red-100 text-red-800',
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
            <GitBranch className="w-6 h-6 text-blue-700" /> Acquisition Workflow
          </h1>
          <p className="page-subtitle">
            Track and manage land acquisition cases through the 11-stage statutory pipeline
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create New Case
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kpi-card">
          <p className="text-xs text-neutral-500 mb-1">Total Cases</p>
          <p className="text-2xl font-bold text-neutral-900">{meta.total}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-neutral-500 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-700">
            {cases.filter(c => c.status === 'IN_PROGRESS').length}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-neutral-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {cases.filter(c => c.status === 'PENDING' || c.status === 'SENT_BACK').length}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-neutral-500 mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">
            {cases.filter(c => c.overdue).length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by case code, project, parcel, or officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 text-sm"
            />
          </div>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`btn btn-sm flex items-center gap-1.5 whitespace-nowrap ${
              overdueOnly ? 'bg-red-100 text-red-800 border border-red-200' : 'btn-secondary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Only
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="form-select text-sm w-auto min-w-[150px]"
          >
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select text-sm w-auto min-w-[130px]"
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
            className="form-select text-sm w-auto min-w-[130px]"
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
        <div className="py-16 text-center">
          <span className="spinner spinner-lg mb-3" />
          <p className="text-sm text-neutral-500">Loading acquisition cases...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="card p-12 text-center">
          <GitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-800">No Cases Found</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            {search || stageFilter || statusFilter || priorityFilter || overdueOnly
              ? 'No cases match your search filters. Try clearing filters.'
              : 'No acquisition cases exist yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="card hover:border-blue-300 transition-all group flex flex-col"
            >
              <div className="card-body flex-1">
                {/* Top row: code + badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {c.case_code}
                    </span>
                    <span className={`badge ${PRIORITY_STYLES[c.priority] || ''}`}>
                      {c.priority}
                    </span>
                    {c.overdue && (
                      <span className="badge bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                  </div>
                  <span className={`badge ${STATUS_STYLES[c.status] || ''}`}>
                    {c.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Stage indicator */}
                <div className="mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Current Stage</span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse" />
                    {STAGE_LABELS[c.current_stage] || c.current_stage}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <FolderKanban className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{c.project_name || 'No project'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{c.parcel_code || 'No parcel linked'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{c.assigned_officer_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className={c.overdue ? 'text-red-600 font-semibold' : ''}>
                      {c.due_date ? new Date(c.due_date).toLocaleDateString() : 'No deadline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  {c.project_code}
                </span>
                <span className="text-xs font-semibold text-blue-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Case <ChevronRight className="w-4 h-4" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-700" /> Create Acquisition Case
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Project *</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value, parcel_id: '' })}
              className="form-select"
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
              className="form-select"
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
                className="form-select"
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
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Describe the acquisition purpose..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <span className="spinner" /> : <Plus className="w-4 h-4" />}
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
