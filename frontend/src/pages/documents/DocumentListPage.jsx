import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import DocumentUploadWizard from './DocumentUploadWizard';
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

  // Upload wizard
  const [showUpload, setShowUpload] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState(null);

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

  const handleVerifyDoc = async (docId) => {
    setVerifyingDocId(docId);
    try {
      await api.post(`/documents/${docId}/verify-ai`);
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.error || 'AI verification failed.');
    } finally {
      setVerifyingDocId(null);
    }
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
          onClick={() => setShowUpload(true)}
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
                    <th>Actions</th>
                    <th>Version</th>
                    <th>File Size</th>
                    <th>Uploaded By</th>
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
                          <span className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.OTHER}`}>
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                        </td>

                        {/* Linked Entity */}
                        <td className="whitespace-nowrap">
                          <div className="space-y-0.5 text-xs text-neutral-600">
                            {doc.project_code && (
                              <div className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                <Link to={`/projects/${doc.project_id}`} className="hover:text-blue-600 font-mono text-[11px]">{doc.project_code}</Link>
                              </div>
                            )}
                            {doc.parcel_code && (
                              <div className="flex items-center gap-1">
                                <FileWarning className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <Link to={`/parcels/${doc.parcel_id}`} className="hover:text-emerald-700 font-mono text-[11px]">{doc.parcel_code} {doc.survey_number && `(${doc.survey_number})`}</Link>
                              </div>
                            )}
                            {doc.case_code && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-purple-600 flex-shrink-0" />
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

      {/* ─── Unified AI Document Analyzer & Upload Wizard ──────────────── */}
      {showUpload && (
        <DocumentUploadWizard
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => fetchDocuments()}
        />
      )}
    </div>
  );
}
