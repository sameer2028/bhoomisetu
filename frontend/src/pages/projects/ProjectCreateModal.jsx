import { useState } from 'react';
import api from '../../services/api';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

export default function ProjectCreateModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'National Highway',
    implementing_agency: 'National Highways Authority of India (NHAI)',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    taluk: 'Sarojini Nagar',
    total_area_required: '',
    start_date: '',
    expected_end_date: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/projects', formData);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-floating border border-slate-200/90 w-full max-w-2xl overflow-hidden fade-in my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-700 shadow-sm">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Create New Acquisition Project</h2>
              <p className="text-[11px] text-slate-500 font-medium">Define land requirement, geography &amp; implementing agency</p>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Project Title *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Purvanchal Industrial Link Expressway"
                className="form-input"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Project Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                placeholder="Brief summary of acquisition objective and corridor scope..."
                className="form-input resize-none"
              />
            </div>

            <div>
              <label className="form-label">Project Type</label>
              <select name="project_type" value={formData.project_type} onChange={handleChange} className="form-select">
                <option value="National Highway">National Highway</option>
                <option value="Expressway">Expressway</option>
                <option value="Railways Infrastructure">Railways Infrastructure</option>
                <option value="Irrigation & Waterways">Irrigation &amp; Waterways</option>
                <option value="Industrial Corridor">Industrial Corridor</option>
                <option value="Airport Infrastructure">Airport Infrastructure</option>
              </select>
            </div>

            <div>
              <label className="form-label">Implementing Agency *</label>
              <input
                type="text"
                name="implementing_agency"
                value={formData.implementing_agency}
                onChange={handleChange}
                placeholder="e.g. NHAI / DFCCIL / YEIDA"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Total Land Required (Acres) *</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                name="total_area_required"
                value={formData.total_area_required}
                onChange={handleChange}
                placeholder="e.g. 500.00"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">District</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Taluk / Tehsil</label>
              <input
                type="text"
                name="taluk"
                value={formData.taluk}
                onChange={handleChange}
                placeholder="e.g. Sarojini Nagar"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Project Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Expected Completion Date</label>
              <input
                type="date"
                name="expected_end_date"
                value={formData.expected_end_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary text-xs font-semibold flex items-center gap-1.5">
              {loading ? <span className="spinner !border-white/30 !border-t-white" /> : <FolderPlus className="w-4 h-4" />}
              Submit Project Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

