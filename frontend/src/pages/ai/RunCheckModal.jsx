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

  const BENCHMARKS = [
    {
      id: 'doc_002_area_mismatch.png',
      title: '🎯 [Benchmark #1] Area Discrepancy (Doc: 1.05 Acres vs Parcel: 1.25 Acres)',
      badge: 'High Severity Flag',
    },
    {
      id: 'doc_003_survey_number_mismatch.png',
      title: '🎯 [Benchmark #2] Survey Number Typo (Doc: #123/3 vs Parcel: #123/2)',
      badge: 'Critical Severity Flag',
    },
    {
      id: 'doc_005_owner_name_mismatch.png',
      title: '🎯 [Benchmark #3] Owner Title Mismatch (Doc: R.K. Singh vs Master Record)',
      badge: 'Medium Severity Flag',
    },
    {
      id: 'doc_004_village_fuzzy_mismatch.png',
      title: '🎯 [Benchmark #4] Village Spelling Transliteration (Doc: Rampoor vs Rampur)',
      badge: 'Low Severity Flag',
    },
    {
      id: 'doc_006_multiple_mismatches.png',
      title: '🎯 [Benchmark #5] Multiple Discrepancies (Acreage Deficit + Village Variant)',
      badge: 'Multiple Flags',
    },
    {
      id: 'doc_001_clean_match.png',
      title: '✅ [Benchmark #6] Clean Gazette Survey (Exact Cadastral Match)',
      badge: 'Zero Discrepancy',
    },
  ];

  const handleDocChange = (e) => {
    const docId = e.target.value;
    setSelectedDocId(docId);
    if (docId && !docId.startsWith('doc_')) {
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
        <div className="p-3 space-y-2.5 bg-slate-50/50 max-h-[85vh] overflow-y-auto">
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
              {/* Document Selector with Optgroups */}
              <div>
                <label className="form-label text-[10px] flex items-center justify-between mb-0.5">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <FileText className="w-3 h-3 text-blue-700" /> Select Source Document / Benchmark Scenario
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">PDF or Scanned Report</span>
                </label>
                <select
                  value={selectedDocId}
                  onChange={handleDocChange}
                  className="form-select text-[11px] py-1.5 px-2 font-medium"
                >
                  <optgroup label="🔬 AI Microservice OCR Benchmark Scenarios">
                    {BENCHMARKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📁 Uploaded Statutory Documents Repository">
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        [{doc.document_type}] {doc.title} ({doc.document_code})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Parcel Selector */}
              <div>
                <label className="form-label text-[10px] font-bold text-slate-700 flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-emerald-600" /> Select Target Cadastral Parcel (Master RoR)
                </label>
                <select
                  value={selectedParcelId}
                  onChange={(e) => setSelectedParcelId(e.target.value)}
                  className="form-select text-[11px] py-1.5 px-2 font-medium"
                  required
                >
                  <option value="">Choose a parcel...</option>
                  {parcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.parcel_code}] Survey No. {p.survey_number} — {p.village} ({p.area_acres} Acres, Owner: {p.owner_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Matrix Info Box */}
              <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-md text-xs text-slate-600 space-y-0.5">
                <div className="font-bold text-blue-900 text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-700" /> Verification Criteria:
                </div>
                <div className="text-[9.5px] text-slate-600 pl-2 space-y-0.5">
                  • <strong>Survey Number:</strong> Strict exact match validation<br />
                  • <strong>Land Area:</strong> Strict numeric tolerance check (±0.01 acres)<br />
                  • <strong>Village &amp; Owner Name:</strong> RapidFuzz phonetics and spelling distance
                </div>
              </div>

              {/* Check Result Display with Field-by-Field Breakdown */}
              {result && (
                <div
                  className={`p-2.5 rounded-lg border text-xs space-y-2 ${
                    result.hasMismatches
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[11px]">
                    {result.hasMismatches ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span className="text-rose-900 font-extrabold">{result.mismatchCount} Discrepancy Flag(s) Detected &amp; Logged!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-emerald-900 font-extrabold">All Fields Verified — No Discrepancies Found!</span>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-700">
                    Checked against Parcel <strong>{result.parcel?.parcel_code} (Survey #{result.parcel?.survey_number})</strong>.
                    {result.hasMismatches ? ' Added to cadastral discrepancy list for officer audit.' : ' Master record is identical to document data.'}
                  </p>

                  {/* Discrepancy Field List */}
                  {result.mismatches && result.mismatches.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {result.mismatches.map((m, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-amber-200 shadow-2xs text-[10.5px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 uppercase tracking-wide">
                              {m.field_name?.replace('_', ' ')}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              m.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              m.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {m.severity}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 pt-0.5">
                            <div><span className="font-semibold text-slate-400">Official:</span> <span className="text-slate-800 font-mono">{m.official_value}</span></div>
                            <div><span className="font-semibold text-rose-600">Extracted:</span> <span className="text-rose-700 font-mono font-bold">{m.extracted_value}</span></div>
                          </div>
                          <p className="text-[9.5px] text-slate-500 italic pt-0.5">{m.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
