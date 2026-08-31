import { MapPin } from 'lucide-react';
import { toLandReference } from '../../services/landRecordMapper';

/**
 * LandRecordIdentity — Primary identity card for a land record.
 *
 * Shows the Land Reference (LR-2026-XXX) prominently,
 * with Survey Number, Village, and Area as secondary info.
 */
export default function LandRecordIdentity({ parcelCode, surveyNumber, village, area, className = '' }) {
  const landRef = toLandReference(parcelCode);

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
        Land Record
      </span>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
        {landRef || '—'}
      </h2>
      <p className="text-sm text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        {surveyNumber && <span>Survey No. {surveyNumber}</span>}
        {surveyNumber && village && <span className="text-slate-300">·</span>}
        {village && <span>{village}</span>}
        {(surveyNumber || village) && area && <span className="text-slate-300">·</span>}
        {area && <span>{typeof area === 'number' ? `${area} Acres` : area}</span>}
        {!surveyNumber && !village && !area && (
          <span className="text-slate-400 italic">Location details not available</span>
        )}
      </p>
    </div>
  );
}
