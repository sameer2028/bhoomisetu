import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toLandReference } from '../../services/landRecordMapper';
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
  MoreVertical,
  Compass,
  ShieldCheck,
  Award,
  Bell,
  IndianRupee,
  Flag,
  Users as UsersIcon,
} from 'lucide-react';

const STAGES_ORDER = [
  'PROJECT_PROPOSAL',
  'LAND_IDENTIFICATION',
  'VERIFICATION',
  'APPROVAL',
  'NOTIFICATION',
  'COMPENSATION',
  'AWARD',
  'PAYMENT',
  'POSSESSION',
  'RR',
  'CLOSURE',
];

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

const STAGE_ICONS = {
  PROJECT_PROPOSAL: FolderKanban,
  LAND_IDENTIFICATION: Compass,
  VERIFICATION: ShieldCheck,
  APPROVAL: Award,
  NOTIFICATION: Bell,
  COMPENSATION: IndianRupee,
  AWARD: Award,
  PAYMENT: IndianRupee,
  POSSESSION: Flag,
  RR: UsersIcon,
  CLOSURE: CheckCircle2,
};

const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200 font-bold',
  CRITICAL: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  SENT_BACK: 'bg-orange-50 text-orange-800 border-orange-200 font-semibold',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
};

export default function CaseListPage() {
  const { hasRole } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
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

  // Client-side sorting for rapid responsiveness
  const sortedCases = useMemo(() => {
    const list = [...cases];
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'due_date') {
      list.sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));
    } else if (sortBy === 'priority') {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      list.sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
    }
    return list;
  }, [cases, sortBy]);

  const canCreate = hasRole('DLAO', 'PIA', 'ADMIN');

  const getCardBorderColor = (c) => {
    if (c.overdue) return 'border-l-4 border-l-rose-500';
    if (c.status === 'COMPLETED') return 'border-l-4 border-l-emerald-500';
    if (c.status === 'IN_PROGRESS') return 'border-l-4 border-l-blue-500';
    return 'border-l-4 border-l-amber-400';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-700" /> Land Acquisition Cases
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="kpi-card kpi-card-green">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cases</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{meta.total}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">All cases in pipeline</p>
        </div>

        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Progress</p>
              <p className="text-xl font-black text-indigo-700 leading-none mt-0.5">
                {cases.filter(c => c.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Active statutory cases</p>
        </div>

        <div className="kpi-card kpi-card-amber">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Action</p>
              <p className="text-xl font-black text-amber-600 leading-none mt-0.5">
                {cases.filter(c => c.status === 'PENDING' || c.status === 'SENT_BACK').length}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Awaiting officer action</p>
        </div>

        <div className="kpi-card kpi-card-red">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overdue Cases</p>
              <p className="text-xl font-black text-rose-600 leading-none mt-0.5">
                {cases.filter(c => c.overdue).length}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Require immediate attention</p>
        </div>
      </div>

      {/* Modern Compact Horizontal Enterprise Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-3 flex flex-wrap lg:flex-nowrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] w-full lg:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case code, project, parcel, or officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input form-input-search text-xs w-full"
          />
        </div>

        {/* Dropdowns & Controls in the same horizontal line */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[140px]"
        >
          <option value="">All 11 Stages</option>
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[125px]"
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
          className="form-select text-xs w-auto min-w-[120px]"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="form-select text-xs w-auto min-w-[140px]"
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="due_date">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
        </select>

        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer select-none text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors flex-shrink-0">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
          />
          <AlertTriangle className={`w-3.5 h-3.5 ${overdueOnly ? 'text-rose-600' : 'text-slate-400'}`} />
          <span className={overdueOnly ? 'text-rose-700 font-bold' : ''}>Overdue Only</span>
        </label>

        <button
          onClick={() => {
            setSearch('');
            setStageFilter('');
            setStatusFilter('');
            setPriorityFilter('');
            setOverdueOnly(false);
            setSortBy('newest');
          }}
          className="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
        </button>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading acquisition cases...</p>
        </div>
      ) : sortedCases.length === 0 ? (
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
          {sortedCases.map((c) => {
            const stageIndex = STAGES_ORDER.indexOf(c.current_stage) >= 0 ? STAGES_ORDER.indexOf(c.current_stage) : 0;
            const stageNumber = stageIndex + 1;
            const StageIcon = STAGE_ICONS[c.current_stage] || Compass;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border border-slate-200/90 shadow-card hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${getCardBorderColor(c)}`}
              >
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* TOP: Case ID, Priority, Overdue | Status, More */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        {c.case_code}
                      </span>
                      <span className={`badge ${PRIORITY_STYLES[c.priority] || 'bg-slate-100 text-slate-700'}`}>
                        {c.priority}
                      </span>
                      {c.overdue && (
                        <span className="badge bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`badge ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-700'}`}>
                        {c.status?.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        aria-label="More case options"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* CURRENT STAGE */}
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block leading-none mb-1">
                          Current Stage
                        </span>
                        <p className="text-xs font-bold text-slate-900 leading-none">
                          {STAGE_LABELS[c.current_stage] || c.current_stage}{' '}
                          <span className="text-[11px] text-slate-400 font-normal ml-1">
                            Stage {stageNumber} of 11
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* 11-step Horizontal Pipeline */}
                    <div className="flex items-center w-full mt-3 px-1">
                      {STAGES_ORDER.map((stage, idx) => {
                        const isCompleted = idx < stageIndex;
                        const isCurrent = idx === stageIndex;
                        return (
                          <div key={stage} className="flex items-center flex-1 last:flex-none">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                                isCurrent
                                  ? 'bg-blue-600 ring-4 ring-blue-100 scale-110'
                                  : isCompleted
                                  ? 'bg-blue-600'
                                  : 'bg-slate-200'
                              }`}
                              title={`Stage ${idx + 1}: ${STAGE_LABELS[stage]}`}
                            />
                            {idx < STAGES_ORDER.length - 1 && (
                              <div
                                className={`h-0.5 w-full mx-0.5 transition-all ${
                                  idx < stageIndex ? 'bg-blue-600' : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CASE INFORMATION: 2-column Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-slate-100/80">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                        Project
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate block" title={c.project_name}>
                        {c.project_name || 'No project'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                        Land Reference
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-900 truncate block">
                        {c.parcel_code ? toLandReference({
                          parcelCode: c.parcel_code,
                          surveyNumber: c.survey_number,
                          village: c.village,
                          year: c.created_at ? new Date(c.created_at).getFullYear() : '2026'
                        }) : 'No land linked'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                        Assigned Officer
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate block" title={c.assigned_officer_name}>
                        {c.assigned_officer_name || 'Unassigned'}
                        {c.assigned_officer_district ? ` (${c.assigned_officer_district})` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                        Target Date
                      </span>
                      <span className={`text-xs font-semibold block ${c.overdue ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                        {c.due_date ? new Date(c.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM: Created Date + Action */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Created on: {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                  <Link
                    to={`/cases/${c.id}`}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:translate-x-0.5 transition-transform"
                  >
                    View Case Pipeline <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
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
    api.get('/projects?limit=100&all=true').then(res => setProjects(res.data.data || [])).catch(() => {});
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

