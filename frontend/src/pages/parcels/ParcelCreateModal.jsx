import { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, MapPin, AlertCircle } from 'lucide-react';

export default function ParcelCreateModal({ isOpen, onClose, onCreated, defaultProjectId = '' }) {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: defaultProjectId,
    survey_number: '',
    village: '',
    taluk: '',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    area_acres: '',
    owner_name: '',
    owner_contact: '',
    latitude: '',
    longitude: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch available projects for dropdown
      api.get('/projects?limit=100').then((res) => {
        setProjects(res.data.data || []);
      }).catch(console.error);

      if (defaultProjectId) {
        setFormData((prev) => ({ ...prev, project_id: defaultProjectId }));
      }
    }
  }, [isOpen, defaultProjectId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/parcels', formData);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create parcel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-2xl overflow-hidden fade-in my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Add New Land Parcel</h2>
              <p className="text-xs text-neutral-500">Register land record parcel and assign to acquisition project</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Associated Acquisition Project</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Select Associated Project (Optional)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.project_code}] {p.name} ({p.district})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Survey Number *</label>
              <input
                type="text"
                name="survey_number"
                value={formData.survey_number}
                onChange={handleChange}
                placeholder="e.g. 123/2 or 45/A"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Area (in Acres) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="area_acres"
                value={formData.area_acres}
                onChange={handleChange}
                placeholder="e.g. 2.50"
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Village *</label>
              <input
                type="text"
                name="village"
                value={formData.village}
                onChange={handleChange}
                placeholder="e.g. Sarai Khas"
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
              <label className="form-label">District</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="form-input"
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
              />
            </div>

            <div>
              <label className="form-label">Owner Name</label>
              <input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                placeholder="e.g. Rameshwar Prasad Sharma"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Owner Contact Number</label>
              <input
                type="text"
                name="owner_contact"
                value={formData.owner_contact}
                onChange={handleChange}
                placeholder="e.g. +91 98390 12345"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">GPS Latitude (Optional)</label>
              <input
                type="number"
                step="0.000001"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g. 26.846700"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">GPS Longitude (Optional)</label>
              <input
                type="number"
                step="0.000001"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g. 80.946200"
                className="form-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-success text-xs flex items-center gap-1.5">
              {loading ? <span className="spinner" /> : <MapPin className="w-4 h-4" />}
              Save Land Parcel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
