import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bell,
  AlertTriangle,
  Clock,
  FileWarning,
  Brain,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Layers,
  Building,
  MapPin,
  FileText,
  Download,
  CheckSquare,
  Square,
  Info,
  Shield,
  Send
} from 'lucide-react';

const PRIORITY_STYLES = {
  CRITICAL: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    border: 'border-l-4 border-l-rose-600 shadow-rose-100/50',
    icon: 'text-rose-600',
    bg: 'bg-rose-50/30',
    meter: 'bg-rose-600',
  },
  HIGH: {
    badge: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
    border: 'border-l-4 border-l-orange-500',
    icon: 'text-orange-500',
    bg: 'bg-orange-50/20',
    meter: 'bg-orange-500',
  },
  MEDIUM: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    border: 'border-l-4 border-l-amber-500',
    icon: 'text-amber-500',
    bg: 'bg-amber-50/10',
    meter: 'bg-amber-500',
  },
  LOW: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
    border: 'border-l-4 border-l-slate-400',
    icon: 'text-slate-400',
    bg: 'bg-slate-50/10',
    meter: 'bg-slate-400',
  },
};

const TYPE_CONFIG = {
  DEADLINE_APPROACHING: { label: 'Deadline Approaching', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  DEADLINE_MISSED: { label: 'Deadline Missed', icon: Clock, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  OVERDUE: { label: 'SLA Overdue', icon: Clock, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  MISSING_DOC: { label: 'Missing Document', icon: FileWarning, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  DATA_MISMATCH: { label: 'AI Data Mismatch', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  ESCALATION: { label: 'Escalation Notice', icon: ShieldAlert, color: 'text-rose-700 bg-rose-100 border-rose-300' },
  HIGH_RISK: { label: 'High Risk Alert', icon: Flame, color: 'text-red-700 bg-red-50 border-red-200' },
};

export default function AlertsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unreadCount: 0,
    pendingActionCount: 0,
    criticalCount: 0,
    highCount: 0,
    deadlineAlerts: 0,
    missingDocAlerts: 0,
    mismatchAlerts: 0,
    escalationAlerts: 0,
    highRiskAlerts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  // Filter State
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, DEADLINE_ALL, MISSING_DOC, DATA_MISMATCH, ESCALATION, HIGH_RISK
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, UNREAD, PENDING_ACTION, ACKNOWLEDGED
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection State
  const [selectedAlertIds, setSelectedAlertIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modals
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  const [acknowledgeRemarks, setAcknowledgeRemarks] = useState('');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTargetRole, setEscalateTargetRole] = useState('SGA');
  const [actionLoading, setActionLoading] = useState(false);
  const [isEscalationTrailModalOpen, setIsEscalationTrailModalOpen] = useState(false);
  const [trailAlert, setTrailAlert] = useState(null);

  // Fetch stats & alerts
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/alerts/stats', { timeout: 60000 }),
        api.get('/alerts', {
          timeout: 60000,
          params: {
            type: activeTab !== 'ALL' ? activeTab : undefined,
            priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
            is_read: statusFilter === 'UNREAD' ? 'false' : undefined,
            is_acknowledged: statusFilter === 'PENDING_ACTION' ? 'false' : statusFilter === 'ACKNOWLEDGED' ? 'true' : undefined,
            search: searchQuery.trim() || undefined,
            limit: 100,
          },
        }),
      ]);

      setStats(statsRes.data.data);
      const items = alertsRes.data.data || [];
      setAlerts(items);

      if (items.length === 0 && (!statsRes.data.data?.totalAlerts || statsRes.data.data?.totalAlerts === 0)) {
        api.post('/alerts/scan', {}, { timeout: 120000 }).then((res) => {
          if (res.data?.data?.generatedCount > 0) {
            fetchData();
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, priorityFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bulk Selection Helpers
  const toggleSelectAll = () => {
    if (selectedAlertIds.size === alerts.length) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(alerts.map((a) => a.id)));
    }
  };

  const toggleSelectAlert = (id, e) => {
    e?.stopPropagation();
    setSelectedAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Action Execution
  const handleBulkAction = async (actionType) => {
    if (selectedAlertIds.size === 0) return;
    try {
      setBulkActionLoading(true);
      const ids = Array.from(selectedAlertIds);
      await api.post('/alerts/bulk-action', {
        alert_ids: ids,
        action: actionType,
        remarks: `Bulk ${actionType} performed by ${user?.full_name || 'Officer'}`,
      });
      setSelectedAlertIds(new Set());
      await fetchData();
    } catch (err) {
      console.error('Bulk action error:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Run Rule Scanner
  const handleRunScan = async () => {
    try {
      setScanning(true);
      setScanMessage(null);
      const res = await api.post('/alerts/scan', {}, { timeout: 120000 });
      setScanMessage(res.data.message || 'SLA & statutory compliance rules evaluated successfully.');
      await fetchData();
      setTimeout(() => setScanMessage(null), 5000);
    } catch (err) {
      console.error('Diagnostic scan error:', err);
      if (err.code === 'ECONNABORTED') {
        setScanMessage('Scan is taking longer than expected. Please refresh the page in a moment.');
      } else {
        setScanMessage('Failed to complete diagnostic scan. Please try again.');
      }
    } finally {
      setScanning(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/alerts/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BhoomiSetu_Statutory_Compliance_Alerts_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export alerts CSV:', err);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/mark-all-read');
      await fetchData();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Single Mark Read
  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.put(`/alerts/${id}/read`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
      setStats((prev) => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  // Open Acknowledge Modal
  const openAcknowledge = (alertItem, e) => {
    e?.stopPropagation();
    setSelectedAlert(alertItem);
    setAcknowledgeRemarks('');
    setIsAcknowledgeModalOpen(true);
  };

  // Submit Acknowledge
  const handleConfirmAcknowledge = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      setActionLoading(true);
      await api.put(`/alerts/${selectedAlert.id}/acknowledge`, { remarks: acknowledgeRemarks });
      setIsAcknowledgeModalOpen(false);
      setSelectedAlert(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Escalate Modal
  const openEscalate = (alertItem, e) => {
    e?.stopPropagation();
    setSelectedAlert(alertItem);
    setEscalateReason('');
    setEscalateTargetRole('SGA');
    setIsEscalateModalOpen(true);
  };

  // Submit Escalate
  const handleConfirmEscalate = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      setActionLoading(true);
      await api.post(`/alerts/${selectedAlert.id}/escalate`, {
        escalation_reason: escalateReason,
        target_role: escalateTargetRole,
      });
      setIsEscalateModalOpen(false);
      setSelectedAlert(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to escalate alert:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Escalation Chain Trail
  const openEscalationTrail = (alertItem, e) => {
    e?.stopPropagation();
    setTrailAlert(alertItem);
    setIsEscalationTrailModalOpen(true);
  };

  // Navigate to Target Record
  const handleNavigateToRecord = (alertItem) => {
    if (alertItem.case_id) navigate('/cases');
    else if (alertItem.parcel_id) navigate('/parcels');
    else if (alertItem.project_id) navigate('/projects');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">
            <ShieldAlert className="w-4 h-4 text-emerald-700" />
            Governance, SLA &amp; Compliance Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Statutory Alerts &amp; Escalation Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time SLA compliance, statutory deadline monitoring, and multi-tier escalation management
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-semibold text-slate-700 hover:bg-slate-100"
            title="Download full statutory alerts report"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={handleMarkAllRead}
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5 font-semibold"
          >
            <Check className="w-3.5 h-3.5 text-blue-700" />
            Mark All Read
          </button>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="btn btn-primary text-xs px-4 py-2 flex items-center gap-2 font-bold shadow-md bg-emerald-800 hover:bg-emerald-900 border-emerald-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Evaluating Rules...' : 'Run SLA Diagnostic Scan'}
          </button>
        </div>
      </div>

      {/* Diagnostic Scan Banner */}
      {scanMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Alerts</span>
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalAlerts}</span>
            {stats.unreadCount > 0 && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {stats.unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">All monitored notifications</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Overdue</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{stats.deadlineAlerts}</span>
            <span className="text-[10px] font-bold text-rose-700 uppercase">Critical</span>
          </div>
          <p className="text-[10px] text-rose-600/80 mt-1 font-medium">Cases past statutory timeline</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Missing Docs</span>
            <FileWarning className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-800">{stats.missingDocAlerts}</span>
            <span className="text-[10px] font-bold text-amber-700">Gazette / 3A / 3D</span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1 font-medium">Required statutory records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI Mismatches</span>
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-800">{stats.mismatchAlerts}</span>
            <span className="text-[10px] font-bold text-purple-700">OCR Discrepancies</span>
          </div>
          <p className="text-[10px] text-purple-700/80 mt-1 font-medium">Official vs Deed variance</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-300 bg-red-50/40 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Escalated</span>
            <ShieldAlert className="w-4 h-4 text-red-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-800">{stats.escalationAlerts}</span>
            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
              Tier 2 / 3
            </span>
          </div>
          <p className="text-[10px] text-red-700/80 mt-1 font-medium">Senior Authority Intervention</p>
        </div>
      </div>

      {/* Escalation Hierarchy Matrix Visual Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Statutory Multi-Tier SLA Escalation Protocol
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
            Automated Trigger Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-[11px] flex-shrink-0">
              L1
            </div>
            <div>
              <p className="font-bold text-amber-300">Field &amp; Revenue Officer (FRO)</p>
              <p className="text-[11px] text-slate-300">Day 0 – 7 • Initial SLA warning and verification request.</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-black flex items-center justify-center text-[11px] flex-shrink-0">
              L2
            </div>
            <div>
              <p className="font-bold text-orange-300">District LAO (DLAO)</p>
              <p className="text-[11px] text-slate-300">Day 8 – 14 • High priority notification and direct case reassignment.</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-[11px] flex-shrink-0">
              L3
            </div>
            <div>
              <p className="font-bold text-rose-300">Senior Authority (SGA / Ministry)</p>
              <p className="text-[11px] text-slate-300">Day 15+ • Critical escalation, audit flag, and statutory inquiry.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="card shadow-sm border border-slate-200">
        <div className="p-4 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs no-scrollbar">
            {[
              { id: 'ALL', label: 'All Alerts', count: stats.totalAlerts },
              { id: 'DEADLINE_ALL', label: 'SLA & Deadlines', count: stats.deadlineAlerts },
              { id: 'MISSING_DOC', label: 'Missing Documents', count: stats.missingDocAlerts },
              { id: 'DATA_MISMATCH', label: 'AI Discrepancies', count: stats.mismatchAlerts },
              { id: 'ESCALATION', label: 'Escalations', count: stats.escalationAlerts },
              { id: 'HIGH_RISK', label: 'High Risk', count: stats.highRiskAlerts },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === tab.id
                      ? 'bg-emerald-950/60 text-emerald-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Dropdowns, and Select All Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                {selectedAlertIds.size > 0 && selectedAlertIds.size === alerts.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({selectedAlertIds.size})</span>
              </button>

              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alert title, case no, survey #..."
                  className="form-input pl-9 pr-4 py-1.5 text-xs rounded-lg w-full bg-slate-50 border-slate-200 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Priority:</span>
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="form-select py-1.5 px-2.5 text-xs rounded-lg bg-slate-50 border-slate-200 font-medium"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 ml-1">
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select py-1.5 px-2.5 text-xs rounded-lg bg-slate-50 border-slate-200 font-medium"
              >
                <option value="ALL">All Status</option>
                <option value="UNREAD">Unread Only</option>
                <option value="PENDING_ACTION">Pending Acknowledge</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List Stream */}
        <div className="border-t border-slate-200 divide-y divide-slate-200">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium">Loading statutory alert registry...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">No active alerts matching your criteria</p>
              <p className="text-xs text-slate-400 mt-1">
                All statutory SLA timelines and compliance checks are currently clear.
              </p>
            </div>
          ) : (
            alerts.map((alertItem) => {
              const priority = PRIORITY_STYLES[alertItem.priority] || PRIORITY_STYLES.LOW;
              const typeMeta = TYPE_CONFIG[alertItem.type] || {
                label: alertItem.type,
                icon: AlertTriangle,
                color: 'text-slate-700 bg-slate-100 border-slate-200',
              };
              const TypeIcon = typeMeta.icon;
              const isSelected = selectedAlertIds.has(alertItem.id);

              return (
                <div
                  key={alertItem.id}
                  className={`p-4 sm:p-5 transition-all hover:bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    priority.border
                  } ${isSelected ? 'bg-blue-50/60 border-l-blue-600' : !alertItem.is_read ? 'bg-blue-50/20' : 'bg-white'}`}
                >
                  {/* Left: Checkbox, Icon & Alert Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => toggleSelectAlert(alertItem.id, e)}
                      className="mt-1 text-slate-400 hover:text-slate-700 flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-700" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>

                    <div className={`p-2 rounded-xl flex-shrink-0 shadow-sm border ${typeMeta.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Chips & SLA Status Meter */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${priority.badge}`}>
                          {alertItem.priority === 'CRITICAL' ? '🔴 CRITICAL SLA' : alertItem.priority}
                        </span>

                        <span className="font-semibold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {typeMeta.label}
                        </span>

                        {/* Visual SLA Countdown Pill */}
                        {alertItem.type === 'OVERDUE' && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-600" />
                            Statutory SLA Breached
                          </span>
                        )}

                        {alertItem.type === 'DEADLINE_APPROACHING' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Expiring in &lt; 7 Days
                          </span>
                        )}

                        {alertItem.is_acknowledged ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Acknowledged
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rose-600" />
                            Action Required
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alertItem.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {alertItem.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {alertItem.message}
                      </p>

                      {/* Context Pills */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                        {alertItem.project_name && (
                          <div className="flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            <Building className="w-3 h-3 text-blue-700" />
                            <span className="truncate max-w-[180px]">{alertItem.project_name}</span>
                          </div>
                        )}

                        {alertItem.survey_number && (
                          <div className="flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            <MapPin className="w-3 h-3 text-emerald-700" />
                            <span>Survey #{alertItem.survey_number}</span>
                          </div>
                        )}

                        {alertItem.case_number && (
                          <div className="flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            <FileText className="w-3 h-3 text-indigo-700" />
                            <span>Case: {alertItem.case_number}</span>
                            {alertItem.case_stage && (
                              <span className="text-[9px] text-indigo-800 bg-indigo-50 px-1 rounded font-bold">
                                {alertItem.case_stage}
                              </span>
                            )}
                          </div>
                        )}

                        {alertItem.target_user_name && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Assigned to: <strong className="text-slate-800">{alertItem.target_user_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={(e) => openEscalationTrail(alertItem, e)}
                      className="btn btn-outline text-xs px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                      title="View statutory escalation timeline & Act reference"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Trail
                    </button>

                    {!alertItem.is_acknowledged && (
                      <button
                        onClick={(e) => openAcknowledge(alertItem, e)}
                        className="btn btn-outline text-xs px-2.5 py-1.5 font-bold text-emerald-800 hover:bg-emerald-50 hover:border-emerald-400 flex items-center gap-1"
                        title="Officer Acknowledge"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    )}

                    {alertItem.priority !== 'CRITICAL' && (
                      <button
                        onClick={(e) => openEscalate(alertItem, e)}
                        className="btn btn-outline text-xs px-2.5 py-1.5 font-bold text-rose-800 hover:bg-rose-50 hover:border-rose-400 flex items-center gap-1"
                        title="Escalate to Senior Officer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Escalate
                      </button>
                    )}

                    {!alertItem.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(alertItem.id, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Mark as Read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {(alertItem.case_id || alertItem.parcel_id || alertItem.project_id) && (
                      <button
                        onClick={() => handleNavigateToRecord(alertItem)}
                        className="btn btn-primary text-xs px-3 py-1.5 font-bold bg-blue-700 hover:bg-blue-800 border-blue-800 flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedAlertIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-slideUp text-xs">
          <div className="flex items-center gap-2 font-bold pr-2 border-r border-slate-700">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>{selectedAlertIds.size} Alerts Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('ACKNOWLEDGE')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg font-bold flex items-center gap-1 text-white shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Bulk Acknowledge
            </button>

            <button
              onClick={() => handleBulkAction('ESCALATE')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded-lg font-bold flex items-center gap-1 text-white shadow-sm"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Bulk Escalate (L3)
            </button>

            <button
              onClick={() => handleBulkAction('MARK_READ')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-slate-200"
            >
              Mark Read
            </button>

            <button
              onClick={() => setSelectedAlertIds(new Set())}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Escalation Trail Visualizer Modal */}
      {isEscalationTrailModalOpen && trailAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn text-xs">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  Statutory Escalation &amp; SLA Hierarchy Trail
                </h3>
              </div>
              <button
                onClick={() => setIsEscalationTrailModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900 text-xs">{trailAlert.title}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">{trailAlert.message}</p>
              </div>

              {/* Step Timeline */}
              <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* L1 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white">
                    1
                  </div>
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-amber-950">Level 1: Field &amp; Revenue Officer (FRO)</p>
                      <span className="text-[9px] font-mono text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded">
                        Day 0 – 7
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Ground verification, boundary survey, and title inquiry notifications under Section 3A.
                    </p>
                  </div>
                </div>

                {/* L2 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white">
                    2
                  </div>
                  <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-orange-950">Level 2: District Land Acquisition Officer (DLAO)</p>
                      <span className="text-[9px] font-mono text-orange-800 bg-orange-200/60 px-1.5 py-0.2 rounded">
                        Day 8 – 14
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Statutory Award Enquiry, Compensation assessment approval, and Section 3D declaration compliance.
                    </p>
                  </div>
                </div>

                {/* L3 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-white">
                    3
                  </div>
                  <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-rose-950">Level 3: Senior Authority (SGA / Joint Secretary)</p>
                      <span className="text-[9px] font-mono text-rose-800 bg-rose-200/60 px-1.5 py-0.2 rounded">
                        Day 15+ (Critical)
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Direct executive review, statutory inquiry, and inter-departmental dispute escalation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Statutory Act Reference */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-indigo-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-700 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-0.5">
                  <p className="font-bold">Statutory SLA Compliance Reference</p>
                  <p className="text-indigo-900/80">
                    Governed by RFCTLARR Act 2013 &amp; Section 3G of National Highways Act 1956. Unresolved breaches past 15 days require formal report submission to the District Collector.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsEscalationTrailModalOpen(false)}
                  className="btn btn-primary text-xs px-4 py-2 bg-slate-900 hover:bg-slate-800"
                >
                  Close Trail View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      {isAcknowledgeModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Record Statutory Acknowledgement
                </h3>
              </div>
              <button
                onClick={() => setIsAcknowledgeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAcknowledge} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedAlert.title}</p>
                <p className="text-slate-600">{selectedAlert.message}</p>
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">
                  Officer Action Remarks / Resolution Plan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={acknowledgeRemarks}
                  onChange={(e) => setAcknowledgeRemarks(e.target.value)}
                  placeholder="State the remedial action taken or timeline for resolution..."
                  className="form-input text-xs w-full mt-1"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                By acknowledging, you confirm formal notification as an authorized officer and log your statutory response in the official audit trail.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAcknowledgeModalOpen(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary text-xs px-4 py-2 bg-emerald-800 hover:bg-emerald-900 border-emerald-900 font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Submit Acknowledgement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {isEscalateModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <h3 className="font-bold text-rose-950 text-sm">
                  Escalate Alert to Higher Authority
                </h3>
              </div>
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEscalate} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">{selectedAlert.title}</p>
                <p className="text-slate-600">{selectedAlert.message}</p>
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">
                  Target Escalation Authority *
                </label>
                <select
                  value={escalateTargetRole}
                  onChange={(e) => setEscalateTargetRole(e.target.value)}
                  className="form-select text-xs w-full mt-1"
                >
                  <option value="SGA">Senior Government Authority (SGA / Joint Secretary)</option>
                  <option value="DLAO">District Land Acquisition Officer (DLAO)</option>
                  <option value="ADMIN">State System Administrator (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="form-label font-bold text-slate-700">
                  Reason for High-Priority Escalation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Specify why normal SLA resolution failed and immediate senior intervention is needed..."
                  className="form-input text-xs w-full mt-1"
                />
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                Escalation upgrades this issue to <strong>CRITICAL PRIORITY</strong> and dispatches statutory notifications to the designated higher authority.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 border-rose-800 font-bold"
                >
                  {actionLoading ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
