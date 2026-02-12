import { useState, useEffect } from 'react';
import { Users, FileText, Send, Building2, Clock } from 'lucide-react';
import * as adminApi from '../../api/admin';

const ACTION_LABELS = {
  created: 'Created checklist',
  updated: 'Updated checklist',
  status_changed: 'Changed status',
  assigned: 'Assigned checklist',
  archived: 'Archived checklist',
  lead_sent_mainland: 'Sent lead to Mainland Title',
  rate_request_sent_anniemac: 'Sent rate request to AnnieMac',
};

const ACTION_COLORS = {
  created: 'text-green-600',
  updated: 'text-blue-600',
  status_changed: 'text-yellow-600',
  assigned: 'text-purple-600',
  archived: 'text-gray-500',
  lead_sent_mainland: 'text-[#1e3a5f]',
  rate_request_sent_anniemac: 'text-[#1b3c6b]',
};

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function StatsOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((data) => setStats(data.stats))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
        <p className="text-lg font-medium">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
        <p>Failed to load stats</p>
      </div>
    );
  }

  const cards = [
    { label: 'Active Users', value: stats.total_users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Checklists', value: stats.total_checklists, icon: FileText, color: 'bg-green-50 text-green-600' },
    { label: 'Leads Sent', value: stats.total_leads, icon: Send, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Teams', value: stats.total_teams, icon: Building2, color: 'bg-purple-50 text-purple-600' },
  ];

  const statusEntries = Object.entries(stats.checklists_by_status || {});

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lead Breakdown + Checklist Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lead Breakdown */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Leads by Type</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mainland Title</span>
              <span className="text-sm font-bold text-[#1e3a5f]">{stats.mainland_leads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">AnnieMac</span>
              <span className="text-sm font-bold text-[#1b3c6b]">{stats.anniemac_leads}</span>
            </div>
          </div>
        </div>

        {/* Checklist Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklists by Status</h3>
          {statusEntries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {statusEntries.map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}
                >
                  {status.replace('_', ' ')} <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No checklists yet</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={16} /> Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.user_name || 'Unknown'}</span>{' '}
                    <span className={ACTION_COLORS[item.action] || 'text-gray-600'}>
                      {ACTION_LABELS[item.action] || item.action}
                    </span>
                  </p>
                  {item.property_address && (
                    <p className="text-xs text-gray-500 truncate">{item.property_address}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-400 text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}
