import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Palette, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BrandingSettings from './BrandingSettings';
import UserManagement from './UserManagement';

const TABS = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'users', label: 'Users', icon: Users },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('branding');

  if (user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Admin Settings</h2>

      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' && <BrandingSettings />}
      {activeTab === 'users' && <UserManagement />}
    </div>
  );
}
