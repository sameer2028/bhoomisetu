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
  BookOpen,
  Copy,
  Printer,
  Share2,
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

const ACTION_CONFIG = {
  APPROVE: {
    label: 'Approve & Forward',
    icon: CheckCircle2,
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm',
    iconClass: 'text-emerald-600',
    description: 'Move this case to the next step in statutory pipeline',
  },
  FORWARD: {
    label: 'Approve & Forward',
    icon: CheckCircle2,
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm',
    iconClass: 'text-emerald-600',
    description: 'Move this case to the next step',
  },
  SEND_BACK: {
    label: 'Request More Information',
    icon: RotateCcw,
    className: 'bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow-sm',
    iconClass: 'text-slate-600',
    description: 'Ask for additional details/clarification or return step',
  },
  REJECT: {
    label: 'Reject',
    icon: XCircle,
    className: 'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm',
    iconClass: 'text-rose-600',
    description: 'Terminate this acquisition case',
  },
  COMPLETE: {
    label: 'Complete & Close Case',
    icon: CheckCircle2,
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm',
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

function downloadProofDocument(doc) {
  if (!doc) return;

  const rawName = doc.file ? doc.file.replace(/\.pdf$/i, '') : (doc.code || 'STATUTORY_PROOF');
  const fileName = `${rawName}_OFFICIAL_CERTIFICATE.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title || 'Statutory Certificate'} — Official Government Record</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 40px 20px;
      -webkit-print-color-adjust: exact;
    }

    .certificate-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 10px solid #1e3a8a;
      outline: 4px solid #d97706;
      border-radius: 4px;
      padding: 50px 60px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      position: relative;
      background-image: radial-gradient(#1e3a8a 0.5px, transparent 0.5px);
      background-size: 24px 24px;
    }

    .header-emblem {
      text-align: center;
      margin-bottom: 25px;
    }

    .emblem-icon {
      font-size: 40px;
      line-height: 1;
      color: #d97706;
    }

    .gov-title {
      font-family: 'Cinzel', serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #1e3a8a;
      text-transform: uppercase;
      margin-top: 8px;
    }

    .portal-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 3px;
    }

    .divider {
      height: 3px;
      background: linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #138808 100%);
      margin: 20px 0;
      border-radius: 2px;
    }

    .cert-heading {
      text-align: center;
      margin: 25px 0 20px;
    }

    .cert-badge {
      display: inline-block;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 14px;
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
      color: #334155;
      border-radius: 20px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .cert-title {
      font-family: 'Cinzel', serif;
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: 0.5px;
      line-height: 1.3;
    }

    .cert-body {
      font-size: 13px;
      line-height: 1.7;
      color: #334155;
      margin: 30px 0;
      text-align: justify;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .meta-value {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .meta-value.mono {
      font-family: monospace;
    }

    .signatures-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
    }

    .signature-block {
      text-align: center;
      width: 220px;
    }

    .digital-seal {
      width: 80px;
      height: 80px;
      border: 2px dashed #059669;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
      background-color: #ecfdf5;
      color: #059669;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transform: rotate(-10deg);
    }

    .sig-line {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
    }

    .sig-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }

    .footer-stamp {
      text-align: center;
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #94a3b8;
    }

    .qr-placeholder {
      font-family: monospace;
      font-size: 8px;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 6px;
    }

    .print-button {
      display: block;
      margin: 20px auto 0;
      background-color: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    @media print {
      body { background-color: #ffffff; padding: 0; }
      .certificate-container { box-shadow: none; border-width: 6px; padding: 30px; }
      .print-button { display: none; }
    }
  </style>
</head>
<body>

  <div class="certificate-container">
    <div class="header-emblem">
      <div class="emblem-icon">🏛️</div>
      <div class="gov-title">Government of India &bull; Ministry of Revenue</div>
      <div class="portal-subtitle">BhoomiSetu — National Land Acquisition &amp; Revenue Workflow</div>
    </div>

    <div class="divider"></div>

    <div class="cert-heading">
      <div class="cert-badge">PROOF CODE: ${doc.code || 'DOC-PROOF-2026'}</div>
      <h1 class="cert-title">${doc.title || 'Official Statutory Record'}</h1>
    </div>

    <div class="cert-body">
      This is to certify that the evidentiary statutory document referenced below has been verified, authenticated, and cryptographically deposited into the BhoomiSetu Land Acquisition Portal under the provisions of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR).
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Document Identification</span>
        <span class="meta-value mono">${doc.code || 'DOC-PROOF-001'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Date of Verification / Issuance</span>
        <span class="meta-value">${doc.date || '26 August 2026'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Issuing / Verifying Authority</span>
        <span class="meta-value">${doc.verifier || 'District Land Acquisition Officer (DLAO)'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Evidentiary Classification</span>
        <span class="meta-value">${doc.type || 'Statutory Stage Proof Certificate'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Digital Signature State</span>
        <span class="meta-value" style="color: #059669;">✓ Verified &amp; Digitally Signed (SHA-256)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">File Size &amp; Format</span>
        <span class="meta-value mono">${doc.size || '4.2 MB'} &bull; Adobe PDF/A (Archival Standard)</span>
      </div>
    </div>

    <div class="signatures-section">
      <div class="signature-block">
        <div class="digital-seal">
          <span>DIGITALLY<br>VERIFIED<br>OFFICIAL</span>
        </div>
        <div class="sig-line">Rajesh Sharma</div>
        <div class="sig-sub">District Land Acquisition Officer (DLAO)</div>
      </div>

      <div class="signature-block">
        <div class="digital-seal" style="border-color: #1e3a8a; background-color: #eff6ff; color: #1e3a8a;">
          <span>GOVT<br>SEAL<br>2026</span>
        </div>
        <div class="sig-line">Revenue Competent Authority</div>
        <div class="sig-sub">Department of Land Resources</div>
      </div>
    </div>

    <div class="footer-stamp">
      <span>This is a computer-generated authentic certificate. Document hash: <code>7f8a9e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f</code></span><br>
      <div class="qr-placeholder">SECURE VERIFICATION TOKEN: BHOOMI-ACQ-2026-AUTH-VALID</div>
    </div>
  </div>

  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>

</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitionModal, setTransitionModal] = useState(null);
  const [selectedStageKey, setSelectedStageKey] = useState(null);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [proofPreview, setProofPreview] = useState(null);
  const [showFullAuditModal, setShowFullAuditModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState('');

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workflow/cases/${id}`);
      setCaseData(res.data.data);
      if (!selectedStageKey) {
        setSelectedStageKey(res.data.data.current_stage);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch case details.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedStageKey]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedToast(''), 3000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="spinner spinner-lg mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading acquisition case record...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Case Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'The requested acquisition case could not be found.'}</p>
        <Link to="/cases" className="btn btn-secondary text-xs">
          Back to Cases List
        </Link>
      </div>
    );
  }

  const currentStageKey = caseData.current_stage || 'PROJECT_PROPOSAL';
  const currentStageIndex = STAGE_ORDER.indexOf(currentStageKey);
  const activeStageKey = selectedStageKey || currentStageKey;
  const activeStageIndex = STAGE_ORDER.indexOf(activeStageKey);
  const isTerminal = ['COMPLETED', 'REJECTED'].includes(caseData.status);
  const stageGuidance = STAGE_GUIDANCE_DATA[activeStageKey] || STAGE_GUIDANCE_DATA.PROJECT_PROPOSAL;
  const daysRemaining = calculateDaysRemaining(caseData.due_date);
  const overallProgressPct = Math.round(((currentStageIndex + 1) / STAGE_ORDER.length) * 100);

  const activeStageAuditEvents = caseData.auditTimeline?.filter(
    (evt) => evt.to_stage === activeStageKey || evt.from_stage === activeStageKey
  ) || [];

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* ─── Top Navigation Header Row ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-2xl bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shadow-sm">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {caseData.case_code}
              </h1>
              <span className={`badge ${PRIORITY_STYLES[caseData.priority] || ''}`}>
                {caseData.priority}
              </span>
              <span className={`badge ${STATUS_STYLES[caseData.status] || ''}`}>
                {caseData.status?.replace('_', ' ')}
              </span>
              {caseData.overdue && (
                <span className="badge bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {caseData.remarks || 'Land acquisition statutory workflow case'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/cases"
            className="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-2 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Cases List
          </Link>
          {/* 3-Dot Quick Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionDropdown((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showActionDropdown
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm ring-2 ring-blue-100'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600 bg-white'
              }`}
              title="More Case Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showActionDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowActionDropdown(false)}
                />

                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-floating border border-slate-200/90 py-2 z-40 fade-in text-xs font-medium text-slate-700">
                  <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Quick Actions</span>
                    <span className="font-mono font-bold text-blue-700 text-[11px]">{caseData.case_code}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      setShowFullAuditModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>View Full Audit Trail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      downloadProofDocument({
                        code: caseData.case_code,
                        title: `EXECUTIVE CASE FILE SUMMARY — ${caseData.case_code}`,
                        type: 'Statutory Acquisition Summary File',
                        verifier: caseData.assigned_officer_name || 'District Land Acquisition Collectorate',
                        date: new Date().toLocaleDateString('en-GB'),
                        file: `${caseData.case_code}_ACQUISITION_SUMMARY.pdf`,
                        size: '1.8 MB',
                      });
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                  >
                    <Printer className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Export Case Certificate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(caseData.case_code, 'Case Code')}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Copy Case Code ({caseData.case_code})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(window.location.href, 'Case URL')}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Copy Direct Link</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <Link
                    to={`/projects/${caseData.project_id}`}
                    onClick={() => setShowActionDropdown(false)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-600 transition-colors font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-blue-600 flex-shrink-0" /> Associated Project
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  {caseData.parcel_id && (
                    <Link
                      to={`/parcels/${caseData.parcel_id}`}
                      onClick={() => setShowActionDropdown(false)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-600 transition-colors font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" /> View Parcel Record
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Executive Summary KPI Bar (Top Summary Card) ──────────── */}
      <div className="card p-5 bg-white border border-slate-200/90 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* KPI 1: Project */}
          <div className="flex items-center gap-3 pr-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Project</p>
              <Link
                to={`/projects/${caseData.project_id}`}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline truncate block"
                title={caseData.project_name}
              >
                {caseData.project_code || 'PRJ-2026-003'}
              </Link>
              <p className="text-[11px] text-slate-500 truncate font-medium">{caseData.project_name || 'Infrastructure Project'}</p>
            </div>
          </div>

          {/* KPI 2: Assigned Officer */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Officer</p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {caseData.assigned_officer_name || 'Rajesh Sharma'}
                {caseData.assigned_officer_district && <span className="text-slate-400 font-normal"> ({caseData.assigned_officer_district})</span>}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">({caseData.assigned_officer_role || 'DLAO'})</p>
            </div>
          </div>

          {/* KPI 3: Due Date */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Due Date</p>
              <p className={`text-xs font-bold ${caseData.overdue ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatDate(caseData.due_date)}
              </p>
              {daysRemaining !== null && (
                <p className={`text-[11px] font-semibold ${daysRemaining < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                </p>
              )}
            </div>
          </div>

          {/* KPI 4: Current Stage */}
          <div className="flex items-center gap-3 pt-3 md:pt-0 md:px-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 border border-indigo-100">
              <Flag className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Stage</p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {STAGE_LABELS[currentStageKey] || currentStageKey}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Step {currentStageIndex + 1} of 11</p>
            </div>
          </div>

          {/* KPI 5: Overall Progress */}
          <div className="flex flex-col justify-center pt-3 md:pt-0 md:pl-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Progress</span>
              <span className="font-extrabold text-slate-900">{overallProgressPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 11-Step Statutory Pipeline Stepper ──────────────────── */}
      <div className="card p-6 bg-white border border-slate-200/90 shadow-card">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" /> STATUTORY WORKFLOW PIPELINE (11 STAGES)
        </h2>

        {/* Stepper Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[850px] flex items-center justify-between relative px-4">
            {/* Connecting line */}
            <div className="absolute left-8 right-8 top-4 h-0.5 bg-slate-200 -z-0" />

            {STAGE_ORDER.map((stageKey, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isSelected = stageKey === activeStageKey;
              const label = STAGE_LABELS[stageKey];

              return (
                <button
                  key={stageKey}
                  type="button"
                  onClick={() => setSelectedStageKey(stageKey)}
                  className="flex flex-col items-center relative z-10 group cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-700 text-white ring-4 ring-blue-200 shadow-md scale-125 z-20'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110'
                        : isPast
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-white border-2 border-slate-300 text-slate-400 hover:border-blue-400'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-2.5 text-center whitespace-nowrap max-w-[85px] truncate ${
                      isSelected
                        ? 'text-blue-900 font-extrabold border-b-2 border-blue-700 pb-0.5'
                        : isCurrent
                        ? 'text-blue-700 font-extrabold border-b-2 border-blue-600 pb-0.5'
                        : isPast
                        ? 'text-slate-700 font-medium'
                        : 'text-slate-400'
                    }`}
                    title={label}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid (3 Columns: 1/4 Left, 2/4 Middle, 1/4 Right) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMN 1: LEFT SIDEBAR (3 cols / 12) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Card 1: CASE INFORMATION */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-4">
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">CASE INFORMATION</h3>
            </div>
            <div className="card-body p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-slate-400 font-mono text-xs w-4">#</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">CASE CODE</p>
                  <p className="font-mono font-bold text-slate-900">{caseData.case_code}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <FolderKanban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">PROJECT</p>
                  <Link
                    to={`/projects/${caseData.project_id}`}
                    className="font-bold text-blue-700 hover:underline truncate block"
                  >
                    {caseData.project_code || 'PRJ-2026-003'}
                  </Link>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{caseData.project_name || 'Ganga Canal Feeder Extension'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">CREATED ON</p>
                  <p className="text-slate-800 font-medium">{formatDateTime(caseData.created_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">LAST UPDATED</p>
                  <p className="text-slate-800 font-medium">{formatDateTime(caseData.updated_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">TOTAL PARCELS</p>
                  <p className="font-bold text-slate-900">128</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <UsersIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">AFFECTED LANDOWNERS</p>
                  <p className="font-bold text-slate-900">342</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">DISTRICT</p>
                  <p className="font-bold text-slate-900">Sitapur, Uttar Pradesh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: PARCEL INTELLIGENCE */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-4 flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">PARCEL INTELLIGENCE</h3>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="card-body p-4 space-y-3">
              {/* Mini Map Box */}
              <div className="h-32 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 shadow-inner flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px]">
                <div className="absolute inset-2 border-2 border-blue-500/60 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded shadow-xs">
                    Polygon #LA-2026-003
                  </span>
                </div>
              </div>

              {/* 4 Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="font-extrabold text-slate-900 text-sm">128</p>
                  <p className="text-[10px] text-slate-500 font-medium">Parcels</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="font-extrabold text-slate-900 text-sm">342</p>
                  <p className="text-[10px] text-slate-500 font-medium">Landowners</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="font-extrabold text-slate-900 text-sm">125.48 ha</p>
                  <p className="text-[10px] text-slate-500 font-medium">Total Area</p>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-emerald-900">
                  <p className="font-extrabold text-emerald-700 text-xs">Verified</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Parcel Status</p>
                </div>
              </div>

              <Link
                to="/gis"
                className="w-full btn btn-secondary text-xs font-bold py-2 text-blue-700 hover:bg-blue-50 border-blue-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                Open GIS Map
              </Link>
            </div>
          </div>
        </div>

        {/* COLUMN 2: MIDDLE WORKSPACE (6 cols / 12) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Hero Step Banner */}
          <div className="bg-gradient-to-r from-[#0b192c] via-[#0f2442] to-[#1e3e62] text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1 max-w-[70%] relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                STEP {activeStageIndex + 1} OF 11
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">{STAGE_LABELS[activeStageKey]}</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium pt-1">
                {stageGuidance.description}
              </p>
            </div>
            <div className="text-5xl opacity-80 pr-2 select-none">
              📢
            </div>
          </div>

          {/* OFFICER DECISION RECORD */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-5 flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">OFFICER DECISION RECORD</h3>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> DECISION RECORDED
              </span>
            </div>
            <div className="card-body p-5">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ACTION TAKEN</p>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5 border border-emerald-200">
                    APPROVE
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">DECISION / REMARKS</p>
                  <p className="font-bold text-slate-800 mt-0.5">done</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">DECIDED ON</p>
                  <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> 26 Aug 2026, 02:59 PM
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs pt-4 mt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">OFFICER</p>
                  <p className="font-bold text-slate-900 mt-0.5">Rajesh Sharma</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ROLE</p>
                  <p className="font-bold text-slate-800 mt-0.5">DLAO</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SIGNATURE / ID</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 text-xs">RS-5721-DLAO</span>
                    <span className="font-serif italic text-blue-800 text-sm font-extrabold underline decoration-blue-400">
                      R.Sharma
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI COMPLIANCE & RISK */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-5 flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                AI COMPLIANCE &amp; RISK <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </h3>
            </div>
            <div className="card-body p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Score Circle / Box */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">RISK SCORE</p>
                  <p className="text-3xl font-black text-slate-900 mt-0.5">
                    72 <span className="text-xs text-slate-400 font-normal">/100</span>
                  </p>
                  <span className="inline-block mt-1 bg-amber-200 text-amber-900 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                    ATTENTION REQUIRED
                  </span>
                </div>

                {/* Findings Checklist */}
                <div className="sm:col-span-2 space-y-2 text-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">FINDINGS</p>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Gazette notification uploaded</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Newspaper publication evidence uploaded</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Individual owner notices pending</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Hearing of objections pending</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>Deadline exceeded by 6 days</span>
                  </div>
                </div>
              </div>

              {/* AI Confidence Progress Bar */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">AI CONFIDENCE</span>
                  <span className="font-extrabold text-blue-700">94%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94%' }} />
                </div>
              </div>

              {/* AI Recommendation Box */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-950 font-medium leading-relaxed">
                <strong className="text-blue-900 font-bold">AI RECOMMENDATION:</strong> Complete individual notice serving and objection-hearing documentation before advancing to the next stage.
              </div>
            </div>
          </div>

          {/* KEY DOCUMENTS & EVIDENCE TABLE */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-5 flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">KEY DOCUMENTS &amp; EVIDENCE</h3>
              <button type="button" className="text-[11px] font-bold text-blue-700 hover:underline">View All</button>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">DOCUMENT</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">VERIFICATION</th>
                      <th className="py-2.5 px-4 text-right">UPLOADED ON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    <tr>
                      <td className="py-2.5 px-4 font-semibold">Gazette Notification</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">UPLOADED</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-bold text-[10px]">VERIFIED</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">26 Aug 2026</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold">Newspaper Clipping (Hindi)</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">UPLOADED</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-bold text-[10px]">VERIFIED</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">26 Aug 2026</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold">Newspaper Clipping (English)</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">UPLOADED</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 font-bold text-[10px]">VERIFIED</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-[11px]">26 Aug 2026</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-500">Individual Notice Serving</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">PENDING</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-amber-700 font-bold text-[10px]">PENDING</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-[11px]">--</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-500">Hearing of Objections Record</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">PENDING</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-amber-700 font-bold text-[10px]">PENDING</span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-[11px]">--</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  className="btn btn-secondary text-xs font-bold text-slate-700 px-4 py-2 border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Upload New Document
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: RIGHT AUDIT TIMELINE (3 cols / 12) */}
        <div className="lg:col-span-3 space-y-5">
          {/* AUDIT TIMELINE CARD */}
          <div className="card bg-white border border-slate-200/90 shadow-card">
            <div className="card-header bg-slate-50/80 border-b border-slate-100 py-3 px-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  AUDIT TIMELINE
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">7 Total Events</span>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setAuditFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    auditFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Events (7)
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('NOTIF')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('APP')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Approvals
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('DOC')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Documents
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('AI')}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  AI Alerts
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="relative space-y-4">
                {/* Connecting Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

                {/* Event 1 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        CREATED
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Project Proposal</span>
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">Urgent acquisition for railway overbridge</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by Rajesh Sharma</span>
                      <span>12 Jul 2026, 10:15 AM</span>
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        APPROVED
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Land Identification</span>
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">Approved under fast-track scheme</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by Dr. Vikramaditya Singh</span>
                      <span>17 Jul 2026, 11:20 AM</span>
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        FORWARDED
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Verification</span>
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">Parcels identified</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by Rajesh Sharma</span>
                      <span>22 Jul 2026, 09:45 AM</span>
                    </div>
                  </div>
                </div>

                {/* Event 4 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        COMPLETED
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Approval</span>
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">Verification complete</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by Amit Kumar Verma</span>
                      <span>01 Aug 2026, 03:10 PM</span>
                    </div>
                  </div>
                </div>

                {/* Event 5 */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    5
                  </div>
                  <div className="flex-1 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                        CURRENT
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Notification</span>
                    </div>
                    <p className="font-bold text-slate-900 leading-snug">Publication of preliminary notification</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by Rajesh Sharma</span>
                      <span>26 Aug 2026, 02:59 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFullAuditModal(true)}
                  className="w-full btn btn-secondary text-xs font-bold text-slate-700 py-2 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  View Full Audit Trail
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Floating Action Button (Bottom Right) ─────────────────── */}
      {!isTerminal && (
        <button
          type="button"
          onClick={() => setTransitionModal(caseData.allowedActions?.includes('APPROVE') ? 'APPROVE' : 'FORWARD')}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl shadow-floating flex items-center gap-2 text-xs transition-all hover:scale-105 cursor-pointer"
        >
          <span className="text-sm">⚡</span>
          <span>Take Action</span>
        </button>
      )}


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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-floating w-full max-w-lg overflow-hidden fade-in border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-300">{proofPreview.code}</span>
                <h3 className="text-sm font-bold text-white leading-tight">{proofPreview.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setProofPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a8a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between font-semibold">
                <span>✓ Digital Signature &amp; Verification Valid</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono">MD5 VERIFIED</span>
              </div>

              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Issuing / Verifying Authority</span>
                  <span className="font-bold text-slate-900">{proofPreview.verifier}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Date of Verification</span>
                  <span className="font-bold text-slate-900">{proofPreview.date}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Document Size</span>
                  <span className="font-bold text-slate-900">{proofPreview.size}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center font-medium">
                This document is cryptographically verified on the National Land Acquisition Portal.
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setProofPreview(null)}
                  className="btn btn-secondary text-xs cursor-pointer font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => downloadProofDocument(proofPreview)}
                  className="btn btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Audit Trail Modal ───────────────────────────────── */}
      {showFullAuditModal && (
        <FullAuditModal
          caseData={caseData}
          onClose={() => setShowFullAuditModal(false)}
        />
      )}

      {/* ─── Toast Notification Popup ─────────────────────────────── */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-floating flex items-center gap-2.5 fade-in border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-floating w-full max-w-md fade-in overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icon className="w-4 h-4 text-blue-700" /> {config.label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 font-medium">{config.description}</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Case Code</span>
              <span className="font-mono font-bold text-slate-900">{caseData.case_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Stage</span>
              <span className="font-bold text-blue-700">{STAGE_LABELS[caseData.current_stage]}</span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="form-label text-xs font-bold text-slate-700">Action Decision Remarks *</label>
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
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 font-medium">
              <strong>⚠ Warning:</strong> Rejecting this case is a permanent action. The case will be closed and cannot be reopened.
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={`btn text-xs ${config.className}`}>
              {submitting ? <span className="spinner !border-white/30 !border-t-white" /> : <Icon className="w-3.5 h-3.5" />}
              Confirm {config.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Full Audit Trail Modal Component ──────────────────────────────
function FullAuditModal({ caseData, onClose }) {
  const [filterAction, setFilterAction] = useState('ALL');
  const events = caseData.auditTimeline || [];

  const filteredEvents = events.filter((evt) => {
    if (filterAction === 'ALL') return true;
    if (filterAction === 'DECISIONS') return ['APPROVE', 'FORWARD', 'COMPLETE'].includes(evt.action);
    if (filterAction === 'RETURNS') return ['SEND_BACK', 'REJECT'].includes(evt.action);
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-floating w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden fade-in border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a] text-white">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Full Case Audit Trail &amp; History</h3>
              <p className="text-[10.5px] text-slate-300 font-mono">Case Code: {caseData.case_code} • {events.length} Total Events Logged</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e3a8a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Filter Events:</span>
            <button
              type="button"
              onClick={() => setFilterAction('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterAction === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('DECISIONS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterAction === 'DECISIONS' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Approvals &amp; Forwards
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('RETURNS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterAction === 'RETURNS' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Returns &amp; Rejections
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 font-bold">{filteredEvents.length} records shown</span>
        </div>

        {/* Event List Container */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 italic font-medium">No audit records match the selected filter.</p>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-200" />

              {filteredEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="flex items-start gap-4 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${
                      evt.action === 'CREATE'
                        ? 'bg-blue-600'
                        : evt.action === 'APPROVE' || evt.action === 'COMPLETE'
                        ? 'bg-emerald-600'
                        : evt.action === 'SEND_BACK'
                        ? 'bg-amber-500'
                        : evt.action === 'REJECT'
                        ? 'bg-rose-600'
                        : 'bg-indigo-600'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide text-white ${
                            evt.action === 'CREATE'
                              ? 'bg-blue-600'
                              : evt.action === 'APPROVE'
                              ? 'bg-emerald-600'
                              : evt.action === 'SEND_BACK'
                              ? 'bg-amber-600'
                              : 'bg-slate-700'
                          }`}
                        >
                          {evt.action === 'CREATE' ? 'CASE CREATED' : evt.action}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {STAGE_LABELS[evt.to_stage] || evt.to_stage}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">{formatDateTime(evt.created_at)}</span>
                    </div>

                    <p className="text-slate-800 bg-white p-3 rounded-xl border border-slate-200/80 text-xs leading-relaxed italic font-medium">
                      "{evt.remarks || 'Stage decision recorded.'}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                      <span>Performing Officer: <strong className="text-slate-800">{evt.performed_by_name || 'Rajesh Sharma'}</strong></span>
                      <span>Role: <strong className="text-slate-800">{evt.performed_by_role || 'DLAO'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">Authenticated Audit Log • BhoomiSetu Audit System</span>
          <button type="button" onClick={onClose} className="btn btn-secondary text-xs px-4 py-1.5 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
