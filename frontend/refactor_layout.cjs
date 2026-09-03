const fs = require('fs');
const path = './src/pages/cases/CaseDetailPage.jsx';

let content = fs.readFileSync(path, 'utf8');

// Normalize line endings for reliable matching
content = content.replace(/\r\n/g, '\n');

// 1. Extract and remove CASE INFORMATION
const caseInfoStart = content.indexOf('{/* Card 1: CASE INFORMATION */}');
const caseInfoEnd = content.indexOf('{/* Card 2: PARCEL INTELLIGENCE */}');
if (caseInfoStart === -1 || caseInfoEnd === -1) {
  console.log("Could not find CASE INFORMATION block");
  process.exit(1);
}
// Remove the block
content = content.substring(0, caseInfoStart) + content.substring(caseInfoEnd);

// 2. Extract and remove PARCEL INTELLIGENCE
const parcelStart = content.indexOf('{/* Card 2: PARCEL INTELLIGENCE */}');
const parcelEnd = content.indexOf('{/* COLUMN 2: MIDDLE WORKSPACE (6 cols / 12) */}');
if (parcelStart === -1 || parcelEnd === -1) {
  console.log("Could not find PARCEL INTELLIGENCE block");
  process.exit(1);
}
const parcelIntelligenceCode = content.substring(parcelStart, parcelEnd);
// Remove the block
content = content.substring(0, parcelStart) + content.substring(parcelEnd);

// At this point, COLUMN 1: LEFT SIDEBAR is empty except for the wrapper div.
// Remove the wrapper div.
const leftColRegex = /\{\/\* COLUMN 1: LEFT SIDEBAR.*?(<div className="lg:col-span-3 space-y-5">.*?<\/div>)/s;
content = content.replace(leftColRegex, '');

// 3. Update grid columns
content = content.replace(
  '{/* ─── Main Content Grid (3 Columns: 1/4 Left, 2/4 Middle, 1/4 Right) ────── */}',
  '{/* ─── Main Content Grid (2 Columns: 8/12 Middle, 4/12 Right) ────── */}'
);
content = content.replace(
  '{/* COLUMN 2: MIDDLE WORKSPACE (6 cols / 12) */}\n        <div className="lg:col-span-6 space-y-5">',
  '{/* COLUMN 1: MAIN WORKSPACE (8 cols / 12) */}\n        <div className="lg:col-span-8 space-y-5">'
);
content = content.replace(
  '{/* COLUMN 3: RIGHT AUDIT TIMELINE (3 cols / 12) */}\n        <div className="lg:col-span-3 space-y-5">',
  '{/* COLUMN 2: RIGHT SIDEBAR (4 cols / 12) */}\n        <div className="lg:col-span-4 space-y-5">'
);

// 4. Insert Horizontal CASE INFORMATION before the grid
const horizontalCaseInfo = `
      {/* ─── CASE INFORMATION (Horizontal) ──────────────────── */}
      <div className="card bg-white border border-slate-200/90 shadow-card mb-5">
        <div className="card-body p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider border-r border-slate-200 pr-4">CASE INFORMATION</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">CODE:</span>
              <span className="font-mono font-bold text-slate-900">{caseData.case_code}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">PROJECT:</span>
              <Link to={\`/projects/\${caseData.project_id}\`} className="font-bold text-blue-700 hover:underline">
                {caseData.project_code || 'PRJ-2026-003'}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">CREATED:</span>
              <span className="text-slate-800 font-medium">{formatDateTime(caseData.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">UPDATED:</span>
              <span className="text-slate-800 font-medium">{formatDateTime(caseData.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
`;

content = content.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">',
  horizontalCaseInfo + '\n      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">'
);

// 5. Insert PARCEL INTELLIGENCE at the end of the right column
const rightColEndRegex = /(<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\{\/\* ─── Floating Action Button)/;
content = content.replace(rightColEndRegex, '\n          ' + parcelIntelligenceCode.trim() + '\n        $1');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully refactored CaseDetailPage.jsx');
