import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FolderKanban,
  MapPin,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  Save,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      const p = res.data.data;
      setProject(p);
      setFormData({
        name: p.name || '',
        description: p.description || '',
        project_type: p.project_type || '',
        implementing_agency: p.implementing_agency || '',
        state: p.state || '',
        district: p.district || '',
        taluk: p.taluk || '',
        total_area_required: p.total_area_required || '',
        total_area_acquired: p.total_area_acquired || '',
        status: p.status || 'PROPOSED',
        start_date: p.start_date || '',
        expected_end_date: p.expected_end_date || '',
      });
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put(`/projects/${id}`, formData);
      setProject(res.data.data);
      setSuccessMsg('Project updated successfully!');
      setEditing(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <span className="spinner spinner-lg mb-3" />
        <p className="text-sm text-neutral-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-neutral-900">Project Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1 mb-4">The project with ID "{id}" could not be located.</p>
        <Link to="/projects" className="btn btn-secondary text-xs">
          Back to Projects List
        </Link>
      </div>
    );
  }

  const reqArea = project.total_area_required || 0;
  const acqArea = project.total_area_acquired || 0;
  const pct = reqArea > 0 ? Math.min(100, Math.round((acqArea / reqArea) * 100)) : 0;
  const canEdit = hasRole('DLAO', 'PIA', 'SGA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Projects List
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="card p-6 border-l-4 border-l-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {project.project_code}
              </span>
              <span className="text-xs text-neutral-500 uppercase tracking-wider">{project.project_type}</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{project.name}</h1>
            <p className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-400" /> {project.implementing_agency}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              project.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
              project.status === 'APPROVED' ? 'bg-cyan-100 text-cyan-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              {project.status.replace('_', ' ')}
            </span>

            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit Project
              </button>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Total Area Required</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{reqArea} Acres</div>
          <span className="text-xs text-neutral-400">Target Corridor Footprint</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Total Area Acquired</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{acqArea} Acres</div>
          <span className="text-xs text-emerald-600 font-medium">{pct}% Completed</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Linked Parcels</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{project.total_parcels || 0}</div>
          <span className="text-xs text-neutral-400">Surveyed Land Parcels</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Acquisition Cases</span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{project.total_cases || 0}</div>
          <span className="text-xs text-neutral-400">Active Workflow Cases</span>
        </div>
      </div>

      {/* Main Content Grid */}
      {editing ? (
        <div className="card p-6">
          <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-700" /> Edit Project Details
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                  <option value="PROPOSED">PROPOSED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="form-label">Implementing Agency</label>
                <input
                  type="text"
                  name="implementing_agency"
                  value={formData.implementing_agency}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Total Area Required (Acres)</label>
                <input
                  type="number"
                  step="0.01"
                  name="total_area_required"
                  value={formData.total_area_required}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Total Area Acquired (Acres)</label>
                <input
                  type="number"
                  step="0.01"
                  name="total_area_acquired"
                  value={formData.total_area_acquired}
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
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Expected End Date</label>
                <input
                  type="date"
                  name="expected_end_date"
                  value={formData.expected_end_date}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                {saving ? <span className="spinner" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview & Geography */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-3">Project Description &amp; Scope</h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {project.description || 'No detailed scope description provided.'}
              </p>

              <div className="mt-6 pt-6 border-t border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-700" /> Overall Acquisition Progress
                </h3>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-neutral-500 font-medium">Acquired Footprint</span>
                  <span className="font-bold text-neutral-900">{acqArea} / {reqArea} Acres ({pct}%)</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      pct === 100 ? 'bg-emerald-600' : 'bg-blue-700'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-700" /> Geographical Extent
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-100">
                  <span className="text-xs text-neutral-400 block font-medium">State</span>
                  <span className="text-sm font-bold text-neutral-800">{project.state || 'N/A'}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-100">
                  <span className="text-xs text-neutral-400 block font-medium">District</span>
                  <span className="text-sm font-bold text-neutral-800">{project.district || 'N/A'}</span>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-100">
                  <span className="text-xs text-neutral-400 block font-medium">Taluk / Tehsil</span>
                  <span className="text-sm font-bold text-neutral-800">{project.taluk || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" /> Authorities &amp; Contacts
              </h2>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-neutral-400 block">Implementing Agency</span>
                  <span className="font-semibold text-neutral-800">{project.implementing_agency}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Created By</span>
                  <span className="font-medium text-neutral-800">{project.creator_name || 'System Admin'}</span>
                  {project.creator_email && <span className="text-xs text-neutral-400 block">{project.creator_email}</span>}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" /> Timeline &amp; Schedule
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-xs text-neutral-500">Start Date</span>
                  <span className="font-medium text-neutral-800">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not Set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-xs text-neutral-500">Expected End Date</span>
                  <span className="font-medium text-neutral-800">{project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'Not Set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
