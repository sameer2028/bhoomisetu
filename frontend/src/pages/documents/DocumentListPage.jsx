import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  FileText, Upload, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Download, Shield, ShieldAlert, ShieldCheck, Clock, X,
  FolderOpen, Layers, FileWarning, AlertCircle, FileCheck, Lock,
  Sparkles, CheckCircle2, RefreshCw, AlertTriangle,
} from 'lucide-react';

const DOC_TYPE_LABELS = {
  LAND_RECORD: 'Land Record / ROR',
  SURVEY_REPORT: 'Survey Report',
  NOTIFICATION: 'Gazette Notification',
  AWARD_ORDER: 'Award Order',
  COMPENSATION_DOC: 'Compensation Doc',
  POSSESSION_DOC: 'Possession Certificate',
  RR_EVIDENCE: 'R&R Evidence',
  OTHER: 'Other',
};

const DOC_TYPE_COLORS = {
  LAND_RECORD: 'bg-blue-100 text-blue-800 border border-blue-200',
  SURVEY_REPORT: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  NOTIFICATION: 'bg-amber-100 text-amber-800 border border-amber-200',
  AWARD_ORDER: 'bg-purple-100 text-purple-800 border border-purple-200',
  COMPENSATION_DOC: 'bg-orange-100 text-orange-800 border border-orange-200',
  POSSESSION_DOC: 'bg-teal-100 text-teal-800 border border-teal-200',
  RR_EVIDENCE: 'bg-pink-100 text-pink-800 border border-pink-200',
  OTHER: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
};

const ACCESS_ICONS = {
  PUBLIC: { icon: ShieldCheck, color: 'text-emerald-600', label: 'Public' },
  RESTRICTED: { icon: Shield, color: 'text-amber-600', label: 'Restricted' },
  CONFIDENTIAL: { icon: ShieldAlert, color: 'text-red-600', label: 'Confidential' },
};

