import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  X,
  IndianRupee,
  Calendar,
  FileText,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Save,
  Check,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
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
 * Convert number into Indian currency words representation (Crores, Lakhs, Thousands)
 */
function numberToIndianWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Rupees';
  if (n < 0) return 'Negative Amount';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(v) {
    if (v < 20) return single[v];
    return tens[Math.floor(v / 10)] + (v % 10 !== 0 ? ' ' + single[v % 10] : '');
  }

  function convertThreeDigits(v) {
    let str = '';
    if (Math.floor(v / 100) > 0) {
      str += single[Math.floor(v / 100)] + ' Hundred ';
    }
    const rem = v % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  let crore = Math.floor(n / 10000000);
  let lakh = Math.floor((n % 10000000) / 100000);
  let thousand = Math.floor((n % 100000) / 1000);
  let remainder = n % 1000;

  let res = '';
  if (crore > 0) res += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) res += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) res += convertThreeDigits(thousand) + ' Thousand ';
  if (remainder > 0) res += convertThreeDigits(remainder) + ' ';

  return (res.trim() + ' Rupees').replace(/\s+/g, ' ');
}

export default function CompensationDetailModal({ isOpen, onClose, record, onUpdated }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'update'
  const [formData, setFormData] = useState({
    paid_amount: 0,
    payment_status: 'Pending',
    payment_date: '',
    remarks: '',
    assessed_amount: 0,
    owner_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (record) {
      setFormData({
        paid_amount: record.paid_amount ?? 0,
        payment_status: record.payment_status || 'Pending',
        payment_date: record.payment_date ? record.payment_date.split('T')[0] : '',
        remarks: record.remarks || '',
        assessed_amount: record.assessed_amount ?? 0,
        owner_name: record.owner_name || '',
      });
      setError('');
      setSuccessMsg('');
      setActiveTab('details');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const currentAssessed = Number(formData.assessed_amount) || 0;
  const currentPaid = Number(formData.paid_amount) || 0;
  const currentPending = Math.max(0, currentAssessed - currentPaid);
  const pctPaid = currentAssessed > 0 ? Math.min(100, ((currentPaid / currentAssessed) * 100)).toFixed(1) : '0';

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

  /**
   * Smart handler when user changes Paid Amount
   */
  const handlePaidAmountChange = (val) => {
    const rawVal = val === '' ? '' : Number(val);
    const newPaid = Number(val) || 0;
    const assessed = Number(formData.assessed_amount) || 0;

    let newStatus = 'Pending';
    if (newPaid >= assessed && assessed > 0) {
      newStatus = 'Fully Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partially Paid';
    }

    setFormData((prev) => ({
      ...prev,
      paid_amount: rawVal,
      payment_status: newStatus,
      payment_date: newPaid > 0 && !prev.payment_date ? new Date().toISOString().split('T')[0] : prev.payment_date,
    }));
    setError('');
  };

  /**
   * Smart handler when user manually switches Status dropdown
   */
  const handleStatusChange = (newStatus) => {
    const assessed = Number(formData.assessed_amount) || 0;
    let newPaid = Number(formData.paid_amount) || 0;
    let newDate = formData.payment_date;

    if (newStatus === 'Fully Paid') {
      newPaid = assessed;
      if (!newDate) newDate = new Date().toISOString().split('T')[0];
    } else if (newStatus === 'Pending') {
      newPaid = 0;
    } else if (newStatus === 'Partially Paid') {
      if (newPaid <= 0 || newPaid >= assessed) {
        newPaid = Math.round(assessed * 0.5); // Default 50% for partial
      }
      if (!newDate) newDate = new Date().toISOString().split('T')[0];
    }

    setFormData((prev) => ({
      ...prev,
      payment_status: newStatus,
      paid_amount: newPaid,
      payment_date: newDate,
    }));
    setError('');
  };

  /**
   * Preset percentage quick buttons (0%, 25%, 50%, 75%, 100%)
   */
  const handleSetPercentage = (pct) => {
    const assessed = Number(formData.assessed_amount) || 0;
    const calculatedPaid = Math.round((assessed * pct) / 100);
    let status = 'Pending';
    if (pct === 100) status = 'Fully Paid';
    else if (pct > 0) status = 'Partially Paid';

    setFormData((prev) => ({
      ...prev,
      paid_amount: calculatedPaid,
      payment_status: status,
      payment_date: pct > 0 ? (prev.payment_date || new Date().toISOString().split('T')[0]) : '',
    }));
    setError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const finalAssessed = Number(formData.assessed_amount) || 0;
    const finalPaid = Number(formData.paid_amount) || 0;

    if (finalPaid < 0) {
      setError('Paid amount cannot be negative.');
      return;
    }

    if (finalPaid > finalAssessed && finalAssessed > 0) {
      setError(`Paid amount (₹${finalPaid.toLocaleString('en-IN')}) cannot exceed assessed amount (₹${finalAssessed.toLocaleString('en-IN')}).`);
      return;
    }

    if (formData.payment_status === 'Fully Paid' && finalPaid < finalAssessed) {
      setError(`Cannot mark status as 'Fully Paid' when Paid Amount (${formatCurrency(finalPaid)}) is less than Assessed Amount (${formatCurrency(finalAssessed)}). Click "100% Full Award" or select "Partially Paid".`);
      return;
    }

    if (formData.payment_status === 'Pending' && finalPaid > 0) {
      setError(`Status cannot be 'Pending' when Paid Amount is ${formatCurrency(finalPaid)}. Please select 'Partially Paid' or set Paid Amount to ₹0.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        paid_amount: finalPaid,
        payment_status: formData.payment_status,
        payment_date: formData.payment_date || null,
        remarks: formData.remarks,
        assessed_amount: finalAssessed,
        owner_name: formData.owner_name,
      };

      const res = await api.put(`/compensation/${record.id}`, payload);
      setSuccessMsg('Compensation record successfully updated & verified!');
      if (onUpdated) onUpdated(res.data.data);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update compensation record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-floating border border-slate-200/90 w-full max-w-2xl overflow-hidden fade-in my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/90 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {record.parcel_code}
                </span>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  Compensation Award &amp; Disbursement
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Owner: <span className="text-slate-800 font-semibold">{record.owner_name || 'Land Owner'}</span> • Survey No: {record.survey_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/40">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Overview &amp; Breakdown
          </button>
          <button
            onClick={() => setActiveTab('update')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'update'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Save className="w-3.5 h-3.5" /> Disburse Payment &amp; Edit
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-900 leading-snug">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Overview & Details */}
        {activeTab === 'details' && (
          <div className="p-6 space-y-5">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Assessed Award</span>
                <span className="text-base font-black text-slate-900 mt-1 block">
                  {formatCurrency(record.assessed_amount)}
                </span>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                  {numberToIndianWords(record.assessed_amount)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider block">Amount Disbursed</span>
                <span className="text-base font-black text-emerald-800 mt-1 block">
                  {formatCurrency(record.paid_amount)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  {((Number(record.paid_amount) / (Number(record.assessed_amount) || 1)) * 100).toFixed(1)}% Settled
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wider block">Remaining Balance</span>
                <span className="text-base font-black text-amber-900 mt-1 block">
                  {formatCurrency(Math.max(0, Number(record.assessed_amount) - Number(record.paid_amount)))}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                  {(100 - (Number(record.paid_amount) / (Number(record.assessed_amount) || 1)) * 100).toFixed(1)}% Due
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Settlement Progress
                </span>
                <span className="font-extrabold text-slate-800">
                  {((Number(record.paid_amount) / (Number(record.assessed_amount) || 1)) * 100).toFixed(1)}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    Number(record.paid_amount) >= Number(record.assessed_amount) && Number(record.assessed_amount) > 0
                      ? 'bg-emerald-500'
                      : Number(record.paid_amount) > 0
                      ? 'bg-amber-500'
                      : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.min(100, (Number(record.paid_amount) / (Number(record.assessed_amount) || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Land &amp; Project Info</div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500 text-[11px]">Associated Project</div>
                    <div className="font-semibold text-slate-800">
                      {record.project_name ? `[${record.project_code}] ${record.project_name}` : 'Unassigned Project'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500 text-[11px]">Village / District</div>
                    <div className="font-semibold text-slate-800">
                      {record.village}, {record.district} ({record.area_acres} Acres)
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disbursement Status</div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500 text-[11px]">Payment Date</div>
                    <div className="font-semibold text-slate-800">
                      {record.payment_date
                        ? new Date(record.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Not yet disbursed'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-slate-500 text-[11px]">Status Badge</div>
                    <div className="mt-0.5">{getStatusBadge(record.payment_status)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks / Audit Note */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Disbursement Remarks &amp; Audit Notes
              </span>
              <p className="text-xs text-slate-700 italic leading-relaxed">
                {record.remarks || 'No remarks recorded for this compensation assessment.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Disburse Payment & Edit Form */}
        {activeTab === 'update' && (
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            {/* Quick Settle Action Bar */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Quick Settlement Presets:
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {pctPaid}% Selected
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPercentage(0)}
                  className="py-1 px-1 rounded text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors text-center"
                >
                  0% Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPercentage(25)}
                  className="py-1 px-1 rounded text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 transition-colors text-center"
                >
                  25% (1st Tranche)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPercentage(50)}
                  className="py-1 px-1 rounded text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 transition-colors text-center"
                >
                  50% (Half)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPercentage(75)}
                  className="py-1 px-1 rounded text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 transition-colors text-center"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPercentage(100)}
                  className="py-1 px-1 rounded text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors text-center"
                >
                  100% Full Award
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Land Owner Name</label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="form-input text-xs"
                  placeholder="Owner name"
                  required
                />
              </div>

              <div>
                <label className="form-label">Payment Status (Auto-calculated)</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="form-select text-xs font-bold"
                  required
                >
                  <option value="Pending">Pending (₹0 Paid)</option>
                  <option value="Partially Paid">Partially Paid (Tranche)</option>
                  <option value="Fully Paid">Fully Paid (100% Settled)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Assessed Award Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.assessed_amount}
                  onChange={(e) => setFormData({ ...formData, assessed_amount: e.target.value })}
                  className="form-input text-xs font-semibold text-slate-900"
                  placeholder="e.g. 7250000"
                  required
                />
                <div className="text-[10px] text-slate-500 mt-1 italic truncate">
                  {numberToIndianWords(formData.assessed_amount)}
                </div>
              </div>

              <div>
                <label className="form-label">Paid / Disbursed Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.paid_amount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                  className="form-input text-xs font-bold text-emerald-800"
                  placeholder="e.g. 7250000"
                  required
                />
                <div className="text-[10px] text-emerald-700 font-semibold mt-1 italic truncate">
                  {numberToIndianWords(formData.paid_amount)}
                </div>
              </div>

              {/* Dynamic Live Balance Preview */}
              <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">Calculated Remaining Balance</span>
                  <span className="font-extrabold text-amber-900 text-sm">
                    {formatCurrency(currentPending)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px] block">Disbursement Rate</span>
                  <span className="font-extrabold text-slate-800 text-sm">
                    {pctPaid}%
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Remarks &amp; Payment Reference</label>
                <textarea
                  rows="2"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="form-input text-xs"
                  placeholder="e.g. RTGS UTR number, installment details, or bank reference..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-success text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save & Verify Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
          <span>Record ID: {record.id.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
