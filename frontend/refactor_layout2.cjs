const fs = require('fs');
const path = './src/pages/cases/CaseDetailPage.jsx';

let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Fix top layout
content = content.replace(
  '<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">',
  '<div className="flex flex-col-reverse gap-3 items-end w-full">'
);
content = content.replace(
  '      <div className="flex flex-col-reverse gap-3 items-end w-full">\n        <div className="flex-1">',
  '      <div className="flex flex-col-reverse gap-3 items-end w-full">\n        <div className="w-full">'
);
content = content.replace(
  '<div className="flex items-center gap-2 self-start sm:self-auto">',
  '<div className="flex items-center gap-2 z-10 relative">'
);

// 2. We'll reconstruct the grid entirely to be safe.
const gridStart = content.indexOf('{/* ─── Main Content Grid');
const fabStart = content.indexOf('{/* ─── Floating Action Button');

const beforeGrid = content.substring(0, gridStart);
const afterGrid = content.substring(fabStart);
const gridContent = content.substring(gridStart, fabStart);

// Extract PARCEL INTELLIGENCE
const parcelStart = gridContent.indexOf('{/* Card 2: PARCEL INTELLIGENCE */}');
const parcelEnd = gridContent.indexOf('{/* COLUMN 2: MIDDLE WORKSPACE');
let parcelIntelligenceCode = gridContent.substring(parcelStart, parcelEnd);
// Remove any trailing </div>s that belong to the left column
parcelIntelligenceCode = parcelIntelligenceCode.replace(/<\/div>\n\s*<\/div>\n\s*$/, '').trim();

// Extract MIDDLE WORKSPACE (which will become MAIN WORKSPACE)
const midStart = gridContent.indexOf('{/* COLUMN 2: MIDDLE WORKSPACE (6 cols / 12) */}');
const midEnd = gridContent.indexOf('{/* COLUMN 3: RIGHT AUDIT TIMELINE (3 cols / 12) */}');
let middleWorkspace = gridContent.substring(midStart, midEnd);
middleWorkspace = middleWorkspace.replace('lg:col-span-6', 'lg:col-span-8');
middleWorkspace = middleWorkspace.replace('{/* COLUMN 2: MIDDLE WORKSPACE (6 cols / 12) */}', '{/* COLUMN 1: MAIN WORKSPACE (8 cols / 12) */}');

// Extract RIGHT AUDIT TIMELINE
const rightStart = gridContent.indexOf('{/* COLUMN 3: RIGHT AUDIT TIMELINE (3 cols / 12) */}');
// It goes to the end of gridContent
let rightWorkspace = gridContent.substring(rightStart);
rightWorkspace = rightWorkspace.replace('lg:col-span-3', 'lg:col-span-4');
rightWorkspace = rightWorkspace.replace('{/* COLUMN 3: RIGHT AUDIT TIMELINE (3 cols / 12) */}', '{/* COLUMN 2: RIGHT SIDEBAR (4 cols / 12) */}');
// Remove the last 2 closing divs of the grid to insert parcelIntelligence safely inside the right col
// The end of rightWorkspace has:
//           </div>
//         </div>
//       </div>
//       \n\n
const rightColInsertionPoint = rightWorkspace.lastIndexOf('</div>', rightWorkspace.lastIndexOf('</div>', rightWorkspace.lastIndexOf('</div>') - 1) - 1);
rightWorkspace = rightWorkspace.substring(0, rightColInsertionPoint) + '\n          ' + parcelIntelligenceCode + '\n        </div>\n      </div>\n\n      ';

// New Horizontal CASE INFORMATION
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

// Reconstruct the new grid
const newGrid = horizontalCaseInfo + `
      {/* ─── Main Content Grid (2 Columns: 8/12 Main, 4/12 Right) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        ` + middleWorkspace + rightWorkspace;

content = beforeGrid + newGrid + afterGrid;

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully reconstructed CaseDetailPage.jsx');
