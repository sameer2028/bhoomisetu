import { Link } from 'react-router-dom';
import {
  X,
  MapPin,
  User,
  Building2,
  IndianRupee,
  ShieldCheck,
  FileText,
  Ruler,
  ExternalLink,
  AlertTriangle,
  Crosshair,
  Users,
  GitBranch,
  Database,
} from 'lucide-react';
import { GEOMETRY_SOURCE_LABELS, formatAcres, getStatusStyle } from './mapConstants';

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">{label}</span>
      <span
        className={`text-xs font-bold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

function SectionHeading({ icon: Icon, children, tint = 'text-blue-700' }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
      <Icon className={`w-3.5 h-3.5 ${tint}`} /> {children}
    </h4>
  );
}

/**
 * Parcel detail panel — Phase 5
 *
 * Shows the parcel's actual database record for the polygon clicked on the map:
 * identification, ownership, GIS measurements, corridor relationship, and the
 * current state of the compensation / possession / document modules.
 *
 * Modules that arrive in later phases are shown as their real (empty) state
 * rather than being faked.
 */
export default function ParcelDetailPanel({ feature, loading, onClose }) {
  if (loading) {
    return (
      <aside className="w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading parcel record...</p>
        </div>
      </aside>
    );
  }

  if (!feature) {
    return (
      <aside className="w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Crosshair className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Parcel Selected</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Click any parcel polygon on the map to open its land record, ownership
            details and acquisition status.
          </p>
        </div>
      </aside>
    );
  }

  const p = feature.properties;
  const style = getStatusStyle(p.acquisition_status);

  // Recorded acreage vs the acreage measured from the polygon in PostGIS
  const recorded = Number(p.area_acres);
  const measured = p.gis_measured_acres != null ? Number(p.gis_measured_acres) : null;
  const areaDelta = measured != null && Number.isFinite(recorded) ? measured - recorded : null;
  const areaDeltaPct =
    areaDelta != null && recorded > 0 ? Math.abs((areaDelta / recorded) * 100) : null;
  // Flag only a material divergence; small values are expected from the
  // synthetic square-polygon generation.
  const areaDivergent = areaDeltaPct != null && areaDeltaPct >= 5;

  const comp = p.compensation;
  const poss = p.possession;

  return (
    <aside className="w-[360px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden slide-in shadow-panel z-20">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-2 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {p.parcel_code}
            </span>
            <span className={`badge ${style.badgeClass} !text-[9px] !px-1.5`}>{style.label}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
            Survey No. {p.survey_number || '—'}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
            {p.village}
            {p.taluk ? `, ${p.taluk}` : ''}, {p.district}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors flex-shrink-0"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Area mismatch advisory (decision support only) */}
        {areaDivergent && (
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <p className="font-bold text-amber-900">Area divergence review</p>
              <p className="text-amber-800 mt-0.5">
                Mapped boundary measures {formatAcres(measured)} against a recorded{' '}
                {formatAcres(recorded)} ({areaDeltaPct.toFixed(1)}% difference). Flagged for
                officer verification.
              </p>
            </div>
          </div>
        )}

        {/* Land record */}
        <section>
          <SectionHeading icon={User} tint="text-emerald-700">
            Land Record &amp; Ownership
          </SectionHeading>
          <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-1.5">
            <Row label="Registered Owner" value={p.owner_name} />
            <Row label="Owner Contact" value={p.owner_contact} mono />
            <Row label="Survey Number" value={p.survey_number} mono />
            <Row label="Village" value={p.village} />
            <Row label="Tehsil / Taluk" value={p.taluk} />
            <Row label="District" value={p.district} />
            <Row label="State" value={p.state} />
          </div>
        </section>

        {/* Spatial measurements */}
        <section>
          <SectionHeading icon={Ruler}>GIS Measurements</SectionHeading>
          <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-1.5">
            <Row label="Recorded Area" value={formatAcres(recorded)} />
            <Row label="Measured from Boundary" value={formatAcres(measured)} />
            <Row
              label="Centroid"
              value={
                p.centroid_lat != null
                  ? `${Number(p.centroid_lat).toFixed(6)}, ${Number(p.centroid_lng).toFixed(6)}`
                  : '—'
              }
              mono
            />
            {p.corridor_overlap_pct != null && (
              <Row label="Inside Corridor" value={`${p.corridor_overlap_pct}%`} />
            )}
            {p.acres_inside_corridor != null && (
              <Row label="Area in Corridor" value={formatAcres(p.acres_inside_corridor)} />
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
            <Database className="w-3 h-3" />
            {GEOMETRY_SOURCE_LABELS[p.geometry_source] || p.geometry_source} &middot; EPSG:4326 PostGIS
          </p>
        </section>

        {/* Project */}
        <section>
          <SectionHeading icon={Building2}>Project Association</SectionHeading>
          {p.project_code ? (
            <div className="bg-blue-50/70 rounded-xl border border-blue-100 p-3">
              <span className="text-[10px] font-mono font-bold text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                {p.project_code}
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                {p.project_name}
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{p.implementing_agency}</p>
              {p.corridor_width_m && (
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Corridor right-of-way: {p.corridor_width_m} m
                </p>
              )}
              <Link
                to={`/projects/${p.project_id}`}
                className="btn btn-secondary btn-sm w-full justify-center mt-2.5 !text-xs font-semibold"
              >
                Open Project <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic px-1">
              Not linked to any project.
            </p>
          )}
        </section>

        {/* Lifecycle module status */}
        <section>
          <SectionHeading icon={GitBranch}>Acquisition Lifecycle</SectionHeading>
          <div className="space-y-2">
            {/* Compensation */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
              <IndianRupee className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                  Compensation
                </p>
                {comp ? (
                  <>
                    <p className="text-xs font-bold text-slate-900">
                      {comp.payment_status?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-medium">
                      Paid ₹{Number(comp.amount_paid || 0).toLocaleString('en-IN')} of ₹
                      {Number(comp.amount_assessed || 0).toLocaleString('en-IN')} assessed
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-semibold text-slate-400">Not assessed yet</p>
                )}
              </div>
            </div>

            {/* Possession */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                  Possession
                </p>
                <p className="text-xs font-bold text-slate-900">
                  {poss ? poss.status.replace(/_/g, ' ') : 'Not Taken'}
                </p>
                {poss?.possession_date && (
                  <p className="text-[10.5px] text-slate-500 font-medium">Recorded {poss.possession_date}</p>
                )}
              </div>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                <FileText className="w-3.5 h-3.5 text-indigo-600 mx-auto" />
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{p.total_documents}</p>
                <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide">Docs</p>
              </div>
              <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                <GitBranch className="w-3.5 h-3.5 text-blue-600 mx-auto" />
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{p.total_cases}</p>
                <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide">Cases</p>
              </div>
              <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                <Users className="w-3.5 h-3.5 text-amber-600 mx-auto" />
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{p.total_families}</p>
                <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide">Families</p>
              </div>
            </div>
          </div>
        </section>

        {/* Attached documents */}
        {p.documents?.length > 0 && (
          <section>
            <SectionHeading icon={FileText} tint="text-indigo-700">
              Attached Documents
            </SectionHeading>
            <ul className="space-y-1">
              {p.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                >
                  <span className="font-medium text-slate-800 truncate">{doc.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold flex-shrink-0">v{doc.version}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Footer action */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
        <Link
          to={`/parcels/${p.id}`}
          className="btn btn-primary w-full justify-center text-xs font-semibold"
        >
          Open Full Parcel Record <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}

