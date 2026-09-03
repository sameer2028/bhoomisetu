import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LandRecordIdentity from '../../components/common/LandRecordIdentity';
import LandRecordContext from '../../components/common/LandRecordContext';
import TechnicalReferences from '../../components/common/TechnicalReferences';
import {
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
  RotateCcw,
  XCircle,
  MessageSquare,
  Shield,
  X,
  Building2,
  FileText,
  ExternalLink,
  Check,
  Eye,
  ListChecks,
  FileCheck,
  Layers,
  Users as UsersIcon,
  Download,
  BookOpen,
  Printer,
  Plus,
  Home,
  HeartHandshake,
  ShieldCheck,
  Award,
  Zap,
  Droplets,
  Truck,
  Trash2
} from 'lucide-react';

const RR_STAGES = [
  { key: 'REGISTRATION', label: '1. Registration' },
  { key: 'ENTITLEMENT', label: '2. Entitlement' },
  { key: 'HOUSING', label: '3. Housing Plot' },
  { key: 'GRANT', label: '4. Resettlement Grant' },
  { key: 'TRAINING', label: '5. Skill Training' },
  { key: 'SUBSISTENCE', label: '6. Subsistence Allowance' },
  { key: 'CLOSURE', label: '7. R&R Closure' },
];

const STAGE_GUIDANCE_DATA = {
  REGISTRATION: {
    description:
      'Initial identification & registration of affected/displaced family under RFCTLARR Act 2013 Section 31.',
    tasks: [
      { text: 'Family survey & head of family verification', done: true },
      { text: 'Displaced vs Affected category determination', done: true },
      { text: 'Aadhaar / Ration card document submission', done: true },
      { text: 'Draft R&R scheme public notification', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-REG-001',
        title: 'Family Survey & Demographic Verification Record',
        verifier: 'District Land Acquisition Officer (DLAO)',
        date: '20 Aug 2026',
        size: '3.8 MB',
        status: 'Verified',
      },
    ],
  },
  ENTITLEMENT: {
    description:
      'Sanction of statutory entitlements under Second Schedule of RFCTLARR Act 2013 (housing, grants, employment allowance).',
    tasks: [
      { text: 'Entitlement matrix assessment by DLAO', done: true },
      { text: 'Second Schedule benefit package computation', done: true },
      { text: 'Sanction order issuance by Competent Authority', done: true },
      { text: 'Family consent & bank details verification', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-ENT-001',
        title: 'Statutory R&R Benefit Sanction Order (Sec 31)',
        verifier: 'Competent Authority (SGA)',
        date: '22 Aug 2026',
        size: '4.5 MB',
        status: 'Verified',
      },
    ],
  },
  HOUSING: {
    description:
      'Allotment of residential plot or constructed dwelling house in designated Resettlement Colony.',
    tasks: [
      { text: 'Resettlement colony layout demarcation', done: true },
      { text: 'Plot / Flat allotment lottery & order issuance', done: true },
      { text: 'Physical possession certificate handover', done: false },
      { text: 'Utility connection clearance (Water/Electricity)', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-HOUS-001',
        title: 'Resettlement Colony Plot Allotment & Demarcation Certificate',
        verifier: 'Project Implementing Agency (PIA)',
        date: '25 Aug 2026',
        size: '5.2 MB',
        status: 'Verified',
      },
    ],
  },
  GRANT: {
    description:
      'Disbursement of one-time resettlement allowance (₹50,000) and shifting allowance for luggage & cattle.',
    tasks: [
      { text: 'Direct Bank Transfer (DBT) sanction approval', done: true },
      { text: 'Cattle shed / structure relocation grant release', done: true },
      { text: 'Transport truck assistance arrangement', done: false },
      { text: 'DBT bank transaction clearance record', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-GRNT-001',
        title: 'Direct Bank Transfer (DBT) Resettlement Grant Voucher',
        verifier: 'Treasury Officer & DLAO',
        date: '26 Aug 2026',
        size: '2.1 MB',
        status: 'Verified',
      },
    ],
  },
  TRAINING: {
    description:
      'Enrollment of adult family members in NSDC vocational skill training & priority job rosters.',
    tasks: [
      { text: 'Skill interest assessment survey', done: true },
      { text: 'NSDC training center enrollment', done: true },
      { text: 'PIA infrastructure job roster placement', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-SKIL-001',
        title: 'NSDC Vocational Certification & Roster Registration',
        verifier: 'Skill Development Mission Officer',
        date: '27 Aug 2026',
        size: '3.1 MB',
        status: 'Verified',
      },
    ],
  },
  SUBSISTENCE: {
    description:
      'Monthly payment of ₹3,000 subsistence allowance for 12 months post-displacement.',
    tasks: [
      { text: 'Monthly voucher generation', done: true },
      { text: 'Direct debit clearance to beneficiary bank account', done: false },
    ],
    proofs: [
      {
        code: 'DOC-RR-SUBS-001',
        title: 'Monthly Subsistence Allowance Payment Schedule',
        verifier: 'DLAO Finance Wing',
        date: '27 Aug 2026',
        size: '1.9 MB',
        status: 'Verified',
      },
    ],
  },
  CLOSURE: {
    description:
      'Final R&R completion certificate issuance and statutory file closure.',
    tasks: [
      { text: 'R&R Compliance Audit verification', done: true },
      { text: 'No Objection Certificate (NOC) signed by Head of Family', done: true },
      { text: 'Final R&R Closure Order signature by Collector', done: true },
    ],
    proofs: [
      {
        code: 'DOC-RR-CLOS-001',
        title: 'Final Rehabilitation & Resettlement Completion Certificate',
        verifier: 'District Collector & DLAO',
        date: '27 Aug 2026',
        size: '4.8 MB',
        status: 'Verified',
      },
    ],
  },
};

