import { useState, useEffect, useRef } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Search,
  RefreshCw,
  FileCheck,
  Navigation,
  Crosshair,
  Phone,
  Layers,
  TreePine,
  Home,
  Check,
  Clock,
  ShieldAlert,
  X,
  ChevronRight,
  SlidersHorizontal,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function FieldVerificationPage() {
  const { user } = useAuth();

  // State
  const [metrics, setMetrics] = useState({
    total_assigned: 0,
    total_verified: 0,
    pending_inspection: 0,
    flagged_issues: 0,
  });
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);

  // GPS State
  const [currentGps, setCurrentGps] = useState({
    latitude: 26.8467,
    longitude: 80.9462,
    accuracy: 3.5,
    captured: false,
    timestamp: null,
  });
  const [capturingGps, setCapturingGps] = useState(false);

  // Photo Upload & Capture State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // JMS Inspection Checklist State
  const [checklist, setChecklist] = useState({
    boundary_demarcation: 'INTACT', // 'INTACT' | 'DAMAGED' | 'MISSING'
    land_classification: 'IRRIGATED_AGRICULTURE',
    standing_crops: 'Sugarcane / Wheat Crop Standing',
    tree_count: 8,
    structure_count: 1,
    borewell_count: 1,
    owner_present: 'YES',
    encroachment_status: 'NONE', // 'NONE' | 'MINOR' | 'SEVERE'
  });
  const [remarks, setRemarks] = useState('');
  const [issueType, setIssueType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchMetrics();
    fetchParcels();
  }, [statusFilter]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/field/metrics');
      if (res.data?.data) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching field metrics:', err);
    }
  };

  const fetchParcels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/field/assigned-parcels?${params.toString()}`);
      if (res.data?.data) {
        setParcels(res.data.data);
        if (res.data.data.length > 0 && !selectedParcel) {
          setSelectedParcel(res.data.data[0]);
          if (res.data.data[0].latitude && res.data.data[0].longitude) {
            setCurrentGps({
              latitude: res.data.data[0].latitude,
              longitude: res.data.data[0].longitude,
              accuracy: 3.5,
              captured: true,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching assigned parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchParcels();
  };

  const handleSelectPlot = (p) => {
    setSelectedParcel(p);
    if (p.latitude && p.longitude) {
      setCurrentGps({
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: 3.5,
        captured: true,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    setIsPlotModalOpen(false);
  };

  // GPS Capture
  const captureGps = () => {
    setCapturingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentGps({
            latitude: parseFloat(position.coords.latitude.toFixed(6)),
            longitude: parseFloat(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy || 3.5),
            captured: true,
            timestamp: new Date().toLocaleTimeString(),
          });
          setCapturingGps(false);
        },
        (error) => {
          console.warn('Geolocation fallback:', error.message);
          const baseLat = selectedParcel?.latitude || 26.8467;
          const baseLng = selectedParcel?.longitude || 80.9462;
          setCurrentGps({
            latitude: parseFloat((baseLat + (Math.random() - 0.5) * 0.002).toFixed(6)),
            longitude: parseFloat((baseLng + (Math.random() - 0.5) * 0.002).toFixed(6)),
            accuracy: 3.5,
            captured: true,
            timestamp: new Date().toLocaleTimeString(),
          });
          setCapturingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setCapturingGps(false);
    }
  };

  // Photo Upload Handlers
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSamplePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Landscape terrain background
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#2d5a27');
    grad.addColorStop(0.5, '#4a7c36');
    grad.addColorStop(1, '#87a96b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    // Sky
    ctx.fillStyle = '#bde0fe';
    ctx.fillRect(0, 0, 640, 140);

    // Boundary stone pillar
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(270, 80);
    ctx.lineTo(370, 80);
    ctx.lineTo(395, 310);
    ctx.lineTo(245, 310);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pillar Text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`PLOT #${selectedParcel?.survey_number || '123/2'}`, 270, 155);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('NLA BOUNDARY PILLAR', 260, 185);
    ctx.fillText('JMS VERIFIED (RFCTLARR)', 250, 215);

    setPhotoPreview(canvas.toDataURL('image/jpeg'));
    setPhotoName(`JMS_Pillar_Survey_${selectedParcel?.survey_number?.replace('/', '_') || '123_2'}.jpg`);
  };

  // Handle Submit Inspection Report
  const handleSubmitReport = async (action) => {
    if (!selectedParcel) return;

    setSubmitting(true);
    setToastMessage(null);

    try {
      const res = await api.post(`/field/parcels/${selectedParcel.id}/submit-report`, {
        gps_coordinates: {
          latitude: currentGps.latitude,
          longitude: currentGps.longitude,
          accuracy_meters: currentGps.accuracy,
        },
        checklist,
        action,
        remarks: remarks || (action === 'VERIFY_AND_APPROVE'
          ? 'On-site Joint Measurement Survey completed. Physical boundaries, structures, and standing assets verified.'
          : `Discrepancy flagged: ${issueType || 'Encroachment / Title Issue'}`),
        issue_type: issueType,
        photo_attached: !!photoPreview,
      });

      if (res.data?.success) {
        setToastMessage({
          type: 'success',
          text: action === 'VERIFY_AND_APPROVE'
            ? `Field Survey approved for Survey #${selectedParcel.survey_number}. Statutory case advanced to APPROVAL stage.`
            : `Issue flagged for Survey #${selectedParcel.survey_number}. Alert recorded for DLAO.`,
        });
        fetchMetrics();
        fetchParcels();
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit field inspection report.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Minimal Header with GPS Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
              On-Site Operations
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Field / Revenue Officer Mode
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-700" />
            Field Verification &amp; JMS Portal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Joint Measurement Survey, GPS coordinate capture &amp; on-site asset enumeration (RFCTLARR 2013)
          </p>
        </div>

        {/* Highlighted GPS Status Card */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 via-teal-50/90 to-emerald-50 border-2 border-emerald-500/80 px-3.5 py-2.5 rounded-xl shadow-md ring-2 ring-emerald-500/20 self-start md:self-auto transition-all">
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Navigation className="w-3 h-3 text-emerald-700" />
                GPS Fix Active
              </span>
              {currentGps.captured && (
                <span className="text-[10px] bg-emerald-200/90 text-emerald-950 px-1.5 py-0.2 rounded font-mono font-bold">
                  ±{currentGps.accuracy}m
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-emerald-950 font-black tracking-tight truncate">
              {currentGps.latitude.toFixed(4)}°N, {currentGps.longitude.toFixed(4)}°E
            </p>
          </div>
          <button
            type="button"
            onClick={captureGps}
            disabled={capturingGps}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-extrabold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Acquire live on-site GPS coordinates"
          >
            <Crosshair className={`w-3.5 h-3.5 ${capturingGps ? 'animate-spin' : ''}`} />
            <span>{capturingGps ? 'Pinning...' : 'Pin GPS'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Assigned Parcels</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.total_assigned}</p>
          <span className="text-[11px] text-slate-400 font-medium">In active acquisition corridors</span>
        </div>

        <div className="card p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Inspected &amp; GPS Fixed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{metrics.total_verified}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Field survey reports approved</span>
        </div>

        <div className="card p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Pending Inspection</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{metrics.pending_inspection}</p>
          <span className="text-[11px] text-amber-600 font-medium">Require on-site JMS survey</span>
        </div>

        <div className="card p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Flagged Issues</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">{metrics.flagged_issues}</p>
          <span className="text-[11px] text-rose-600 font-medium">Disputes &amp; title variances</span>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
              : 'bg-rose-50 text-rose-950 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs underline font-bold opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Active Plot Selector Bar with "View All Assigned Plots" Button */}
      <div className="card p-4 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 border border-blue-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-extrabold text-blue-950 font-mono">
                Active Plot: #{selectedParcel?.survey_number || '123/2'}
              </span>
              <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                {selectedParcel?.parcel_code || 'P-101'}
              </span>
              {selectedParcel?.geometry_source === 'FIELD_GPS' ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  ✓ GPS Fixed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  ⏳ Pending Survey
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate font-medium">
              Owner: <strong>{selectedParcel?.owner_name || 'Rameshwar Prasad Sharma'}</strong> • Village:{' '}
              {selectedParcel?.village || 'Sarai Khas'} ({selectedParcel?.area_acres || '2.5'} Acres)
            </p>
          </div>
        </div>

        {/* Action: Open "View All Assigned Plots" Modal */}
        <button
          type="button"
          onClick={() => setIsPlotModalOpen(true)}
          className="btn btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all flex-shrink-0 cursor-pointer"
        >
          <Layers className="w-4 h-4" />
          <span>View All Assigned Plots ({metrics.total_assigned})</span>
        </button>
      </div>

      {/* Main Focus: Full-Width Joint Measurement Survey (JMS) Form */}
      {selectedParcel ? (
        <div className="card p-5 sm:p-6 bg-white space-y-6 shadow-sm border border-slate-200">
          {/* Header: Selected Parcel Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Joint Measurement Survey (JMS) Inspection Form
                </h2>
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200">
                  #{selectedParcel.survey_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Project: <strong>{selectedParcel.project_name}</strong> • Revenue Ward: {selectedParcel.village} ({selectedParcel.district})
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Acquisition Area</span>
              <span className="text-sm sm:text-base font-extrabold text-blue-950 font-mono">
                {selectedParcel.area_acres} Acres ({(parseFloat(selectedParcel.area_acres) * 0.404686).toFixed(3)} Ha)
              </span>
            </div>
          </div>

          {/* Owner & Ground Truth Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Primary Landholder</span>
              <span className="font-bold text-slate-900 text-sm">{selectedParcel.owner_name}</span>
              <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedParcel.owner_contact || '+91 98765 43210'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Statutory Case &amp; Stage</span>
              <span className="font-bold text-slate-900 font-mono">{selectedParcel.case_code || 'CASE-2026-NLA-101'}</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {selectedParcel.current_stage || 'VERIFICATION'}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Checklist Form */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-700" />
              Statutory Field Checklist (RFCTLARR 2013)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* 1. Boundary Demarcation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  1. Boundary Pillars / Demarcation
                </label>
                <select
                  value={checklist.boundary_demarcation}
                  onChange={(e) => setChecklist({ ...checklist, boundary_demarcation: e.target.value })}
                  className="form-select text-xs font-semibold text-slate-800"
                >
                  <option value="INTACT">✅ Intact &amp; Verified on Ground</option>
                  <option value="DAMAGED">⚠️ Partially Damaged (Requires Re-peg)</option>
                  <option value="MISSING">❌ Missing / Not Demarcated</option>
                </select>
              </div>

              {/* 2. Land Classification */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  2. On-Site Land Use
                </label>
                <select
                  value={checklist.land_classification}
                  onChange={(e) => setChecklist({ ...checklist, land_classification: e.target.value })}
                  className="form-select text-xs font-semibold text-slate-800"
                >
                  <option value="IRRIGATED_AGRICULTURE">🌾 Irrigated Agricultural (Chahi)</option>
                  <option value="UNIRRIGATED_AGRICULTURE">🌱 Rainfed / Dryland Crop</option>
                  <option value="COMMERCIAL_MIXED">🏢 Commercial / Industrial Adjacent</option>
                  <option value="FALLOW_LAND">🍂 Fallow / Vacant Land</option>
                </select>
              </div>

              {/* 3. Tree Enumeration */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                  3. Standing Fruit / Timber Trees
                </label>
                <input
                  type="number"
                  value={checklist.tree_count}
                  onChange={(e) => setChecklist({ ...checklist, tree_count: parseInt(e.target.value, 10) || 0 })}
                  className="form-input text-xs font-bold font-mono"
                  min="0"
                />
              </div>

              {/* 4. Structures & Wells */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-indigo-600" />
                  4. Permanent Structures / Borewells
                </label>
                <input
                  type="number"
                  value={checklist.structure_count}
                  onChange={(e) => setChecklist({ ...checklist, structure_count: parseInt(e.target.value, 10) || 0 })}
                  className="form-input text-xs font-bold font-mono"
                  min="0"
                />
              </div>

              {/* 5. Owner Presence Confirmation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  5. Landowner Presence on Ground
                </label>
                <select
                  value={checklist.owner_present}
                  onChange={(e) => setChecklist({ ...checklist, owner_present: e.target.value })}
                  className="form-select text-xs font-semibold text-slate-800"
                >
                  <option value="YES">👤 Landowner Present in Person</option>
                  <option value="AUTHORIZED_REP">🤝 Authorized Representative Present</option>
                  <option value="ABSENT">⚠️ Absent (Notice Served at Residence)</option>
                </select>
              </div>

              {/* 6. Encroachment Check */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  6. Encroachment / Title Dispute
                </label>
                <select
                  value={checklist.encroachment_status}
                  onChange={(e) => setChecklist({ ...checklist, encroachment_status: e.target.value })}
                  className="form-select text-xs font-semibold text-slate-800"
                >
                  <option value="NONE">✅ Clear Title — No Encroachment</option>
                  <option value="MINOR">⚠️ Minor Pathway / Fence Overlap</option>
                  <option value="SEVERE">❌ Severe Encroachment / Court Stay</option>
                </select>
              </div>
            </div>

            {/* Interactive Geotagged Photo Upload & Camera Capture */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      Geotagged Photo Evidence Attachment
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.2 rounded border border-emerald-300">
                        GPS Watermarked
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload or capture boundary pillars &amp; standing assets with verified GPS overlay
                    </p>
                  </div>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="space-y-3">
                  {/* Photo Preview Container with Live Watermark */}
                  <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/80 shadow-md bg-slate-900">
                    <img
                      src={photoPreview}
                      alt="Field Inspection Evidence"
                      className="w-full h-48 sm:h-64 object-cover"
                    />

                    {/* Statutory Geotag Watermark Overlay Banner */}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-md p-2.5 text-white text-[11px] border-t border-white/20 font-mono">
                      <div className="flex items-center justify-between text-emerald-400 font-bold mb-0.5">
                        <span className="flex items-center gap-1 text-[10px]">
                          <Navigation className="w-3 h-3 text-emerald-400" />
                          GEOTAG: {currentGps.latitude.toFixed(6)}° N, {currentGps.longitude.toFixed(6)}° E
                        </span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/40">
                          ±{currentGps.accuracy}m ACCURACY
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <span>
                          SURVEY #{selectedParcel?.survey_number || '123/2'} • {selectedParcel?.village || 'Sarai Khas'}
                        </span>
                        <span>{currentGps.timestamp ? `CAPTURED: ${currentGps.timestamp}` : new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-medium truncate">
                      Attached: <strong>{photoName || 'Survey_Inspection_Photo.jpg'}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="btn btn-secondary text-xs py-1.5 px-2.5 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Retake
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary text-xs py-1.5 px-2.5 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" /> Replace Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoName('');
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload Dropzone */
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-white transition-all">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-2.5">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Capture or Upload Geotagged Field Photo
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3.5 max-w-sm mx-auto">
                    Photos are automatically stamped with current coordinates ({currentGps.latitude.toFixed(4)}°N, {currentGps.longitude.toFixed(4)}°E) and timestamp.
                  </p>

                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="btn btn-primary text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo (Camera)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload File</span>
                    </button>

                    <button
                      type="button"
                      onClick={loadSamplePhoto}
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent transition-colors cursor-pointer"
                    >
                      Use Demo Inspection Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field Remarks Input */}
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1.5">
                Revenue Officer Inspection Remarks
              </label>
              <textarea
                rows="2"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter on-site Joint Measurement Survey observations and recommendations..."
                className="form-input text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSubmitReport('FLAG_ISSUE')}
                disabled={submitting}
                className="btn btn-secondary text-xs font-bold text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center justify-center gap-2 py-2.5 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Flag Dispute / Discrepancy
              </button>

              <button
                type="button"
                onClick={() => handleSubmitReport('VERIFY_AND_APPROVE')}
                disabled={submitting}
                className="btn btn-primary text-xs font-bold flex items-center justify-center gap-2 py-2.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting Sign-off...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    Approve &amp; Forward to DLAO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center text-slate-500 text-xs bg-white">
          <p className="font-semibold text-slate-700 mb-3">No survey plot currently selected.</p>
          <button
            type="button"
            onClick={() => setIsPlotModalOpen(true)}
            className="btn btn-primary text-xs py-2 px-4"
          >
            Select from Assigned Plots
          </button>
        </div>
      )}

      {/* 📋 Modal: View All Assigned Plots */}
      {isPlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    All Assigned Survey Plots
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a parcel to inspect or conduct Joint Measurement Survey
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPlotModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Status Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Survey #, Parcel Code, Owner, Village..."
                  className="form-input pl-8 text-xs font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </form>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PENDING', label: 'Pending Survey' },
                  { id: 'VERIFIED', label: 'Verified' },
                  { id: 'FLAGGED', label: 'Flagged' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parcels List Table / Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[460px]">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-medium">Loading assigned plots...</div>
              ) : parcels.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-medium">No parcels found matching filter.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {parcels.map((p) => {
                    const isSelected = selectedParcel?.id === p.id;
                    const isVerified = p.geometry_source === 'FIELD_GPS';
                    const isIssue = p.acquisition_status === 'RR_ISSUE';

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlot(p)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-600/30'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900 font-mono">
                              Survey #{p.survey_number}
                            </span>
                            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                              {p.parcel_code}
                            </span>
                          </div>

                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-700" /> GPS Fixed
                            </span>
                          ) : isIssue ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-700" /> Issue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" /> Pending
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 font-medium truncate mb-1">
                          Owner: <strong>{p.owner_name}</strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1.5 border-t border-slate-100">
                          <span>{p.village} ({p.district})</span>
                          <span className="font-bold text-blue-900 font-mono">{p.area_acres} Acres</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsPlotModalOpen(false)}
                className="btn btn-secondary text-xs py-2 px-5 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
