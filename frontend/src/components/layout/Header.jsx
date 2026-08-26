import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search } from 'lucide-react';

export default function Header() {
  const { user, roleLabel } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30 shadow-subtle">
      {/* Left — Breadcrumb area */}
      <div className="flex items-center gap-3">
        <div id="header-breadcrumb" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5" />
      </div>

      {/* Right — Search & Actions */}
      <div className="flex items-center gap-4">
        {/* Global Search Input */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cases, parcels, projects..."
            className="form-input pl-9 pr-14 py-1.5 w-80 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-all shadow-inner focus:shadow-none font-medium"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-md border border-slate-300/80">
            Ctrl + K
          </span>
        </div>

        {/* Notifications Bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
            3
          </span>
        </button>

        {/* User Profile Pill */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:bg-slate-50 px-2 py-1.5 rounded-xl transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0">
            {user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'RS'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
              {user?.full_name || 'Rajesh Sharma'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">{roleLabel || 'District Land Acquisition Officer'}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}



