import { useAuth } from '../../contexts/AuthContext';
import {
  FolderKanban,
  MapPin,
  GitBranch,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, roleLabel } = useAuth();

  // Placeholder KPI data — will be replaced with real data in Phase 11
  const kpis = [
    { label: 'Total Projects', value: '—', icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Parcels', value: '—', icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Cases', value: '—', icon: GitBranch, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Documents', value: '—', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Overdue Cases', value: '—', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completed', value: '—', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'High Risk', value: '—', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Progress', value: '—', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.full_name} — {roleLabel}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{kpi.value}</div>
              <p className="text-xs text-neutral-400 mt-1">Data will populate in Phase 11</p>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-1">Phase 1 — Foundation Complete</h3>
              <p className="text-sm text-neutral-500">
                The application foundation is set up with routing, authentication context, design system, and API infrastructure.
                Dashboard KPIs, charts, and drill-down will be implemented in Phase 11.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