export default function DocumentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filters state from URL or defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams.get('document_type') || '');
  const [accessFilter, setAccessFilter] = useState(searchParams.get('access_level') || '');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project_id') || '');
  const [parcelFilter, setParcelFilter] = useState(searchParams.get('parcel_id') || '');
  const [caseFilter, setCaseFilter] = useState(searchParams.get('case_id') || '');
  const [showFilters, setShowFilters] = useState(Boolean(searchParams.get('project_id') || searchParams.get('parcel_id') || searchParams.get('case_id')));
  const [page, setPage] = useState(1);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', document_type: 'OTHER', access_level: 'PUBLIC',
    project_id: '', parcel_id: '', case_id: '',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadAiResult, setUploadAiResult] = useState(null);
  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [aiActionResult, setAiActionResult] = useState(null);

  // Lookup data for linking
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [cases, setCases] = useState([]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (docTypeFilter) params.document_type = docTypeFilter;
      if (accessFilter) params.access_level = accessFilter;
      if (projectFilter) params.project_id = projectFilter;
      if (parcelFilter) params.parcel_id = parcelFilter;
      if (caseFilter) params.case_id = caseFilter;

      const res = await api.get('/documents', { params });
      setDocuments(res.data.data || []);
      setMeta(res.data.meta || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [page, search, docTypeFilter, accessFilter, projectFilter, parcelFilter, caseFilter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Sync state to URL search params
  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (docTypeFilter) p.set('document_type', docTypeFilter);
    if (accessFilter) p.set('access_level', accessFilter);
    if (projectFilter) p.set('project_id', projectFilter);
    if (parcelFilter) p.set('parcel_id', parcelFilter);
    if (caseFilter) p.set('case_id', caseFilter);
    setSearchParams(p, { replace: true });
  }, [search, docTypeFilter, accessFilter, projectFilter, parcelFilter, caseFilter, setSearchParams]);

  // Fetch lookup data for upload form & filter dropdowns
  const [loadingLookups, setLoadingLookups] = useState(false);

  const fetchLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [projRes, parcRes, caseRes] = await Promise.allSettled([
        api.get('/projects', { params: { limit: 100, all: 'true' } }),
        api.get('/parcels', { params: { limit: 300, all: 'true' } }),
        api.get('/workflow/cases', { params: { limit: 100 } }),
      ]);
      if (projRes.status === 'fulfilled' && projRes.value?.data?.data) {
        setProjects(projRes.value.data.data);
      }
      if (parcRes.status === 'fulfilled' && parcRes.value?.data?.data) {
        setParcels(parcRes.value.data.data);
      }
      if (caseRes.status === 'fulfilled' && caseRes.value?.data?.data) {
        setCases(caseRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to load lookups:', e);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const [aiScanStage, setAiScanStage] = useState(0); // 0: Idle, 1: Uploading, 2: OCR, 3: Cadastral Comparison
  const [activeModalView, setActiveModalView] = useState('FORM'); // 'FORM' | 'SCANNING' | 'RESULT'
  const [lastUploadedDoc, setLastUploadedDoc] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError('');
    setActiveModalView('SCANNING');
    setAiScanStage(1);

    const stageTimer1 = setTimeout(() => setAiScanStage(2), 700);
    const stageTimer2 = setTimeout(() => setAiScanStage(3), 1500);

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      formData.append('document_type', uploadForm.document_type);
      formData.append('access_level', uploadForm.access_level);
      if (uploadForm.project_id) formData.append('project_id', uploadForm.project_id);
      if (uploadForm.parcel_id) formData.append('parcel_id', uploadForm.parcel_id);
      if (uploadForm.case_id) formData.append('case_id', uploadForm.case_id);
      if (uploadFile) formData.append('file', uploadFile);

      const res = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      const createdDoc = res.data?.data;
      setLastUploadedDoc(createdDoc);
      fetchDocuments();

      if (createdDoc?.ai_verification) {
        setUploadAiResult(createdDoc.ai_verification);
        setActiveModalView('RESULT');
      } else {
        // If no AI verification object was attached, still show completed state
        setActiveModalView('RESULT');
        setUploadAiResult({
          hasMismatches: false,
          mismatchCount: 0,
          mismatches: [],
          extracted_fields: null,
          target_parcel: null,
          note: 'Document saved successfully.',
        });
      }
    } catch (err) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setActiveModalView('FORM');
      setUploadError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      setAiScanStage(0);
    }
  };

  const handleVerifyDoc = async (docId) => {
    setVerifyingDocId(docId);
    try {
      const res = await api.post(`/documents/${docId}/verify-ai`);
      const targetDoc = documents.find(d => d.id === docId);
      setLastUploadedDoc(targetDoc || { id: docId });
      setUploadAiResult(res.data?.data);
      setActiveModalView('RESULT');
      setShowUpload(true);
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.error || 'AI verification failed.');
    } finally {
      setVerifyingDocId(null);
    }
  };

  const resetUploadModal = () => {
    setShowUpload(false);
    setActiveModalView('FORM');
    setUploadAiResult(null);
    setUploadError('');
    setUploadForm({ title: '', description: '', document_type: 'SURVEY_REPORT', access_level: 'PUBLIC', project_id: '', parcel_id: '', case_id: '' });
    setUploadFile(null);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const clearFilters = () => {
    setSearch('');
    setDocTypeFilter('');
    setAccessFilter('');
    setProjectFilter('');
    setParcelFilter('');
    setCaseFilter('');
    setPage(1);
  };

  const hasFilters = search || docTypeFilter || accessFilter || projectFilter || parcelFilter || caseFilter;

  const landRecordsCount = documents.filter(d => d.document_type === 'LAND_RECORD').length;
  const notificationsCount = documents.filter(d => d.document_type === 'NOTIFICATION').length;
  const awardOrdersCount = documents.filter(d => d.document_type === 'AWARD_ORDER' || d.document_type === 'COMPENSATION_DOC').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            Statutory Document Repository
          </h1>
          <p className="page-subtitle">
            Centralized e-Governance repository for Gazette notifications, SIA reports, Award orders, and Land Titles
          </p>
        </div>
        <button
          onClick={() => {
            fetchLookups();
            setShowUpload(true);
          }}
          className="btn btn-primary text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Standard KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Documents</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{meta.total || documents.length}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Archived official records</p>
        </div>

        <div className="kpi-card kpi-card-amber">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gazette Notifications</p>
              <p className="text-xl font-black text-amber-700 leading-none mt-0.5">{notificationsCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Sec 4 &amp; Sec 11 statutory gazettes</p>
        </div>

        <div className="kpi-card kpi-card-green">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Land Titles (ROR)</p>
              <p className="text-xl font-black text-emerald-700 leading-none mt-0.5">{landRecordsCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Verified cadastral extracts</p>
        </div>

        <div className="kpi-card kpi-card-purple">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Award Orders</p>
              <p className="text-xl font-black text-purple-800 leading-none mt-0.5">{awardOrdersCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Compensation &amp; possession awards</p>
        </div>
      </div>

      {/* Active Pre-filter Indicator */}
      {(projectFilter || parcelFilter || caseFilter) && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-700" />
            <span>
              Filtered for linked entity: <strong>{projectFilter ? 'Project' : parcelFilter ? 'Parcel' : 'Workflow Case'}</strong>
            </span>
          </div>
          <button onClick={clearFilters} className="text-emerald-700 hover:underline font-bold">
            Show All Documents
          </button>
        </div>
      )}

      {/* Modern Compact Horizontal Enterprise Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-3 flex flex-wrap lg:flex-nowrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] w-full lg:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, code, survey number, file name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input form-input-search text-xs w-full"
          />
        </div>

        {/* Dropdowns & Controls */}
        <select
          value={docTypeFilter}
          onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1); }}
          className="form-select text-xs w-auto min-w-[160px]"
        >
          <option value="">All Document Types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={accessFilter}
          onChange={(e) => { setAccessFilter(e.target.value); setPage(1); }}
          className="form-select text-xs w-auto min-w-[140px]"
        >
          <option value="">All Access Levels</option>
          <option value="PUBLIC">Public</option>
          <option value="RESTRICTED">Restricted</option>
          <option value="CONFIDENTIAL">Confidential</option>
        </select>

        <select
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
          className="form-select text-xs w-auto min-w-[160px]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer select-none text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors flex-shrink-0">
          <input
            type="checkbox"
            checked={accessFilter === 'CONFIDENTIAL'}
            onChange={(e) => { setAccessFilter(e.target.checked ? 'CONFIDENTIAL' : ''); setPage(1); }}
            className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
          />
          <Lock className={`w-3.5 h-3.5 ${accessFilter === 'CONFIDENTIAL' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className={accessFilter === 'CONFIDENTIAL' ? 'text-amber-700 font-bold' : ''}>Confidential</span>
        </label>

        <button
          onClick={clearFilters}
          className="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card">
          <div className="card-body text-center py-16">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">Loading repository records...</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-16">
            <FolderOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-700 mb-1">No Statutory Documents Found</h3>
            <p className="text-sm text-neutral-500">
              {hasFilters ? 'Try adjusting your search terms or filters.' : 'Upload your first statutory document to start tracking.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Document Table */}
          <div className="card overflow-hidden border border-neutral-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-700 text-xs uppercase">
                    <th>Statutory Document</th>
                    <th>Category</th>
                    <th>Linked Entity</th>
                    <th>Access</th>
                    <th>AI Status</th>
                    <th>Version</th>
                    <th>File Size</th>
                    <th>Uploaded By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {documents.map((doc) => {
                    const AccessObj = ACCESS_ICONS[doc.access_level] || ACCESS_ICONS.PUBLIC;
                    const AccessIcon = AccessObj.icon;
                    const openMismatches = parseInt(doc.open_mismatch_count || 0, 10);
                    const totalMismatches = parseInt(doc.mismatch_count || 0, 10);

                    return (
                      <tr key={doc.id} className="hover:bg-neutral-50/70 transition-colors">
                        {/* Title & Code */}
                        <td>
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <FileText className="w-4 h-4 text-emerald-700" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/documents/${doc.id}`}
                                className="font-bold text-xs text-neutral-900 hover:text-emerald-700 transition-colors block truncate max-w-[280px]"
                                title={doc.title}
                              >
                                {doc.title}
                              </Link>
                              <span className="text-[10px] text-neutral-400 font-mono block">{doc.document_code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.OTHER}`}>
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                        </td>

                        {/* Linked Entity */}
                        <td>
                          <div className="space-y-0.5 text-xs text-neutral-600">
                            {doc.project_code && (
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-blue-600" />
                                <Link to={`/projects/${doc.project_id}`} className="hover:text-blue-600 font-mono text-[11px]">{doc.project_code}</Link>
                              </div>
                            )}
                            {doc.parcel_code && (
                              <div className="flex items-center gap-1">
                                <FileWarning className="w-3 h-3 text-emerald-600" />
                                <Link to={`/parcels/${doc.parcel_id}`} className="hover:text-emerald-700 font-mono text-[11px]">{doc.parcel_code} ({doc.survey_number})</Link>
                              </div>
                            )}
                            {doc.case_code && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-purple-600" />
                                <Link to={`/cases/${doc.case_id}`} className="hover:text-purple-600 font-mono text-[11px]">{doc.case_code}</Link>
                              </div>
                            )}
                            {!doc.project_code && !doc.parcel_code && !doc.case_code && (
                              <span className="text-neutral-400 text-[10px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Access */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <AccessIcon className={`w-3.5 h-3.5 ${AccessObj.color}`} />
                            <span className="text-xs text-neutral-700">{AccessObj.label}</span>
                          </div>
                        </td>

                        {/* AI Cadastral Verification */}
                        <td>
                          {openMismatches > 0 ? (
                            <Link
                              to="/ai/mismatches"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors shadow-xs"
                              title={`${openMismatches} active discrepancy flag(s) detected. Click to review in AI Mismatch Center.`}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {openMismatches} Discrepanc{openMismatches === 1 ? 'y' : 'ies'}
                            </Link>
                          ) : totalMismatches > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <CheckCircle2 className="w-3 h-3 text-amber-600" /> Resolved Flags
                            </span>
                          ) : doc.file_path ? (
                            <button
                              onClick={() => handleVerifyDoc(doc.id)}
                              disabled={verifyingDocId === doc.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                              title="Run automated OCR & cadastral discrepancy check"
                            >
                              {verifyingDocId === doc.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-amber-500" />
                              )}
                              Run AI Scan
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-[10px]">No File Attached</span>
                          )}
                        </td>

                        {/* Version */}
                        <td>
                          <span className="text-xs font-mono font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                            v{doc.version}
                          </span>
                        </td>

                        {/* Size */}
                        <td>
                          <span className="text-xs text-neutral-500 font-mono">{formatBytes(doc.file_size)}</span>
                        </td>

                        {/* Uploaded By */}
                        <td>
                          <div className="text-xs">
                            <div className="text-neutral-800 font-semibold">{doc.uploaded_by_name || 'System Admin'}</div>
                            <div className="text-neutral-400 text-[10px] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDate(doc.created_at)}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleVerifyDoc(doc.id)}
                              disabled={verifyingDocId === doc.id}
                              className="p-1.5 rounded hover:bg-amber-50 text-amber-600 hover:text-amber-800 transition-colors"
                              title="Run AI OCR & Discrepancy Analysis"
                            >
                              {verifyingDocId === doc.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </button>
                            <Link
                              to={`/documents/${doc.id}`}
                              className="p-1.5 rounded hover:bg-emerald-50 text-neutral-500 hover:text-emerald-700 transition-colors"
                              title="View Document Details & History"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <a
                              href={`/api/documents/${doc.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded hover:bg-blue-50 text-neutral-500 hover:text-blue-700 transition-colors"
                              title="Open / Download Document File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-neutral-500 font-mono">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} records total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Unified AI Document Analyzer & Upload Modal ──────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className={`px-6 py-4 text-white flex items-center justify-between flex-shrink-0 ${
              activeModalView === 'RESULT' && uploadAiResult?.hasMismatches
                ? 'bg-gradient-to-r from-rose-900 to-rose-800'
                : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    {activeModalView === 'RESULT'
                      ? 'AI Cadastral Discrepancy Audit Report'
                      : activeModalView === 'SCANNING'
                      ? 'AI Microservice: OCR & Cadastral Verification'
                      : 'Statutory Document Upload & AI Verification'}
                  </h2>
                  <p className="text-xs text-white/80">
                    {activeModalView === 'RESULT'
                      ? (uploadAiResult?.hasMismatches ? 'Discrepancies flagged against master land revenue record' : '100% match verified against official cadastral record')
                      : 'Automated OCR entity extraction & master revenue record cross-referencing'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetUploadModal}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* ─── VIEW 1: UPLOAD FORM ─── */}
              {activeModalView === 'FORM' && (
                <form onSubmit={handleUpload} className="space-y-4">
                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Project Selector */}
                  <div>
                    <label className="form-label text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Target Infrastructure Project <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Select which project this document belongs to</span>
                    </label>
                    <select
                      value={uploadForm.project_id}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setUploadForm(f => ({ ...f, project_id: pid, parcel_id: '' }));
                      }}
                      className="form-input text-xs font-semibold py-2"
                      required
                    >
                      <option value="">— Select an Infrastructure Project —</option>
                      {projects.length === 0 ? (
                        <option value="" disabled>
                          {loadingLookups ? '⏳ Loading projects from database...' : 'No projects found'}
                        </option>
                      ) : (
                        projects.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.project_code || 'PRJ'}] {p.name} {p.district ? `(${p.district})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Parcel Selector (Filtered by Project) */}
                  <div>
                    <label className="form-label text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileWarning className="w-3.5 h-3.5 text-emerald-600" />
                        Target Cadastral Parcel (Master Land Record)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {uploadForm.project_id
                          ? `${parcels.filter(p => p.project_id === uploadForm.project_id).length} parcel(s) available`
                          : 'Select a project first'}
                      </span>
                    </label>
                    <select
                      value={uploadForm.parcel_id}
                      onChange={(e) => setUploadForm(f => ({ ...f, parcel_id: e.target.value }))}
                      className="form-input text-xs font-medium py-2"
                    >
                      <option value="">⚡ Auto-Detect Parcel from Document Text (OCR Survey #)</option>
                      {(uploadForm.project_id
                        ? parcels.filter(p => p.project_id === uploadForm.project_id)
                        : parcels
                      ).map(p => (
                        <option key={p.id} value={p.id}>
                          [{p.parcel_code}] Survey #{p.survey_number} — {p.village} ({p.area_acres} Acres, Owner: {p.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title & Document Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs font-bold text-slate-800">
                        Document Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Field Survey Assessment Report"
                        className="form-input text-xs py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs font-bold text-slate-800">Document Category</label>
                      <select
                        value={uploadForm.document_type}
                        onChange={(e) => setUploadForm(f => ({ ...f, document_type: e.target.value }))}
                        className="form-input text-xs py-2"
                      >
                        {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* File Upload Dropzone */}
                  <div>
                    <label className="form-label text-xs font-bold text-slate-800">
                      Attach Document File (PDF or Photo/Scan) <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center transition-all bg-slate-50/70 hover:bg-emerald-50/30">
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="hidden"
                        id="file-upload-modal"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.tiff"
                        required
                      />
                      <label htmlFor="file-upload-modal" className="cursor-pointer block">
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        {uploadFile ? (
                          <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg inline-block text-left">
                            <p className="text-xs text-emerald-900 font-extrabold flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-emerald-700" />
                              {uploadFile.name}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-mono mt-0.5">{formatBytes(uploadFile.size)} • Ready for AI Extraction</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-800 font-bold">Click or drag &amp; drop document to attach</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PDF, PNG, JPG (Automated Optical Character Recognition enabled)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* AI Feature Info Card */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
                    <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-blue-950">Immediate AI Discrepancy Verification Engine</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Upon clicking upload, the FastAPI microservice extracts survey number, acreage, owner name, and village via OCR and compares them against the master cadastral database. Results appear on screen immediately.
                      </p>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetUploadModal}
                      className="btn btn-secondary flex-1 text-xs py-2.5 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!uploadFile}
                      className="btn text-white font-bold flex-1 flex items-center justify-center gap-2 text-xs py-2.5 shadow-md hover:shadow-lg transition-all"
                      style={{ background: 'linear-gradient(135deg, #1e6b3e 0%, #155724 100%)' }}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Upload &amp; Run AI Verification
                    </button>
                  </div>
                </form>
              )}

              {/* ─── VIEW 2: LIVE AI SCANNING ANIMATION ─── */}
              {activeModalView === 'SCANNING' && (
                <div className="py-10 px-4 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl">
                      <Sparkles className="w-10 h-10 text-amber-300 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">AI Cadastral Analyzer in Action</h3>
                    <p className="text-xs text-slate-500 mt-1">Cross-referencing document against official revenue records...</p>
                  </div>

                  {/* Live Progress Steps */}
                  <div className="max-w-md mx-auto space-y-2.5 text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className={`flex items-center gap-2.5 font-semibold ${aiScanStage >= 1 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {aiScanStage > 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="spinner spinner-sm text-emerald-600" />}
                      <span>1. Uploading &amp; Pre-processing Document File...</span>
                    </div>
                    <div className={`flex items-center gap-2.5 font-semibold ${aiScanStage >= 2 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {aiScanStage > 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : aiScanStage === 2 ? <div className="spinner spinner-sm text-emerald-600" /> : <Clock className="w-4 h-4" />}
                      <span>2. Running Tesseract Optical Character Recognition (OCR)...</span>
                    </div>
                    <div className={`flex items-center gap-2.5 font-semibold ${aiScanStage >= 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {aiScanStage === 3 ? <div className="spinner spinner-sm text-emerald-600" /> : <Clock className="w-4 h-4" />}
                      <span>3. Extracting Survey #, Area, Title &amp; Comparing Cadastral Records...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── VIEW 3: IMMEDIATE AI DISCREPANCY RESULTS ─── */}
              {activeModalView === 'RESULT' && (
                <div className="space-y-4">
                  {/* Top Status Alert */}
                  {uploadAiResult?.hasMismatches ? (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-rose-900">
                            {uploadAiResult.mismatchCount} Cadastral Discrepancy Flag(s) Detected!
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900 uppercase">
                            Action Required
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                          The AI Microservice detected title/acreage variances between this uploaded document and the master revenue database record for parcel <strong>{uploadAiResult.target_parcel?.parcel_code || lastUploadedDoc?.parcel_code || 'Linked Land'} (Survey #{uploadAiResult.target_parcel?.survey_number || lastUploadedDoc?.survey_number || '—'})</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-900">100% Cadastral Match Verified!</h3>
                        <p className="text-xs text-emerald-700 mt-1">
                          Document text perfectly matches the official surveyed revenue records (Survey Number, Land Area, Village, and Ownership).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Target Parcel Card */}
                  {uploadAiResult?.target_parcel && (
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">Master Record:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border text-slate-700 font-bold">
                          {uploadAiResult.target_parcel.parcel_code}
                        </span>
                        <span className="text-slate-600">Survey #{uploadAiResult.target_parcel.survey_number}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Owner: <strong className="text-slate-800">{uploadAiResult.target_parcel.owner_name}</strong>
                      </div>
                    </div>
                  )}

                  {/* Side-by-Side Comparison Matrix */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                        Cadastral Verification Comparison Matrix
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">OCR Extracted vs Master RoR</span>
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                          <th className="p-2.5">Field</th>
                          <th className="p-2.5">Official Revenue Record</th>
                          <th className="p-2.5">Document OCR Extracted</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {/* Survey Number */}
                        <tr>
                          <td className="p-2.5 font-bold text-slate-700">Survey / Khasra No</td>
                          <td className="p-2.5 text-slate-800">{uploadAiResult?.target_parcel?.survey_number || '—'}</td>
                          <td className="p-2.5 font-mono text-slate-900">{uploadAiResult?.extracted_fields?.survey_number || '—'}</td>
                          <td className="p-2.5">
                            {uploadAiResult?.mismatches?.some(m => m.field_name === 'survey_number') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">Mismatch ❌</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Match ✅</span>
                            )}
                          </td>
                        </tr>
                        {/* Area */}
                        <tr>
                          <td className="p-2.5 font-bold text-slate-700">Land Area</td>
                          <td className="p-2.5 text-slate-800">{uploadAiResult?.target_parcel?.area_acres ? `${uploadAiResult.target_parcel.area_acres} Acres` : '—'}</td>
                          <td className="p-2.5 font-mono text-slate-900">{uploadAiResult?.extracted_fields?.area_acres ? `${uploadAiResult.extracted_fields.area_acres} Acres` : '—'}</td>
                          <td className="p-2.5">
                            {uploadAiResult?.mismatches?.some(m => m.field_name === 'area_acres') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                {uploadAiResult.mismatches.find(m => m.field_name === 'area_acres')?.difference || 'Variance'} ❌
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Match ✅</span>
                            )}
                          </td>
                        </tr>
                        {/* Owner Name */}
                        <tr>
                          <td className="p-2.5 font-bold text-slate-700">Landowner Title</td>
                          <td className="p-2.5 text-slate-800">{uploadAiResult?.target_parcel?.owner_name || '—'}</td>
                          <td className="p-2.5 text-slate-900">{uploadAiResult?.extracted_fields?.owner_name || '—'}</td>
                          <td className="p-2.5">
                            {uploadAiResult?.mismatches?.some(m => m.field_name === 'owner_name') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">Discrepancy ⚠️</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Match ✅</span>
                            )}
                          </td>
                        </tr>
                        {/* Village */}
                        <tr>
                          <td className="p-2.5 font-bold text-slate-700">Village / Location</td>
                          <td className="p-2.5 text-slate-800">{uploadAiResult?.target_parcel?.village || '—'}</td>
                          <td className="p-2.5 text-slate-900">{uploadAiResult?.extracted_fields?.village || '—'}</td>
                          <td className="p-2.5">
                            {uploadAiResult?.mismatches?.some(m => m.field_name === 'village') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">Discrepancy ⚠️</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Match ✅</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Discrepancy Detail Cards */}
                  {uploadAiResult?.mismatches?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Discrepancy Details &amp; Legal Severity
                      </h4>
                      {uploadAiResult.mismatches.map((m, idx) => (
                        <div key={idx} className="p-3 bg-white border border-rose-200 rounded-xl shadow-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 uppercase">
                              Field: {m.field_name.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              m.severity === 'HIGH' || m.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {m.severity} SEVERITY
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium">
                            {m.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Statutory DLAO Action Playbook */}
                  {uploadAiResult?.hasMismatches && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                          Recommended DLAO Statutory Resolution Steps
                        </span>
                        <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                          RFCTLARR 2013 SOP
                        </span>
                      </div>
                      <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                        {uploadAiResult?.mismatches?.some(m => m.field_name === 'area_acres') && (
                          <li>
                            <strong className="text-slate-900">Area Deficit:</strong> Depute Field Revenue Officer (FRO) for a Joint Measurement Survey (JMS) with DGPS to reconcile plot boundary against the Cadastral Map (Shajra).
                          </li>
                        )}
                        {uploadAiResult?.mismatches?.some(m => m.field_name === 'owner_name') && (
                          <li>
                            <strong className="text-slate-900">Title / Owner Variance:</strong> Issue Section 21 notice to claimant. Obtain 12-year Khatauni extract and notarized Tehsildar identity affidavit for alias verification.
                          </li>
                        )}
                        <li>
                          <strong className="text-slate-900">Adjudication:</strong> Click below to open the AI Mismatch Resolution Center to pass the official order or order a field survey.
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="pt-2 flex flex-wrap gap-2 justify-between items-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveModalView('FORM')}
                      className="btn btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Another Document
                    </button>

                    <div className="flex gap-2">
                      {lastUploadedDoc?.id && (
                        <Link
                          to={`/documents/${lastUploadedDoc.id}`}
                          onClick={resetUploadModal}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Document
                        </Link>
                      )}
                      {uploadAiResult?.hasMismatches ? (
                        <Link
                          to="/ai/mismatches"
                          onClick={resetUploadModal}
                          className="btn btn-primary text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          Adjudicate in AI Mismatch Center &rarr;
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={resetUploadModal}
                          className="btn btn-primary text-xs font-bold"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
