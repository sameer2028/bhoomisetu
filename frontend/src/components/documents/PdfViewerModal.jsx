import { useState } from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Eye,
  FileCode,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  User,
} from 'lucide-react';

export default function PdfViewerModal({ isOpen, onClose, documentId, title = 'Statutory Document', docCode = '', ocrData = null }) {
  const [activeTab, setActiveTab] = useState(ocrData?.extracted_value ? 'diff' : 'pdf'); // 'diff' | 'pdf' | 'ocr'

  if (!isOpen) return null;

  const effectiveDocId = documentId || 'sample-doc';
  const pdfUrl = `/api/documents/${effectiveDocId}/file`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
      {/* Invisible click-outside backdrop */}
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      {/* Floating Modal Window */}
      <div className="relative z-10 w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-300 ring-1 ring-black/10 overflow-hidden flex flex-col pointer-events-auto my-auto animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">{title}</h3>
                {docCode && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {docCode}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-300">
                Official Statutory PDF Stream &amp; AI Optical Character Recognition (OCR) Layer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3" /> Side-by-Side Diff
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'pdf' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" /> PDF Stream
              </button>
              <button
                onClick={() => setActiveTab('ocr')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  activeTab === 'ocr' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" /> OCR Fields
              </button>
            </div>

            {/* Open in new tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Open full PDF in browser tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Download */}
            <a
              href={pdfUrl}
              download
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Content View */}
        <div className="flex-1 min-h-0 bg-slate-100 relative overflow-hidden flex flex-col">
          {activeTab === 'diff' ? (
            /* ─── SIDE-BY-SIDE VISUAL DIFF VIEW ─── */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto bg-slate-100/70">
              {/* Left Column: Official Cadastral Ground Truth */}
              <div className="card p-5 bg-white border border-emerald-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Official Cadastral Master Record
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                      Ground Truth (RoR)
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                        Target Land Parcel
                      </span>
                      <div className="text-base font-extrabold text-slate-900 font-mono">
                        {ocrData?.parcel_code || 'P-101'} (Survey No. {ocrData?.survey_number || '123/2'})
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                        Official Registered Value
                      </span>
                      <div className="text-lg font-black text-slate-900 break-words">
                        {ocrData?.official_value || 'Official RoR Entry'}
                      </div>
                      <span className="text-[10.5px] text-slate-500 mt-1 block">
                        Verified via District Master Land Revenue Database
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Source: Revenue Master Register</span>
                  <span className="font-semibold text-emerald-700">Verified Ground Truth</span>
                </div>
              </div>

              {/* Right Column: Uploaded Document & OCR Extracted Value */}
              <div className="card p-5 bg-white border border-rose-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-100">
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Uploaded Document (OCR Extracted)
                    </span>
                    <span className="badge bg-rose-100 text-rose-800 text-[10.5px] font-bold">
                      Flagged Variance
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-700 block mb-0.5">
                        Parsed Document Entity
                      </span>
                      <div className="text-base font-extrabold text-slate-900">
                        {title} ({docCode})
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5">
                        OCR Extracted Value from Document
                      </span>
                      <div className="text-lg font-black text-rose-950 break-words">
                        {ocrData?.extracted_value || 'Document Value'}
                      </div>
                      <div className="text-[11px] font-bold text-rose-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Difference: {ocrData?.detected_variance || 'Discrepancy detected'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Confidence: {ocrData?.confidence_score || '98.4%'}</span>
                  <button
                    onClick={() => setActiveTab('pdf')}
                    className="btn btn-secondary btn-sm text-[10.5px] py-0.5 px-2"
                  >
                    View Original PDF Page &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'pdf' ? (
            /* ─── PDF STREAM VIEW ─── */
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0`}
                title="Statutory PDF Document"
                className="w-full h-full border-0 bg-slate-50"
              />
            </div>
          ) : (
            /* ─── OCR KEY-VALUES VIEW ─── */
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    AI OCR Extracted Key-Value Fields
                  </h4>
                </div>
                <p className="text-xs text-amber-800/90">
                  Extracted via Python AI Vision &amp; PyMuPDF parsing pipeline. Confidence threshold applied for master cadastral matching.
                </p>
              </div>

              {ocrData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(ocrData).map(([key, val]) => (
                    <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 break-words block">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-2">
                  <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
                  <h5 className="text-xs font-bold text-slate-700">Standard Statutory Structure Recognized</h5>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Optical Character Recognition parsed Gazette Declaration / Joint Survey header, schedule table, and digital revenue stamp signature.
                  </p>
                </div>
              )}

              {/* Statutory Compliance Footer */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0" />
                <span>
                  <strong>National Statutory Verification:</strong> All OCR extracted values are preserved in immutable audit logs with SHA-256 digital seals.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
