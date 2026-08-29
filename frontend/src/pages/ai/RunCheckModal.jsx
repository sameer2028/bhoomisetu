import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  X,
  Sparkles,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Play,
  ShieldCheck,
} from 'lucide-react';

export default function RunCheckModal({ isOpen, onClose, onCheckCompleted }) {
  const [documents, setDocuments] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setErrorMsg('');
      return;
    }

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [docsRes, parcelsRes] = await Promise.all([
          api.get('/documents?limit=50'),
          api.get('/parcels?limit=100'),
        ]);
        setDocuments(docsRes.data.data || []);
        setParcels(parcelsRes.data.data || []);
        if (parcelsRes.data.data?.length > 0) {
          setSelectedParcelId(parcelsRes.data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load documents or parcels:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();
  }, [isOpen]);

  const handleDocChange = (e) => {
    const docId = e.target.value;
    setSelectedDocId(docId);
    if (docId) {
      const doc = documents.find((d) => d.id === docId);
      if (doc && doc.parcel_id) {
        setSelectedParcelId(doc.parcel_id);
      }
    }
  };

  const handleRunCheck = async (e) => {
    e.preventDefault();
    if (!selectedParcelId) {
      setErrorMsg('Please select a target land parcel for verification.');
      return;
    }

    setRunning(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await api.post('/ai/compare', {
        document_id: selectedDocId || undefined,
        parcel_id: selectedParcelId,
      });
      setResult(res.data.data);
      if (onCheckCompleted) onCheckCompleted();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Verification check failed to execute.');
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      {/* Invisible click-outside catcher with NO background/blur */}
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />

      {/* Floating Card Popup in size of form only */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 ring-1 ring-black/10 overflow-hidden flex flex-col pointer-events-auto my-auto animate-fadeIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">Run AI Document Verification</h3>
              <p className="text-[10px] text-slate-300">
                Cross-match document fields against cadastral master records
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
        <div className="p-3 space-y-2.5 bg-slate-50/50">
          {errorMsg && (
            <div className="flex items-center gap-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-md text-[11px] font-semibold text-rose-800">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          {loadingInitial ? (
            <div className="py-6 text-center">
              <div className="spinner spinner-md mb-1" />
              <p className="text-[11px] text-slate-500 font-medium">Loading documents and parcels...</p>
            </div>
          ) : (
            <form onSubmit={handleRunCheck} className="space-y-2.5">
              {/* Document Selector */}
              <div>
                <label className="form-label text-[10px] flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <FileText className="w-3 h-3 text-blue-700" /> Select Source Document
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">PDF or Image</span>
                </label>
                <select
                  value={selectedDocId}
                  onChange={handleDocChange}
                  className="form-select text-[11px] py-1 px-2"
                >
                  <option value="">Select an uploaded document (or direct compare)</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      [{doc.document_type}] {doc.title} ({doc.document_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Parcel Selector */}
              <div>
                <label className="form-label text-[10px] font-bold text-slate-700 flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-emerald-600" /> Select Target Cadastral Parcel
                </label>
                <select
                  value={selectedParcelId}
                  onChange={(e) => setSelectedParcelId(e.target.value)}
                  className="form-select text-[11px] py-1 px-2"
                  required
                >
                  <option value="">Choose a parcel...</option>
                  {parcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.parcel_code}] Survey No. {p.survey_number} — {p.village} ({p.area_acres} Acres)
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Matrix Info Box */}
              <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-md text-xs text-slate-600 space-y-0.5">
                <div className="font-bold text-blue-900 text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-700" /> Validation Matrix:
                </div>
                <div className="text-[9.5px] text-slate-500 pl-3 list-disc space-y-0.5">
                  • <strong>Survey No &amp; District:</strong> Exact match validation<br />
                  • <strong>Acreage:</strong> Numeric tolerance (±0.01 acres)<br />
                  • <strong>Village &amp; Owner Name:</strong> Fuzzy similarity check
                </div>
              </div>

              {/* Check Result Display */}
              {result && (
                <div
                  className={`p-2 rounded-md border text-xs ${
                    result.hasMismatches
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[11px]">
                    {result.hasMismatches ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{result.mismatchCount} Discrepancy Flag(s) Detected!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>All Fields Verified — No Discrepancies Found!</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5 text-slate-600">
                    Checked against Parcel <strong>{result.parcel?.parcel_code}</strong>.
                    {result.hasMismatches ? ' Added to mismatch table.' : ' Cadastral records match seamlessly.'}
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5"
                >
                  {result ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={running}
                  className="btn btn-primary btn-sm text-[11px] font-semibold py-1 px-3 flex items-center gap-1"
                >
                  {running ? (
                    <>
                      <span className="spinner !border-white/30 !border-t-white" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run Verification Check</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
