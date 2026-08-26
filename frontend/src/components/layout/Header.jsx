import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, ShieldCheck } from 'lucide-react';

export default function Header() {
  const { user, roleLabel } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-[#1e6b3e] shadow-sm flex-shrink-0">
      {/* ── Indian Tricolor Accent Strip ─────────────────────────── */}
      <div className="h-1 w-full flex flex-shrink-0">
        <div className="w-1/3" style={{ background: '#FF9933' }} />
        <div className="w-1/3 bg-white border-t border-b border-gray-200" />
        <div className="w-1/3" style={{ background: '#138808' }} />
      </div>

      {/* ── Main Government Bar ──────────────────────────────────── */}
      <div className="h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Left — Official Emblem & Bilingual Title */}
        <div className="flex items-center gap-3">
          <img
            src="/emblem.png"
            alt="State Emblem of India"
            className="h-12 w-auto object-contain flex-shrink-0"
          />
          <div className="border-l border-neutral-300 pl-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-none">
                Government of India • भारत सरकार
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-neutral-900 leading-tight flex items-center gap-2">
              BhoomiSetu <span className="text-emerald-700 font-normal hidden sm:inline">| भूमिसेतु</span>
            </h1>
            <p className="text-[10px] text-neutral-500 hidden md:block">
              National Land Acquisition &amp; Rehabilitation System
            </p>
          </div>
        </div>

        {/* Right — Search, Notifications, Officer Profile */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar */}
          <div className="relative hidden lg:block">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search survey no, parcel code, project..."
              className="form-input form-input-search pr-12 py-1.5 w-72 lg:w-96 text-xs bg-neutral-50 border-neutral-200 rounded-lg focus:bg-white transition-all font-medium"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-neutral-400 bg-neutral-200 px-1 py-0.5 rounded">
              ⌘K
            </span>
          </div>

          {/* Notifications Bell */}
          <button
            type="button"
            aria-label="View notifications"
            className="relative p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Officer Role & Profile Badge */}
          <Link
            to="/profile"
            className="flex items-center gap-2.5 pl-3 border-l border-neutral-200 hover:bg-neutral-50 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0"
              style={{ background: '#1e6b3e' }}
            >
              {user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'RS'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors leading-tight">
                  {user?.full_name || 'Rajesh Sharma'}
                </p>
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
              </div>
              <span className="inline-block text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded mt-0.5">
                {roleLabel || 'District LAO'}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
