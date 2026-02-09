import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Calendar, Lock, LogOut, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../api/auth';
import StatusToast from '../Shared/StatusToast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    try {
      const result = await updateProfile({ name: name.trim() });
      updateUser(result.user);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      await updateProfile({
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'team_lead':
        return 'bg-yellow-100 text-yellow-700';
      case 'transaction_coordinator':
        return 'bg-teal-100 text-teal-700';
      case 'isa':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'team_lead':
        return 'Team Lead';
      case 'transaction_coordinator':
        return 'Transaction Coordinator';
      case 'isa':
        return 'ISA';
      default:
        return 'Agent';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Profile Header Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {initial}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{user?.name}</h2>
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Mail size={16} />
            <span>{user?.email}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeClass(user?.role)}`}>
            <Shield size={14} />
            {getRoleLabel(user?.role)}
          </span>
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
            <Calendar size={14} />
            <span>Member since {formatDate(user?.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Edit Name Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} />
          Edit Profile
        </h3>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
              placeholder="Your name"
            />
          </div>
          <button
            type="submit"
            className="action-button w-full py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 text-[var(--brand-text-on-primary)]"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Save size={18} />
            Save Profile
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            className="action-button w-full py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 text-[var(--brand-text-on-primary)]"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Save size={18} />
            Change Password
          </button>
        </form>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="action-button w-full py-3 rounded-lg font-bold text-base flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
      >
        <LogOut size={18} />
        Logout
      </button>

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  );
}
