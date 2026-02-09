import { useState } from 'react';
import { Palette, Users } from 'lucide-react';
import BrandingSettings from './BrandingSettings';

const TABS = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'users', label: 'Users', icon: Users },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('branding');

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
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
          <Users size={48} className="mx-auto mb-3" />
          <p className="text-lg font-medium">User Management</p>
          <p className="text-sm">User management features coming soon.</p>
        </div>
      )}
    </div>
  );
}
