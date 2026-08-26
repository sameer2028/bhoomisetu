import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  FileText, Upload, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Download, Shield, ShieldAlert, ShieldCheck, Clock, X,
  FolderOpen, Layers, FileWarning, AlertCircle, FileCheck,
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
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [projRes, parcRes, caseRes] = await Promise.all([
          api.get('/projects', { params: { limit: 100 } }),
          api.get('/parcels', { params: { limit: 100 } }),
          api.get('/workflow', { params: { limit: 100 } }),
        ]);
        setProjects(projRes.data.data || []);
        setParcels(parcRes.data.data || []);
        setCases(caseRes.data.data || []);
      } catch { /* ignore */ }
    }
    fetchLookups();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError('');
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

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUpload(false);
      setUploadForm({ title: '', description: '', document_type: 'OTHER', access_level: 'PUBLIC', project_id: '', parcel_id: '', case_id: '' });
      setUploadFile(null);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-700" />
            Statutory Document Repository
          </h1>
          <p className="page-subtitle">
            Centralized e-Governance storage for Gazette notifications, SIA reports, Award orders, and Land Records
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn text-white font-bold flex items-center gap-2"
          style={{ background: '#1e6b3e' }}
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Active Pre-filter Indicator */}
      {(projectFilter || parcelFilter || caseFilter) && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-700" />
            <span>
              Pre-filtered for specific entity: <strong>{projectFilter ? 'Project' : parcelFilter ? 'Parcel' : 'Workflow Case'}</strong>
            </span>
          </div>
          <button onClick={clearFilters} className="text-emerald-700 hover:underline font-bold">
            Show All Documents
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by title, code, survey number, file name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10 text-sm"
              />
            </div>

            {/* Filter Toggles */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 text-sm`}
              >
                <Filter className="w-4 h-4" />
                Filters {hasFilters ? '•' : ''}
              </button>
              {hasFilters && (
                <button onClick={clearFilters} className="btn btn-secondary flex items-center gap-1 text-sm text-red-600">
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-100">
              <div>
                <label className="form-label text-xs font-bold">Document Type</label>
                <select
                  value={docTypeFilter}
                  onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1); }}
                  className="form-input text-xs"
                >
                  <option value="">All Document Types</option>
                  {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-bold">Access Classification</label>
                <select
                  value={accessFilter}
                  onChange={(e) => { setAccessFilter(e.target.value); setPage(1); }}
                  className="form-input text-xs"
                >
                  <option value="">All Access Levels</option>
                  <option value="PUBLIC">Public Access</option>
                  <option value="RESTRICTED">Restricted (Officer Only)</option>
                  <option value="CONFIDENTIAL">Confidential (Secretariat)</option>
                </select>
              </div>

              <div>
                <label className="form-label text-xs font-bold">Filter by Infrastructure Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
                  className="form-input text-xs"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
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
                  disabled={page >= meta.totalPages}
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Upload Modal ─────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                <h2 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  Upload Statutory Document
                </h2>
                <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-neutral-100 text-neutral-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Document Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Section 4(1) Gazette Notification"
                    className="form-input text-xs"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of statutory content..."
                    className="form-input text-xs"
                    rows={2}
                  />
                </div>

                {/* Type & Access */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-xs font-bold text-neutral-700">Document Category</label>
                    <select
                      value={uploadForm.document_type}
                      onChange={(e) => setUploadForm(f => ({ ...f, document_type: e.target.value }))}
                      className="form-input text-xs"
                    >
                      {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs font-bold text-neutral-700">Access Classification</label>
                    <select
                      value={uploadForm.access_level}
                      onChange={(e) => setUploadForm(f => ({ ...f, access_level: e.target.value }))}
                      className="form-input text-xs"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="RESTRICTED">Restricted (Officers)</option>
                      <option value="CONFIDENTIAL">Confidential (Secretariat)</option>
                    </select>
                  </div>
                </div>

                {/* Link to Project */}
                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Link to Infrastructure Project</label>
                  <select
                    value={uploadForm.project_id}
                    onChange={(e) => setUploadForm(f => ({ ...f, project_id: e.target.value }))}
                    className="form-input text-xs"
                  >
                    <option value="">— Unlinked / General —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-xs font-bold text-neutral-700">Link to Parcel</label>
                    <select
                      value={uploadForm.parcel_id}
                      onChange={(e) => setUploadForm(f => ({ ...f, parcel_id: e.target.value }))}
                      className="form-input text-xs"
                    >
                      <option value="">— None —</option>
                      {parcels.map(p => (
                        <option key={p.id} value={p.id}>{p.parcel_code} ({p.survey_number})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs font-bold text-neutral-700">Link to Workflow Case</label>
                    <select
                      value={uploadForm.case_id}
                      onChange={(e) => setUploadForm(f => ({ ...f, case_id: e.target.value }))}
                      className="form-input text-xs"
                    >
                      <option value="">— None —</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.case_code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Attach Document File</label>
                  <div className="border-2 border-dashed border-neutral-200 rounded-lg p-4 text-center hover:border-emerald-400 transition-colors bg-neutral-50/50">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.tiff,.txt,.csv"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                      {uploadFile ? (
                        <p className="text-xs text-emerald-800 font-bold">{uploadFile.name} ({formatBytes(uploadFile.size)})</p>
                      ) : (
                        <>
                          <p className="text-xs text-neutral-700 font-semibold">Click to select PDF or image file</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Supports PDF, Word, Excel, PNG, JPG (Max 25 MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="btn btn-secondary flex-1 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="btn text-white font-bold flex-1 flex items-center justify-center gap-2 text-xs"
                    style={{ background: '#1e6b3e' }}
                  >
                    {uploading ? (
                      <><span className="spinner border-t-white" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Save Record</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
