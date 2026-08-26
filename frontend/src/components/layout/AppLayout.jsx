import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl emblem-gradient flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="spinner spinner-lg !border-white/20 !border-t-white" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Loading NLA System...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen transition-all duration-300">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-auto max-w-7xl w-full mx-auto">
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

