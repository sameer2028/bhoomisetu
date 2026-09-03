import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="spinner spinner-lg !border-white/20 !border-t-white" />
          </div>
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Loading BhoomiSetu System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen w-screen bg-white flex font-sans antialiased text-slate-800 overflow-hidden">
      {/* Sidebar — Fixed 100% Height (Desktop) & Responsive Off-Canvas Drawer (Mobile) */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Right Column Container */}
      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-white transition-all duration-300 ml-0 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* Fixed Non-Scrollable Government Header with Mobile Hamburger */}
        <Header mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Scrollable Page Content Area — Pure White Background */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-3.5 sm:p-6 md:p-8 min-w-0 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
