import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { toLandReference } from '../../services/landRecordMapper';

/**
 * TechnicalReferences — Collapsible section showing raw backend IDs.
 *
 * Collapsed by default. For power users who need official reference numbers.
 */
export default function TechnicalReferences({
  parcelCode,
  projectCode,
  projectId,
  surveyNumber,
  caseCode,
  familyCode,
  fieldVerificationId,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState('');

  const landRef = toLandReference(parcelCode);

  const refs = [
    { label: 'Land Reference', value: landRef },
    { label: 'Parcel ID', value: parcelCode },
    { label: 'Project ID', value: projectCode || projectId },
    { label: 'Survey Number', value: surveyNumber },
    { label: 'Official Case Number', value: caseCode },
    { label: 'Family ID', value: familyCode },
    { label: 'Field Verification ID', value: fieldVerificationId },
  ].filter((r) => r.value);

  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (refs.length === 0) return null;

  return (
    <div className={`${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        Technical / Official References
      </button>

      {isOpen && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
          {refs.map((ref) => (
            <div key={ref.label} className="flex items-center justify-between gap-3">
              <span className="text-slate-500 font-medium whitespace-nowrap">{ref.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-800">{ref.value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(ref.value, ref.label)}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={`Copy ${ref.label}`}
                >
                  {copied === ref.label ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
