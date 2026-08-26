import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, ArrowLeft, Download, Upload, Edit3, Trash2,
  Shield, ShieldAlert, ShieldCheck, Clock, User, Layers,
  FileWarning, History, Eye, CheckCircle2, AlertCircle, X, Save,
  ExternalLink, FileCheck, Building2, HardDrive,
} from 'lucide-react';

const DOC_TYPE_LABELS = {
  LAND_RECORD: 'Land Record / ROR',
  SURVEY_REPORT: 'Survey Report',
  NOTIFICATION: 'Gazette Notification',
  AWARD_ORDER: 'Award Order',
  COMPENSATION_DOC: 'Compensation Document',
  POSSESSION_DOC: 'Possession Certificate',
  RR_EVIDENCE: 'R&R Evidence',
  OTHER: 'Other Document',
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

const ACCESS_META = {
  PUBLIC: { icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Public Access' },
  RESTRICTED: { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Restricted (Officers)' },
  CONFIDENTIAL: { icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', label: 'Confidential (Secretariat)' },
};

export default function DocumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // New version upload
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [versionFile, setVersionFile] = useState(null);
  const [changeNotes, setChangeNotes] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);

  const fetchDocument = async () => {
    setLoading(true);
    setError('');
    setImgError(false);
    try {
      const res = await api.get(`/documents/${id}`);
      setDoc(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocument(); }, [id]);

  const handleEdit = () => {
    setEditForm({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type,
      access_level: doc.access_level,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/documents/${doc.id}`, editForm);
      setEditing(false);
      fetchDocument();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleVersionUpload = async (e) => {
    e.preventDefault();
    if (!versionFile) return;
    setUploadingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      if (changeNotes) formData.append('change_notes', changeNotes);
      await api.post(`/documents/${doc.id}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowVersionUpload(false);
      setVersionFile(null);
      setChangeNotes('');
      fetchDocument();
    } catch (err) {
      setError(err.response?.data?.error || 'Version upload failed.');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this statutory document? This action will be logged in the audit trail.')) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      window.history.back();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center py-16">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Loading statutory document...</p>
        </div>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="card">
        <div className="card-body text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-800 mb-1">Record Error</h3>
          <p className="text-sm text-neutral-500">{error}</p>
          <Link to="/documents" className="btn btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  const AccessObj = ACCESS_META[doc.access_level] || ACCESS_META.PUBLIC;
  const AccessIcon = AccessObj.icon;
  const canEdit = ['DLAO', 'PIA', 'SGA', 'ADMIN'].includes(user?.role);
  const canDelete = ['SGA', 'ADMIN'].includes(user?.role);
  const isImage = doc.mime_type?.startsWith('image/') && !imgError;
  const isPdf = doc.mime_type === 'application/pdf' || doc.file_name?.endsWith('.pdf');

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link to="/documents" className="text-xs text-neutral-500 hover:text-emerald-700 flex items-center gap-1 w-fit font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Statutory Repository
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="card mb-6 border border-neutral-200 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                {editing ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="form-input text-base font-bold mb-1"
                  />
                ) : (
                  <h1 className="text-xl font-extrabold text-neutral-900">{doc.title}</h1>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-neutral-400 font-bold">{doc.document_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.OTHER}`}>
                    {editing ? (
                      <select
                        value={editForm.document_type}
                        onChange={(e) => setEditForm(f => ({ ...f, document_type: e.target.value }))}
                        className="bg-transparent border-none text-xs p-0 font-bold"
                      >
                        {Object.entries(DOC_TYPE_LABELS).map(([k, l]) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </select>
                    ) : (
                      DOC_TYPE_LABELS[doc.document_type] || doc.document_type
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${AccessObj.bg} ${AccessObj.color}`}>
                    <AccessIcon className="w-3 h-3" />
                    {editing ? (
                      <select
                        value={editForm.access_level}
                        onChange={(e) => setEditForm(f => ({ ...f, access_level: e.target.value }))}
                        className="bg-transparent border-none text-xs p-0 font-bold"
                      >
                        <option value="PUBLIC">Public</option>
                        <option value="RESTRICTED">Restricted</option>
                        <option value="CONFIDENTIAL">Confidential</option>
                      </select>
                    ) : (
                      AccessObj.label
                    )}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-1.5 py-0.5 rounded font-bold">
                    v{doc.version}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="btn btn-secondary text-xs flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn text-white font-bold text-xs flex items-center gap-1" style={{ background: '#1e6b3e' }}>
                    {saving ? <span className="spinner border-t-white" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                  </button>
                </>
              ) : (
                <>
                  <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                  <button onClick={() => setShowVersionUpload(true)} className="btn btn-secondary text-xs flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> New Version
                  </button>
                  {canEdit && (
                    <button onClick={handleEdit} className="btn btn-secondary text-xs flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Metadata
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} className="btn btn-secondary text-xs flex items-center gap-1 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Details & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Document Summary & Description
              </h3>
            </div>
            <div className="card-body">
              {editing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="form-input text-xs"
                  rows={4}
                />
              ) : (
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {doc.description || 'No detailed description recorded for this document.'}
                </p>
              )}
            </div>
          </div>

          {/* Document Preview Box */}
          <div className="card border border-neutral-200 shadow-sm">
            <div className="card-header border-b border-neutral-100 flex items-center justify-between">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-700" />
                Document Viewer & Preview
              </h3>
              <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-bold">
                Open in New Tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="card-body p-4">
              {isImage ? (
                <img
                  src={`/api/documents/${doc.id}/file`}
                  alt={doc.title}
                  onError={() => setImgError(true)}
                  className="max-w-full h-auto rounded-lg border border-neutral-200 mx-auto max-h-[500px] object-contain"
                />
              ) : (
                <div className="space-y-3">
                  <iframe
                    src={`/api/documents/${doc.id}/file`}
                    title={doc.title}
                    className="w-full h-[520px] border border-neutral-200 rounded-lg bg-neutral-50"
                  />
                  <div className="flex items-center justify-between text-xs text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Official PDF Document Stream
                    </span>
                    <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs py-1 px-3">
                      Download PDF ({formatBytes(doc.file_size)})
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" /> Version History & Revisions
              </h3>
            </div>
            <div className="card-body">
              {doc.versions && doc.versions.length > 0 ? (
                <div className="space-y-3">
                  {doc.versions.map((v) => (
                    <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-800 font-mono">
                        v{v.version}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900">{v.file_name || 'Statutory File'}</span>
                          <span className="text-[10px] font-mono text-neutral-500">{formatBytes(v.file_size)}</span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-0.5">{v.change_notes || 'Initial record upload'}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {v.uploaded_by_name || 'Officer'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDateTime(v.created_at)}
                          </span>
                        </div>
                      </div>
                      {v.file_path && (
                        <a href={v.file_path} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-emerald-50 text-neutral-500 hover:text-emerald-700">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 text-center py-4">No version history available.</p>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Statutory Audit Trail
              </h3>
            </div>
            <div className="card-body">
              {doc.auditTrail && doc.auditTrail.length > 0 ? (
                <div className="space-y-2">
                  {doc.auditTrail.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-neutral-50 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="font-bold text-neutral-800">{entry.action?.replace(/_/g, ' ')}</span>
                        <span className="text-neutral-500">by</span>
                        <span className="text-neutral-700 font-semibold">{entry.performed_by_name || 'System Admin'}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">{formatDateTime(entry.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 text-center py-4">No audit events recorded for this document.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Linked Entities & File Info Sidebar */}
        <div className="space-y-6">
          {/* File Info */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide">
                File Details
              </h3>
            </div>
            <div className="card-body space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">File Name</span>
                <span className="font-bold text-neutral-900 truncate max-w-[170px]" title={doc.file_name}>{doc.file_name || 'Statutory PDF'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">File Size</span>
                <span className="font-mono text-neutral-800">{formatBytes(doc.file_size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">MIME Format</span>
                <span className="font-mono text-[11px] text-neutral-600">{doc.mime_type || 'application/pdf'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Latest Version</span>
                <span className="font-mono font-bold text-emerald-700">v{doc.version}</span>
              </div>
            </div>
          </div>

          {/* Linked Entities */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Linked System Entities
              </h3>
            </div>
            <div className="card-body space-y-3">
              {doc.project_code ? (
                <Link to={`/projects/${doc.project_id}`} className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200">
                  <Building2 className="w-4 h-4 text-blue-700 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold text-blue-900 block">{doc.project_code}</span>
                    <span className="text-[10px] text-blue-700 line-clamp-1">{doc.project_name}</span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-neutral-400 text-xs">
                  <Layers className="w-4 h-4" />
                  <span>No infrastructure project linked</span>
                </div>
              )}

              {doc.parcel_code ? (
                <Link to={`/parcels/${doc.parcel_id}`} className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200">
                  <FileWarning className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold text-emerald-900 block">{doc.parcel_code}</span>
                    <span className="text-[10px] text-emerald-700">Survey {doc.survey_number} — {doc.village}</span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-neutral-400 text-xs">
                  <FileWarning className="w-4 h-4" />
                  <span>No land parcel linked</span>
                </div>
              )}

              {doc.case_code ? (
                <Link to={`/cases/${doc.case_id}`} className="flex items-center gap-2.5 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200">
                  <FileText className="w-4 h-4 text-purple-700 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold text-purple-900 block">{doc.case_code}</span>
                    <span className="text-[10px] text-purple-700">Stage: {doc.current_stage?.replace(/_/g, ' ')}</span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 text-neutral-400 text-xs">
                  <FileText className="w-4 h-4" />
                  <span>No workflow case linked</span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Info */}
          <div className="card">
            <div className="card-header border-b border-neutral-100">
              <h3 className="card-title text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Provenance & Metadata
              </h3>
            </div>
            <div className="card-body space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Uploaded By</span>
                <span className="font-semibold text-neutral-900">{doc.uploaded_by_name || 'System Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Officer Designation</span>
                <span className="font-semibold text-neutral-900">{doc.uploaded_by_role || 'DLAO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Upload Date</span>
                <span className="text-neutral-700 font-mono text-[11px]">{formatDateTime(doc.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Last Modified</span>
                <span className="text-neutral-700 font-mono text-[11px]">{formatDateTime(doc.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── New Version Upload Modal ───────────────────────────── */}
      {showVersionUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-neutral-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                <h2 className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  Upload New Document Revision
                </h2>
                <button onClick={() => setShowVersionUpload(false)} className="p-1 rounded hover:bg-neutral-100 text-neutral-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVersionUpload} className="space-y-4">
                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Change Notes / Reason for Revision</label>
                  <input
                    type="text"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="e.g. Corrected boundary measurements in Section 11 notice"
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="form-label text-xs font-bold text-neutral-700">Attach Revision File <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-neutral-200 rounded-lg p-4 text-center bg-neutral-50/50">
                    <input
                      type="file"
                      onChange={(e) => setVersionFile(e.target.files[0])}
                      className="hidden"
                      id="version-file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.tiff,.txt,.csv"
                    />
                    <label htmlFor="version-file" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                      {versionFile ? (
                        <p className="text-xs font-bold text-emerald-800">{versionFile.name}</p>
                      ) : (
                        <p className="text-xs text-neutral-600 font-semibold">Click to choose revised PDF or document</p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowVersionUpload(false)} className="btn btn-secondary flex-1 text-xs">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingVersion || !versionFile}
                    className="btn text-white font-bold flex-1 flex items-center justify-center gap-2 text-xs"
                    style={{ background: '#1e6b3e' }}
                  >
                    {uploadingVersion ? <><span className="spinner border-t-white" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload Revision v{doc.version + 1}</>}
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
