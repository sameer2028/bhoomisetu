import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import CompensationDetailModal from './CompensationDetailModal';
import CompensationCreateModal from './CompensationCreateModal';
import {
  IndianRupee,
  Search,
  Filter,
  Building2,
  ChevronRight,
  User,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  MapPin,
} from 'lucide-react';

/**
 * Format currency in Indian format (₹ xx,xx,xxx)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format compact currency in Lakhs / Crores for top KPI summaries
 */
function formatCompactINR(amount) {
  const num = Number(amount) || 0;
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return formatCurrency(num);
}

export default function CompensationListPage() {
  const { hasRole } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectIdFilter, setProjectIdFilter] = useState('');
  const [projects, setProjects] = useState([]);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fully dynamic summary calculations from the currently visible/filtered records
  const summary = useMemo(() => {
    let totalAssessed = 0;
    let totalPaid = 0;
    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let pendingCount = 0;

    for (const r of records) {
      const assessed = Math.max(0, Number(r.assessed_amount) || 0);
      const paid = Math.max(0, Number(r.paid_amount) || 0);
      totalAssessed += assessed;
      totalPaid += paid;

      const status = r.payment_status;
      if (status === 'Fully Paid' || (paid >= assessed && assessed > 0)) {
        fullyPaidCount++;
      } else if (status === 'Partially Paid' || (paid > 0 && paid < assessed)) {
        partiallyPaidCount++;
      } else {
        pendingCount++;
      }
    }

    const totalPending = Math.max(0, totalAssessed - totalPaid);
    const percentageComplete = totalAssessed > 0
      ? Number(((totalPaid / totalAssessed) * 100).toFixed(1))
      : 0;

    return {
      total_assessed: totalAssessed,
      total_paid: totalPaid,
      total_pending: totalPending,
      percentage_complete: percentageComplete,
      total_records: records.length,
      fully_paid_count: fullyPaidCount,
      partially_paid_count: partiallyPaidCount,
      pending_count: pendingCount,
    };
  }, [records]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects?limit=100');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects list:', err);
    }
  }, []);

  const fetchCompensation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.payment_status = statusFilter;
      if (projectIdFilter) params.project_id = projectIdFilter;

      const res = await api.get('/compensation', { params });
      setRecords(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch compensation records:', err);
      setError(err.response?.data?.error || 'Failed to load compensation records.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, projectIdFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchCompensation();
  }, [fetchCompensation]);

  const handleRecordUpdated = (updatedRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    );
    setSelectedRecord(updatedRecord);
  };

  const handleRecordCreated = () => {
    fetchCompensation();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Fully Paid':
        return (
          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-flex items-center gap-1.5 px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fully Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="badge bg-amber-50 text-amber-800 border border-amber-200 font-bold inline-flex items-center gap-1.5 px-2.5 py-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Partially Paid
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="badge bg-rose-50 text-rose-700 border border-rose-200 font-bold inline-flex items-center gap-1.5 px-2.5 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Pending
          </span>
        );
    }
  };

  const canCreate = hasRole('DLAO', 'PIA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-emerald-600" /> Compensation &amp; Disbursement Management
          </h1>
          <p className="page-subtitle">
            Statutory Land Acquisition Awards, Direct Benefit Transfers &amp; Disbursement Monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchCompensation()}
            className="btn btn-secondary text-xs font-semibold flex items-center gap-1.5"
            title="Refresh records"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-success text-xs font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Record Compensation
            </button>
          )}
        </div>
      </div>

      {/* Top Progress & KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Assessed */}
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Assessed</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-0.5">{formatCompactINR(summary.total_assessed)}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Across {summary.total_records} assessed parcels</p>
        </div>

        {/* Total Paid */}
        <div className="kpi-card kpi-card-green">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Disbursed</p>
              <p className="text-xl font-black text-emerald-700 leading-none mt-0.5">{formatCompactINR(summary.total_paid)}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">{summary.fully_paid_count} settled • {summary.partially_paid_count} partial</p>
        </div>

        {/* Total Pending */}
        <div className="kpi-card kpi-card-amber">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Release</p>
              <p className="text-xl font-black text-amber-700 leading-none mt-0.5">{formatCompactINR(summary.total_pending)}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">{summary.pending_count} pending DBT mandate</p>
        </div>

        {/* Overall Completion Progress */}
        <div className="kpi-card kpi-card-green">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disbursement Progress</p>
              <p className="text-xl font-black text-teal-800 leading-none mt-0.5">{summary.percentage_complete}%</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.percentage_complete)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modern Compact Horizontal Enterprise Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-3 flex flex-wrap lg:flex-nowrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] w-full lg:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by beneficiary name, award reference no., parcel code, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input form-input-search text-xs w-full"
          />
        </div>

        {/* Dropdowns & Controls */}
        <select
          value={projectIdFilter}
          onChange={(e) => setProjectIdFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[180px]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.project_code}] {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select text-xs w-auto min-w-[160px]"
        >
          <option value="">All Payment Statuses</option>
          <option value="Fully Paid">Fully Paid</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Pending">Pending</option>
        </select>

        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer select-none text-xs font-semibold text-slate-700 whitespace-nowrap transition-colors flex-shrink-0">
          <input
            type="checkbox"
            checked={statusFilter === 'Pending'}
            onChange={(e) => setStatusFilter(e.target.checked ? 'Pending' : '')}
            className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
          />
          <Clock className={`w-3.5 h-3.5 ${statusFilter === 'Pending' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className={statusFilter === 'Pending' ? 'text-amber-700 font-bold' : ''}>Pending Only</span>
        </label>

        <button
          onClick={() => { setSearch(''); setStatusFilter(''); setProjectIdFilter(''); }}
          className="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
        </button>
      </div>

      {/* Compensation Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading compensation records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <IndianRupee className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Compensation Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter || projectIdFilter
              ? 'No compensation records match your selected filters. Try clearing or adjusting search filters.'
              : 'No compensation awards have been registered in the system yet.'}
          </p>
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn btn-success text-xs font-semibold inline-flex items-center gap-1.5 mt-4"
            >
              <Plus className="w-4 h-4" /> Add First Compensation Record
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden shadow-card border border-slate-200/90">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcel Code</th>
                  <th>Owner Name</th>
                  <th>Associated Project</th>
                  <th>Assessed Amount</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="font-mono font-bold text-blue-900 text-xs">
                      <div>{item.parcel_code}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Survey {item.survey_number}</div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{item.owner_name || 'Owner N/A'}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 pl-5">
                        {item.village}, {item.district}
                      </div>
                    </td>

                    <td>
                      {item.project_code ? (
                        <Link
                          to={`/projects/${item.project_id}`}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[190px]">
                            [{item.project_code}] {item.project_name}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="font-extrabold text-slate-900 text-xs">
                      {formatCurrency(item.assessed_amount)}
                    </td>

                    <td className="font-bold text-emerald-700 text-xs">
                      <div>{formatCurrency(item.paid_amount)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {Number(item.assessed_amount) > 0
                          ? `${Math.min(100, Math.round((Number(item.paid_amount || 0) / Number(item.assessed_amount)) * 100))}% disbursed`
                          : '0% disbursed'}
                      </div>
                    </td>

                    <td>{getStatusBadge(item.payment_status)}</td>

                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecord(item);
                          setIsDetailOpen(true);
                        }}
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        View Record <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail & Edit Modal */}
      <CompensationDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        onUpdated={handleRecordUpdated}
      />

      {/* Create Modal */}
      <CompensationCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleRecordCreated}
      />
    </div>
  );
}
