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
  Building2,
  Flag,
  MoreVertical,
  FileText,
  ExternalLink,
  Check,
  HelpCircle,
  Eye,
  ListChecks,
  FileCheck,
  Layers,
  IndianRupee,
  Users as UsersIcon,
  Map as MapIcon,
  Download,
} from 'lucide-react';

// ─── Stage Configuration & Comprehensive Guidance Data ──────────────
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

const STAGE_ORDER = [
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

const STAGE_GUIDANCE_DATA = {
  PROJECT_PROPOSAL: {
    description:
      'The requiring department (e.g. NHAI, PWD, Water Resources) submits a formal land acquisition proposal defining project objectives, layout map, estimated land area, and initial funding authorization.',
    tasks: [
      { text: 'Submission of formal proposal by Requiring Body', done: true },
      { text: 'Preliminary scope & corridor width validation', done: true },
      { text: 'Assignment of case code & DLAO', done: false },
      { text: 'Budget & administrative feasibility assessment', done: false },
    ],
    documents: [
      { name: 'Project Plan / DPR', status: 'Uploaded' },
      { name: 'Administrative Sanction Order', status: 'Uploaded' },
      { name: 'Proposed Corridor Alignment Map', status: 'Pending' },
      { name: 'Budget Estimate & Source', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-PROP-001',
        title: 'Detailed Project Report (DPR) & Layout Map',
        verifier: 'NHAI Infrastructure Authority',
        date: '26 Aug 2026',
        size: '4.2 MB',
        status: 'Verified',
      },
      {
        code: 'DOC-PROP-002',
        title: 'Administrative Sanction & Budget Clearance',
        verifier: 'Ministry of Road Transport & Highways',
        date: '26 Aug 2026',
        size: '1.8 MB',
        status: 'Verified',
      },
    ],
  },
  LAND_IDENTIFICATION: {
    description:
      'Extraction of revenue Khasra maps, survey numbers, boundary demarcation, and preliminary field schedule verification by the Revenue Department.',
    tasks: [
      { text: 'Extraction of Revenue Khasra maps & survey numbers', done: true },
      { text: 'Overlaying project alignment on GIS cadastral layer', done: true },
      { text: 'Verification of land ownership & Khatauni records', done: true },
      { text: 'Identification of government vs private land proportion', done: false },
    ],
    documents: [
      { name: 'Village Khasra Map / Shajra', status: 'Uploaded' },
      { name: 'Land Parcel Survey Schedule', status: 'Uploaded' },
      { name: 'Preliminary Cadastral Boundaries', status: 'Uploaded' },
      { name: 'Land Class & Tenancy Certificate', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-IDENT-001',
        title: 'Cadastral Map Overlay & Khasra Schedule',
        verifier: 'District Revenue Department',
        date: '24 Aug 2026',
        size: '6.1 MB',
        status: 'Verified',
      },
    ],
  },
  VERIFICATION: {
    description:
      'On-ground field inspection by Field Revenue Officers (FRO) to verify land boundaries, structures, trees, crops, and encumbrances.',
    tasks: [
      { text: 'Physical ground verification of survey boundaries', done: true },
      { text: 'Geo-tagging of structures, wells, and standing crops', done: true },
      { text: 'Public notice verification in local Gram Panchayat', done: true },
      { text: 'Objections & claims collection from landowners', done: false },
    ],
    documents: [
      { name: 'Field Verification Report (FRO Signed)', status: 'Uploaded' },
      { name: 'Geo-Tagged Field Inspection Photographs', status: 'Uploaded' },
      { name: 'Public Objections & Dispute Summary', status: 'Uploaded' },
      { name: 'Tree & Structure Valuation Schedule', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-VERIF-001',
        title: 'Field Survey Inspection Report & Photos',
        verifier: 'Field Revenue Officer (Lucknow)',
        date: '25 Aug 2026',
        size: '8.4 MB',
        status: 'Verified',
      },
    ],
  },
  APPROVAL: {
    description:
      'Statutory evaluation under RFCTLARR Act 2013 by District Land Acquisition Officer (DLAO) and Senior Government Authority (SGA).',
    tasks: [
      { text: 'Social Impact Assessment (SIA) report evaluation', done: true },
      { text: 'Environment & Rehabilitation clearance check', done: true },
      { text: 'Competent Authority approval signature', done: false },
      { text: 'Issuance of formal acquisition clearance order', done: false },
    ],
    documents: [
      { name: 'Social Impact Assessment (SIA) Report', status: 'Uploaded' },
      { name: 'Environmental Clearance Certificate', status: 'Uploaded' },
      { name: 'Formal Approval Notification', status: 'Pending' },
      { name: 'Competent Authority Sanction Order', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-APPR-001',
        title: 'SIA Committee Approval Recommendation',
        verifier: 'State SIA Expert Group',
        date: '20 Aug 2026',
        size: '3.5 MB',
        status: 'Verified',
      },
    ],
  },
  NOTIFICATION: {
    description:
      'Publication of preliminary notification under Section 11 of RFCTLARR Act in Official Gazette and local daily newspapers.',
    tasks: [
      { text: 'Section 11 Preliminary Notification draft preparation', done: true },
      { text: 'Publication in State Gazette & 2 local newspapers', done: true },
      { text: 'Serving individual notices to registered land owners', done: false },
      { text: 'Hearing of objections under Section 15', done: false },
    ],
    documents: [
      { name: 'Gazette Notification Copy (Section 11)', status: 'Uploaded' },
      { name: 'Newspaper Clipping Proofs', status: 'Uploaded' },
      { name: 'Notice Serving Acknowledgement Register', status: 'Pending' },
      { name: 'Hearing of Objections Record', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-NOTIF-001',
        title: 'State Official Gazette Notification (Sec 11)',
        verifier: 'Government Press & Gazette Dept',
        date: '18 Aug 2026',
        size: '2.9 MB',
        status: 'Verified',
      },
    ],
  },
  COMPENSATION: {
    description:
      'Valuation of land market value, 100% Solatium, multiplying factor, and structural compensation determination.',
    tasks: [
      { text: 'Circle rate calculation & sales statistics analysis', done: true },
      { text: 'Solatium (100%) & interest calculation', done: true },
      { text: 'Individual land owner compensation awards calculation', done: true },
      { text: 'Submission to District Collector for approval', done: false },
    ],
    documents: [
      { name: 'Land Valuation & Circle Rate Summary', status: 'Uploaded' },
      { name: 'Detailed Compensation Schedule (Form 7)', status: 'Uploaded' },
      { name: 'Structure & Crop Assessment Valuation', status: 'Uploaded' },
      { name: 'Collector Approval Order', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-COMP-001',
        title: 'Circle Rate & Market Value Assessment Sheet',
        verifier: 'District Valuation Committee',
        date: '22 Aug 2026',
        size: '5.0 MB',
        status: 'Verified',
      },
    ],
  },
  AWARD: {
    description:
      'Declaration and passing of final Land Acquisition Award under Section 23/37 of RFCTLARR Act.',
    tasks: [
      { text: 'Declaration of Final Award by DLAO', done: true },
      { text: 'Allocation of award funds to project escrow account', done: true },
      { text: 'Publication of Award Notice to affected families', done: false },
      { text: 'Service of Section 37 notices to titleholders', done: false },
    ],
    documents: [
      { name: 'Final Award Statement (Form 11)', status: 'Uploaded' },
      { name: 'Fund Authorization & Escrow Credit', status: 'Uploaded' },
      { name: 'Section 37 Notice Copies', status: 'Pending' },
      { name: 'Individual Award Allocation Sheet', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-AWRD-001',
        title: 'DLAO Final Land Acquisition Award Declaration',
        verifier: 'District Collectorate Lucknow',
        date: '15 Aug 2026',
        size: '4.8 MB',
        status: 'Verified',
      },
    ],
  },
  PAYMENT: {
    description:
      'Direct Benefit Transfer (DBT) of compensation amount to verified bank accounts of landowners.',
    tasks: [
      { text: 'Landowner bank account & Aadhaar verification', done: true },
      { text: 'PFMS / Treasury e-Payment generation', done: true },
      { text: 'Disbursement of compensation amount', done: false },
      { text: 'Payment receipt & indemnity bond execution', done: false },
    ],
    documents: [
      { name: 'Treasury Payment Advice / PFMS Voucher', status: 'Uploaded' },
      { name: 'Bank Account Verification Proof', status: 'Uploaded' },
      { name: 'Indemnity & Release Bond', status: 'Pending' },
      { name: 'Compensation Receipt Acknowledgements', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-PAY-001',
        title: 'PFMS Treasury Disbursement Authorization',
        verifier: 'State Treasury & Accounts Dept',
        date: '12 Aug 2026',
        size: '3.1 MB',
        status: 'Verified',
      },
    ],
  },
  POSSESSION: {
    description:
      'Taking physical possession of acquired land under Section 38/40 and handing over to Implementing Agency.',
    tasks: [
      { text: 'Serving 60-day possession notice under Section 38', done: true },
      { text: 'Physical possession takeover on site', done: true },
      { text: 'Revenue record mutation in favor of Government', done: false },
      { text: 'Handing over certificate to Project Implementing Agency', done: false },
    ],
    documents: [
      { name: 'Section 38 Possession Notice', status: 'Uploaded' },
      { name: 'Panchnama / Possession Taking Certificate', status: 'Uploaded' },
      { name: 'Revenue Record Mutation (Dakhal Kabza)', status: 'Pending' },
      { name: 'Handover Certificate to Implementing Agency', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-POSS-001',
        title: 'Site Panchnama & Physical Possession Certificate',
        verifier: 'Tehsildar & Police Department',
        date: '10 Aug 2026',
        size: '7.2 MB',
        status: 'Verified',
      },
    ],
  },
  RR: {
    description:
      'Implementation of Rehabilitation & Resettlement (R&R) scheme including alternate housing, annuity allowance, and livelihood grants.',
    tasks: [
      { text: 'Finalization of affected families list', done: true },
      { text: 'Allotment of alternate residential / commercial plots', done: true },
      { text: 'Payment of one-time Resettlement & Moving allowances', done: false },
      { text: 'Provision of infrastructural amenities at R&R site', done: false },
    ],
    documents: [
      { name: 'Approved R&R Scheme Notification', status: 'Uploaded' },
      { name: 'Allotment Letters for Resettlement Plots', status: 'Uploaded' },
      { name: 'Livelihood Grant Disbursement Sheet', status: 'Pending' },
      { name: 'R&R Completion & Compliance Report', status: 'Pending' },
    ],
    proofs: [
      {
        code: 'DOC-RR-001',
        title: 'Approved Resettlement & Rehabilitation Master Plan',
        verifier: 'State R&R Commissionerate',
        date: '05 Aug 2026',
        size: '9.3 MB',
        status: 'Verified',
      },
    ],
  },
  CLOSURE: {
    description:
      'Final administrative closure of acquisition file, archival of records, and completion audit.',
    tasks: [
      { text: 'Comprehensive financial & audit reconcilement', done: true },
      { text: 'Archival of physical & digital case files', done: true },
      { text: 'Submission of Final Completion Report to Ministry', done: true },
      { text: 'Formal case status update to Closed', done: true },
    ],
    documents: [
      { name: 'Final Completion & Reconciliation Report', status: 'Uploaded' },
      { name: 'Audit Clearance Certificate', status: 'Uploaded' },
      { name: 'GIS Land Bank Entry Confirmation', status: 'Uploaded' },
      { name: 'File Archival Certificate', status: 'Uploaded' },
    ],
    proofs: [
      {
        code: 'DOC-CLOSE-001',
        title: 'Final Audit & Project Archival Clearance',
        verifier: 'Principal Accountant General (Audit)',
        date: '01 Aug 2026',
        size: '5.5 MB',
        status: 'Verified',
      },
    ],
  },
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
    className: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
    iconClass: 'text-emerald-600',
    description: 'Move this case to the next step in statutory pipeline',
  },
  FORWARD: {
    label: 'Approve & Forward',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
    iconClass: 'text-emerald-600',
    description: 'Move this case to the next step',
  },
  SEND_BACK: {
    label: 'Request More Information',
    icon: RotateCcw,
    className: 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200',
    iconClass: 'text-slate-600',
    description: 'Ask for additional details/clarification or return step',
  },
  REJECT: {
    label: 'Reject',
    icon: XCircle,
    className: 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200',
    iconClass: 'text-red-600',
    description: 'Terminate this acquisition case',
  },
  COMPLETE: {
    label: 'Complete & Close Case',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
    iconClass: 'text-emerald-600',
    description: 'Finalize statutory closure of acquisition file',
  },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
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
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

function calculateDaysRemaining(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const today = new Date();
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitionModal, setTransitionModal] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

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
      <div className="py-20 text-center">
        <span className="spinner spinner-lg mb-3" />
        <p className="text-sm text-neutral-500 font-medium">Loading acquisition case details...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-8">
        <GitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-800">Case Not Found</h3>
        <p className="text-sm text-neutral-500 mt-1">The requested acquisition case could not be found.</p>
        <Link to="/cases" className="btn btn-primary mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to All Cases
        </Link>
      </div>
    );
  }

  const isTerminal = ['COMPLETED', 'REJECTED'].includes(caseData.status);
  const currentStageKey = caseData.current_stage || 'PROJECT_PROPOSAL';
  const stageGuidance = STAGE_GUIDANCE_DATA[currentStageKey] || STAGE_GUIDANCE_DATA.PROJECT_PROPOSAL;

  const currentStageIndex = STAGE_ORDER.indexOf(currentStageKey);
  const overallProgressPct = Math.min(100, Math.max(9, Math.round(((currentStageIndex + 1) / 11) * 100)));
  const daysRemaining = calculateDaysRemaining(caseData.due_date);

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* ─── Top Navigation Header Row ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-neutral-900 leading-none">
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
            <p className="text-xs text-neutral-500 mt-1">
              {caseData.remarks || 'Land acquisition statutory workflow case'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/cases"
            className="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Cases
          </Link>
          <button className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Executive Summary KPI Bar (Top Summary Card) ──────────── */}
      <div className="card p-4 sm:p-5 bg-white border border-neutral-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-neutral-100">
          {/* KPI 1: Project */}
          <div className="flex items-center gap-3 pr-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Project</p>
              <Link
                to={`/projects/${caseData.project_id}`}
                className="text-xs font-bold text-blue-700 hover:underline truncate block"
                title={caseData.project_name}
              >
                {caseData.project_code || 'PRJ-2026-003'}
              </Link>
              <p className="text-[11px] text-neutral-500 truncate">{caseData.project_name || 'Infrastructure Project'}</p>
            </div>
          </div>

          {/* KPI 2: Assigned Officer */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Assigned Officer</p>
              <p className="text-xs font-bold text-neutral-900 truncate">
                {caseData.assigned_officer_name || 'Rajesh Sharma'}
              </p>
              <p className="text-[11px] text-neutral-500">({caseData.assigned_officer_role || 'DLAO'})</p>
            </div>
          </div>

          {/* KPI 3: Due Date */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Due Date</p>
              <p className={`text-xs font-bold ${caseData.overdue ? 'text-red-600' : 'text-neutral-900'}`}>
                {formatDate(caseData.due_date)}
              </p>
              {daysRemaining !== null && (
                <p className={`text-[11px] font-medium ${daysRemaining < 0 ? 'text-red-600' : 'text-neutral-500'}`}>
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                </p>
              )}
            </div>
          </div>

          {/* KPI 4: Current Stage */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-xs font-bold text-neutral-900 truncate">
                {STAGE_LABELS[currentStageKey] || currentStageKey}
              </p>
              <p className="text-[11px] text-neutral-500">Step {currentStageIndex + 1} of 11</p>
            </div>
          </div>

          {/* KPI 5: Overall Progress */}
          <div className="flex flex-col justify-center pt-3 md:pt-0 md:pl-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Overall Progress</span>
              <span className="font-extrabold text-neutral-900">{overallProgressPct}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 11-Step Statutory Pipeline Stepper ──────────────────── */}
      <div className="card p-6 bg-white border border-neutral-200">
        <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" /> WORKFLOW PROGRESS
        </h2>

        {/* Stepper Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[850px] flex items-center justify-between relative px-4">
            {/* Connecting line */}
            <div className="absolute left-8 right-8 top-4 h-0.5 bg-neutral-200 -z-0" />

            {STAGE_ORDER.map((stageKey, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const label = STAGE_LABELS[stageKey];

              return (
                <div key={stageKey} className="flex flex-col items-center relative z-10 group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110'
                        : 'bg-white border-2 border-neutral-300 text-neutral-400'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-2.5 text-center whitespace-nowrap max-w-[85px] truncate ${
                      isCurrent
                        ? 'text-blue-700 font-extrabold border-b-2 border-blue-600 pb-0.5'
                        : isPast
                        ? 'text-neutral-700 font-medium'
                        : 'text-neutral-400'
                    }`}
                    title={label}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid (2 Columns: Left 2/3, Right 1/3) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Middle Split Grid: Case Information + Stage Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Case Information (1 col) */}
            <div className="card md:col-span-1 bg-white border border-neutral-200">
              <div className="card-header bg-neutral-50/70 border-b border-neutral-100 py-3">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Case Information</h3>
              </div>
              <div className="card-body py-4 space-y-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-neutral-400 font-mono text-xs w-4">#</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Case Code</p>
                    <p className="font-mono font-bold text-neutral-900">{caseData.case_code}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FolderKanban className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Project</p>
                    <Link
                      to={`/projects/${caseData.project_id}`}
                      className="font-semibold text-blue-700 hover:underline truncate block"
                    >
                      {caseData.project_code} - {caseData.project_name}
                    </Link>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Assigned Officer</p>
                    <p className="font-semibold text-neutral-800">{caseData.assigned_officer_name || 'Rajesh Sharma (DLAO)'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Due Date</p>
                    <p className={`font-semibold ${caseData.overdue ? 'text-red-600' : 'text-neutral-800'}`}>
                      {formatDate(caseData.due_date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Created On</p>
                    <p className="text-neutral-700">{formatDateTime(caseData.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-neutral-400 uppercase font-semibold">Last Updated</p>
                    <p className="text-neutral-700">{formatDateTime(caseData.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Stage Guidance & Mandatory Checklists (2 cols) */}
            <div className="card md:col-span-2 bg-white border border-neutral-200 overflow-hidden flex flex-col justify-between">
              {/* Dark Navy Header Bar */}
              <div className="bg-[#0f172a] text-white px-5 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  STAGE GUIDANCE — {STAGE_LABELS[currentStageKey]?.toUpperCase()}
                </h3>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {/* Description Info Banner */}
                <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3.5 text-xs text-blue-950 flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span>{stageGuidance.description}</span>
                    <button className="text-blue-700 font-bold ml-1 hover:underline inline-block">Read more</button>
                  </div>
                </div>

                {/* 2-Column Inner Tasks & Documents Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Column 1: Key Tasks */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                      KEY TASKS &amp; PROCEDURAL WORKFLOW
                    </h4>
                    <div className="space-y-2 text-xs">
                      {stageGuidance.tasks.map((t, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-neutral-700">
                          {t.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-300 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={t.done ? 'line-through text-neutral-500' : 'font-medium'}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Mandatory Documents Checklist */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      MANDATORY DOCUMENTS CHECKLIST
                    </h4>
                    <div className="space-y-2 text-xs">
                      {stageGuidance.documents.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-neutral-50 border border-neutral-100">
                          <span className="text-neutral-800 font-medium truncate flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                            {d.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              d.status === 'Uploaded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stage Proof & Evidentiary Records Section */}
                <div className="pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      STAGE PROOF &amp; EVIDENTIARY RECORDS ({stageGuidance.proofs.length})
                    </h4>
                    <button className="text-[11px] font-bold text-blue-700 hover:underline">View All</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stageGuidance.proofs.map((proof, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                            <span className="font-mono font-bold text-neutral-600">{proof.code}</span>
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              ✓ {proof.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-neutral-900 leading-snug">{proof.title}</p>
                          <p className="text-[11px] text-neutral-500 mt-1">Verified by: {proof.verifier}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[11px]">
                          <span className="text-neutral-400">{proof.date} • {proof.size}</span>
                          <button
                            onClick={() => setProofPreview(proof)}
                            className="btn btn-secondary btn-sm text-[11px] px-2.5 py-1 flex items-center gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Proof
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Workflow Actions Card ────────────────────────────── */}
          {!isTerminal && (
            <div className="card p-5 bg-white border border-neutral-200">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">
                WORKFLOW ACTIONS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {caseData.allowedActions?.includes('APPROVE') || caseData.allowedActions?.includes('FORWARD') ? (
                  <button
                    onClick={() => setTransitionModal(caseData.allowedActions.includes('APPROVE') ? 'APPROVE' : 'FORWARD')}
                    className="p-4 rounded-xl text-left transition-all bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Approve &amp; Forward
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">Move this case to the next step in statutory pipeline</p>
                  </button>
                ) : null}

                {caseData.allowedActions?.includes('REJECT') && (
                  <button
                    onClick={() => setTransitionModal('REJECT')}
                    className="p-4 rounded-xl text-left transition-all bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-900 mb-1">
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      Reject
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">Terminate this acquisition case permanently</p>
                  </button>
                )}

                {caseData.allowedActions?.includes('SEND_BACK') && (
                  <button
                    onClick={() => setTransitionModal('SEND_BACK')}
                    className="p-4 rounded-xl text-left transition-all bg-slate-50 hover:bg-slate-100 border border-slate-200 group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                      <RotateCcw className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      Request Information
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">Return to previous stage for re-verification</p>
                  </button>
                )}

                {caseData.allowedActions?.includes('COMPLETE') && (
                  <button
                    onClick={() => setTransitionModal('COMPLETE')}
                    className="p-4 rounded-xl text-left transition-all bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 group"
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Complete &amp; Close Case
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">Finalize statutory closure of acquisition file</p>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (1/3 Sidebar) */}
        <div className="space-y-6">
          {/* Audit Timeline Card */}
          <div className="card bg-white border border-neutral-200">
            <div className="card-header bg-neutral-50/70 border-b border-neutral-100 py-3.5 px-5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-700" />
                AUDIT TIMELINE
              </h3>
              <span className="text-[11px] text-neutral-400 font-semibold">
                {caseData.auditTimeline?.length || 0} Events
              </span>
            </div>

            <div className="p-5">
              {(!caseData.auditTimeline || caseData.auditTimeline.length === 0) ? (
                <p className="text-xs text-neutral-400 text-center py-6">No audit events logged yet.</p>
              ) : (
                <div className="relative space-y-4">
                  {/* Vertical timeline connector */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-neutral-200" />

                  {caseData.auditTimeline.map((evt, idx) => (
                    <div key={evt.id || idx} className="flex items-start gap-3.5 relative z-10">
                      {/* Event Dot */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                          evt.action === 'CREATE'
                            ? 'bg-blue-600'
                            : evt.action === 'APPROVE' || evt.action === 'COMPLETE'
                            ? 'bg-emerald-600'
                            : evt.action === 'SEND_BACK'
                            ? 'bg-amber-500'
                            : evt.action === 'REJECT'
                            ? 'bg-red-600'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${
                              evt.action === 'CREATE'
                                ? 'bg-blue-600'
                                : evt.action === 'APPROVE'
                                ? 'bg-emerald-600'
                                : evt.action === 'SEND_BACK'
                                ? 'bg-amber-600'
                                : 'bg-slate-700'
                            }`}
                          >
                            {evt.action === 'CREATE' ? 'CREATED' : evt.action}
                          </span>
                          <span className="text-neutral-500 text-[11px] font-semibold">
                            {STAGE_LABELS[evt.to_stage] || evt.to_stage}
                          </span>
                        </div>

                        <p className="font-semibold text-neutral-900 mt-1 leading-snug">
                          {evt.remarks || 'Stage action updated'}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1">
                          <span>by {evt.performed_by_name || 'Rajesh Sharma (DLAO)'}</span>
                          <span>•</span>
                          <span>{timeAgo(evt.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-neutral-100 text-center">
                <button className="text-xs font-bold text-blue-700 hover:underline flex items-center justify-center gap-1 mx-auto">
                  View Full Audit Trail <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="card bg-white border border-neutral-200">
            <div className="card-header bg-neutral-50/70 border-b border-neutral-100 py-3.5 px-5">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">QUICK LINKS</h3>
            </div>
            <div className="p-3 space-y-1 text-xs font-medium text-neutral-700">
              <Link
                to={`/projects/${caseData.project_id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-600" /> View Project Details
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {caseData.parcel_id && (
                <Link
                  to={`/parcels/${caseData.parcel_id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" /> View Parcel Summary
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

              <Link
                to="/gis"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-purple-600" /> GIS Map — Project Area
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/compensation"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-600" /> Compensation Summary
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/rr"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-rose-600" /> R&amp;R Implications
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Transition Modal ─────────────────────────────────────── */}
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

      {/* ─── Document Proof Preview Modal ──────────────────────────── */}
      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-300">{proofPreview.code}</span>
                <h3 className="text-sm font-bold text-white">{proofPreview.title}</h3>
              </div>
              <button onClick={() => setProofPreview(null)} className="p-1 rounded text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center justify-between">
                <span className="font-semibold">✓ Digital Signature &amp; Verification Valid</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono">MD5 VERIFIED</span>
              </div>

              <div className="space-y-2 text-xs text-neutral-700 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                <div className="flex justify-between py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">Issuing / Verifying Authority</span>
                  <span className="font-semibold text-neutral-900">{proofPreview.verifier}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">Date of Verification</span>
                  <span className="font-semibold text-neutral-900">{proofPreview.date}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Document Size</span>
                  <span className="font-semibold text-neutral-900">{proofPreview.size}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-500 text-center">
                This document is cryptographically verified on the National Land Acquisition Portal.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setProofPreview(null)} className="btn btn-secondary text-xs">
                  Close
                </button>
                <button
                  onClick={() => alert(`Downloading verified document ${proofPreview.code}...`)}
                  className="btn btn-primary text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transition Modal Component ─────────────────────────────────────
function TransitionModal({ action, caseData, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const config = ACTION_CONFIG[action] || {
    label: action,
    icon: GitBranch,
    className: 'btn-primary',
    description: 'Perform stage transition action.',
  };

  const Icon = config.icon;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md fade-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Icon className="w-4 h-4 text-blue-700" /> {config.label}
          </h2>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <p className="text-neutral-600">{config.description}</p>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Case Code</span>
              <span className="font-mono font-bold text-neutral-900">{caseData.case_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Stage</span>
              <span className="font-bold text-blue-700">{STAGE_LABELS[caseData.current_stage]}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="form-label text-xs font-semibold text-neutral-700">Action Decision Remarks *</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-input text-xs"
              rows={3}
              placeholder="Enter decision rationale, observations, or instructions..."
              required
              minLength={3}
              autoFocus
            />
          </div>

          {action === 'REJECT' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              <strong>⚠ Warning:</strong> Rejecting this case is a permanent action. The case will be closed and cannot be reopened.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={`btn text-xs ${config.className}`}>
              {submitting ? <span className="spinner" /> : <Icon className="w-3.5 h-3.5" />}
              Confirm {config.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
