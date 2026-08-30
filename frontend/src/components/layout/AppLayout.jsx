import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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
      {/* Sidebar — Fixed 100% Height */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Right Column Container */}
      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-white transition-all duration-300 ${
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
        }`}
      >
        {/* Fixed Non-Scrollable Government Header */}
        <Header />

        {/* Scrollable Page Content Area — Pure White Background */}
        <main className="flex-1 overflow-y-auto scroll-smooth p-4 sm:p-6 md:p-8 min-w-0 bg-white">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
