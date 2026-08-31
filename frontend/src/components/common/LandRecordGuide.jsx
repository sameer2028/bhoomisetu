import { X, FolderKanban, MapPin, GitBranch, Users, Crosshair, ChevronDown } from 'lucide-react';

/**
 * LandRecordGuide — Simple modal explaining how land records connect.
 *
 * Uses plain language. No "entity lineage" / "hierarchy" terminology.
 */
export default function LandRecordGuide({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              How Land Records Connect
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Understanding the relationship between entities
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Flow */}
        <div className="p-6 space-y-0">
          <GuideItem
            icon={<FolderKanban className="w-4 h-4" />}
            color="indigo"
            title="Project"
            description="The overall infrastructure project (e.g. NH-48 Highway Expansion). A project affects multiple land parcels."
            showArrow
          />
          <GuideItem
            icon={<MapPin className="w-4 h-4" />}
            color="green"
            title="Land Record"
            description="The specific land being tracked. Identified by a Survey Number from the official revenue record and tracked with a Land Reference (e.g. LR-2026-001)."
            showArrow
          />
          <GuideItem
            icon={<Users className="w-4 h-4" />}
            color="amber"
            title="Affected Family"
            description="The people who own or depend on the land. They are entitled to compensation, resettlement, and rehabilitation under the RFCTLARR Act."
            showArrow
          />
          <GuideItem
            icon={<GitBranch className="w-4 h-4" />}
            color="blue"
            title="Acquisition Case"
            description="The legal process for acquiring the land. Moves through 11 statutory stages from proposal to closure."
            showArrow
          />
          <GuideItem
            icon={<Crosshair className="w-4 h-4" />}
            color="purple"
            title="Field Verification"
            description="The physical, on-site verification of the land — GPS coordinates, boundary checks, crop and structure enumeration."
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-2 px-5 font-bold cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideItem({ icon, color, title, description, showArrow }) {
  const colorMap = {
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="pt-0.5">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>
      {showArrow && (
        <div className="flex justify-start pl-3 py-1">
          <ChevronDown className="w-4 h-4 text-slate-300" />
        </div>
      )}
    </>
  );
}
