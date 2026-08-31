import { generateLandStory, mapParcelToLandRecord } from '../../services/landRecordMapper';

/**
 * LandStory — Dynamic prose summary generated from actual data.
 *
 * Produces sentences like:
 * "LR-2026-001 is a 2.5-acre land parcel in Sarai Khas identified by
 *  Survey No. 123/2 and affected by the NH-48 Highway Expansion project."
 *
 * Missing info produces shorter sentences — never fake data.
 */
export default function LandStory({ parcel, landRecord, className = '' }) {
  const record = landRecord || (parcel ? mapParcelToLandRecord(parcel) : null);
  const story = generateLandStory(record);

  if (!story || story === '.') return null;

  return (
    <p className={`text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 border border-slate-200 rounded-xl p-3.5 ${className}`}>
      {story}
    </p>
  );
}
