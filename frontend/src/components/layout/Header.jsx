import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Bell,
  Search,
  ShieldCheck,
  X,
  Check,
  FolderKanban,
  MapPin,
  FileText,
  Users as UsersIcon,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Menu,
} from 'lucide-react';

const PRIORITY_BADGES = {
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Header({ mobileOpen, setMobileOpen }) {
  const { user, roleLabel } = useAuth();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Notifications State
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  // Fetch Alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { limit: 10 } });
      setAlerts(res.data.data || []);
      setUnreadCount(res.data.meta?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await api.put('/alerts/mark-all-read');
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Handle Single Alert Click
  const handleAlertClick = async (alertItem) => {
    try {
      if (!alertItem.is_read) {
        await api.put(`/alerts/${alertItem.id}/read`);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertItem.id ? { ...a, is_read: true } : a))
        );
      }
      setIsNotificationsOpen(false);

      if (alertItem.case_id) navigate('/cases');
      else if (alertItem.parcel_id) navigate('/parcels');
      else if (alertItem.project_id) navigate('/projects');
      else navigate('/alerts');
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  // Handle Search Query Change with Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q: searchQuery } });
        setSearchResults(res.data.data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside Handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults = searchResults
    ? (searchResults.projects?.length || 0) +
    (searchResults.parcels?.length || 0) +
    (searchResults.cases?.length || 0) +
    (searchResults.families?.length || 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-[#1e6b3e] shadow-sm flex-shrink-0">
      {/* Indian Tricolor Accent Strip */}
      <div className="h-1 w-full flex flex-shrink-0">
        <div className="w-1/3" style={{ background: '#FF9933' }} />
        <div className="w-1/3 bg-white border-t border-b border-gray-200" />
        <div className="w-1/3" style={{ background: '#138808' }} />
      </div>

      {/* Main Government Bar */}
      <div className="h-16 flex items-center justify-between px-3 sm:px-6">
        {/* Left — Mobile Hamburger + Official Emblem & Bilingual Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Hamburger Button for Mobile View */}
          <button
            type="button"
            onClick={() => setMobileOpen && setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 cursor-pointer"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>

          <img
            src="/emblem.png"
            alt="State Emblem of India"
            className="h-10 sm:h-12 w-auto object-contain flex-shrink-0"
          />
          <div className="border-l border-neutral-300 pl-2.5 sm:pl-3">
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
          <div ref={searchContainerRef} className="relative hidden lg:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search survey no, parcel code, project..."
                className="form-input form-input-search pr-12 py-1.5 w-72 lg:w-96 text-xs bg-neutral-50 border-neutral-200 rounded-lg focus:bg-white transition-all font-medium"
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-neutral-400 bg-neutral-200 px-1 py-0.5 rounded pointer-events-none">
                  ⌘K
                </span>
              )}
            </div>

            {/* Live Search Results Dropdown Flyout */}
            {isSearchOpen && (searchQuery || isSearching) && (
              <div className="absolute right-0 top-full mt-2 w-[480px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs max-h-[80vh] flex flex-col">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-700" />
                    Global Search Results
                  </span>
                  {isSearching ? (
                    <span className="text-[11px] text-slate-500 font-medium">Searching...</span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">{totalResults} matches found</span>
                  )}
                </div>

                <div className="p-3 overflow-y-auto space-y-4 flex-1">
                  {!isSearching && totalResults === 0 && searchQuery && (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <Search className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <p className="font-medium text-slate-700">No matching records found</p>
                      <p className="text-[11px] text-slate-400">Try searching survey number, parcel code, or family head</p>
                    </div>
                  )}

                  {/* Projects */}
                  {searchResults?.projects?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2">
                        Projects ({searchResults.projects.length})
                      </p>
                      {searchResults.projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            navigate('/projects');
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-blue-700 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.project_code} • {p.district}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Parcels */}
                  {searchResults?.parcels?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2">
                        Land Parcels ({searchResults.parcels.length})
                      </p>
                      {searchResults.parcels.map((pc) => (
                        <div
                          key={pc.id}
                          onClick={() => {
                            navigate('/parcels');
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">Survey #{pc.survey_number} ({pc.village})</p>
                              <p className="text-[10px] text-slate-500 font-mono">{pc.parcel_code} • {pc.project_name}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cases */}
                  {searchResults?.cases?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2">
                        Workflow Cases ({searchResults.cases.length})
                      </p>
                      {searchResults.cases.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            navigate('/cases');
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-700 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">{c.case_number}</p>
                              <p className="text-[10px] text-slate-500">Stage: {c.stage} • {c.project_name}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* R&R Families */}
                  {searchResults?.families?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2">
                        R&R Beneficiary Families ({searchResults.families.length})
                      </p>
                      {searchResults.families.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => {
                            navigate(`/rr/families/${f.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-teal-700 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900">{f.head_of_family}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{f.family_code} • {f.category} ({f.members_count} members)</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Notifications Bell Dropdown */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="View notifications"
              className="relative p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Menu */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-xs">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Bell className="w-3.5 h-3.5 text-blue-700" />
                    Statutory Alerts &amp; Notifications
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <p className="font-medium text-slate-700">No active notifications</p>
                    </div>
                  ) : (
                    alerts.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => handleAlertClick(a)}
                        className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${!a.is_read ? 'bg-blue-50/40' : ''
                          }`}
                      >
                        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.priority === 'CRITICAL' ? 'text-rose-600' : 'text-amber-500'}`} />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 text-xs">{a.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_BADGES[a.priority] || ''}`}>
                              {a.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{a.message}</p>
                          <p className="text-[9px] text-slate-400 font-mono pt-0.5">
                            {new Date(a.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t text-center">
                  <Link
                    to="/alerts"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    View All Governance Alerts <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

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
