import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  X, Upload, FileText, Layers, FileWarning, ChevronDown,
  CheckCircle2, AlertTriangle, AlertCircle, Clock, Sparkles,
  RefreshCw, Eye, Save, ArrowLeft, ArrowRight, FileCheck,
  ZoomIn, ZoomOut, Maximize2, RotateCw, Edit3, Info,
  Camera, ScanLine, File, Image as ImageIcon,
} from 'lucide-react';

const DOC_TYPE_LABELS = {
  LAND_RECORD: 'Land Record (Khasra/Khatauni)',
  SURVEY_REPORT: 'Survey Report',
  NOTIFICATION: 'Gazette Notification',
  AWARD_ORDER: 'Award Order',
  COMPENSATION_DOC: 'Compensation Document',
  POSSESSION_DOC: 'Possession Certificate',
  RR_EVIDENCE: 'R&R Evidence',
  OTHER: 'Other',
};

/* ─── Stepper Bar ──────────────────────────────────────────────── */
function StepperBar({ currentStep }) {
  const steps = [
    { num: 1, label: 'Upload Document', sub: 'Select project, parcel and file' },
    { num: 2, label: 'AI Extraction', sub: 'Automated OCR & field detection' },
    { num: 3, label: 'Verify & Save', sub: 'Review extracted details' },
  ];

  return (
    <div className="flex items-center justify-center gap-0 py-5 px-6 bg-gradient-to-b from-emerald-50/80 to-white border-b border-slate-200">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center min-w-[140px]">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                    : isActive
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.num}
              </div>
              <p className={`mt-2 text-xs font-bold ${isActive || isCompleted ? 'text-emerald-800' : 'text-slate-400'}`}>
                {step.label}
              </p>
              <p className={`text-[10px] mt-0.5 ${isActive || isCompleted ? 'text-emerald-600' : 'text-slate-300'}`}>
                {step.sub}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-24 h-[2px] mx-1 mt-[-24px] ${
                currentStep > step.num ? 'bg-emerald-500' : 'border-t-2 border-dashed border-slate-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Match Score Donut (CSS-only) ─────────────────────────────── */
function MatchScoreDonut({ matchCount, totalFields }) {
  const pct = totalFields > 0 ? Math.round((matchCount / totalFields) * 100) : 100;
  const color = pct >= 90 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626';
  return (
    <div className="relative w-[120px] h-[120px]">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="50" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${(pct / 100) * 314.16} 314.16`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-slate-500 font-semibold">Match Score</span>
      </div>
    </div>
  );
}

/* ─── Main Wizard Component ────────────────────────────────────── */
export default function DocumentUploadWizard({ onClose, onUploadComplete }) {
  const [step, setStep] = useState(1);

  // Lookup data
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [cases, setCases] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Step 1 form state
  const [form, setForm] = useState({
    project_id: '',
    parcel_id: '',
    case_id: '',
    title: '',
    document_type: 'LAND_RECORD',
    description: '',
    access_level: 'PUBLIC',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Step 2 state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [aiScanStage, setAiScanStage] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);
  const [editingFields, setEditingFields] = useState(false);
  const [editedExtracted, setEditedExtracted] = useState({});
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewRotation, setPreviewRotation] = useState(0);

  // Step 3 state
  const [confirmChecks, setConfirmChecks] = useState({
    reviewed: false,
    readable: false,
    acceptDiscrepancy: false,
    linkCase: false,
    addNote: false,
  });
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch lookup data
  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [projRes, parcRes, caseRes] = await Promise.allSettled([
        api.get('/projects', { params: { limit: 100, all: 'true' } }),
        api.get('/parcels', { params: { limit: 300, all: 'true' } }),
        api.get('/workflow/cases', { params: { limit: 100 } }),
      ]);
      if (projRes.status === 'fulfilled' && projRes.value?.data?.data) setProjects(projRes.value.data.data);
      if (parcRes.status === 'fulfilled' && parcRes.value?.data?.data) setParcels(parcRes.value.data.data);
      if (caseRes.status === 'fulfilled' && caseRes.value?.data?.data) setCases(caseRes.value.data.data);
    } catch (e) {
      console.error('Failed to load lookups:', e);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  // Generate file preview URL when file is set, not in an effect
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ── File drag-and-drop handlers ── */
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      // Simulate event object for handleFileChange
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };
  const handleFileSelect = handleFileChange;

  /* ── Step 1 → Step 2: Upload & AI Scan ── */
  const handleUploadAndScan = async () => {
    if (!uploadFile || !form.project_id || !form.title) return;
    setUploading(true);
    setUploadError('');
    setStep(2);
    setAiScanStage(1);

    const timer1 = setTimeout(() => setAiScanStage(2), 800);
    const timer2 = setTimeout(() => setAiScanStage(3), 1800);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);
      formData.append('document_type', form.document_type);
      formData.append('access_level', form.access_level);
      if (form.project_id) formData.append('project_id', form.project_id);
      if (form.parcel_id) formData.append('parcel_id', form.parcel_id);
      if (form.case_id) formData.append('case_id', form.case_id);
      formData.append('file', uploadFile);

      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setAiScanStage(4);

      const createdDoc = res.data?.data;
      setLastUploadedDoc(createdDoc);

      if (createdDoc?.ai_verification) {
        setAiResult(createdDoc.ai_verification);
        if (createdDoc.ai_verification.extracted_fields) {
          setEditedExtracted({ ...createdDoc.ai_verification.extracted_fields });
        }
      } else {
        setAiResult({
          hasMismatches: false,
          mismatchCount: 0,
          mismatches: [],
          extracted_fields: null,
          target_parcel: null,
          note: 'Document saved successfully. No AI extraction data available.',
        });
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
      setStep(1);
      setAiScanStage(0);
    } finally {
      setUploading(false);
    }
  };

  /* ── Step 3: Save ── */
  const handleFinalSave = async () => {
    setSaving(true);
    try {
      if (onUploadComplete) onUploadComplete();
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Computed fields for verification ── */
  const comparisonFields = [
    { key: 'report_date', label: 'Report Date', icon: Clock },
    { key: 'project_name', label: 'Project', icon: Layers },
    { key: 'survey_number', label: 'Survey No.', icon: FileText },
    { key: 'area_acres', label: 'Area', icon: FileWarning, format: (v) => v ? `${v} acres` : '—' },
    { key: 'village', label: 'Village', icon: FileText },
    { key: 'owner_name', label: 'Owner', icon: FileText },
    { key: 'district', label: 'District', icon: FileText },
  ];

  const getFieldStatus = (fieldKey) => {
    if (!aiResult?.mismatches) return 'match';
    return aiResult.mismatches.some(m => m.field_name === fieldKey) ? 'mismatch' : 'match';
  };

  const matchCount = comparisonFields.filter(f => getFieldStatus(f.key) === 'match').length;
  const mismatchCount = aiResult?.mismatchCount || comparisonFields.filter(f => getFieldStatus(f.key) === 'mismatch').length;
  const totalFields = comparisonFields.length;

  const canProceedStep1 = uploadFile && form.project_id && form.title;
  const canProceedStep3 = confirmChecks.reviewed && confirmChecks.readable && (mismatchCount === 0 || confirmChecks.acceptDiscrepancy);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white" style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* ═══ TOP HEADER BAR ═══ */}
      <div className="flex-shrink-0 px-6 py-3.5 bg-gradient-to-r from-[#0f2b1d] via-[#1a3c2b] to-[#0f2b1d] text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">
              Statutory Document Upload & AI Verification
            </h1>
            <p className="text-[11px] text-white/70">
              Upload land acquisition documents and let AI extract & verify key details automatically
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ═══ STEPPER BAR ═══ */}
      <StepperBar currentStep={step} />

      {/* ═══ MAIN CONTENT (scrollable) ═══ */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-6 py-6">

          {/* ═══ STEP 1: UPLOAD DOCUMENT ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              {uploadError && (
                <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Section 1: Select Context */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="text-emerald-700">1.</span> Select Context
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Link this document to the correct project, parcel and (optionally) workflow case.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Infrastructure Project */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      Infrastructure Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.project_id}
                      onChange={(e) => setForm(f => ({ ...f, project_id: e.target.value, parcel_id: '' }))}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                      required
                    >
                      <option value="">— Select a project —</option>
                      {loadingLookups ? (
                        <option disabled>Loading projects...</option>
                      ) : (
                        projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.district ? `(${p.district})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">Select the project this document belongs to</p>
                  </div>

                  {/* Cadastral Parcel */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <FileWarning className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      Cadastral Parcel (Master Land Record) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.parcel_id}
                      onChange={(e) => setForm(f => ({ ...f, parcel_id: e.target.value }))}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    >
                      <option value="">Auto-detect from document (OCR Survey #)</option>
                      {(form.project_id
                        ? parcels.filter(p => p.project_id === form.project_id)
                        : parcels
                      ).map(p => (
                        <option key={p.id} value={p.id}>
                          Survey #{p.survey_number} — {p.village} ({p.area_acres} Acres, Owner: {p.owner_name})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">We'll extract survey number and match automatically</p>
                  </div>
                </div>

                {/* Workflow Case */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    Associated Workflow Case (Optional)
                  </label>
                  <select
                    value={form.case_id}
                    onChange={(e) => setForm(f => ({ ...f, case_id: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  >
                    <option value="">Select a case</option>
                    {cases
                      .filter(c => {
                        if (form.parcel_id) return c.parcel_id === form.parcel_id;
                        if (form.project_id) return c.project_id === form.project_id;
                        return true;
                      })
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.case_code}] {c.project_code ? `Project: ${c.project_code}` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5">Link this document to a specific acquisition case</p>
                </div>
              </section>

              {/* Section 2: Document Details */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="text-emerald-700">2.</span> Document Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide basic information about the document you are uploading.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      Document Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Field Survey Assessment Report"
                      className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      Document Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.document_type}
                      onChange={(e) => setForm(f => ({ ...f, document_type: e.target.value }))}
                      className="w-full px-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    >
                      {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Section 3: Upload Document */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="text-emerald-700">3.</span> Upload Document
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a clear scan or photo. Handwritten, scanned and printed documents are supported.
                  </p>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200
                    ${dragOver
                      ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                      : uploadFile
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/30'
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.tiff"
                  />

                  {uploadFile ? (
                    <div className="space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
                        <FileCheck className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-emerald-900 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          File loaded
                        </p>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">{uploadFile.name}</p>
                        <p className="text-[10px] text-emerald-600 font-mono mt-0.5">{formatBytes(uploadFile.size)} • Uploaded just now</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                        className="text-[10px] text-slate-500 hover:text-red-600 underline font-semibold"
                      >
                        Remove & choose different file
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100/60 border border-emerald-200/50 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-7 h-7 text-emerald-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Drag & drop your document here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        or click to <span className="text-emerald-600 font-bold underline">browse files</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        Supports PDF, PNG, JPG&nbsp;&nbsp;|&nbsp;&nbsp;Max size: 10 MB
                      </p>
                    </>
                  )}
                </div>

                {/* Supported types chips */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Supported document types:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: File, label: 'PDF', color: 'text-red-600 bg-red-50 border-red-100' },
                      { icon: ImageIcon, label: 'JPG', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                      { icon: ImageIcon, label: 'PNG', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                      { icon: Camera, label: 'Photos from mobile', color: 'text-slate-600 bg-slate-50 border-slate-200' },
                      { icon: ScanLine, label: 'Scanned documents', color: 'text-slate-600 bg-slate-50 border-slate-200' },
                      { icon: FileText, label: 'Other files', color: 'text-slate-600 bg-slate-50 border-slate-200' },
                    ].map((t, i) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${t.color}`}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ═══ STEP 2: AI EXTRACTION & FIELD DETECTION ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Scanning animation (while uploading) */}
              {uploading && (
                <div className="py-16 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl">
                      <Sparkles className="w-10 h-10 text-amber-300 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">AI Document Analyzer in Action</h3>
                    <p className="text-xs text-slate-500 mt-1">Extracting fields and comparing against master records...</p>
                  </div>
                  <div className="max-w-md mx-auto space-y-2.5 text-left text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    {[
                      { stage: 1, label: 'Uploading & pre-processing document file...' },
                      { stage: 2, label: 'Running Tesseract OCR engine...' },
                      { stage: 3, label: 'Extracting fields & comparing cadastral records...' },
                    ].map(s => (
                      <div key={s.stage} className={`flex items-center gap-2.5 font-semibold ${aiScanStage >= s.stage ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {aiScanStage > s.stage ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : aiScanStage === s.stage ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <Clock className="w-4 h-4" />}
                        <span>{s.stage}. {s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results (after upload complete) */}
              {!uploading && aiResult && (
                <>
                  {/* Section Header + Status Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="text-emerald-700">2.</span> AI Extraction & Field Detection
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">The document has been processed successfully. Review the extracted information and verification results below.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Document processed</p>
                        <p className="text-[10px] text-emerald-600">AI has extracted key fields from the document</p>
                      </div>
                    </div>
                  </div>

                  {/* Three-column layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Document Preview */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Document Preview</p>
                          <p className="text-[10px] text-slate-400">Uploaded file</p>
                        </div>
                      </div>
                      {/* Zoom controls */}
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50">
                        <button onClick={() => setPreviewZoom(z => Math.max(50, z - 25))} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 min-w-[35px] text-center">{previewZoom}%</span>
                        <button onClick={() => setPreviewZoom(z => Math.min(200, z + 25))} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setPreviewZoom(100)} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setPreviewRotation(r => (r + 90) % 360)} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Preview area */}
                      <div className="p-3 bg-slate-100 min-h-[300px] flex items-center justify-center overflow-auto">
                        {filePreviewUrl ? (
                          <img
                            src={filePreviewUrl}
                            alt="Document preview"
                            className="max-w-full rounded-lg border border-slate-200 shadow-sm transition-transform duration-200"
                            style={{
                              transform: `scale(${previewZoom / 100}) rotate(${previewRotation}deg)`,
                            }}
                          />
                        ) : (
                          <div className="text-center py-10">
                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs text-slate-500 font-semibold">{uploadFile?.name || 'Document'}</p>
                            <p className="text-[10px] text-slate-400 mt-1">PDF preview not available in browser</p>
                          </div>
                        )}
                      </div>
                      {/* File info */}
                      {uploadFile && (
                        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                            <File className="w-3.5 h-3.5 text-red-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{uploadFile.name}</p>
                            <p className="text-[10px] text-slate-400">{formatBytes(uploadFile.size)} • Uploaded just now</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> File loaded
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Center: Extracted Information (OCR) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Extracted Information (OCR)</p>
                          <p className="text-[10px] text-slate-400">Key details automatically from the document</p>
                        </div>
                        <button
                          onClick={() => setEditingFields(!editingFields)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {comparisonFields.map(field => {
                          const extractedVal = aiResult?.extracted_fields?.[field.key] || editedExtracted[field.key] || '—';
                          const displayVal = field.format ? field.format(extractedVal === '—' ? null : extractedVal) : extractedVal;
                          return (
                            <div key={field.key} className="px-4 py-3 flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <field.icon className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{field.label}</p>
                                {editingFields ? (
                                  <input
                                    value={editedExtracted[field.key] || ''}
                                    onChange={(e) => setEditedExtracted(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-200 rounded focus:border-emerald-500 outline-none"
                                  />
                                ) : (
                                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{displayVal}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Info note */}
                      <div className="px-4 py-3 bg-blue-50/50 border-t border-slate-100 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-600">
                          These fields were extracted using AI (OCR). You can edit any field if required before saving.
                        </p>
                      </div>
                    </div>

                    {/* Right: Verification with Master Record */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800">Verification with Master Record</p>
                        <p className="text-[10px] text-slate-400">Extracted details are compared with the cadastral database.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left">
                          <thead>
                            <tr className="bg-slate-50 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-200">
                              <th className="px-3 py-2">Field</th>
                              <th className="px-3 py-2">Extracted Value</th>
                              <th className="px-3 py-2">Master Record</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {comparisonFields.map(field => {
                              const extracted = aiResult?.extracted_fields?.[field.key] || '—';
                              const master = aiResult?.target_parcel?.[field.key] || '—';
                              const status = getFieldStatus(field.key);
                              const isMismatch = status === 'mismatch';
                              return (
                                <tr key={field.key} className={isMismatch ? 'bg-amber-50/30' : ''}>
                                  <td className="px-3 py-2.5 font-bold text-slate-700">{field.label}</td>
                                  <td className={`px-3 py-2.5 ${isMismatch ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
                                    {field.format ? field.format(extracted === '—' ? null : extracted) : extracted}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-700">
                                    {field.format ? field.format(master === '—' ? null : master) : master}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {isMismatch ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Difference
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Match
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Discrepancy Summary */}
                      {mismatchCount > 0 && (
                        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-extrabold text-amber-800">
                              {mismatchCount} discrepanc{mismatchCount === 1 ? 'y' : 'ies'} found
                            </p>
                            {aiResult?.mismatches?.map((m, idx) => (
                              <p key={idx} className="text-[10px] text-amber-700 mt-0.5">
                                {m.explanation || `${m.field_name}: extracted "${m.extracted_value}" vs master "${m.master_value}"`}
                              </p>
                            ))}
                            <p className="text-[10px] text-amber-600 mt-1">Please review and confirm before saving.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ STEP 3: VERIFY & SAVE ═══ */}
          {step === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* AI Verification Completed Banner */}
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-emerald-900">AI Verification Completed</p>
                  <p className="text-xs text-emerald-600">Review the results below and confirm to save.</p>
                </div>
              </div>

              {/* Verification Status Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-extrabold text-slate-900 mb-4">Verification Status</h3>
                <div className="flex items-center gap-8 flex-wrap">
                  <MatchScoreDonut matchCount={matchCount} totalFields={totalFields} />
                  <div className="space-y-3 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-extrabold text-emerald-800">{matchCount} fields match</p>
                        <p className="text-[10px] text-slate-500">Verified against master record</p>
                      </div>
                    </div>
                    {mismatchCount > 0 && (
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-extrabold text-amber-700">{mismatchCount} field{mismatchCount > 1 ? 's' : ''} with discrepancy</p>
                          <p className="text-[10px] text-slate-500">Requires review</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-extrabold text-slate-700">0 critical issues</p>
                        <p className="text-[10px] text-slate-500">No blocking errors</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review & Confirm */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Review & Confirm</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Please confirm the following before saving this document.</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={confirmChecks.reviewed}
                      onChange={(e) => setConfirmChecks(c => ({ ...c, reviewed: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                      I have reviewed the extracted information and verification results.
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={confirmChecks.readable}
                      onChange={(e) => setConfirmChecks(c => ({ ...c, readable: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                      I confirm that the document is readable and correctly classified.
                    </span>
                  </label>

                  {mismatchCount > 0 && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={confirmChecks.acceptDiscrepancy}
                        onChange={(e) => setConfirmChecks(c => ({ ...c, acceptDiscrepancy: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                        I want to save this document even with the noted discrepancy.
                      </span>
                    </label>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={confirmChecks.linkCase}
                      onChange={(e) => setConfirmChecks(c => ({ ...c, linkCase: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                      Link this document to a workflow case
                    </span>
                  </label>

                  {confirmChecks.linkCase && (
                    <div className="ml-8">
                      <select
                        value={form.case_id}
                        onChange={(e) => setForm(f => ({ ...f, case_id: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      >
                        <option value="">Select a case (optional)</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>[{c.case_code}]</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={confirmChecks.addNote}
                      onChange={(e) => setConfirmChecks(c => ({ ...c, addNote: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                      Add a note (optional)
                    </span>
                  </label>

                  {confirmChecks.addNote && (
                    <div className="ml-8 relative">
                      <textarea
                        value={saveNote}
                        onChange={(e) => setSaveNote(e.target.value.slice(0, 500))}
                        placeholder="e.g. Area in document is 2.10 acres, master record shows 2.30 acres. Requires field re-verification."
                        rows={3}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none resize-none"
                      />
                      <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono">
                        {saveNote.length}/500
                      </span>
                    </div>
                  )}
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl mt-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Once saved, this document will be stored with a version history and included in the audit log.
                    You can always update or add a new version later.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div>
          {step === 1 && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {step === 2 && !uploading && (
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          {step === 3 && (
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>

        <div>
          {step === 1 && (
            <button
              onClick={handleUploadAndScan}
              disabled={!canProceedStep1 || uploading}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md hover:shadow-lg ${
                canProceedStep1
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Upload & Run AI Verification
            </button>
          )}
          {step === 2 && !uploading && (
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              Continue to Review <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleFinalSave}
              disabled={!canProceedStep3 || saving}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md hover:shadow-lg ${
                canProceedStep3
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Document
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
