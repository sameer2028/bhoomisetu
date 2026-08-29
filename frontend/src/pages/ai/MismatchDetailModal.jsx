import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Save,
  ArrowUpRight,
  Eye,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import PdfViewerModal from '../../components/documents/PdfViewerModal';

export default function MismatchDetailModal({ isOpen, onClose, mismatch, onUpdated }) {
  const [status, setStatus] = useState('DETECTED');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    if (mismatch) {
      setStatus(mismatch.status || 'DETECTED');
      setRemarks('');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [mismatch]);

  if (!isOpen || !mismatch) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.put(`/ai/mismatches/${mismatch.id}/status`, {
        status,
        remarks: remarks.trim() || undefined,
      });
      setSuccessMsg(`Marked as ${status.replace('_', ' ')}!`);
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 400);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="badge bg-purple-100 text-purple-900 border border-purple-300 font-bold text-[10px] py-0 px-1.5">Critical</span>;
      case 'HIGH':
        return <span className="badge bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] py-0 px-1.5">High</span>;
      case 'MEDIUM':
        return <span className="badge bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] py-0 px-1.5">Medium</span>;
      case 'LOW':
        return <span className="badge bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[10px] py-0 px-1.5">Low</span>;
      default:
        return <span className="badge bg-slate-100 text-slate-700 text-[10px] py-0 px-1.5">{sev}</span>;
    }
  };

  const fieldLabelMap = {
    area_acres: 'Land Area (Acres)',
    survey_number: 'Survey / Khasra No.',
    village: 'Village / Mauza',
    owner_name: 'Recorded Title Owner',
    district: 'Revenue District',
  };

  const fieldDisplayName = fieldLabelMap[mismatch.field_name] || mismatch.field_name?.replace('_', ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      {/* Invisible click-outside catcher with NO background/blur */}
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      {/* Floating Card Popup in size of form only */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-300 ring-1 ring-black/10 overflow-hidden flex flex-col pointer-events-auto my-auto animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">Document Discrepancy Verification</h3>
                {getSeverityBadge(mismatch.severity)}
              </div>
              <p className="text-[10px] text-slate-300">
                AI Cross-Check vs Land Record • {mismatch.parcel_code} (Survey {mismatch.survey_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-2 bg-slate-50/50">
          {successMsg && (
            <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-md text-[11px] font-semibold text-rose-800">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          {/* High-Clarity Difference Comparison Matrix */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field Comparison:</span>
                <span className="text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {fieldDisplayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfViewer(true)}
                className="btn btn-secondary btn-sm text-[10px] py-0.5 px-2 font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                title="Open full Side-by-Side PDF comparison"
              >
                <ArrowRightLeft className="w-3 h-3 text-indigo-600" /> Compare in PDF &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Official Record */}
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border-2 border-emerald-300 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Master RoR Record
                  </span>
                  <span className="badge bg-emerald-200/80 text-emerald-900 text-[8.5px] py-0 font-bold">Ground Truth</span>
                </div>
                <div className="text-xs font-black text-slate-900 break-words mt-1">
                  {mismatch.official_value || '—'}
                </div>
                <div className="text-[9.5px] text-emerald-700 font-semibold mt-0.5">
                  Official Revenue Record
                </div>
              </div>

              {/* Extracted Document Value */}
              <div className="p-2.5 rounded-lg bg-rose-50/80 border-2 border-rose-300 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-rose-600" /> Extracted From Doc
                  </span>
                  <span className="badge bg-rose-200/80 text-rose-900 text-[8.5px] py-0 font-bold">Flagged</span>
                </div>
                <div className="text-xs font-black text-rose-950 break-words mt-1">
                  {mismatch.extracted_value || '—'}
                </div>
                <div className="text-[9.5px] text-rose-700 font-bold mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                  <span>Variance: {mismatch.difference}</span>
                </div>
              </div>
            </div>

            {/* Difference Highlight Banner */}
            <div className="p-1.5 bg-amber-50 rounded-md border border-amber-200 flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                Detected Discrepancy:
              </span>
              <span className="font-mono font-black text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                {mismatch.difference}
              </span>
            </div>
          </div>

          {/* AI Plain Language Explanation */}
          <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200 text-xs">
            <h4 className="text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Automated Explanation
            </h4>
            <p className="text-slate-700 text-[11px] leading-snug">
              {mismatch.explanation}
            </p>
          </div>

          {/* Reference Links Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-1.5 bg-white rounded-md border border-slate-200 flex items-center justify-between">
              <div className="truncate pr-1">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Parcel</span>
                <span className="font-bold text-slate-800 font-mono text-[11px] truncate block">{mismatch.parcel_code}</span>
              </div>
              {mismatch.parcel_id ? (
                <Link
                  to={`/parcels/${mismatch.parcel_id}`}
                  onClick={onClose}
                  className="btn btn-secondary btn-sm text-[10px] py-0.5 px-1.5 flex items-center gap-0.5 flex-shrink-0"
                  title="View Cadastral Parcel Detail"
                >
                  Parcel <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
              ) : (
                <span className="text-[10px] text-slate-400 italic">No Parcel</span>
              )}
            </div>

            <div className="p-1.5 bg-white rounded-md border border-slate-200 flex items-center justify-between">
              <div className="truncate pr-1">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Source Doc</span>
                <span className="font-bold text-slate-800 text-[11px] truncate block">{mismatch.document_title || 'Document'}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPdfViewer(true)}
                  className="btn btn-secondary btn-sm text-[10px] py-0.5 px-1.5 flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  title="Preview OCR extracted document in PDF viewer"
                >
                  <Eye className="w-2.5 h-2.5 text-emerald-700" /> View PDF
                </button>
                {mismatch.document_id && (
                  <Link
                    to={`/documents/${mismatch.document_id}`}
                    onClick={onClose}
                    className="btn btn-secondary btn-sm text-[10px] py-0.5 px-1.5 flex items-center gap-0.5"
                    title="Open document detail page"
                  >
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Officer Action & Status Update Section */}
          <form onSubmit={handleSave} className="bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-600" /> Officer Review &amp; Resolution
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label text-[9.5px] mb-0.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-select text-[11px] font-semibold py-1 px-2"
                >
                  <option value="DETECTED">DETECTED</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                </select>
              </div>

              <div>
                <label className="form-label text-[9.5px] mb-0.5">Notes</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Officer remarks..."
                  className="form-input text-[11px] py-1 px-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-sm text-[11px] font-semibold py-1 px-3 flex items-center gap-1"
              >
                {saving ? (
                  <span className="spinner !border-white/30 !border-t-white" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save Resolution
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PDF & OCR Viewer Modal */}
      <PdfViewerModal
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        documentId={mismatch.document_id || 'sample-doc'}
        title={mismatch.document_title || `Statutory Verification Document (${mismatch.parcel_code})`}
        docCode={mismatch.document_code || 'DOC-2026-NLA'}
        ocrData={{
          parcel_code: mismatch.parcel_code,
          survey_number: mismatch.survey_number,
          field_name: mismatch.field_name,
          extracted_value: mismatch.extracted_value,
          official_value: mismatch.official_value,
          detected_variance: mismatch.difference,
          confidence_score: '98.4%',
          ocr_engine: 'PyMuPDF / Tesseract Vision',
        }}
      />
    </div>
  );
}
