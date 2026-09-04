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
  Trash2,
  Lock,
  Upload,
  Paperclip
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

const STAGE_DESCRIPTIONS = {
  REGISTRATION: 'Initial identification & registration of affected/displaced family under RFCTLARR Act 2013 Section 31.',
  ENTITLEMENT: 'Sanction of statutory entitlements under Second Schedule of RFCTLARR Act 2013 (housing, grants, employment allowance).',
  HOUSING: 'Allotment of residential plot or constructed dwelling house in designated Resettlement Colony.',
  GRANT: 'Disbursement of statutory resettlement allowance and shifting allowances.',
  TRAINING: 'Enrollment of family members in vocational skill training & priority job rosters.',
  SUBSISTENCE: 'Payment of monthly subsistence allowance post-displacement.',
  CLOSURE: 'Final R&R completion certificate issuance and statutory file closure.',
};

// Map activity_type keywords to their corresponding stage
const STAGE_ACTIVITY_KEYWORDS = {
  REGISTRATION: ['registra', 'survey', 'verify', 'identification', 'household'],
  ENTITLEMENT: ['entitle', 'sanction', 'schedule', 'statutory'],
  HOUSING: ['hous', 'plot', 'colony', 'possession', 'dwelling', 'site allocation'],
  GRANT: ['grant', 'dbt', 'allowance', 'shifting', 'disbursement', 'resettlement grant'],
  TRAINING: ['skill', 'train', 'nsdc', 'roster', 'vocational', 'livelihood'],
  SUBSISTENCE: ['subsist', 'monthly'],
  CLOSURE: ['closur', 'noc', 'audit', 'final', 'completion certificate'],
};

/**
 * Compute the highest stage index the family has reached based on their activities.
 * A stage is "reached" if it has at least one completed activity.
 * The family is always at minimum on Stage 0 (REGISTRATION).
 * The "current stage" = highest stage with completed activity + 1 (the next in-progress stage),
 * capped at 6 (CLOSURE). If no activities exist, current stage = 0 (REGISTRATION).
 */
function computeCurrentStageIndex(activities) {
  if (!activities || activities.length === 0) return 0; // Start at Registration

  const stageKeys = RR_STAGES.map(s => s.key);
  let highestCompletedStageIdx = -1;

  for (const act of activities) {
    if (act.status !== 'COMPLETED') continue;
    const type = (act.activity_type || '').toLowerCase();

    for (let i = 0; i < stageKeys.length; i++) {
      const keywords = STAGE_ACTIVITY_KEYWORDS[stageKeys[i]] || [];
      if (keywords.some(kw => type.includes(kw))) {
        if (i > highestCompletedStageIdx) {
          highestCompletedStageIdx = i;
        }
        break;
      }
    }
  }

  // If at least one activity in a stage is completed, the user can view that stage
  // AND the next stage (which is now "in progress").
  // If nothing is completed, user is on stage 0.
  if (highestCompletedStageIdx === -1) {
    // No completed activities — check if any activity exists at all
    // If there are pending/in-progress activities, user is still on stage 0
    return 0;
  }

  // User can access up to the stage AFTER the highest completed one
  return Math.min(highestCompletedStageIdx + 1, stageKeys.length - 1);
}

