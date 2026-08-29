import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FolderKanban,
  MapPin,
  GitBranch,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Building2,
  Flag,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, roleLabel } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalParcels: 0,
    activeCases: 0,
    totalDocuments: 0,
    overdueCases: 0,
    highRiskProjects: 0,
    openMismatches: 0,
  });
  const [highRiskProjects, setHighRiskProjects] = useState([]);
  const [recentMismatches, setRecentMismatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [projRes, parcelsRes, casesRes, docsRes, riskRes, mismatchRes] = await Promise.allSettled([
          api.get('/projects?limit=100'),
          api.get('/parcels?limit=1'),
          api.get('/workflow/cases?limit=100'),
          api.get('/documents?limit=1'),
          api.get('/ai/risk-scores'),
          api.get('/ai/mismatches?limit=5'),
        ]);

        const projects = projRes.status === 'fulfilled' ? projRes.value.data.data || [] : [];
        const parcelsCount = parcelsRes.status === 'fulfilled' ? parcelsRes.value.data.meta?.total || 0 : 0;
        const cases = casesRes.status === 'fulfilled' ? casesRes.value.data.data || [] : [];
        const docsCount = docsRes.status === 'fulfilled' ? docsRes.value.data.meta?.total || 0 : 0;
        const riskProjects = riskRes.status === 'fulfilled' ? riskRes.value.data.data || [] : [];
        const mismatchesData = mismatchRes.status === 'fulfilled' ? mismatchRes.value.data.data || [] : [];
        const mismatchMeta = mismatchRes.status === 'fulfilled' ? mismatchRes.value.data.meta?.summary : null;

        const activeCasesCount = cases.filter((c) => c.status === 'PENDING' || c.status === 'IN_PROGRESS').length;
        const overdueCasesCount = cases.filter((c) => c.is_overdue || (c.status === 'PENDING' && new Date(c.due_date) < new Date())).length;
        const highRiskList = riskProjects.filter((p) => p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL');

        setStats({
          totalProjects: projects.length,
          totalParcels: parcelsCount,
          activeCases: activeCasesCount,
          totalDocuments: docsCount,
          overdueCases: overdueCasesCount,
          highRiskProjects: highRiskList.length,
          openMismatches: mismatchMeta?.total || mismatchesData.length,
        });

        setHighRiskProjects(highRiskList);
        setRecentMismatches(mismatchesData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const kpis = [
    { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', link: '/projects' },
    { label: 'Total Parcels', value: stats.totalParcels, icon: MapPin, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', link: '/parcels' },
    { label: 'Active Cases', value: stats.activeCases, icon: GitBranch, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100', link: '/cases' },
    { label: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', link: '/documents' },
    { label: 'Overdue Cases', value: stats.overdueCases, icon: Clock, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', link: '/cases' },
    { label: 'High-Risk Projects', value: stats.highRiskProjects, icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', link: '#high-risk-section' },
    { label: 'AI Discrepancies', value: stats.openMismatches, icon: Sparkles, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', link: '/ai/mismatch' },
    { label: 'Spatial Coverage', value: '100%', icon: TrendingUp, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-100', link: '/gis' },
  ];

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-700/50">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>National Land Acquisition Portal Active • Jurisdiction: {user?.district || 'All Jurisdictions'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {user?.full_name || 'Officer'}
            </h1>
            <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
              <span>{roleLabel} ({user?.role})</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-200/80">
                <Calendar className="w-3.5 h-3.5" /> {currentDate}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-medium">System Status</span>
              <span className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Executive Overview</h2>
          <span className="text-xs text-slate-400 font-medium">Real-time metrics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.label}
                to={kpi.link}
                className="kpi-card group hover:border-blue-300 transition-all block"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${kpi.bg} border flex items-center justify-center transition-transform group-hover:scale-105`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {loading ? '—' : kpi.value}
                </div>
                <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1 group-hover:underline">
                  View module records &rarr;
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Feature 2: High-Risk Projects Widget */}
      <div id="high-risk-section" className="space-y-4">
        <div className="card p-6 border-l-4 border-l-rose-600 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">High-Risk Acquisition Projects</h3>
                <span className="badge bg-rose-100 text-rose-800 border border-rose-300 font-extrabold">
                  {highRiskProjects.length} Flagged
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Projects requiring urgent statutory intervention based on overdue cases, compensation delays, or title mismatches.
              </p>
            </div>
            <Link to="/projects" className="btn btn-secondary btn-sm text-xs font-semibold self-start sm:self-auto">
              View All Projects &rarr;
            </Link>
          </div>

          {highRiskProjects.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">No Projects at High or Critical Risk</p>
              <p className="text-[11px] text-slate-400">All infrastructure project acquisition schedules are within risk tolerances.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Code &amp; Name</th>
                    <th>Jurisdiction</th>
                    <th>Acquisition Progress</th>
                    <th>Risk Score</th>
                    <th>Primary Risk Bottleneck</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highRiskProjects.map((proj) => {
                    const factors = typeof proj.factors === 'string' ? JSON.parse(proj.factors) : proj.factors;
                    const topFactor = factors?.overdue_cases?.score >= 20
                      ? factors.overdue_cases.label
                      : factors?.pending_compensation?.label || factors?.rr_issues?.label || 'Statutory review pipeline';

                    return (
                      <tr key={proj.id} className="hover:bg-rose-50/30 transition-colors">
                        <td>
                          <Link
                            to={`/projects/${proj.id}`}
                            className="font-bold text-blue-900 hover:underline text-xs flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>[{proj.project_code}] {proj.name}</span>
                          </Link>
                        </td>
                        <td className="text-xs text-slate-600">{proj.district}, {proj.state}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${proj.progress_pct || 0}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{proj.progress_pct || 0}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-rose-100 text-rose-800 border border-rose-300 font-extrabold">
                            {proj.score} / 100 ({proj.risk_level})
                          </span>
                        </td>
                        <td className="text-xs text-slate-700 max-w-xs truncate" title={topFactor}>
                          {topFactor}
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/projects/${proj.id}`}
                            className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs font-semibold"
                          >
                            Breakdown <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Feature 1: Recent AI Discrepancies Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Recent AI Document Discrepancies</h3>
            </div>
            <Link to="/ai/mismatch" className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">
              View All Flags &rarr;
            </Link>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Title deeds and survey reports with detected cadastral field variances awaiting human review.
          </p>

          <div className="space-y-2.5">
            {recentMismatches.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No open document discrepancies.</p>
            ) : (
              recentMismatches.map((m) => (
                <Link
                  key={m.id}
                  to={`/ai/mismatch?search=${m.parcel_code}`}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-colors flex items-center justify-between block group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center font-bold text-xs">
                      {m.parcel_code}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{m.field_name.replace('_', ' ').toUpperCase()} MISMATCH</span>
                        <span className="badge bg-rose-100 text-rose-800 text-[10px] py-0">{m.severity}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        Official: {m.official_value} vs Extracted: {m.extracted_value}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Platform Status */}
        <div className="card p-6 bg-white border-l-4 border-l-blue-700 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">National Statutory Verification Engine</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The AI verification microservice performs OCR text extraction and field-level discrepancy analysis on title deeds,
              gazette notifications, and joint survey reports. All AI outputs serve as <strong>decision support</strong>, requiring
              final review and resolution by designated land acquisition officers.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Model: v1.2-weighted • Decision Support Active</span>
            <Link to="/ai/mismatch" className="btn btn-primary btn-sm text-xs font-semibold">
              Open AI Mismatch Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