function downloadProofDocument(doc, family) {
  if (!doc) return;

  const rawName = doc.code || 'RR_CERTIFICATE';
  const fileName = `${rawName}_OFFICIAL_CERTIFICATE.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title || 'R&R Statutory Certificate'} — Official Government Record</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 40px 20px;
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
    }
    .emblem {
      text-align: center;
      margin-bottom: 20px;
    }
    .emblem-title {
      font-family: 'Cinzel', serif;
      font-size: 22px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 10px 0 2px 0;
    }
    .emblem-sub {
      font-size: 12px;
      font-weight: 700;
      color: #d97706;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin: 0 0 20px 0;
    }
    .cert-heading {
      text-align: center;
      font-family: 'Cinzel', serif;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      border-top: 2px solid #e2e8f0;
      border-bottom: 2px solid #e2e8f0;
      padding: 12px 0;
      margin: 25px 0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
    }
    .meta-table th, .meta-table td {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      font-size: 13px;
    }
    .meta-table th {
      background-color: #f8fafc;
      text-align: left;
      font-weight: 600;
      color: #334155;
      width: 35%;
    }
    .footer-signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sig-box {
      text-align: center;
      width: 220px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin-top: 40px;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="emblem">
      <div class="emblem-title">Government of India • भारत सरकार</div>
      <div class="emblem-sub">National Land Acquisition & Management System (BhoomiSetu)</div>
    </div>

    <div class="cert-heading">
      STATUTORY REHABILITATION & RESETTLEMENT CERTIFICATE
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #334155;">
      This is an official statutory record issued under Section 31 of the 
      <strong>Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR)</strong>.
    </p>

    <table class="meta-table">
      <tr><th>Document Code</th><td><strong>${doc.code || 'DOC-RR-001'}</strong></td></tr>
      <tr><th>Certificate Title</th><td><strong>${doc.title}</strong></td></tr>
      <tr><th>Head of Family</th><td><strong>${family?.head_of_family || 'N/A'}</strong> (${family?.family_code || ''})</td></tr>
      <tr><th>Category</th><td>${family?.category || 'DISPLACED'} FAMILY (${family?.members_count || 1} Members)</td></tr>
      <tr><th>Project Name</th><td>${family?.project_name || 'N/A'} (${family?.project_code || ''})</td></tr>
      <tr><th>Land Parcel</th><td>Survey #${family?.survey_number || 'N/A'} (${family?.village || ''})</td></tr>
      <tr><th>Issuing Authority</th><td>${doc.verifier || 'District Land Acquisition Officer'}</td></tr>
      <tr><th>Verification Date</th><td>${doc.date || new Date().toLocaleDateString('en-IN')}</td></tr>
    </table>

    <div style="background: #f8fafc; border: 1px border-dashed #cbd5e1; padding: 14px; border-radius: 4px; font-size: 12px; margin-top: 20px;">
      <strong>Statutory Package Details:</strong><br>
      ${family?.entitlement || 'Standard statutory entitlement package under Second Schedule.'}
    </div>

    <div class="footer-signatures">
      <div class="sig-box">
        <div class="sig-line">Beneficiary Head Signature<br>${family?.head_of_family || ''}</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">District Land Acquisition Officer<br>(DLAO Seal & Sign)</div>
      </div>
    </div>
  </div>
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

export default function FamilyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active milestone tab selection
  const [activeStageKey, setActiveStageKey] = useState('REGISTRATION');

  // Documents lookup
  const [documents, setDocuments] = useState([]);

  // Statutory Certificate Viewer Modal state
  const [viewingCertificate, setViewingCertificate] = useState(null);

  // Modals
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // New Activity Form
  const [activityForm, setActivityForm] = useState({
    activity_type: 'Housing Site Allocation',
    description: '',
    due_date: '',
    status: 'PENDING',
  });

  // Update Status Form
  const [statusForm, setStatusForm] = useState({
    status: 'COMPLETED',
    pending_reason: '',
    completion_date: '',
    evidence_document_id: '',
  });

  const fetchFamilyDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/rr/families/${id}`);
      setFamily(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load family profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents', { params: { limit: 100 } });
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    fetchFamilyDetail();
    fetchDocuments();
  }, [fetchFamilyDetail]);

  const handleAddActivitySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rr/activities', {
        ...activityForm,
        family_id: id,
      });
      setShowAddActivityModal(false);
      setActivityForm({ activity_type: 'Housing Site Allocation', description: '', due_date: '', status: 'PENDING' });
      fetchFamilyDetail();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create activity');
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedActivity) return;
    try {
      await api.put(`/rr/activities/${selectedActivity.id}`, statusForm);
      setShowUpdateStatusModal(false);
      setSelectedActivity(null);
      fetchFamilyDetail();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteFamilySubmit = async () => {
    setDeleting(true);
    try {
      await api.delete(`/rr/families/${id}`);
      navigate('/rr');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete family record');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="spinner spinner-lg mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading R&R statutory file...</p>
      </div>
    );
  }

  if (error || !family) {
    return (
      <div className="card p-8 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800">{error || 'Family record not found.'}</p>
        <Link to="/rr" className="btn btn-secondary inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to R&R Pipeline
        </Link>
      </div>
    );
  }

  const activities = family.activities || [];
  const totalAct = activities.length;
  const compAct = activities.filter((a) => a.status === 'COMPLETED').length;
  const progressPct = totalAct > 0 ? Math.round((compAct / totalAct) * 100) : 0;
  const guidance = STAGE_GUIDANCE_DATA[activeStageKey] || STAGE_GUIDANCE_DATA.REGISTRATION;
  const canDelete = hasRole('DLAO', 'PIA', 'SGA', 'ADMIN');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div>
        <Link to="/rr" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to R&R Pipeline
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-5 md:p-6 rounded-xl border-t-4 border-t-amber-500 shadow-sm relative overflow-hidden">
          <div className="flex-1">
            {family.parcel_code && (
              <LandRecordIdentity
                parcelCode={family.parcel_code}
                surveyNumber={family.survey_number}
                village={family.village}
                area={family.area_acres}
              />
            )}
            
            <div className={family.parcel_code ? "mt-5" : ""}>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="badge bg-amber-50 text-amber-800 font-bold border-amber-200">
                  <UsersIcon className="w-3 h-3 mr-1" /> R&R Case
                </span>
                <span className="badge bg-indigo-50 text-indigo-900 border-indigo-200 font-semibold">
                  {family.category} FAMILY
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  👨‍👩‍👧‍👦 {family.members_count} Members
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-4">{family.head_of_family}</h1>
              
              <LandRecordContext
                project={{
                  id: family.project_id,
                  name: family.project_name,
                  code: family.project_code,
                }}
                ownerName={family.head_of_family}
              />
              
              <div className="mt-5">
                <TechnicalReferences
                  parcelCode={family.parcel_code}
                  projectCode={family.project_code}
                  projectId={family.project_id}
                  surveyNumber={family.survey_number}
                  familyCode={family.family_code}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Delete
              </button>
            )}

            <button
              onClick={() => setShowAddActivityModal(true)}
              className="btn btn-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Professional Executive R&R KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">R&R Progress</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-indigo-700">{progressPct}%</span>
            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Category & Household</p>
          <p className="text-base font-extrabold text-slate-900">{family.category}</p>
          <p className="text-[11px] text-slate-500 font-medium">👨‍👩‍👧‍👦 {family.members_count} Dependents</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tasks Settled</p>
          <p className="text-base font-extrabold text-emerald-600">{compAct} of {totalAct} Done</p>
          <p className="text-[11px] text-slate-500">RFCTLARR Compliance</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Housing Allotment</p>
          <p className="text-xs font-bold text-slate-900">🏡 Sector-4 Resettlement Plot</p>
          <p className="text-[11px] text-indigo-700 font-semibold">Ready for Possession</p>
        </div>
      </div>

      {/* Milestone Step Tracker Bar */}
      <div className="card p-4 overflow-x-auto">
        <div className="flex items-center min-w-[700px] justify-between relative">
          {RR_STAGES.map((st, idx) => {
            const isActive = activeStageKey === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setActiveStageKey(st.key)}
                className={`flex-1 text-center py-2 px-1 border-b-2 text-xs font-bold transition-all ${isActive
                    ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                    : 'border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dark Navy Guidance Card (Matching CaseDetailPage Dark Guidance Header) */}
      <div className="bg-slate-900 text-white rounded-xl shadow-xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] text-blue-400 font-mono uppercase tracking-widest font-bold block">
              STATUTORY R&R GUIDANCE & REHABILITATION FRAMEWORK
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              {RR_STAGES.find((s) => s.key === activeStageKey)?.label}
            </h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono border border-slate-700">
            RFCTLARR Sec 31 Compliance
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-sans">
          {guidance.description}
        </p>

        {/* Statutory Checklist & Proof Documents Exporter & Viewer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Checklist */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-indigo-400" /> Stage Statutory Requirements
            </h3>
            <div className="space-y-2">
              {guidance.tasks.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${t.done ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className={t.done ? 'text-slate-200 line-through' : 'text-slate-300'}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Proof Documents Downloader & Interactive Viewer */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400" /> Statutory Proof Certificates
            </h3>
            <div className="space-y-2">
              {guidance.proofs.map((proof) => (
                <div key={proof.code} className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">{proof.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">Code: {proof.code} • {proof.size}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingCertificate(proof)}
                      className="btn btn-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-600 font-semibold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => downloadProofDocument(proof, family)}
                      className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left side Resettlement & Entitlement Cards, Right side Action Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Entitlement Card & Resettlement Colony Allotment Card */}
        <div className="space-y-4">
          {/* Professional Resettlement Colony Card */}
          <div className="card p-4 space-y-3 bg-slate-50 border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="flex items-center gap-1.5"><Home className="w-4 h-4 text-indigo-600" /> Resettlement Colony Allotment</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">POSSESSION</span>
            </h3>

            <div className="text-xs space-y-2 text-slate-800">
              <div>
                <span className="text-slate-500 font-medium">Allotted Dwelling/Plot:</span>
                <p className="font-bold text-slate-900">Sector-4 Resettlement Colony, Plot #42</p>
                <p className="text-[11px] text-slate-500">Area: 120 Sq. Yards (Residential)</p>
              </div>

              <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1 text-slate-700">
                  <Zap className="w-3 h-3 text-amber-600" /> Power: Ready
                </div>
                <div className="flex items-center gap-1 text-slate-700">
                  <Droplets className="w-3 h-3 text-blue-600" /> Water: Connected
                </div>
                <div className="flex items-center gap-1 text-slate-700 col-span-2">
                  <Truck className="w-3 h-3 text-indigo-600" /> Transport Truck: Arranged
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" /> Linked Land Details
            </h3>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400 font-medium">Project Name:</span>
                <p className="font-semibold text-slate-900">{family.project_name}</p>
                <p className="font-mono text-slate-400">{family.project_code}</p>
              </div>

              {family.survey_number && (
                <div>
                  <span className="text-slate-400 font-medium">Affected Survey Number:</span>
                  <p className="font-semibold text-slate-900">Survey #{family.survey_number} ({family.village})</p>
                  <p className="text-slate-500 font-mono">Parcel: {family.parcel_code} ({family.area_acres} Acres)</p>
                </div>
              )}

              {family.contact && (
                <div>
                  <span className="text-slate-400 font-medium">Head Contact:</span>
                  <p className="font-semibold text-slate-800">{family.contact}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 space-y-2 bg-slate-50 border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" /> Statutory Entitlement Terms
            </h3>
            <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
              {family.entitlement || 'Standard statutory entitlement package under Second Schedule of RFCTLARR Act 2013.'}
            </p>
          </div>
        </div>

        {/* Right: R&R Activities Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" /> R&R Action Plan & Executed Tasks
              </h3>
              <button
                onClick={() => setShowAddActivityModal(true)}
                className="btn btn-secondary py-1 px-3 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">No activity items logged in this R&R file yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act, index) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{act.activity_type}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
                        </div>
                      </div>

                      <span
                        className={`badge ${act.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                            : act.status === 'DELAYED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold'
                          }`}
                      >
                        {act.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <div>
                        Target Date: <strong className="text-slate-700">{act.due_date ? new Date(act.due_date).toLocaleDateString('en-IN') : 'N/A'}</strong>
                        {act.authority_name && <span className="ml-3">Officer: <strong className="text-slate-700">{act.authority_name}</strong></span>}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedActivity(act);
                          setStatusForm({
                            status: act.status,
                            pending_reason: act.pending_reason || '',
                            completion_date: act.completion_date || '',
                            evidence_document_id: act.evidence_document_id || '',
                          });
                          setShowUpdateStatusModal(true);
                        }}
                        className="text-blue-700 font-bold hover:underline"
                      >
                        Update Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUTORY CERTIFICATE VIEWER MODAL */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-4xl bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Statutory Certificate Viewer
                    <span className="text-xs font-mono text-indigo-400 font-normal">[{viewingCertificate.code}]</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Official Government Record under RFCTLARR Act 2013</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadProofDocument(viewingCertificate, family)}
                  className="btn btn-primary text-xs flex items-center gap-1 py-1.5 px-3 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download Document
                </button>

                <button
                  onClick={() => setViewingCertificate(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Paper Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="certificate-paper max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded border-[8px] border-indigo-950 outline outline-2 outline-amber-500 shadow-2xl relative font-serif space-y-6">
                {/* National Emblem & Title Header */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200">
                    <span className="text-2xl font-bold text-amber-700">🏛️</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-indigo-950 tracking-wider uppercase font-serif">
                    Government of India • भारत सरकार
                  </h2>
                  <p className="text-[11px] font-bold text-amber-600 tracking-widest uppercase font-sans">
                    National Land Acquisition & Management System (BhoomiSetu)
                  </p>
                </div>

                <div className="text-center border-y-2 border-slate-200 py-3 my-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide font-serif">
                    STATUTORY REHABILITATION & RESETTLEMENT CERTIFICATE
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  This is an official statutory certificate issued under Section 31 of the{' '}
                  <strong>Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR)</strong>.
                </p>

                {/* Metadata Table */}
                <table className="w-full border-collapse text-xs font-sans">
                  <tbody>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700 w-1/3">Document Code</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{viewingCertificate.code}</td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Certificate Title</td>
                      <td className="p-2.5 font-bold text-slate-900">{viewingCertificate.title}</td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Head of Family</td>
                      <td className="p-2.5 text-slate-900">
                        <strong>{family.head_of_family}</strong> ({family.family_code})
                      </td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Category & Members</td>
                      <td className="p-2.5 text-slate-900">
                        <span className="font-bold text-indigo-900">{family.category} FAMILY</span> ({family.members_count} Members)
                      </td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Project Name</td>
                      <td className="p-2.5 text-slate-900">
                        {family.project_name} ({family.project_code})
                      </td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Land Parcel</td>
                      <td className="p-2.5 text-slate-900">
                        Survey #{family.survey_number || 'N/A'} ({family.village || ''})
                      </td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Issuing Authority</td>
                      <td className="p-2.5 text-slate-900">{viewingCertificate.verifier}</td>
                    </tr>
                    <tr className="border border-slate-300">
                      <td className="bg-slate-100 p-2.5 font-bold text-slate-700">Date of Issuance</td>
                      <td className="p-2.5 text-slate-900">{viewingCertificate.date}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Entitlement Terms */}
                <div className="bg-slate-50 border border-dashed border-slate-300 p-3 rounded text-xs font-sans text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Statutory Package Details:</span>
                  {family.entitlement || 'Standard statutory entitlement package under Second Schedule of RFCTLARR Act 2013.'}
                </div>

                {/* Signatures & Seal */}
                <div className="flex justify-between items-end pt-8 font-sans">
                  <div className="text-center w-44">
                    <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                      Beneficiary Head Signature<br />
                      <span className="text-slate-500 font-normal">{family.head_of_family}</span>
                    </div>
                  </div>

                  <div className="text-center w-52">
                    <div className="inline-block border-2 border-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                      ✓ VERIFIED & DIGITALLY SEALED
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[11px] font-bold text-slate-800">
                      District Land Acquisition Officer<br />
                      <span className="text-slate-500 font-normal">(DLAO Official Seal & Sign)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Family Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md bg-white p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete Family Record
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the R&R record for{' '}
              <strong className="text-slate-900">{family.head_of_family}</strong> ({family.family_code})?
              All associated tasks and entitlement records will be removed.
            </p>

            <div className="flex justify-end gap-3 border-t pt-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFamilySubmit}
                disabled={deleting}
                className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg bg-white p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Task for {family.head_of_family}</h3>
              <button onClick={() => setShowAddActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivitySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Activity Type *</label>
                <select
                  value={activityForm.activity_type}
                  onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                  className="form-select w-full"
                >
                  <option value="Housing Site Allocation">Housing Site Allocation</option>
                  <option value="One-Time Resettlement Grant">One-Time Resettlement Grant</option>
                  <option value="Vocational Skill Training">Vocational Skill Training</option>
                  <option value="Monthly Subsistence Allowance">Monthly Subsistence Allowance</option>
                  <option value="Livelihood Rehabilitation Grant">Livelihood Rehabilitation Grant</option>
                  <option value="Cattle Shed Shifting Grant">Cattle Shed Shifting Grant</option>
                  <option value="Commercial Shop Site Allotment">Commercial Shop Site Allotment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task details & allotment reference..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={activityForm.due_date}
                  onChange={(e) => setActivityForm({ ...activityForm, due_date: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setShowAddActivityModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Task Status */}
      {showUpdateStatusModal && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md bg-white p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Update R&R Task Status</h3>
              <button onClick={() => setShowUpdateStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Status *</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="form-select w-full"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DELAYED">DELAYED</option>
                </select>
              </div>

              {statusForm.status === 'COMPLETED' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={statusForm.completion_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStatusForm({ ...statusForm, completion_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              )}

              {statusForm.status === 'DELAYED' && (
                <div>
                  <label className="block text-rose-700 font-bold mb-1">Delay Reason *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Specify administrative reason for delay..."
                    value={statusForm.pending_reason}
                    onChange={(e) => setStatusForm({ ...statusForm, pending_reason: e.target.value })}
                    className="form-input w-full border-rose-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-3">
                <button type="button" onClick={() => setShowUpdateStatusModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
