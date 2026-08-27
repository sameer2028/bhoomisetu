import { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, IndianRupee, AlertCircle, Plus, Sparkles } from 'lucide-react';

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

export default function CompensationCreateModal({ isOpen, onClose, onCreated }) {
  const [parcels, setParcels] = useState([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [formData, setFormData] = useState({
    parcel_id: '',
    owner_name: '',
    assessed_amount: '',
    paid_amount: '0',
    payment_status: 'Pending',
    payment_date: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingParcels(true);
      api
        .get('/parcels?limit=200')
        .then((res) => {
          setParcels(res.data.data || []);
        })
        .catch((err) => {
          console.error('Failed to load parcels for compensation:', err);
        })
        .finally(() => {
          setLoadingParcels(false);
        });

      setFormData({
        parcel_id: '',
        owner_name: '',
        assessed_amount: '',
        paid_amount: '0',
        payment_status: 'Pending',
        payment_date: '',
        remarks: '',
      });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParcelChange = (e) => {
    const selectedId = e.target.value;
    const selectedParcel = parcels.find((p) => p.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      parcel_id: selectedId,
      owner_name: selectedParcel?.owner_name || '',
    }));
  };

  const handlePaidChange = (val) => {
    const rawVal = val === '' ? '' : Number(val);
    const paid = Number(val) || 0;
    const assessed = Number(formData.assessed_amount) || 0;

    let status = 'Pending';
    if (paid >= assessed && assessed > 0) {
      status = 'Fully Paid';
    } else if (paid > 0) {
      status = 'Partially Paid';
    }

    setFormData((prev) => ({
      ...prev,
      paid_amount: rawVal,
      payment_status: status,
      payment_date: paid > 0 && !prev.payment_date ? new Date().toISOString().split('T')[0] : prev.payment_date,
    }));
    setError('');
  };

  const handleStatusChange = (status) => {
    const assessed = Number(formData.assessed_amount) || 0;
    let paid = Number(formData.paid_amount) || 0;
    let date = formData.payment_date;

    if (status === 'Fully Paid') {
      paid = assessed;
      if (!date) date = new Date().toISOString().split('T')[0];
    } else if (status === 'Pending') {
      paid = 0;
    } else if (status === 'Partially Paid') {
      if (paid <= 0 || paid >= assessed) paid = Math.round(assessed * 0.5);
      if (!date) date = new Date().toISOString().split('T')[0];
    }

    setFormData((prev) => ({
      ...prev,
      payment_status: status,
      paid_amount: paid,
      payment_date: date,
    }));
    setError('');
  };

  const handleSetPreset = (pct) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.parcel_id) {
      setError('Please select a land parcel.');
      return;
    }

    const assessed = Number(formData.assessed_amount);
    const paid = Number(formData.paid_amount) || 0;

    if (!assessed || assessed <= 0) {
      setError('Please enter a valid assessed compensation amount.');
      return;
    }

    if (paid < 0) {
      setError('Paid amount cannot be negative.');
      return;
    }

    if (paid > assessed) {
      setError(`Paid amount (₹${paid.toLocaleString('en-IN')}) cannot exceed assessed amount (₹${assessed.toLocaleString('en-IN')}).`);
      return;
    }

    if (formData.payment_status === 'Fully Paid' && paid < assessed) {
      setError(`Cannot mark as 'Fully Paid' when Paid Amount (₹${paid.toLocaleString('en-IN')}) is less than Assessed Amount (₹${assessed.toLocaleString('en-IN')}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        parcel_id: formData.parcel_id,
        owner_name: formData.owner_name,
        assessed_amount: assessed,
        paid_amount: paid,
        payment_status: formData.payment_status,
        payment_date: formData.payment_date || null,
        remarks: formData.remarks || null,
      };

      const res = await api.post('/compensation', payload);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create compensation record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-floating border border-slate-200/90 w-full max-w-xl overflow-hidden fade-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Record New Compensation Assessment
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Set statutory compensation award for a land parcel
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-900 leading-snug">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="form-label">Select Land Parcel *</label>
            <select
              value={formData.parcel_id}
              onChange={handleParcelChange}
              className="form-select text-xs"
              required
              disabled={loadingParcels}
            >
              <option value="">
                {loadingParcels ? 'Loading parcels...' : '-- Select Cadastral Parcel --'}
              </option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.parcel_code}] Survey {p.survey_number} — {p.owner_name || 'Owner N/A'} ({p.village}, {p.district})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Beneficiary / Owner Name *</label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                className="form-input text-xs"
                placeholder="Full Name of Landowner"
                required
              />
            </div>

            <div>
              <label className="form-label">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="form-select text-xs font-semibold"
                required
              >
                <option value="Pending">Pending (₹0 Paid)</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Fully Paid">Fully Paid (100% Settled)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Assessed Compensation Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.assessed_amount}
                onChange={(e) => setFormData({ ...formData, assessed_amount: e.target.value })}
                className="form-input text-xs font-semibold text-slate-900"
                placeholder="e.g. 5000000"
                required
              />
              <div className="text-[10px] text-slate-500 mt-1 italic truncate">
                {numberToIndianWords(formData.assessed_amount)}
              </div>
            </div>

            <div>
              <label className="form-label">Initial Paid Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.paid_amount}
                onChange={(e) => handlePaidChange(e.target.value)}
                className="form-input text-xs font-bold text-emerald-800"
                placeholder="0"
              />
              <div className="text-[10px] text-emerald-700 font-semibold mt-1 italic truncate">
                {numberToIndianWords(formData.paid_amount)}
              </div>
            </div>

            {/* Quick presets if assessed amount entered */}
            {Number(formData.assessed_amount) > 0 && (
              <div className="sm:col-span-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Presets:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetPreset(0)}
                    className="py-0.5 px-2 rounded text-[10.5px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  >
                    0% Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(50)}
                    className="py-0.5 px-2 rounded text-[10.5px] font-bold bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
                  >
                    50% Half
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset(100)}
                    className="py-0.5 px-2 rounded text-[10.5px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    100% Full Award
                  </button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="form-label">Disbursement Date (Optional)</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="form-input text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Remarks / Statutory Notes</label>
              <textarea
                rows="2"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="form-input text-xs"
                placeholder="e.g. Award order number, RTGS details, or escrow notes"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-success text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {loading ? 'Recording...' : 'Record Compensation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
