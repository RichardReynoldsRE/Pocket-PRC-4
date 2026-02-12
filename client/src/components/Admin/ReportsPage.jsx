import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Send, TrendingDown, Trophy, Clock, User, ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as adminApi from '../../api/admin';
import LoadingSpinner from '../Shared/LoadingSpinner';

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    adminApi
      .getLeadReports()
      .then((data) => setReports(data.reports))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <LoadingSpinner />;
  if (!reports) return null;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} />
            Lead Reports
          </h1>
          <p className="text-sm text-gray-500">Track lead sends to partners</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <Send size={24} className="mx-auto mb-1 text-gray-500" />
          <p className="text-2xl font-bold text-gray-800">{reports.total_leads}</p>
          <p className="text-xs text-gray-500">Total Sends</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded bg-[#1e3a5f] flex items-center justify-center">
            <Send size={14} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{reports.mainland_total}</p>
          <p className="text-xs text-gray-500">Mainland Title</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded bg-[#1b3c6b] flex items-center justify-center">
            <TrendingDown size={14} className="text-white" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{reports.anniemac_total}</p>
          <p className="text-xs text-gray-500">Annie Mac</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            Lead Leaderboard
          </h2>
        </div>
        {reports.leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Send size={36} className="mx-auto mb-2" />
            <p className="text-sm">No leads sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.leaderboard.map((agent, index) => (
              <div key={agent.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{agent.name}</p>
                  <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#1e3a5f] font-semibold" title="Mainland Title sends">
                    {agent.mainland_sends}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[#1b3c6b] font-semibold" title="Annie Mac sends">
                    {agent.anniemac_sends}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="font-bold text-gray-800" title="Total sends">
                    {agent.total_sends}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {reports.leaderboard.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex items-center justify-end gap-4 rounded-b-lg">
            <span className="text-[#1e3a5f]">Mainland</span>
            <span>|</span>
            <span className="text-[#1b3c6b]">Annie Mac</span>
            <span>|</span>
            <span className="text-gray-600">Total</span>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />
            Recent Lead Sends
          </h2>
        </div>
        {reports.recent_sends.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Clock size={36} className="mx-auto mb-2" />
            <p className="text-sm">No lead activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.recent_sends.map((send, index) => {
              const isMainland = send.action === 'lead_sent_mainland';
              return (
                <div key={index} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isMainland
                            ? 'bg-[#1e3a5f] text-white'
                            : 'bg-[#1b3c6b] text-white'
                        }`}>
                          {isMainland ? 'Mainland Title' : 'Annie Mac'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={12} />
                        <span>{send.user_name}</span>
                      </div>
                      {send.property_address && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                          <MapPin size={12} />
                          <span className="truncate">{send.property_address}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(send.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
