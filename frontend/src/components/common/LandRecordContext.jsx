import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  GitBranch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import { formatAcquisitionStatus, formatStageLabel } from '../../services/landRecordMapper';

/**
 * LandRecordContext — Relationship summary showing connected entities in plain language.
 *
 * Each section is clickable where a corresponding route exists.
 * Missing relationships show "Not available" — never fake data.
 * Supports arrays (multiple families, cases, etc.).
 */
export default function LandRecordContext({
  project,
  ownerName,
  families = [],
  acquisitionStatus,
  acquisitionStage,
  caseId,
  caseCode,
  fieldVerified,
  className = '',
}) {
  const hasProject = project?.name || project?.code;
  const hasFamilies = families.length > 0;
  const hasOwner = ownerName && !hasFamilies;
  const hasAcquisition = acquisitionStatus || acquisitionStage;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0 ${className}`}>
      {/* Project */}
      <ContextCard
        label="Project"
        icon={<FolderKanban className="w-4 h-4" />}
        color="indigo"
        link={project?.id ? `/projects/${project.id}` : null}
      >
        {hasProject ? (
          <span className="font-bold text-slate-900 text-sm leading-snug">
            {project.name || project.code}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Not assigned</span>
        )}
      </ContextCard>

      {/* Affected Family / Owner */}
      <ContextCard
        label="Affected Family"
        icon={<Users className="w-4 h-4" />}
        color="amber"
        link={hasFamilies && families.length === 1 ? `/rr/families/${families[0].id}` : null}
      >
        {hasFamilies ? (
          families.length === 1 ? (
            <span className="font-bold text-slate-900 text-sm leading-snug">
              {families[0].head_of_family}
            </span>
          ) : (
            <span className="font-bold text-slate-900 text-sm">
              {families.length} families
            </span>
          )
        ) : hasOwner ? (
          <span className="font-bold text-slate-900 text-sm leading-snug">{ownerName}</span>
        ) : (
          <span className="text-slate-400 italic text-xs">No family information available</span>
        )}
      </ContextCard>

      {/* Acquisition */}
      <ContextCard
        label="Acquisition"
        icon={<GitBranch className="w-4 h-4" />}
        color="blue"
        link={caseId ? `/cases/${caseId}` : null}
      >
        {hasAcquisition ? (
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 text-sm">
              {formatAcquisitionStatus(acquisitionStatus) || formatStageLabel(acquisitionStage) || acquisitionStatus}
            </span>
            {caseCode && (
              <span className="block text-[10px] font-mono text-slate-500">{caseCode}</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic text-xs">No active case</span>
        )}
      </ContextCard>

      {/* Field Verification */}
      <ContextCard
        label="Field Verification"
        icon={<Crosshair className="w-4 h-4" />}
        color="purple"
      >
        {fieldVerified === true ? (
          <span className="font-bold text-emerald-700 text-sm flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        ) : fieldVerified === false ? (
          <span className="font-bold text-amber-700 text-sm flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Not available</span>
        )}
      </ContextCard>
    </div>
  );
}

function ContextCard({ label, icon, color, link, children }) {
  const colorMap = {
    indigo: 'border-indigo-200 bg-indigo-50/40',
    amber: 'border-amber-200 bg-amber-50/40',
    blue: 'border-blue-200 bg-blue-50/40',
    purple: 'border-purple-200 bg-purple-50/40',
    green: 'border-emerald-200 bg-emerald-50/40',
  };

  const iconColorMap = {
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-emerald-600',
  };

  const content = (
    <div className={`rounded-xl border p-3.5 transition-all ${colorMap[color] || colorMap.blue} ${link ? 'hover:shadow-sm cursor-pointer' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={iconColorMap[color] || 'text-slate-500'}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
      </div>
      <div className="break-words whitespace-normal">
        {children}
      </div>
    </div>
  );

  if (link) {
    return <Link to={link} className="block min-w-0 h-full">{content}</Link>;
  }

  return content;
}
