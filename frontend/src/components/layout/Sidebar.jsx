import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  MapPin,
  GitBranch,
  FileText,
  Brain,
  IndianRupee,
  HandCoins,
  Users,
  BarChart3,
  Bell,
  Shield,
  Radio,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Landmark,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['DLAO', 'PIA', 'SGA', 'ADMIN'] },
  { path: '/parcels', label: 'Parcels', icon: MapPin, roles: ['DLAO', 'SGA', 'FRO', 'ADMIN'], dividerBefore: true },
  { path: '/gis', label: 'GIS Map', icon: Map, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/cases', label: 'Workflow', icon: GitBranch, roles: ['DLAO', 'SGA', 'ADMIN'], dividerBefore: true },
  { path: '/documents', label: 'Documents', icon: FileText, roles: ['DLAO', 'PIA', 'SGA', 'FRO', 'ADMIN'] },
  { path: '/ai/mismatch', label: 'AI Mismatch', icon: Brain, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/compensation', label: 'Compensation', icon: IndianRupee, roles: ['DLAO', 'SGA', 'ADMIN'], dividerBefore: true },
  { path: '/rr', label: 'R&R', icon: Users, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/alerts', label: 'Alerts', icon: Bell, roles: ['DLAO', 'SGA', 'ADMIN'], dividerBefore: true },
  { path: '/audit', label: 'Audit Trail', icon: Shield, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/mock-api', label: 'Gov API (Mock)', icon: Radio, roles: ['DLAO', 'SGA', 'ADMIN'] },
  { path: '/field', label: 'Field View', icon: Smartphone, roles: ['FRO', 'ADMIN'] },
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

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Government Tricolor Stripe */}
      <div className="gov-stripe flex-shrink-0" />

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-neutral-100 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg emblem-gradient flex items-center justify-center flex-shrink-0">
          <Landmark className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-neutral-900 leading-tight truncate">NLA System</h1>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest">SIH 2026</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <div key={item.path}>
              {item.dividerBefore && <div className="h-px bg-neutral-100 my-2 mx-2" />}
              <Link
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group mb-0.5 ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-neutral-400 group-hover:text-neutral-600'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="border-t border-neutral-100 p-3 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-800 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-neutral-400 truncate">{roleLabel}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors flex-1"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
