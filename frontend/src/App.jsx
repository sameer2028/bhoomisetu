import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProfilePage from './pages/auth/ProfilePage';
import ProjectListPage from './pages/projects/ProjectListPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ParcelListPage from './pages/parcels/ParcelListPage';
import ParcelDetailPage from './pages/parcels/ParcelDetailPage';
import GisPage from './pages/gis/GisPage';
import CaseListPage from './pages/cases/CaseListPage';
import CaseDetailPage from './pages/cases/CaseDetailPage';
import DocumentListPage from './pages/documents/DocumentListPage';
import DocumentDetailPage from './pages/documents/DocumentDetailPage';
import RrListPage from './pages/rr/RrListPage';
import FamilyDetailPage from './pages/rr/FamilyDetailPage';
import CompensationListPage from './pages/compensation/CompensationListPage';
import MismatchListPage from './pages/ai/MismatchListPage';
import AlertsPage from './pages/alerts/AlertsPage';
import AuditLogPage from './pages/audit/AuditLogPage';

// Placeholder pages for future phases
function PlaceholderPage({ title, phase }) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">This module will be implemented in {phase}</p>
      </div>
      <div className="card">
        <div className="card-body text-center py-16">
          <p className="text-neutral-400 text-lg">🚧 Coming in {phase}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes inside AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Phase 3 — Projects */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/gis" element={<GisPage />} />

            {/* Phase 4 — Parcels */}
            <Route path="/parcels" element={<ParcelListPage />} />
            <Route path="/parcels/:id" element={<ParcelDetailPage />} />

            {/* Phase 5 — GIS */}
            <Route path="/gis" element={<GisPage />} />

            {/* Phase 6 — Workflow */}
            <Route path="/cases" element={<CaseListPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />

            {/* Phase 7 — Documents */}
            <Route path="/documents" element={<DocumentListPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />

            {/* Phase 8 — AI Document Mismatch */}
            <Route path="/ai/mismatch" element={<MismatchListPage />} />

            {/* Phase 9 — Compensation */}
            <Route path="/compensation" element={<CompensationListPage />} />

            {/* Phase 10 — R&R */}
            <Route path="/rr" element={<RrListPage />} />
            <Route path="/rr/families/:id" element={<FamilyDetailPage />} />

            {/* Phase 12 — Alerts & Escalation */}
            <Route path="/alerts" element={<AlertsPage />} />

            {/* Phase 12 — Audit */}
            <Route path="/audit" element={<AuditLogPage />} />

            {/* Phase 13 — Mock API */}
            <Route path="/mock-api" element={<PlaceholderPage title="Government API (Mock)" phase="Phase 13" />} />

            {/* Phase 14 — Field */}
            <Route path="/field" element={<PlaceholderPage title="Field View" phase="Phase 14" />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
