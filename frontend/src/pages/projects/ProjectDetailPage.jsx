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
  Map as MapIcon,
  Route,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Flame,
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

  // Risk Score State
  const [riskData, setRiskData] = useState(null);
  const [isRiskExpanded, setIsRiskExpanded] = useState(true);
  const [recalculatingRisk, setRecalculatingRisk] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, riskRes] = await Promise.allSettled([
        api.get(`/projects/${id}`),
        api.get(`/ai/risk-scores/${id}`),
      ]);

      if (projRes.status === 'fulfilled') {
        const p = projRes.value.data.data;
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
      }

      if (riskRes.status === 'fulfilled' && riskRes.value.data?.data?.risk) {
        setRiskData(riskRes.value.data.data.risk);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRecalculateRisk = async () => {
    setRecalculatingRisk(true);
    try {
      const res = await api.post(`/ai/risk-scores/${id}/recalculate`);
      if (res.data?.data?.risk) {
        setRiskData(res.data.data.risk);
        setSuccessMsg('Risk score recomputed successfully from live project metrics!');
      }
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
    } finally {
      setRecalculatingRisk(false);
    }
  };

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
      <div className="py-20 text-center">
        <div className="spinner spinner-lg mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The project with ID "{id}" could not be located in records.</p>
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
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Infrastructure Projects
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="card p-6 md:p-8 border-l-4 border-l-blue-800 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {project.project_code}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                {project.project_type}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{project.name}</h1>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
              <Building2 className="w-4 h-4 text-slate-400" /> {project.implementing_agency}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Score Badge */}
            {riskData && (
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                  riskData.risk_level === 'HIGH' || riskData.risk_level === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : riskData.risk_level === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                }`}
                title="AI Project Risk Index (0-100)"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${
                  riskData.risk_level === 'HIGH' || riskData.risk_level === 'CRITICAL'
                    ? 'text-rose-600'
                    : riskData.risk_level === 'MEDIUM'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`} />
                <span>Risk Score: {riskData.score}/100 • {riskData.risk_level} RISK</span>
              </span>
            )}

            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              project.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
              project.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              project.status === 'APPROVED' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
              'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {project.status?.replace('_', ' ')}
            </span>

            <Link
              to={`/projects/${project.id}/gis`}
              className="btn btn-primary text-xs font-semibold flex items-center gap-1.5"
              title="Open this project on the GIS map"
            >
              <MapIcon className="w-4 h-4" /> Open GIS Map
            </Link>

            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-secondary text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit Project
              </button>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" /> {errorMsg}
        </div>
      )}

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Area Required</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{reqArea} Acres</div>
          <span className="text-xs text-slate-400 font-medium">Target Footprint</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Area Acquired</span>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{acqArea} Acres</div>
          <span className="text-xs text-emerald-600 font-semibold">{pct}% Completed</span>
        </div>

        <Link to={`/parcels?projectId=${project.id}`} className="kpi-card hover:border-emerald-300 transition-colors group">
          <span className="text-xs text-slate-500 uppercase font-semibold">Linked Parcels</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{project.total_parcels || 0}</div>
          <span className="text-xs text-blue-600 group-hover:underline font-bold flex items-center gap-1 mt-0.5">
            View Project Parcels &rarr;
          </span>
        </Link>

        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Acquisition Cases</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{project.total_cases || 0}</div>
          <span className="text-xs text-slate-400 font-medium">Active Statutory Pipeline</span>
        </div>
      </div>

      {/* Main Content Grid */}
      {editing ? (
        <div className="card p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                {saving ? <span className="spinner !border-white/30 !border-t-white" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview & Geography */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 md:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3">Project Description &amp; Scope</h2>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {project.description || 'No detailed scope description provided for this project.'}
              </p>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-700" /> Overall Acquisition Progress
                </h3>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 font-medium">Acquired Footprint</span>
                  <span className="font-bold text-slate-900">{acqArea} / {reqArea} Acres ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden ring-1 ring-slate-200/50">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      pct === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-700 to-indigo-700'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Risk Score Breakdown Card */}
            {riskData && (
              <div className="card p-6 md:p-8 border-l-4 border-l-rose-600 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" /> AI Project Risk Assessment Breakdown
                      </h2>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                        riskData.risk_level === 'HIGH' || riskData.risk_level === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : riskData.risk_level === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {riskData.score} / 100 ({riskData.risk_level} RISK)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Multi-factor statutory bottleneck analysis • Why this score?
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRecalculateRisk}
                      disabled={recalculatingRisk}
                      className="btn btn-secondary btn-sm text-xs font-semibold flex items-center gap-1.5"
                      title="Recalculate risk score from live database metrics"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${recalculatingRisk ? 'animate-spin' : ''}`} />
                      {recalculatingRisk ? 'Computing...' : 'Recalculate Score'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Factor 1: Overdue Cases */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-800">1. Statutory Overdue Cases (Max 35 pts)</span>
                      <span className="font-extrabold text-rose-700">
                        {riskData.factors?.overdue_cases?.score || 0} / 35 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50">
                      <div
                        className="h-full bg-rose-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((riskData.factors?.overdue_cases?.score || 0) / 35) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {riskData.factors?.overdue_cases?.label || 'Statutory review timelines'}
                    </p>
                  </div>

                  {/* Factor 2: Pending Compensation */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-800">2. Pending Compensation Disbursement (Max 25 pts)</span>
                      <span className="font-extrabold text-amber-700">
                        {riskData.factors?.pending_compensation?.score || 0} / 25 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((riskData.factors?.pending_compensation?.score || 0) / 25) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {riskData.factors?.pending_compensation?.label || 'Award disbursement progress'}
                    </p>
                  </div>

                  {/* Factor 3: R&R Delays */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-800">3. Rehabilitation &amp; Resettlement Delays (Max 20 pts)</span>
                      <span className="font-extrabold text-indigo-700">
                        {riskData.factors?.rr_issues?.score || 0} / 20 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((riskData.factors?.rr_issues?.score || 0) / 20) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {riskData.factors?.rr_issues?.label || 'Family rehabilitation entitlements'}
                    </p>
                  </div>

                  {/* Factor 4: AI Document Discrepancies */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-slate-800">4. AI Document Discrepancies (Max 20 pts)</span>
                      <span className="font-extrabold text-purple-700">
                        {riskData.factors?.document_mismatches?.score || 0} / 20 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-200/50">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((riskData.factors?.document_mismatches?.score || 0) / 20) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {riskData.factors?.document_mismatches?.label || 'Unresolved title deed / survey mismatches'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="card p-6 md:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-700" /> Geographical Extent
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">State</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{project.state || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">District</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{project.district || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Taluk / Tehsil</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{project.taluk || 'N/A'}</span>
                </div>
              </div>

              {/* Spatial corridor summary */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                  <Route className="w-4 h-4 text-blue-700" /> Acquisition Corridor (GIS PostGIS Layer)
                </h3>
                {project.has_corridor ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-400 block font-semibold uppercase">Alignment Length</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {project.corridor_length_km ?? '—'} km
                      </span>
                    </div>
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                      <span className="text-[11px] text-slate-400 block font-semibold uppercase">Right-of-Way Width</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {project.corridor_width_m ?? '—'} m
                      </span>
                    </div>
                    <Link
                      to={`/projects/${project.id}/gis`}
                      className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 hover:border-blue-300 transition-colors group block"
                    >
                      <span className="text-[11px] text-slate-400 block font-semibold uppercase">Mapped Parcels</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {project.total_parcels || 0}
                      </span>
                      <span className="text-[11px] text-blue-700 group-hover:underline font-bold block mt-1">
                        View on GIS map &rarr;
                      </span>
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-medium">
                    No spatial corridor geometry has been defined for this project yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-700" /> Authorities &amp; Contacts
              </h2>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Implementing Agency</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{project.implementing_agency}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Created By</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{project.creator_name || 'System Admin'}</span>
                  {project.creator_email && <span className="text-[11px] text-slate-400 block font-mono mt-0.5">{project.creator_email}</span>}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" /> Timeline &amp; Schedule
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Start Date</span>
                  <span className="font-semibold text-slate-800">{project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Expected End Date</span>
                  <span className="font-semibold text-slate-800">{project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

