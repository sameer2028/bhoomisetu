import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  GitBranch,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  User,
  FolderKanban,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRightCircle,
  RotateCcw,
  XCircle,
  MessageSquare,
  Shield,
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

const ACTION_CONFIG = {
  APPROVE: {
    label: 'Approve & Forward',
    icon: CheckCircle2,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    description: 'Approve this stage and advance the case to the next step in the pipeline.',
  },
  FORWARD: {
    label: 'Forward',
    icon: ArrowRightCircle,
    className: 'bg-blue-700 text-white hover:bg-blue-800',
    description: 'Forward this case to the next stage for further processing.',
  },
  SEND_BACK: {
    label: 'Send Back',
    icon: RotateCcw,
    className: 'bg-amber-500 text-white hover:bg-amber-600',
    description: 'Return this case to the previous stage for re-verification or correction.',
  },
  REJECT: {
    label: 'Reject',
    icon: XCircle,
    className: 'bg-red-600 text-white hover:bg-red-700',
    description: 'Reject this acquisition case. This action is terminal and cannot be undone.',
  },
  COMPLETE: {
    label: 'Complete & Close',
    icon: CheckCircle2,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    description: 'Mark R&R activities as complete and close this acquisition case.',
  },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitionModal, setTransitionModal] = useState(null); // action name or null

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workflow/cases/${id}`);
      setCaseData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch case:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const canTransition = hasRole('DLAO', 'SGA', 'ADMIN');

  if (loading) {
    return (
      <div className="py-16 text-center">
        <span className="spinner spinner-lg mb-3" />
        <p className="text-sm text-neutral-500">Loading case details...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="card p-12 text-center">
        <GitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-800">Case Not Found</h3>
        <p className="text-sm text-neutral-500 mt-1">The requested acquisition case could not be found.</p>
        <Link to="/cases" className="btn btn-primary mt-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
      </div>
    );
  }

  const isTerminal = ['COMPLETED', 'REJECTED'].includes(caseData.status);

  return (
    <div className="space-y-6 fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link to="/cases" className="hover:text-blue-700 transition-colors">Workflow</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-neutral-800 font-medium">{caseData.case_code}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="page-title flex items-center gap-2 mb-0">
              <GitBranch className="w-6 h-6 text-blue-700" />
              {caseData.case_code}
            </h1>
            <span className={`badge ${PRIORITY_STYLES[caseData.priority] || ''}`}>
              {caseData.priority}
            </span>
            <span className={`badge ${STATUS_STYLES[caseData.status] || ''}`}>
              {caseData.status?.replace('_', ' ')}
            </span>
            {caseData.overdue && (
              <span className="badge bg-red-100 text-red-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> OVERDUE
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            {caseData.remarks || 'No description'}
          </p>
        </div>

        <Link
          to="/cases"
          className="btn btn-secondary self-start flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> All Cases
        </Link>
      </div>

      {/* ─── 11-Step Stage Stepper ───────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Workflow Progress
        </h2>

        {/* Desktop stepper */}
        <div className="hidden lg:block">
          <div className="flex items-start">
            {caseData.stageProgress?.map((stage, index) => {
              const isFirst = index === 0;
              const isLast = index === caseData.stageProgress.length - 1;

              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {!isFirst && (
                    <div
                      className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${
                        stage.status === 'completed' || stage.status === 'current'
                          ? 'bg-blue-500'
                          : stage.status === 'rejected'
                          ? 'bg-red-300'
                          : 'bg-neutral-200'
                      }`}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      stage.status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : stage.status === 'current'
                        ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100 animate-pulse'
                        : stage.status === 'rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : stage.status === 'rejected' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-[10px] mt-2 text-center leading-tight font-medium max-w-[80px] ${
                      stage.status === 'current'
                        ? 'text-blue-700 font-bold'
                        : stage.status === 'completed'
                        ? 'text-emerald-700'
                        : 'text-neutral-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile stepper (vertical) */}
        <div className="lg:hidden space-y-2">
          {caseData.stageProgress?.map((stage, index) => (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  stage.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : stage.status === 'current'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                    : stage.status === 'rejected'
                    ? 'bg-red-500 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {stage.status === 'completed' ? '✓' : index + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  stage.status === 'current'
                    ? 'text-blue-700 font-bold'
                    : stage.status === 'completed'
                    ? 'text-emerald-700'
                    : 'text-neutral-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Main Content Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case Info + Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Case Info Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-bold text-neutral-700">Case Information</h3>
            </div>
            <div className="card-body space-y-4">
              <InfoRow icon={GitBranch} label="Case Code" value={caseData.case_code} />
              <InfoRow
                icon={FolderKanban}
                label="Project"
                value={
                  <Link to={`/projects/${caseData.project_id}`} className="text-blue-700 hover:underline">
                    {caseData.project_code} — {caseData.project_name}
                  </Link>
                }
              />
              {caseData.parcel_code && (
                <InfoRow
                  icon={MapPin}
                  label="Parcel"
                  value={
                    <Link to={`/parcels/${caseData.parcel_id}`} className="text-blue-700 hover:underline">
                      {caseData.parcel_code} — {caseData.survey_number}
                    </Link>
                  }
                />
              )}
              <InfoRow
                icon={User}
                label="Assigned Officer"
                value={
                  <div>
                    <span className="font-medium">{caseData.assigned_officer_name || 'Unassigned'}</span>
                    {caseData.assigned_officer_role && (
                      <span className="text-neutral-400 text-[10px] block">{caseData.assigned_officer_role}</span>
                    )}
                  </div>
                }
              />
              <InfoRow
                icon={Calendar}
                label="Due Date"
                value={
                  <span className={caseData.overdue ? 'text-red-600 font-bold' : ''}>
                    {caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : 'No deadline'}
                    {caseData.overdue && ' (OVERDUE)'}
                  </span>
                }
              />
              <InfoRow
                icon={Clock}
                label="Created"
                value={new Date(caseData.created_at).toLocaleString()}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {canTransition && !isTerminal && caseData.allowedActions?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-bold text-neutral-700">Workflow Actions</h3>
              </div>
              <div className="card-body space-y-2">
                {caseData.allowedActions.map((action) => {
                  const config = ACTION_CONFIG[action];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={action}
                      onClick={() => setTransitionModal(action)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${config.className}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left">
                        <div>{config.label}</div>
                        <div className="text-[10px] font-normal opacity-80">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isTerminal && (
            <div className={`card border-2 ${caseData.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="card-body text-center py-6">
                {caseData.status === 'COMPLETED' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-emerald-800">Case Completed</p>
                    <p className="text-xs text-emerald-600 mt-1">This acquisition case has been completed successfully.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
                    <p className="font-bold text-red-800">Case Rejected</p>
                    <p className="text-xs text-red-600 mt-1">This acquisition case has been rejected.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Audit Timeline */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Audit Timeline
              </h3>
              <span className="text-xs text-neutral-400">
                {caseData.auditTimeline?.length || 0} events
              </span>
            </div>
            <div className="card-body">
              {(!caseData.auditTimeline || caseData.auditTimeline.length === 0) ? (
                <p className="text-sm text-neutral-400 text-center py-8">No audit events recorded.</p>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-neutral-200" />

                  <div className="space-y-1">
                    {caseData.auditTimeline.map((event, index) => (
                      <TimelineEvent key={event.id} event={event} isLast={index === caseData.auditTimeline.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {transitionModal && (
        <TransitionModal
          action={transitionModal}
          caseData={caseData}
          onClose={() => setTransitionModal(null)}
          onSuccess={() => {
            setTransitionModal(null);
            fetchCase();
          }}
        />
      )}
    </div>
  );
}

// ─── Info Row Component ─────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{label}</p>
        <div className="text-sm text-neutral-800">{value}</div>
      </div>
    </div>
  );
}

// ─── Timeline Event Component ───────────────────────────────────────
function TimelineEvent({ event, isLast }) {
  const actionColors = {
    CREATE: 'bg-blue-500',
    APPROVE: 'bg-emerald-500',
    FORWARD: 'bg-blue-500',
    SEND_BACK: 'bg-amber-500',
    REJECT: 'bg-red-500',
    COMPLETE: 'bg-emerald-500',
  };

  const actionLabels = {
    CREATE: 'Created',
    APPROVE: 'Approved',
    FORWARD: 'Forwarded',
    SEND_BACK: 'Sent Back',
    REJECT: 'Rejected',
    COMPLETE: 'Completed',
  };

  return (
    <div className="relative flex gap-4 pb-5">
      {/* Dot */}
      <div className={`relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 flex-shrink-0 ring-2 ring-white ${actionColors[event.action] || 'bg-neutral-400'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white ${actionColors[event.action] || 'bg-neutral-400'}`}>
            {actionLabels[event.action] || event.action}
          </span>
          {event.from_stage && event.to_stage && event.from_stage !== event.to_stage && (
            <span className="text-[10px] text-neutral-500">
              {STAGE_LABELS[event.from_stage]} → {STAGE_LABELS[event.to_stage]}
            </span>
          )}
          {!event.from_stage && event.to_stage && (
            <span className="text-[10px] text-neutral-500">
              → {STAGE_LABELS[event.to_stage]}
            </span>
          )}
        </div>

        {event.remarks && (
          <p className="text-sm text-neutral-700 leading-relaxed mb-1.5">
            {event.remarks}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {event.performed_by_name || 'System'}
            {event.performed_by_role && ` (${event.performed_by_role})`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(event.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Transition Modal ───────────────────────────────────────────────
function TransitionModal({ action, caseData, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const config = ACTION_CONFIG[action];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (remarks.trim().length < 3) {
      setError('Please provide meaningful remarks (at least 3 characters).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/workflow/cases/${caseData.id}/transition`, {
        action,
        remarks: remarks.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Transition failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = config?.icon || GitBranch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Icon className="w-5 h-5" /> {config?.label || action}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-neutral-600">
            {config?.description}
          </p>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Case</span>
              <span className="font-mono font-bold text-neutral-800">{caseData.case_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Stage</span>
              <span className="font-medium text-neutral-800">{STAGE_LABELS[caseData.current_stage]}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Remarks *</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-input"
              rows={4}
              placeholder="Provide your decision rationale, observations, or instructions..."
              required
              minLength={3}
              autoFocus
            />
          </div>

          {action === 'REJECT' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>⚠ Warning:</strong> Rejecting this case is a permanent action. The case will be closed and cannot be reopened.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className={`btn ${config?.className || 'btn-primary'}`}
            >
              {submitting ? <span className="spinner" /> : <Icon className="w-4 h-4" />}
              Confirm {config?.label || action}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
