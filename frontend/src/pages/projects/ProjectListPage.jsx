import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ProjectCreateModal from './ProjectCreateModal';
import {
  FolderKanban,
  Plus,
  Search,
  MapPin,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Filter,
} from 'lucide-react';

export default function ProjectListPage() {
  const { user, hasRole } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/projects', { params });
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROPOSED':
        return <span className="badge badge-proposed">Proposed</span>;
      case 'APPROVED':
        return <span className="badge bg-blue-100 text-blue-800">Approved</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-in-progress">In Progress</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed">Completed</span>;
      case 'CLOSED':
        return <span className="badge bg-neutral-200 text-neutral-800">Closed</span>;
      default:
        return <span className="badge bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  const canCreate = hasRole('PIA', 'ADMIN');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-blue-700" /> Infrastructure Projects
          </h1>
          <p className="page-subtitle">National &amp; State Land Acquisition Projects Portfolio</p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by project name, code (PRJ-...), or agency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-neutral-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select text-sm w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            <option value="PROPOSED">Proposed</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <span className="spinner spinner-lg mb-3" />
          <p className="text-sm text-neutral-500">Loading acquisition projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-800">No Projects Found</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter
              ? 'No projects match your search filters. Try clearing filters.'
              : 'No land acquisition projects exist in the platform yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const reqArea = project.total_area_required || 0;
            const acqArea = project.total_area_acquired || 0;
            const pct = reqArea > 0 ? Math.min(100, Math.round((acqArea / reqArea) * 100)) : 0;

            return (
              <div key={project.id} className="card hover:border-blue-300 transition-all group flex flex-col justify-between">
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {project.project_code}
                      </span>
                      <h3 className="text-lg font-bold text-neutral-900 group-hover:text-blue-800 transition-colors mt-1.5 leading-snug">
                        {project.name}
                      </h3>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  <p className="text-xs text-neutral-600 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-neutral-500 mb-4 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{project.implementing_agency}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{project.district}, {project.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span>{project.project_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span>Target: {project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-neutral-700 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Land Acquisition Progress
                      </span>
                      <span className="font-bold text-neutral-900">
                        {acqArea} / {reqArea} Acres ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          pct === 100 ? 'bg-emerald-600' : pct > 40 ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">Created by {project.creator_name || 'System'}</span>
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    View Project Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ProjectCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          fetchProjects();
        }}
      />
    </div>
  );
}
