import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search } from 'lucide-react';

export default function Header() {
  const { user, roleLabel } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left — Page context breadcrumb area */}
      <div className="flex items-center gap-4">
        <div id="header-breadcrumb" />
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, parcels..."
            className="form-input pl-9 pr-4 py-2 w-64 text-sm bg-neutral-50 border-neutral-200 focus:bg-white"
          />
        </div>

        {/* Notifications Bell */}
        <button className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User pill clickable link to profile */}
        <Link to="/profile" className="flex items-center gap-2 pl-3 border-l border-neutral-200 hover:opacity-80 transition-opacity cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-neutral-800 group-hover:text-blue-600 transition-colors">{user?.full_name}</p>
            <p className="text-[10px] text-neutral-400">{roleLabel}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </Link>
      </div>
    </header>
  );
}

