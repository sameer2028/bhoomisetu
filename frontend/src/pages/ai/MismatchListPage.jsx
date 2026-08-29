import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import MismatchDetailModal from './MismatchDetailModal';
import RunCheckModal from './RunCheckModal';
import {
  Sparkles,
  Search,
  Building2,
  ChevronRight,
  Filter,
  AlertTriangle,
  FileText,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  Layers,
  HelpCircle,
  Eye,
} from 'lucide-react';
import PdfViewerModal from '../../components/documents/PdfViewerModal';

export default function MismatchListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialProjectId = searchParams.get('projectId') || '';

  const { hasRole } = useAuth();
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState(initialProjectId);
  const [projects, setProjects] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    total: 0,
    highCritical: 0,
    underReview: 0,
    resolved: 0,
    detected: 0,
  });

  // Modal States
  const [selectedMismatch, setSelectedMismatch] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRunCheckOpen, setIsRunCheckOpen] = useState(false);
  const [pdfPreviewDoc, setPdfPreviewDoc] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects?limit=100');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects dropdown:', err);
    }
  }, []);

  const fetchMismatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (projectIdFilter) params.project_id = projectIdFilter;

      const res = await api.get('/ai/mismatches', { params });
      setMismatches(res.data.data || []);
      if (res.data.meta?.summary) {
        setSummaryMetrics(res.data.meta.summary);
      }
    } catch (err) {
      console.error('Failed to fetch AI mismatches:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, severityFilter, projectIdFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMismatches();
  }, [fetchMismatches]);

  const handleOpenDetail = (mismatch) => {
    setSelectedMismatch(mismatch);
    setIsDetailOpen(true);
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="badge bg-purple-100 text-purple-900 border border-purple-200 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />Critical</span>;
      case 'HIGH':
        return <span className="badge bg-rose-100 text-rose-800 border border-rose-200 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-rose-600" />High</span>;
      case 'MEDIUM':
        return <span className="badge bg-amber-100 text-amber-800 border border-amber-200 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Medium</span>;
      case 'LOW':
        return <span className="badge bg-blue-100 text-blue-800 border border-blue-200 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Low</span>;
      default:
        return <span className="badge bg-slate-100 text-slate-700">{sev}</span>;
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'DETECTED':
        return <span className="badge badge-proposed"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Detected</span>;
      case 'UNDER_REVIEW':
        return <span className="badge badge-under-acquisition"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Under Review</span>;
      case 'RESOLVED':
        return <span className="badge badge-acquired"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Resolved</span>;
      case 'FALSE_POSITIVE':
        return <span className="badge bg-slate-100 text-slate-700 border border-slate-200">False Positive</span>;
      default:
        return <span className="badge bg-slate-100 text-slate-700">{st}</span>;
    }
  };

  const fieldLabelMap = {
    area_acres: 'Area (Acres)',
    survey_number: 'Survey No.',
    village: 'Village Name',
    owner_name: 'Owner Title',
    district: 'District',
  };

  const canRunCheck = hasRole('DLAO', 'PIA', 'FRO', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> Cadastral AI Discrepancy Detection
          </h1>
          <p className="page-subtitle">
            Automated document OCR extraction vs. revenue land record cross-matching &amp; decision support
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canRunCheck && (
            <button
              onClick={() => setIsRunCheckOpen(true)}
              className="btn btn-primary text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Run Document Check
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Discrepancies</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{summaryMetrics.total}</div>
          <span className="text-[11px] text-slate-400 font-medium">Logged across statutory documents</span>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High / Critical Flags</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700">{summaryMetrics.highCritical}</div>
          <span className="text-[11px] text-rose-600 font-semibold">Priority verification required</span>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Under Field Review</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-700">{summaryMetrics.underReview}</div>
          <span className="text-[11px] text-slate-400 font-medium">Assigned to revenue officers</span>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved / Cleared</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{summaryMetrics.resolved}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Audited and closed</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by parcel code (e.g. P-101), survey no., village, or field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input form-input-search text-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Project Filter */}
          <select
            value={projectIdFilter}
            onChange={(e) => setProjectIdFilter(e.target.value)}
            className="form-select text-xs w-full sm:w-56"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.project_code}] {p.name}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="form-select text-xs w-full sm:w-40"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select text-xs w-full sm:w-44"
          >
            <option value="">All Statuses</option>
            <option value="DETECTED">Detected</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>
        </div>
      </div>

      {/* Discrepancy Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Scanning and fetching document discrepancies...</p>
        </div>
      ) : mismatches.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Discrepancies Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || statusFilter || severityFilter || projectIdFilter
              ? 'No discrepancies match your filter criteria. Try clearing or adjusting filters.'
              : 'All statutory documents match master cadastral revenue records.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-card border border-slate-200/90">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel Code</th>
                  <th>Flagged Field</th>
                  <th>Official Value vs Extracted Value</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Detected Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mismatches.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(m)}
                  >
                    {/* Parcel Code */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/parcels/${m.parcel_id}`}
                        className="font-mono font-bold text-blue-900 hover:text-blue-700 hover:underline text-xs block"
                      >
                        {m.parcel_code}
                      </Link>
                      <span className="text-[10.5px] text-slate-400 font-medium">Survey {m.survey_number}</span>
                    </td>

                    {/* Field */}
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {fieldLabelMap[m.field_name] || m.field_name}
                      </span>
                    </td>

                    {/* Official vs Extracted */}
                    <td className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 w-16">Official:</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[200px]">{m.official_value || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-amber-600 w-16">Extracted:</span>
                          <span className="font-bold text-amber-950 truncate max-w-[200px]">{m.extracted_value || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Severity */}
                    <td>{getSeverityBadge(m.severity)}</td>

                    {/* Status */}
                    <td>{getStatusBadge(m.status)}</td>

                    {/* Detected Date */}
                    <td className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      {m.detected_at
                        ? new Date(m.detected_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    {/* Action */}
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPdfPreviewDoc(m)}
                          className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 py-1 px-2"
                          title="Preview OCR extracted document in PDF viewer"
                        >
                          <Eye className="w-3 h-3 text-emerald-700" /> PDF
                        </button>
                        <button
                          onClick={() => handleOpenDetail(m)}
                          className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs font-semibold py-1 px-2.5"
                        >
                          View Record <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <MismatchDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        mismatch={selectedMismatch}
        onUpdated={() => fetchMismatches()}
      />

      {/* Run Check Modal */}
      <RunCheckModal
        isOpen={isRunCheckOpen}
        onClose={() => setIsRunCheckOpen(false)}
        onCheckCompleted={() => fetchMismatches()}
      />

      {/* PDF & OCR Viewer Modal */}
      <PdfViewerModal
        isOpen={!!pdfPreviewDoc}
        onClose={() => setPdfPreviewDoc(null)}
        documentId={pdfPreviewDoc?.document_id || 'sample-doc'}
        title={pdfPreviewDoc?.document_title || `Statutory Revenue Record (${pdfPreviewDoc?.parcel_code})`}
        docCode={pdfPreviewDoc?.document_code || 'DOC-NLA-2026'}
        ocrData={pdfPreviewDoc ? {
          parcel_code: pdfPreviewDoc.parcel_code,
          survey_number: pdfPreviewDoc.survey_number,
          field_name: pdfPreviewDoc.field_name,
          extracted_value: pdfPreviewDoc.extracted_value,
          official_value: pdfPreviewDoc.official_value,
          detected_variance: pdfPreviewDoc.difference,
          confidence_score: '98.4%',
          ocr_engine: 'PyMuPDF / Tesseract Vision',
        } : null}
      />
    </div>
  );
}
