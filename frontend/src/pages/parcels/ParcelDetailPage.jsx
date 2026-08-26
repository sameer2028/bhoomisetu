import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ParcelBoundaryPreview from '../../components/map/ParcelBoundaryPreview';
import { GEOMETRY_SOURCE_LABELS } from '../../components/map/mapConstants';
import {
  MapPin,
  Building2,
  User,
  Phone,
  ArrowLeft,
  Edit3,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  FileText,
  Save,
  Globe,
  Map,
  Compass,
} from 'lucide-react';

export default function ParcelDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchParcel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parcels/${id}`);
      const p = res.data.data;
      setParcel(p);
      setFormData({
        survey_number: p.survey_number || '',
        village: p.village || '',
        taluk: p.taluk || '',
        district: p.district || '',
        state: p.state || '',
        area_acres: p.area_acres || '',
        owner_name: p.owner_name || '',
        owner_contact: p.owner_contact || '',
        acquisition_status: p.acquisition_status || 'PROPOSED',
        latitude: p.latitude || '',
        longitude: p.longitude || '',
      });
    } catch (err) {
      console.error('Failed to fetch parcel:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchParcel();
  }, [fetchParcel]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put(`/parcels/${id}`, formData);
      setParcel(res.data.data);
      setSuccessMsg('Parcel details updated successfully!');
      setEditing(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update parcel.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="spinner spinner-lg mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading cadastral parcel record...</p>
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Parcel Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The parcel record for ID "{id}" could not be located.</p>
        <Link to="/parcels" className="btn btn-secondary text-xs">
          Back to Parcels List
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROPOSED':
        return <span className="badge badge-proposed"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Proposed</span>;
      case 'NOTIFIED':
        return <span className="badge badge-notified"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Notified</span>;
      case 'UNDER_ACQUISITION':
        return <span className="badge badge-under-acquisition"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Under Acquisition</span>;
      case 'ACQUIRED':
        return <span className="badge badge-acquired"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Acquired</span>;
      case 'POSSESSION_TAKEN':
        return <span className="badge badge-possession-taken"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />Possession Taken</span>;
      case 'RR_ISSUE':
        return <span className="badge badge-rr-issue"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />R&amp;R Flagged</span>;
      default:
        return <span className="badge bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const canEdit = hasRole('DLAO', 'PIA', 'FRO', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link to="/parcels" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Land Parcels List
        </Link>
      </div>

      {/* Header Banner */}
      <div className="card p-6 md:p-8 border-l-4 border-l-emerald-600 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {parcel.parcel_code}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                Survey No. {parcel.survey_number}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
              Survey No. {parcel.survey_number} — {parcel.village}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" /> {parcel.village}, Tehsil: {parcel.taluk || 'N/A'}, District: {parcel.district}, {parcel.state}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {getStatusBadge(parcel.acquisition_status)}

            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-secondary text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit Parcel
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
          <span className="text-xs text-slate-500 uppercase font-semibold">Plot Measure</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{parcel.area_acres} Acres</div>
          <span className="text-xs text-slate-400 font-medium">Cadastral Survey Extent</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Registered Owner</span>
          <div className="text-base font-extrabold text-slate-900 mt-1 truncate">{parcel.owner_name || 'Sample Owner'}</div>
          <span className="text-xs text-slate-400 font-mono mt-0.5 block">{parcel.owner_contact || 'Contact N/A'}</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Associated Project</span>
          <div className="text-xs font-bold text-blue-800 mt-1 truncate">
            {parcel.project_code ? `[${parcel.project_code}] ${parcel.project_name}` : 'Unassigned'}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block truncate">{parcel.implementing_agency || 'N/A'}</span>
        </div>

        <div className="kpi-card">
          <span className="text-xs text-slate-500 uppercase font-semibold">Acquisition Status</span>
          <div className="mt-1.5">{getStatusBadge(parcel.acquisition_status)}</div>
          <span className="text-xs text-slate-400 mt-1 block font-medium">Lifecycle Pipeline</span>
        </div>
      </div>

      {/* Main Grid */}
      {editing ? (
        <div className="card p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-700" /> Edit Parcel Record
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Survey Number</label>
                <input
                  type="text"
                  name="survey_number"
                  value={formData.survey_number}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Acquisition Status</label>
                <select name="acquisition_status" value={formData.acquisition_status} onChange={handleChange} className="form-select">
                  <option value="PROPOSED">PROPOSED</option>
                  <option value="NOTIFIED">NOTIFIED</option>
                  <option value="UNDER_ACQUISITION">UNDER_ACQUISITION</option>
                  <option value="ACQUIRED">ACQUIRED</option>
                  <option value="POSSESSION_TAKEN">POSSESSION_TAKEN</option>
                  <option value="RR_ISSUE">RR_ISSUE</option>
                </select>
              </div>

              <div>
                <label className="form-label">Area (Acres)</label>
                <input
                  type="number"
                  step="0.01"
                  name="area_acres"
                  value={formData.area_acres}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Registered Owner Name</label>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Owner Contact</label>
                <input
                  type="text"
                  name="owner_contact"
                  value={formData.owner_contact}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Village</label>
                <input
                  type="text"
                  name="village"
                  value={formData.village}
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
                <label className="form-label">Taluk / Tehsil</label>
                <input
                  type="text"
                  name="taluk"
                  value={formData.taluk}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  name="longitude"
                  value={formData.longitude}
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
                className="btn btn-success text-xs font-semibold flex items-center gap-1.5"
              >
                {saving ? <span className="spinner !border-white/30 !border-t-white" /> : <Save className="w-4 h-4" />}
                Save Parcel Record
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 md:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" /> Land Ownership &amp; Identification Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Primary Land Owner</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{parcel.owner_name || 'Sample Owner'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Owner Contact Phone</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">{parcel.owner_contact || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Survey Identifier</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{parcel.survey_number}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-semibold uppercase">Plot Extent</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">{parcel.area_acres} Acres</span>
                </div>
              </div>
            </div>

            {/* Modules Status Summary */}
            <div className="card p-6 md:p-8 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Connected Module Status Summary</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-1.5">
                    <IndianRupee className="w-4 h-4 text-blue-600" /> Compensation
                  </div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {parcel.compensation ? parcel.compensation.payment_status : 'Not Assessed Yet'}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Phase 9 Module</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Possession
                  </div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {parcel.possession ? parcel.possession.status : 'Not Taken'}
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Phase 9 Module</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" /> Documents
                  </div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {parcel.total_documents || 0} Attached
                  </span>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium">Phase 7 Module</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700" /> Project Association
              </h2>
              {parcel.project_code ? (
                <div>
                  <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {parcel.project_code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-2">{parcel.project_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{parcel.implementing_agency}</p>
                  <Link
                    to={`/projects/${parcel.project_id}`}
                    className="btn btn-secondary btn-sm w-full mt-4 justify-center text-xs font-semibold"
                  >
                    View Project Dashboard
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">This parcel is not yet linked to any project.</p>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-700" /> Cadastral Boundary (GIS)
                </h2>
                <Link
                  to={`/gis?projectId=${parcel.project_id || ''}`}
                  className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Map className="w-3.5 h-3.5" /> Full GIS map
                </Link>
              </div>

              {/* Live PostGIS boundary preview */}
              <div className="h-48 rounded-xl overflow-hidden border border-slate-200 mb-3.5 shadow-inner">
                <ParcelBoundaryPreview parcelId={parcel.id} />
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Latitude</span>
                  <span className="font-mono font-bold">
                    {parcel.latitude != null ? Number(parcel.latitude).toFixed(6) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Longitude</span>
                  <span className="font-mono font-bold">
                    {parcel.longitude != null ? Number(parcel.longitude).toFixed(6) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Recorded Area</span>
                  <span className="font-bold">{parcel.area_acres} acres</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Measured from Boundary</span>
                  <span className="font-bold">
                    {parcel.gis_measured_acres != null ? `${parcel.gis_measured_acres} acres` : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Boundary Source</span>
                  <span className="font-semibold text-right">
                    {GEOMETRY_SOURCE_LABELS[parcel.geometry_source] || parcel.geometry_source || '—'}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 pt-1 font-medium leading-normal">
                  Spatial layer rendered in EPSG:4326 PostGIS geometry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

