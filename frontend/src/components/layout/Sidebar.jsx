import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  MapPin,
  Map,
  GitBranch,
  FileText,
  Brain,
  IndianRupee,
  Users,
  Bell,
  Shield,
  Radio,
  Compass,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Core System',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
      { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['DLAO', 'PIA', 'SGA', 'ADMIN'] },
      { path: '/parcels', label: 'Parcels', icon: MapPin, roles: ['DLAO', 'SGA', 'FRO', 'ADMIN'] },
      { path: '/gis', label: 'GIS Map', icon: Map, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
    ],
  },
  {
    title: 'Statutory Operations',
    items: [
      { path: '/field', label: 'Field Verification', icon: Compass, roles: ['FRO', 'DLAO', 'ADMIN'] },
      { path: '/cases', label: 'Workflow', icon: GitBranch, roles: ['DLAO', 'SGA', 'ADMIN'] },
      { path: '/documents', label: 'Documents', icon: FileText, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
      { path: '/ai/mismatch', label: 'AI Mismatch', icon: Brain, roles: ['DLAO', 'SGA', 'ADMIN'] },
      { path: '/compensation', label: 'Compensation', icon: IndianRupee, roles: ['DLAO', 'SGA', 'ADMIN'] },
      { path: '/rr', label: 'R&R', icon: Users, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
    ],
  },
  {
    title: 'Governance & Audit',
    items: [
      { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['DLAO', 'SGA', 'ADMIN'] },
      { path: '/audit', label: 'Audit Trail', icon: Shield, roles: ['DLAO', 'SGA', 'ADMIN'] },
      { path: '/mock-api', label: 'Gov API (Mock)', icon: Radio, roles: ['DLAO', 'SGA', 'ADMIN'] },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout, roleLabel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    if (setMobileOpen) setMobileOpen(false);
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Off-Canvas Mobile Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#0b192c] text-white shadow-2xl transition-all duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
          } w-[280px]`}
      >
        {/* Top Logo & Title with Close button on mobile */}
        <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center border border-white/20 flex-shrink-0 shadow-md">
              <img src="/favicon.png" alt="BhoomiSetu Favicon" className="w-full h-full object-contain" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight flex items-center gap-1.5">
                  BhoomiSetu <span className="text-emerald-400 font-normal">| भूमिसेतु</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                  National Land Portal
                </p>
              </div>
            )}
          </div>

          {/* Close Button for Mobile Drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close navigation menu"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links with Group Dividers */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 no-scrollbar">
          {NAV_GROUPS.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(user?.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {/* Group Label */}
                {(!collapsed || mobileOpen) && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1">
                    {group.title}
                  </p>
                )}

                {/* Group Items */}
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleLinkClick}
                      title={collapsed && !mobileOpen ? item.label : undefined}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${isActive
                          ? 'bg-blue-600 text-white shadow-md font-bold'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                      />
                      {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}

                {/* Group Separator Line */}
                {groupIdx < NAV_GROUPS.length - 1 && (
                  <div className="border-t border-slate-800/80 my-2 mx-2" />
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="border-t border-slate-800/80 p-3 flex-shrink-0 bg-[#081220]">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
                  {user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'RS'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">{user?.full_name || 'Rajesh Sharma'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{roleLabel || user?.role || 'DLAO'}</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </div>
          )}

          <div className={`flex ${collapsed && !mobileOpen ? 'flex-col gap-2' : 'flex-row items-center gap-1.5'}`}>
            <button
              onClick={handleLogout}
              title="Logout"
              className={`flex items-center gap-2 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 border border-transparent transition-all ${collapsed && !mobileOpen ? 'w-full justify-center px-0' : 'px-3 flex-1'
                }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span>Logout</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden lg:flex p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${collapsed ? 'w-full justify-center' : ''
                }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
