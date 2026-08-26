import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['DLAO', 'PIA', 'SGA', 'ADMIN'] },
  { path: '/parcels', label: 'Parcels', icon: MapPin, roles: ['DLAO', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/gis', label: 'GIS Map', icon: Map, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/cases', label: 'Workflow', icon: GitBranch, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/documents', label: 'Documents', icon: FileText, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/ai/mismatch', label: 'AI Mismatch', icon: Brain, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/compensation', label: 'Compensation', icon: IndianRupee, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/rr', label: 'R&R', icon: Users, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/audit', label: 'Audit Trail', icon: Shield, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/mock-api', label: 'Gov API (Mock)', icon: Radio, roles: ['DLAO', 'SGA', 'ADMIN'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, roleLabel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-[#0b192c] text-white shadow-2xl transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Top Logo & Title */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800/80 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-xl">🏛️</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">NLA System</h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 tracking-wider uppercase">SIH 2026</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 no-scrollbar">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Card & Logout Footer */}
      <div className="border-t border-slate-800/80 p-3 flex-shrink-0 bg-[#081220]">
        {!collapsed && (
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

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 border border-transparent transition-all flex-1"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}


