import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { User, Shield, Building, Phone, Mail, MapPin, CheckCircle, AlertCircle, Save } from 'lucide-react';

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
      case 'DLAO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PIA': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SGA': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'FRO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const rolePermissions = {
    DLAO: [
      'Full parcel verification & CRUD',
      'Acquisition case workflow management & approvals',
      'Compensation assessment & approval tracking',
      'Document management & AI mismatch resolution',
      'Overdue case & deadline management',
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
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">Manage your account details and view role permissions</p>
      </div>

      {/* Overview Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{user?.full_name}</h2>
              <p className="text-sm text-neutral-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClass(user?.role)} uppercase tracking-wider`}>
              {user?.role} — {roleLabel}
            </span>
            <span className="text-xs text-neutral-400 mt-1">Jurisdiction: {user?.district || 'All'}, {user?.state || 'India'}</span>
          </div>
        </div>

        {/* Profile Update Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Account Information
          </h3>

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4" /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" /> Full Name
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
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="form-input bg-neutral-100 text-neutral-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400" /> Phone Number
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
                <Shield className="w-3.5 h-3.5 text-neutral-400" /> System Role
              </label>
              <input
                type="text"
                value={`${user?.role} (${roleLabel})`}
                disabled
                className="form-input bg-neutral-100 text-neutral-500 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-neutral-400" /> Assigned State
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
                <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Assigned District
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading ? <span className="spinner" /> : <Save className="w-4 h-4" />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Role & Role-Based Permissions Card */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-600" /> Role-Based Access Control (RBAC) Entitlements
        </h3>

        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-900 text-sm">Active Role: {roleLabel}</span>
            <span className="text-xs text-blue-700 font-mono">Code: {user?.role}</span>
          </div>
        </div>

        <ul className="space-y-2">
          {rolePermissions[user?.role]?.map((permission, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-neutral-700">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{permission}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
