import { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Send,
  Code2,
  History,
  ShieldCheck,
  Building2,
  FileCheck,
  Landmark,
  Zap,
  Check,
  Copy,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function MockGovPage() {
  const { user } = useAuth();

  // State
  const [registries, setRegistries] = useState([]);
  const [selectedRegistry, setSelectedRegistry] = useState(null);
  const [surveyNumber, setSurveyNumber] = useState('123/2');
  const [scenario, setScenario] = useState('EXACT_MATCH');
  const [parcelsList, setParcelsList] = useState([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');

  // Execution states
  const [querying, setQuerying] = useState(false);
  const [validating, setValidating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'terminal'
  const [terminalTab, setTerminalTab] = useState('response'); // 'request' | 'response'
  const [copied, setCopied] = useState(false);

  // Sync Log state
  const [syncLogs, setSyncLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');
  const [selectedLogPayload, setSelectedLogPayload] = useState(null);

  // Sync fields selection
  const [syncFields, setSyncFields] = useState({
    owner_name: true,
    area_acres: true,
    village: true,
  });
  const [syncRemarks, setSyncRemarks] = useState('Authoritative synchronization from State RoR Portal');
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchRegistries();
    fetchParcels();
    fetchSyncLogs();
  }, []);

  const fetchRegistries = async () => {
    try {
      const res = await api.get('/mock-gov/registries');
      if (res.data?.data) {
        setRegistries(res.data.data);
        setSelectedRegistry(res.data.data[0]);
      }
    } catch (err) {
      console.error('Error fetching mock registries:', err);
    }
  };

  const fetchParcels = async () => {
    try {
      const res = await api.get('/parcels?limit=15');
      if (res.data?.data) {
        setParcelsList(res.data.data);
        if (res.data.data.length > 0) {
          setSurveyNumber(res.data.data[0].survey_number || '123/2');
          setSelectedParcelId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching parcels:', err);
    }
  };

  const fetchSyncLogs = async () => {
    setLogsLoading(true);
    try {
      const params = logFilter !== 'ALL' ? `?validation_result=${logFilter}` : '';
      const res = await api.get(`/mock-gov/logs${params}`);
      if (res.data?.data) {
        setSyncLogs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Trigger query automatically on first load once parcels arrive
  useEffect(() => {
    if (parcelsList.length > 0 && !queryResult) {
      handleQuery(null, parcelsList[0].survey_number, parcelsList[0].id);
    }
  }, [parcelsList]);

  // Handle Query
  const handleQuery = async (e, overrideSurvey, overrideParcelId) => {
    if (e) e.preventDefault();
    const querySurv = overrideSurvey || surveyNumber;
    const queryPId = overrideParcelId !== undefined ? overrideParcelId : selectedParcelId;

    if (!querySurv || !querySurv.trim()) return;

    setQuerying(true);
    setValidationResult(null);
    setToastMessage(null);

    try {
      const res = await api.post('/mock-gov/query', {
        registry_id: selectedRegistry?.id || 'UP_BHULEKH',
        survey_number: querySurv.trim(),
        parcel_id: queryPId || undefined,
        scenario,
      });

      if (res.data?.data) {
        const qData = res.data.data;
        setQueryResult(qData);

        // Automatically trigger validation if local parcel exists
        if (qData.local_parcel?.id && qData.simulated_response?.data?.record) {
          handleValidate(qData.local_parcel.id, qData.simulated_response.data.record);
        }
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to query mock state land registry.',
      });
    } finally {
      setQuerying(false);
    }
  };

  // Handle Validation
  const handleValidate = async (parcelId, record) => {
    setValidating(true);
    try {
      const res = await api.post('/mock-gov/validate', {
        parcel_id: parcelId,
        registry_record: record,
      });
      if (res.data?.data) {
        setValidationResult(res.data.data);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  // Handle Sync
  const handleSync = async () => {
    if (!queryResult?.simulated_response?.data?.record) return;

    setSyncing(true);
    setToastMessage(null);

    const activeFields = Object.keys(syncFields).filter((k) => syncFields[k]);

    try {
      const res = await api.post('/mock-gov/sync', {
        parcel_id: selectedParcelId || queryResult.local_parcel?.id,
        survey_number: surveyNumber,
        registry_record: queryResult.simulated_response.data.record,
        validation_result: validationResult?.overall_result || 'MATCH',
        sync_fields: activeFields,
        remarks: syncRemarks,
      });

      if (res.data?.success) {
        setToastMessage({
          type: 'success',
          text: 'Parcel record synchronized with state registry! Transaction logged in audit trail.',
        });
        fetchSyncLogs();
        fetchParcels();
        if (selectedParcelId) {
          handleValidate(selectedParcelId, queryResult.simulated_response.data.record);
        }
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to synchronize parcel with registry.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ⚠️ Prominent Simulation Notice Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-600 border-y border-r border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-200/80 text-amber-900 flex-shrink-0 mt-0.5">
            <Radio className="w-5 h-5 animate-pulse text-amber-800" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-600 text-white tracking-wider uppercase">
                Simulated Integration (Mock API)
              </span>
              <span className="text-xs text-amber-900 font-bold">
                Phase 13 • SIH 2026 Statutory Prototype
              </span>
            </div>
            <p className="text-xs text-amber-950 font-medium leading-relaxed">
              This module demonstrates bidirectional REST API synchronization with State Land Revenue Registries (
              <strong>UP Bhulekh, MP Bhu-Abhilekh, Bhoomi Karnataka, MahaBhulekh</strong>). It compares internal
              cadastral data against official Record of Rights (RoR) records, highlights variances, and commits audited
              ground-truth updates.
            </p>
          </div>
        </div>
      </div>

      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="w-7 h-7 text-blue-700" />
            Government Land Records API (Mock)
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Simulate inter-governmental Record of Rights (RoR) data queries, discrepancy checks &amp; ground-truth synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchSyncLogs();
              fetchParcels();
            }}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
              : 'bg-rose-50 text-rose-950 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs underline font-bold opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. State Land Registry Provider Selector */}
      <div className="card p-5 bg-white">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-700" />
          Select Target State Land Records Provider
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {registries.map((reg) => {
            const isSelected = selectedRegistry?.id === reg.id;
            return (
              <button
                key={reg.id}
                type="button"
                onClick={() => setSelectedRegistry(reg)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900 truncate">{reg.name}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    {reg.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium truncate mb-2.5">{reg.authority}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                  <span className="font-semibold">{reg.state}</span>
                  <span className="text-blue-700 font-bold">~{reg.avgLatencyMs}ms</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Query Console */}
      <div className="card p-5 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Simulated Query Console
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Query state registry by survey number and evaluate cadastral comparison benchmarks
            </p>
          </div>

          {/* Quick Pre-fill Survey Numbers from seeded parcels */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold">Quick Pre-fill:</span>
            {parcelsList.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSurveyNumber(p.survey_number);
                  setSelectedParcelId(p.id);
                  handleQuery(null, p.survey_number, p.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  selectedParcelId === p.id
                    ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                    : 'bg-slate-100 hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                }`}
              >
                #{p.survey_number} ({p.parcel_code})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleQuery} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          {/* Survey Number Input */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Survey / Khasra Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                placeholder="e.g. 123/2"
                className="form-input pl-9 font-mono text-sm font-bold text-slate-900"
                required
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Match Scenario */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Simulation Scenario
            </label>
            <select
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value);
              }}
              className="form-select text-xs font-bold text-slate-800"
            >
              <option value="EXACT_MATCH">🎯 Exact Match (100% RoR Alignment)</option>
              <option value="AREA_VARIANCE">⚠️ Area Variance (+8% Land Area Disparity)</option>
              <option value="OWNER_SPELLING_VARIANCE">🔤 Name Variance (Alias / Minor Spelling Diff)</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-4 flex items-end">
            <button
              type="submit"
              disabled={querying}
              className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {querying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Querying State Registry...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Query State Registry (API)
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Query Results & Cadastral Diff Engine */}
      {queryResult && (
        <div className="space-y-4 animate-fadeIn">
          {/* Result Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'comparison'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                Cadastral Ground Truth Comparison
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Raw HTTP Request &amp; Response Terminal
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-semibold">Latency:</span>
              <span className="text-emerald-700 font-bold">{queryResult.simulated_latency_ms}ms</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-semibold">Status:</span>
              <span className="text-blue-700 font-bold">200 OK</span>
            </div>
          </div>

          {/* TAB 1: Cadastral Comparison Matrix */}
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Validation Score & Differences Table */}
              <div className="lg:col-span-8 space-y-4">
                <div className="card p-5 bg-white">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-700" />
                        Automated Field-Level Validation
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Cross-verifying internal BhoomiSetu database record vs official state revenue record
                      </p>
                    </div>

                    {validationResult && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                          validationResult.overall_result === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {validationResult.match_score_pct}% Match Score
                      </span>
                    )}
                  </div>

                  {/* Comparison Rows */}
                  {validationResult ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <th className="py-3 px-4">Field Attribute</th>
                            <th className="py-3 px-4">Internal PostGIS Record</th>
                            <th className="py-3 px-4">State Registry (RoR)</th>
                            <th className="py-3 px-4 text-right">Validation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {validationResult.comparisons.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-bold text-slate-800">{c.field}</td>
                              <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                                {c.db_value || '—'}
                              </td>
                              <td className="py-3 px-4 font-mono text-blue-900 font-extrabold">
                                {c.registry_value || '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {c.status === 'MATCH' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                                    <Check className="w-3.5 h-3.5 text-emerald-700" /> Match
                                  </span>
                                ) : c.status === 'VARIANCE' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Variance
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-300">
                                    <XCircle className="w-3.5 h-3.5 text-rose-700" /> Mismatch
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      {validating ? 'Analyzing cadastral differences...' : 'No validation data available.'}
                    </div>
                  )}

                  {/* Encumbrance Box */}
                  {validationResult?.has_encumbrances && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-900 mb-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                        Encumbrance / Bank Lien Detected on State Land Record:
                      </div>
                      {validationResult.encumbrances.map((enc, idx) => (
                        <div key={idx} className="ml-6 text-amber-950 font-medium">
                          • {enc.type} with <strong>{enc.bank}</strong> — ₹{enc.amount_inr?.toLocaleString('en-IN')}{' '}
                          (Mortgaged on {enc.mortgage_date})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Synchronize Ground Truth Action Panel */}
              <div className="lg:col-span-4 space-y-4">
                <div className="card p-5 bg-gradient-to-b from-blue-50/70 to-white border border-blue-200 shadow-sm">
                  <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-700" />
                    Synchronize to Database
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed font-medium">
                    Commit verified State Land Registry attributes into PostGIS ground-truth and generate an append-only audit record.
                  </p>

                  <div className="space-y-2.5 mb-4 text-xs font-semibold text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncFields.area_acres}
                        onChange={(e) => setSyncFields({ ...syncFields, area_acres: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Sync Land Area ({queryResult.simulated_response?.data?.record?.total_area_acres} Acres)</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncFields.owner_name}
                        onChange={(e) => setSyncFields({ ...syncFields, owner_name: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="truncate">Sync Owner ({queryResult.simulated_response?.data?.record?.recorded_owners?.[0]?.name})</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncFields.village}
                        onChange={(e) => setSyncFields({ ...syncFields, village: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Sync Village ({queryResult.simulated_response?.data?.record?.village_name})</span>
                    </label>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Audit Remarks
                    </label>
                    <input
                      type="text"
                      value={syncRemarks}
                      onChange={(e) => setSyncRemarks(e.target.value)}
                      className="form-input text-xs"
                      placeholder="Remarks for sync audit entry..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing || !user || !['DLAO', 'SGA', 'ADMIN'].includes(user.role)}
                    className="w-full btn btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Synchronizing Database...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Commit to PostGIS Ground Truth
                      </>
                    )}
                  </button>

                  {!['DLAO', 'SGA', 'ADMIN'].includes(user?.role) && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-2 text-center">
                      * Only DLAO, SGA, or ADMIN roles can execute database synchronization.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Raw HTTP Terminal */}
          {activeTab === 'terminal' && (
            <div className="card p-5 bg-white">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTerminalTab('response')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      terminalTab === 'response' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Simulated Response Body (JSON)
                  </button>
                  <button
                    onClick={() => setTerminalTab('request')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      terminalTab === 'request' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Simulated Request Payload
                  </button>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        terminalTab === 'response'
                          ? queryResult.simulated_response
                          : queryResult.simulated_request,
                        null,
                        2
                      )
                    )
                  }
                  className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <div className="bg-[#0b192c] text-emerald-400 p-4 rounded-xl overflow-x-auto max-h-96 text-xs leading-relaxed font-mono shadow-inner border border-slate-800">
                <pre>
                  {JSON.stringify(
                    terminalTab === 'response'
                      ? queryResult.simulated_response
                      : queryResult.simulated_request,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Live Synchronization Audit Log History */}
      <div className="card p-5 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              State Land Registry Sync Audit Log (`mock_gov_sync_log`)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Append-only transaction log of all external land registry synchronizations
            </p>
          </div>

          {/* Validation Result Filter */}
          <div className="flex items-center gap-1.5">
            {['ALL', 'MATCH', 'MISMATCH'].map((filt) => (
              <button
                key={filt}
                onClick={() => setLogFilter(filt)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logFilter === filt
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filt}
              </button>
            ))}
          </div>
        </div>

        {/* Sync Log Table */}
        {logsLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">Loading sync history...</div>
        ) : syncLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">No synchronization logs found.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Survey / Khasra</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Validation Outcome</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-600 text-xs font-medium">
                      {new Date(log.synced_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">
                      #{log.survey_number}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.request_data?.registry_id || 'UP_BHULEKH'}
                    </td>
                    <td className="py-3 px-4">
                      {log.validation_result === 'MATCH' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-700" /> MATCH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-700" /> MISMATCH
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {log.request_data?.requested_by || 'system'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLogPayload(log)}
                        className="text-blue-700 hover:text-blue-900 font-bold text-xs underline cursor-pointer"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Inspection Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-700" />
                Sync Audit Payload — Survey #{selectedLogPayload.survey_number}
              </h3>
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <p className="text-[11px] uppercase font-extrabold text-slate-600 mb-1">Request Payload:</p>
                <div className="bg-[#0b192c] text-emerald-300 p-3.5 rounded-lg max-h-44 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(selectedLogPayload.request_data, null, 2)}</pre>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase font-extrabold text-slate-600 mb-1">Response Data:</p>
                <div className="bg-[#0b192c] text-emerald-300 p-3.5 rounded-lg max-h-44 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(selectedLogPayload.response_data, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedLogPayload(null)} className="btn btn-secondary text-xs py-2 px-5 font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