function downloadProofDocument(doc, family) {
  if (!doc) return;

  const docId = doc.documentId || doc.id;
  if (docId) {
    const fileUrl = `/api/documents/${docId}/file`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.target = '_blank';
    a.download = doc.originalFilename || doc.title || 'evidence_document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const rawName = doc.code || doc.id || 'RR_CERTIFICATE';
  const fileName = `${rawName}_OFFICIAL_CERTIFICATE.html`;
  const currentDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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
      <div style="font-size:36px;">🏛️</div>
      <div class="emblem-title">Government of India • भारत सरकार</div>
      <div class="emblem-sub">National Land Acquisition & Management System (BhoomiSetu)</div>
    </div>

    <div class="cert-heading">
      STATUTORY REHABILITATION & RESETTLEMENT CERTIFICATE
    </div>

    <p style="font-size:13px; line-height:1.6; color:#334155;">
      This is an official statutory record issued under Section 31 of the
      <strong>Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR)</strong>
      verifying the statutory rehabilitation entitlements for the affected family record below.
    </p>

    <table class="meta-table">
      <tbody>
        <tr>
          <th>Document Reference</th>
          <td><strong>${doc.code || doc.id || 'DOC-RR-STAT-001'}</strong></td>
        </tr>
        <tr>
          <th>Certificate Title</th>
          <td>${doc.title || 'Statutory R&R Certificate'}</td>
        </tr>
        <tr>
          <th>Head of Family</th>
          <td><strong>${family?.head_of_family || 'N/A'}</strong> (Code: ${family?.family_code || 'N/A'})</td>
        </tr>
        <tr>
          <th>Category & Household</th>
          <td><strong>${family?.category || 'N/A'} FAMILY</strong> (${family?.members_count || 1} Members)</td>
        </tr>
        <tr>
          <th>Project Name</th>
          <td>${family?.project_name || 'N/A'} (${family?.project_code || ''})</td>
        </tr>
        <tr>
          <th>Linked Land Parcel</th>
          <td>Survey #${family?.survey_number || 'N/A'} (${family?.village || 'N/A'})</td>
        </tr>
        <tr>
          <th>Issuing Authority</th>
          <td>${doc.verifier || doc.authority_name || 'District Land Acquisition Officer (DLAO)'}</td>
        </tr>
        <tr>
          <th>Date of Record</th>
          <td>${doc.date || currentDateStr}</td>
        </tr>
      </tbody>
    </table>

    <div style="background-color:#f8fafc; border:1px dashed #cbd5e1; padding:12px; border-radius:4px; font-size:12px; color:#475569; margin-top:20px;">
      <strong>Registered Entitlement Details:</strong><br/>
      ${family?.entitlement || 'Standard statutory entitlement package under Second Schedule of RFCTLARR Act 2013.'}
    </div>

    <div class="footer-signatures">
      <div class="sig-box">
        <div style="font-size:10px; color:#64748b;">Digitally Signed & Verified</div>
        <div class="sig-line">Beneficiary Signature / Thumb</div>
      </div>
      <div class="sig-box">
        <div style="font-size:10px; color:#64748b;">Competent Authority Approval</div>
        <div class="sig-line">District Land Acquisition Officer (DLAO)</div>
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
  const { user, hasRole } = useAuth();

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

  // Proof Document Upload Modal
  const [showUploadProofModal, setShowUploadProofModal] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofTitle, setProofTitle] = useState('');
  const [proofDescription, setProofDescription] = useState('');

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

  const handleDeleteProof = async (activityId) => {
    if (!window.confirm('Are you sure you want to permanently delete this proof document? You can re-upload it after deletion.')) return;
    try {
      await api.delete(`/rr/activities/${activityId}`);
      fetchFamilyDetail();
    } catch (err) {
      alert(err.response?.data?.error || 'Access Denied: Only the uploading role can delete this.');
    }
  };

  // Upload proof document handler
  const handleUploadProofSubmit = async (e) => {
    e.preventDefault();
    if (!proofFile) {
      alert('Please select a file to upload.');
      return;
    }
    if (!proofTitle.trim()) {
      alert('Please enter a document title.');
      return;
    }
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('title', proofTitle.trim());
      formData.append('description', proofDescription.trim() || `R&R evidence proof for ${activeStageKey} stage - ${family.head_of_family}`);
      formData.append('document_type', 'OTHER');
      formData.append('project_id', family.project_id || '');
      formData.append('access_level', 'RESTRICTED');

      const uploadRes = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedDocId = uploadRes.data?.data?.id;

      // Create an R&R activity linked to this uploaded document
      if (uploadedDocId) {
        const stageLabel = RR_STAGES.find(s => s.key === activeStageKey)?.label || activeStageKey;
        await api.post('/rr/activities', {
          family_id: id,
          activity_type: `${stageLabel} - Evidence Upload`,
          description: proofTitle.trim(),
          status: 'COMPLETED',
          completion_date: new Date().toISOString().split('T')[0],
          evidence_document_id: uploadedDocId,
          responsible_authority: user?.id,
        });
      }

      // Reset and close
      setShowUploadProofModal(false);
      setProofFile(null);
      setProofTitle('');
      setProofDescription('');
      fetchFamilyDetail();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload proof document.');
    } finally {
      setUploadingProof(false);
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
  const canDelete = hasRole('DLAO', 'PIA', 'SGA', 'ADMIN');

  // Compute the maximum stage index the user can access
  const currentStageIndex = computeCurrentStageIndex(activities);
  const activeStageIndex = RR_STAGES.findIndex(s => s.key === activeStageKey);
  
  // Disable strict stage locking so users can access any stage (e.g. Closure) even if they skip optional middle stages
  const isStageLocked = false;

  // Filter stage-specific real activities from DB
  const stageActivities = isStageLocked ? [] : activities.filter(a => {
    const type = (a.activity_type || '').toLowerCase();
    const keywords = STAGE_ACTIVITY_KEYWORDS[activeStageKey] || [];
    return keywords.some(kw => type.includes(kw));
  });

  // Extract real evidence documents attached in DB — only for unlocked stages
  const stageFilteredActivities = isStageLocked ? [] : activities.filter(a => {
    const type = (a.activity_type || '').toLowerCase();
    const keywords = STAGE_ACTIVITY_KEYWORDS[activeStageKey] || [];
    return keywords.some(kw => type.includes(kw));
  });

  const realProofs = stageFilteredActivities
    .filter(a => a.evidence_document_title || a.evidence_document_id)
    .map((a) => {
      const matchedDoc = documents.find(d => String(d.id) === String(a.evidence_document_id));
      const uploaderName = a.doc_uploader_name || matchedDoc?.uploaded_by_name || a.authority_name || (user?.full_name ? `${user.full_name}` : 'District Officer');
      const uploaderRole = a.doc_uploader_role || matchedDoc?.uploaded_by_role || a.authority_role || (user?.role || 'DLAO');

      return {
        id: a.evidence_document_id || a.id,
        documentId: a.evidence_document_id || matchedDoc?.id,
        activity_id: a.id,
        code: matchedDoc?.document_code || `DOC-RR-${a.id.substring(0, 8).toUpperCase()}`,
        title: a.evidence_document_title || matchedDoc?.title || `${a.activity_type} Document`,
        verifier: uploaderName,
        verifierRole: uploaderRole,
        date: a.completion_date ? new Date(a.completion_date).toLocaleDateString('en-IN') : 'Uploaded',
        filePath: matchedDoc?.file_path,
        fileType: matchedDoc?.file_type || matchedDoc?.mime_type,
        originalFilename: matchedDoc?.original_filename || a.evidence_document_title,
        status: a.status === 'COMPLETED' ? 'Verified' : a.status
      };
    });

  const guidanceDescription = STAGE_DESCRIPTIONS[activeStageKey] || STAGE_DESCRIPTIONS.REGISTRATION;

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

          {canDelete && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Delete Record
              </button>
            </div>
          )}
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
          <p className="text-[11px] text-slate-500 font-medium">👨‍👩‍👧‍👦 {family.members_count} Members</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tasks Settled</p>
          <p className="text-base font-extrabold text-emerald-600">{compAct} of {totalAct} Done</p>
          <p className="text-[11px] text-slate-500">RFCTLARR Compliance</p>
        </div>

        <div className="kpi-card">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Registered Entitlement</p>
          <p className="text-xs font-bold text-slate-900 truncate" title={family.entitlement || 'Pending Record'}>
            {family.entitlement || 'Pending Record'}
          </p>
          <p className="text-[11px] text-indigo-700 font-semibold">
            {family.entitlement ? 'DB Entitlement Active' : 'Awaiting Sanction'}
          </p>
        </div>
      </div>

      {/* Milestone Step Tracker Bar */}
      <div className="card p-4 overflow-x-auto">
        <div className="flex items-center min-w-[700px] justify-between relative">
          {RR_STAGES.map((st, idx) => {
            const isActive = activeStageKey === st.key;
            const isLocked = idx > currentStageIndex;
            const isCompleted = idx < currentStageIndex;
            return (
              <button
                key={st.key}
                onClick={() => !isLocked && setActiveStageKey(st.key)}
                disabled={isLocked}
                title={isLocked ? `Complete Step ${currentStageIndex + 1} to unlock this stage` : st.label}
                className={`flex-1 text-center py-2 px-1 border-b-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${isLocked
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50'
                    : isActive
                      ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                      : isCompleted
                        ? 'border-emerald-400 text-emerald-700 hover:text-emerald-800 bg-emerald-50/30'
                        : 'border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
              >
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                {isLocked && <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left side Linked Land Context, Right side Active Step Dedicated Panel & Task Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Constant Case Context Card */}
        <div className="space-y-4 lg:order-last">
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
              {family.entitlement || 'No specific statutory entitlement terms entered in database for this family record yet.'}
            </p>
          </div>

          <div className={`card p-4 space-y-2 ${isStageLocked ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
            <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isStageLocked ? 'text-slate-500' : 'text-indigo-900'}`}>
              {isStageLocked ? <Lock className="w-4 h-4 text-slate-400" /> : <BookOpen className="w-4 h-4 text-indigo-600" />}
              {isStageLocked ? 'Stage Locked' : 'Active Stage Context'}
            </h3>
            <p className={`text-[11px] font-semibold ${isStageLocked ? 'text-slate-500' : 'text-indigo-950'}`}>
              {RR_STAGES.find((s) => s.key === activeStageKey)?.label}
            </p>
            <p className={`text-[11px] leading-relaxed font-sans ${isStageLocked ? 'text-slate-400' : 'text-indigo-800'}`}>
              {isStageLocked
                ? `This stage will unlock after Step ${currentStageIndex + 1} activities are completed.`
                : `Displaying real database activity logs and evidence documents registered for the ${activeStageKey} phase.`
              }
            </p>
          </div>
        </div>

        {/* Right: Active Step Dedicated View & Tasks */}
        <div className="lg:col-span-2 space-y-6 lg:order-first">
          {/* Dark Navy Guidance & Statutory Proof Card for ACTIVE STAGE */}
          {isStageLocked ? (
            /* LOCKED STAGE — Show locked placeholder */
            <div className="bg-slate-100 text-slate-400 rounded-xl shadow-sm p-8 space-y-4 border-2 border-dashed border-slate-300 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-500">
                {RR_STAGES.find((s) => s.key === activeStageKey)?.label} — Locked
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                This stage will become accessible once the activities for
                <strong className="text-slate-600"> Step {currentStageIndex + 1}: {RR_STAGES[currentStageIndex]?.label.split('. ')[1]} </strong>
                are completed. Please complete the current stage first.
              </p>
              <div className="inline-flex items-center gap-2 bg-slate-200 text-slate-500 px-4 py-2 rounded-full text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                Complete Step {currentStageIndex + 1} to Unlock
              </div>
            </div>
          ) : (
            /* UNLOCKED STAGE — Show real guidance card */
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
                {guidanceDescription}
              </p>

              {/* Statutory Checklist & Real Proof Documents Exporter & Viewer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Stage Executed Tasks */}
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-indigo-400" /> Registered Tasks for Stage
                  </h3>
                  {stageActivities.length === 0 ? (
                    <div className="py-4 text-slate-400 text-xs">
                      No activity logs recorded for this stage yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stageActivities.map((act) => (
                        <div key={act.id} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${act.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-500'}`} />
                          <div>
                            <span className={act.status === 'COMPLETED' ? 'text-slate-200 font-medium' : 'text-slate-300'}>
                              {act.activity_type}
                            </span>
                            {act.description && <p className="text-[11px] text-slate-400">{act.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real Proof Documents Downloader & Viewer */}
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-400" /> Statutory Evidence Proofs
                  </h3>
                  {realProofs.length === 0 ? (
                    <div className="py-4 text-slate-400 text-xs space-y-2">
                      <p>No evidence documents uploaded in database for this stage yet.</p>
                      <button
                        onClick={() => setShowUploadProofModal(true)}
                        className="btn btn-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-600 font-semibold text-xs flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Proof Document
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {realProofs.map((proof) => (
                        <div key={proof.code} className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white">{proof.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">Ref: {proof.code} • Date: {proof.date}</div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-700/80 text-[11px] text-indigo-300 font-medium">
                              <User className="w-3 h-3 text-indigo-400" />
                              <span>Uploaded by: <strong className="text-white">{proof.verifier}</strong> <span className="text-indigo-300">({proof.verifierRole})</span></span>
                            </div>
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
                              <Download className="w-3.5 h-3.5" /> Export
                            </button>
                            {(user?.role === proof.verifierRole || user?.role === 'ADMIN') && (
                              <button
                                onClick={() => handleDeleteProof(proof.activity_id)}
                                className="btn btn-sm bg-rose-600/90 hover:bg-rose-700 text-white border border-rose-500 font-semibold text-xs flex items-center gap-1 shadow-sm"
                                title="Delete Proof"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <button
                          onClick={() => setShowUploadProofModal(true)}
                          className="btn btn-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-600 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" /> Upload Additional Proof Document
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED STAGE-SPECIFIC REAL DETAIL PANELS — Only for unlocked stages */}
          {!isStageLocked && activeStageKey === 'REGISTRATION' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-blue-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-blue-600" /> Step 1: Registration & Household Verification Record
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-slate-500 font-medium">Head of Family:</span>
                  <p className="font-bold text-slate-900 text-sm">{family.head_of_family}</p>
                  <p className="text-slate-500">System Family Code: <strong className="font-mono text-slate-800">{family.family_code}</strong></p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-slate-500 font-medium">Displacement Category & Members:</span>
                  <p className="font-bold text-indigo-800">{family.category} FAMILY</p>
                  <p className="text-slate-600">Registered Dependents: {family.members_count} Members</p>
                </div>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'ENTITLEMENT' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-indigo-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" /> Step 2: Statutory Entitlement Package Record
              </h3>
              <div className="p-4 bg-indigo-50/60 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-indigo-950">Statutory Entitlement Terms (Database Record)</p>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {family.entitlement || 'No statutory entitlement text recorded in database for this family.'}
                </p>
                <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-[11px] text-indigo-900 font-semibold">
                  <span>Project: {family.project_name} ({family.project_code})</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    {family.entitlement ? 'RECORD REGISTERED' : 'PENDING REGISTER'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'HOUSING' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-emerald-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" /> Step 3: Resettlement Dwelling & Land Allocation Record
              </h3>
              <div className="p-4 bg-emerald-50/60 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-sm">
                    {family.survey_number ? `Survey #${family.survey_number} (${family.village})` : 'Land Parcel Allocation'}
                  </span>
                  <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
                    {family.parcel_code ? `PARCEL: ${family.parcel_code}` : 'LINKED PARCEL'}
                  </span>
                </div>
                <p className="text-slate-700">Acquired Land Area: {family.area_acres || 'N/A'} Acres</p>
                <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-900">
                  <strong>Entitlement Terms:</strong> {family.entitlement || 'Residential housing plot allotment under Second Schedule.'}
                </div>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'GRANT' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-amber-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Step 4: Resettlement Grant & Financial Disbursement Panel
              </h3>
              <div className="p-4 bg-amber-50/60 rounded-xl space-y-3 text-xs">
                <p className="font-bold text-amber-950">Statutory Financial Grant Package</p>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {family.entitlement || 'Statutory grant package under RFCTLARR Act Second Schedule.'}
                </p>
                <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-900 font-semibold flex justify-between">
                  <span>Contact: {family.contact || 'N/A'}</span>
                  <span>Category: {family.category}</span>
                </div>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'TRAINING' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-purple-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" /> Step 5: Vocational Skill Training & Livelihood Panel
              </h3>
              <div className="p-4 bg-purple-50/60 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-purple-950">Livelihood Rehabilitation Program</p>
                <p className="text-slate-700">Family Members Eligible: {family.members_count} Members ({family.category})</p>
                <p className="text-slate-700">Project Alignment: {family.project_name}</p>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'SUBSISTENCE' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-teal-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" /> Step 6: Subsistence Allowance Record Panel
              </h3>
              <div className="p-4 bg-teal-50/60 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-teal-950">Monthly Subsistence Allowance</p>
                <p className="text-slate-700">Head of Family: {family.head_of_family} ({family.family_code})</p>
                <p className="text-slate-700">Entitlement Status: {family.entitlement || 'Statutory subsistence allowance under Second Schedule.'}</p>
              </div>
            </div>
          )}

          {!isStageLocked && activeStageKey === 'CLOSURE' && (
            <div className="card p-5 space-y-3 border-l-4 border-l-emerald-600">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Step 7: Final R&R Statutory File Closure Record
              </h3>
              <div className="p-4 bg-emerald-50/60 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-emerald-950">Statutory R&R Case Status</p>
                <p className="text-slate-700">Executed Tasks: {compAct} of {totalAct} Completed ({progressPct}%)</p>
                <p className="font-mono text-emerald-900 font-bold">
                  {progressPct === 100 ? 'Status: 100% COMPLETE — Ready for Collector Final Sign-Off' : `Status: IN PROGRESS (${progressPct}% Completed)`}
                </p>
              </div>
            </div>
          )}

          {/* Right: R&R Activities Timeline — Only for unlocked stages */}
          {!isStageLocked && (
            <div className="card p-5 space-y-4">
              <div className="border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" /> R&R Action Plan & Executed Tasks
                </h3>
              </div>

              {stageActivities.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">No activity items logged for this stage yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stageActivities.map((act, index) => (
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
                          {act.authority_name && (
                            <span className="ml-3">
                              Officer: <strong className="text-slate-700">{act.authority_name}</strong>
                              {act.authority_role && <span className="text-slate-500 ml-1">({act.authority_role})</span>}
                            </span>
                          )}
                          {act.evidence_document_id && act.doc_uploader_name && !act.authority_name && (
                            <span className="ml-3">
                              Uploaded By: <strong className="text-slate-700">{act.doc_uploader_name}</strong>
                              {act.doc_uploader_role && <span className="text-slate-500 ml-1">({act.doc_uploader_role})</span>}
                            </span>
                          )}
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
          )}
        </div>
      </div>

      {/* MODAL: VIEW UPLOADED EVIDENCE DOCUMENT */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-5xl bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {viewingCertificate.title || 'Uploaded Evidence Document'}
                    <span className="text-xs font-mono text-indigo-400 font-normal">[{viewingCertificate.code}]</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Uploaded by: <strong className="text-indigo-300">{viewingCertificate.verifier} ({viewingCertificate.verifierRole})</strong> • Date: {viewingCertificate.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${viewingCertificate.documentId || viewingCertificate.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 py-1.5 px-3 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </a>
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

            {/* Document File Viewer Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[450px]">
              {(() => {
                const docId = viewingCertificate.documentId || viewingCertificate.id;
                const fileUrl = `/api/documents/${docId}/file`;
                const fileType = (viewingCertificate.fileType || '').toLowerCase();
                const fileName = (viewingCertificate.originalFilename || viewingCertificate.title || '').toLowerCase();

                const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff)$/i.test(fileName);

                if (isImage) {
                  return (
                    <div className="w-full flex flex-col items-center justify-center p-2 space-y-3">
                      <img
                        src={fileUrl}
                        alt={viewingCertificate.title}
                        className="max-w-full max-h-[65vh] object-contain rounded-lg border border-slate-700 shadow-2xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          document.getElementById(`fallback-doc-box-${docId}`)?.classList.remove('hidden');
                        }}
                      />
                      <div id={`fallback-doc-box-${docId}`} className="hidden text-center py-8 space-y-3">
                        <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                        <p className="text-xs text-slate-400">Unable to display inline image preview directly.</p>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Click to View Original File
                        </a>
                      </div>
                    </div>
                  );
                }

                // Default viewer for PDF, Office Docs, or fallback files
                return (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
                    title={viewingCertificate.title}
                  />
                );
              })()}
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

      {/* Modal: Upload Proof Document */}
      {showUploadProofModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg bg-white p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Proof Document</h3>
                  <p className="text-[11px] text-slate-500">
                    Stage: {RR_STAGES.find(s => s.key === activeStageKey)?.label} • {family.head_of_family}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowUploadProofModal(false); setProofFile(null); setProofTitle(''); setProofDescription(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadProofSubmit} className="space-y-4 text-xs">
              {/* File Drop Area */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Evidence File *</label>
                <label
                  className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${proofFile
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
                    }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.tiff"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProofFile(file);
                        if (!proofTitle) {
                          setProofTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                        }
                      }
                    }}
                  />
                  {proofFile ? (
                    <div className="space-y-1">
                      <Paperclip className="w-6 h-6 text-emerald-600 mx-auto" />
                      <p className="text-sm font-bold text-emerald-800">{proofFile.name}</p>
                      <p className="text-[11px] text-emerald-600">
                        {(proofFile.size / 1024).toFixed(1)} KB • {proofFile.type || 'Unknown type'}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setProofFile(null); }}
                        className="text-rose-500 font-bold text-xs hover:underline mt-1"
                      >
                        Remove & Choose Another
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-600">Click to select file</p>
                      <p className="text-[11px] text-slate-400">
                        PDF, Images, Word, Excel — Max 25MB
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Document Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Registration Certificate, Survey Report, NOC..."
                  value={proofTitle}
                  onChange={(e) => setProofTitle(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional details about this evidence document..."
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
                <strong>Note:</strong> This document will be uploaded as statutory evidence proof for the{' '}
                <strong>{RR_STAGES.find(s => s.key === activeStageKey)?.label}</strong> stage and linked to the family's R&R case file.
              </div>

              <div className="flex justify-end gap-3 border-t pt-3">
                <button
                  type="button"
                  onClick={() => { setShowUploadProofModal(false); setProofFile(null); setProofTitle(''); setProofDescription(''); }}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof || !proofFile}
                  className="btn btn-primary text-xs font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingProof ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
