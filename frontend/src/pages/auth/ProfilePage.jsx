import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { User, Shield, Building, Phone, Mail, MapPin, CheckCircle, AlertCircle, Save, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user, roleLabel } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    state: '',
    district: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        state: user.state || '',
        district: user.district || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/users/profile', formData);
      setSuccessMsg('Profile updated successfully!');
      // Update local storage user data
      const updatedUser = res.data.data;
      const stored = localStorage.getItem('nla_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('nla_user', JSON.stringify({ ...parsed, ...updatedUser }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'DLAO': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PIA': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'SGA': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'FRO': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const rolePermissions = {
    DLAO: [
      'Full parcel verification & CRUD operations',
      'Acquisition case workflow management & statutory approvals',
      'Compensation assessment & approval tracking',
      'Document management & AI mismatch resolution',
      'Overdue case & deadline escalation management',
    ],
    PIA: [
      'Create and submit new land acquisition projects',
      'Define project land requirements and geographical scope',
      'Monitor parcel acquisition progress & timeline',
      'View project-level compensation and R&R progress',
    ],
    SGA: [
      'National, State, and District dashboard visibility',
      'High-risk project and delay analytics monitoring',
      'Review inter-departmental escalations',
      'Cross-district acquisition performance comparison',
    ],
    FRO: [
      'Access assigned parcel verification list',
      'Field survey & GPS verification data entry',
      'Upload photo evidence and survey observations',
      'Flag parcel issues & physical site discrepancies',
    ],
    ADMIN: [
      'Full system access and user role management',
      'System configuration & audit trail inspection',
    ],
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <User className="w-6 h-6 text-blue-700" /> Officer Profile &amp; Entitlements
        </h1>
        <p className="page-subtitle">Manage personal account details and verify role-based permissions</p>
      </div>

      {/* Overview Card */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-700 to-indigo-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-md ring-4 ring-blue-500/10">
              {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{user?.full_name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getRoleBadgeClass(user?.role)} uppercase tracking-wider`}>
              {user?.role} — {roleLabel}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Jurisdiction: {user?.district || 'All'}, {user?.state || 'India'}
            </span>
          </div>
        </div>

        {/* Profile Update Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-2">
            <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Account Information
          </h3>

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="form-input bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> System Role
              </label>
              <input
                type="text"
                value={`${user?.role} (${roleLabel})`}
                disabled
                className="form-input bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Assigned State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Assigned District
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center gap-2 text-xs font-semibold"
            >
              {loading ? <span className="spinner !border-white/30 !border-t-white" /> : <Save className="w-4 h-4" />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Role & Role-Based Permissions Card */}
      <div className="card p-6 md:p-8">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-700" /> Role-Based Access Control (RBAC) Entitlements
        </h3>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 text-xs uppercase tracking-wide">Active Role: {roleLabel}</span>
            <span className="text-xs text-blue-700 font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
              {user?.role}
            </span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {rolePermissions[user?.role]?.map((permission, index) => (
            <li key={index} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{permission}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

