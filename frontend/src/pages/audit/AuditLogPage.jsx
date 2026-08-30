import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowRight,
  X,
  CheckCircle2,
  FileText,
  Download,
  Calendar,
  Sparkles
} from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
  DELETE: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  APPROVE: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
  REJECT: 'bg-red-100 text-red-800 border-red-300 font-bold',
  ESCALATE: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
  MANUAL_ESCALATION: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
  ACKNOWLEDGE_ALERT: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
  RESOLVE_ALERT: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  LOGIN: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
  LOGOUT: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
  BULK_ACKNOWLEDGE: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
  BULK_ESCALATE: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  BULK_MARK_READ: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
  RUN_DIAGNOSTIC_SCAN: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
};

const ENTITY_ICONS = {
  PROJECT: '📁',
  PARCEL: '📍',
  CASE: '📋',
  DOCUMENT: '📄',
  COMPENSATION: '💰',
  RR: '👥',
  ALERT: '🔔',
  ALERT_ENGINE: '⚙️',
  ALERTS: '🔔',
  USER: '👤',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    stats: {
      totalEvents: 0,
      entityTypesCount: 0,
      activeUsersCount: 0,
      eventsLast24h: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateShortcut, setDateShortcut] = useState('ALL'); // ALL, TODAY, 7DAYS, 30DAYS
  const [page, setPage] = useState(0);

  // Entities & Actions options
  const [filterOptions, setFilterOptions] = useState({ entityTypes: [], actions: [] });

  // Expanded row IDs for JSON inspection
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/audit/entities');
        setFilterOptions(res.data.data);
      } catch (err) {
        console.error('Failed to fetch audit filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Compute from_date based on shortcut
  const getFromDate = () => {
    if (dateShortcut === 'TODAY') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (dateShortcut === '7DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (dateShortcut === '30DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    return undefined;
  };

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-trail', {
        params: {
          entity_type: entityType || undefined,
          action: action || undefined,
          search: search.trim() || undefined,
          from_date: getFromDate(),
          limit: 50,
          offset: page * 50,
        },
      });
      setLogs(res.data.data || []);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, action, search, dateShortcut, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/audit/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BhoomiSetu_Statutory_Audit_Log_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export audit CSV:', err);
    }
  };

  const totalPages = Math.ceil((meta.total || 0) / 50);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">
            <Shield className="w-4 h-4 text-blue-700" />
            Immutable Statutory Audit &amp; Compliance Trail
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            System Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable audit trail of authorized officer activities, state mutations, and statutory compliance events
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-semibold text-slate-700 hover:bg-slate-100"
            title="Download full statutory audit trail CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Audit Log
          </button>

          <button
            onClick={fetchLogs}
            className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stream
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Events</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{meta.stats?.totalEvents || 0}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Append-only compliance log</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Entity Types</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{meta.stats?.entityTypesCount || 0}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Projects, Parcels, Cases, etc.</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Actors</span>
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-700">{meta.stats?.activeUsersCount || 0}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Authorized government officers</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Last 24 Hours</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-700">{meta.stats?.eventsLast24h || 0}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Recent system mutations</p>
        </div>
      </div>

      {/* Filter Bar & Date Range Chips */}
      <div className="card shadow-sm border border-slate-200">
        <div className="p-4 space-y-3">
          {/* Quick Date Range Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Range:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today (24h)' },
              { id: '7DAYS', label: 'Last 7 Days' },
              { id: '30DAYS', label: 'Last 30 Days' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDateShortcut(d.id);
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  dateShortcut === d.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search actor, action, entity ID, IP..."
                className="form-input pl-9 pr-4 py-1.5 text-xs rounded-lg w-full bg-slate-50 border-slate-200 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(0);
                }}
                className="form-select py-1.5 px-2.5 text-xs rounded-lg bg-slate-50 border-slate-200 font-medium"
              >
                <option value="">All Entities</option>
                {filterOptions.entityTypes.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>

              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(0);
                }}
                className="form-select py-1.5 px-2.5 text-xs rounded-lg bg-slate-50 border-slate-200 font-medium"
              >
                <option value="">All Actions</option>
                {filterOptions.actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Target Record ID</th>
                <th className="py-3 px-4 text-right">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading audit stream...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  const hasDiff = log.old_values || log.new_values;
                  const actionClass = ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-4 text-center">
                        {hasDiff ? (
                          <button
                            onClick={() => toggleRow(log.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                            title="Inspect Change JSON"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-3.5 h-3.5 inline-block" />
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{ENTITY_ICONS[log.entity_type] || '🔹'}</span>
                          <span>{log.entity_type}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${actionClass}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {log.actor_name ? (
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{log.actor_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{log.actor_role}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">SYSTEM / ENGINE</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                        {log.entity_id || '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expandable Syntax-Colored JSON Change Details */}
        {logs
          .filter((l) => expandedRows.has(l.id))
          .map((log) => (
            <div key={`diff-${log.id}`} className="p-4 bg-slate-950 text-slate-100 text-xs font-mono border-t border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  State Mutation Diff — Audit Event #{log.id}
                </span>
                <span className="text-[10px] text-slate-400">
                  Actor: <strong className="text-slate-200">{log.actor_name || 'SYSTEM'}</strong> ({log.ip_address || '127.0.0.1'})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-900/40">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>🔴 Previous State (old_values)</span>
                  </p>
                  <pre className="text-[11px] overflow-x-auto text-rose-200/90 p-2 bg-slate-950/70 rounded-lg">
                    {log.old_values ? JSON.stringify(log.old_values, null, 2) : '<null / initial state>'}
                  </pre>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-900/40">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span>🟢 Updated State (new_values)</span>
                  </p>
                  <pre className="text-[11px] overflow-x-auto text-emerald-200/90 p-2 bg-slate-950/70 rounded-lg">
                    {log.new_values ? JSON.stringify(log.new_values, null, 2) : '<null>'}
                  </pre>
                </div>
              </div>
            </div>
          ))}

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong>{logs.length > 0 ? page * 50 + 1 : 0}</strong> to{' '}
            <strong>{Math.min((page + 1) * 50, meta.total)}</strong> of <strong>{meta.total}</strong> events
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn btn-outline text-xs px-3 py-1 font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-mono text-[11px]">
              Page {totalPages > 0 ? page + 1 : 1} of {totalPages || 1}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-outline text-xs px-3 py-1 font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
