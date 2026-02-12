import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Send, TrendingDown, Trophy, Clock, User, ArrowLeft, MapPin, CalendarDays } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as adminApi from '../../api/admin';
import LoadingSpinner from '../Shared/LoadingSpinner';

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'ytd', label: 'YTD' },
  { key: 'year', label: 'Last Year' },
  { key: 'quarter', label: 'Last Quarter' },
  { key: 'month', label: 'Last Month' },
  { key: 'week', label: 'Last Week' },
  { key: 'custom', label: 'Custom' },
];

function getDateRange(period) {
  const now = new Date();
  let start = null;
  let end = null;

  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString();
      break;
    }
    case 'month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      start = d.toISOString();
      break;
    }
    case 'quarter': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      start = d.toISOString();
      break;
    }
    case 'year': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString();
      break;
    }
    case 'ytd': {
      start = new Date(now.getFullYear(), 0, 1).toISOString();
      break;
    }
    default:
      break;
  }

  return { start, end };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadReports = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const data = await adminApi.getLeadReports(start, end);
      setReports(data.reports);
    } catch {
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/');
      return;
    }
    const { start, end } = getDateRange('all');
    loadReports(start, end);
  }, [user, navigate, loadReports]);

  const handlePeriodChange = (key) => {
    setPeriod(key);
    if (key === 'custom') return; // wait for user to pick dates
    const { start, end } = getDateRange(key);
    loadReports(start, end);
  };

  const handleCustomApply = () => {
    if (!customStart) return;
    const start = new Date(customStart).toISOString();
    // End date: set to end of day if provided, otherwise null (open-ended)
    const end = customEnd
      ? new Date(customEnd + 'T23:59:59.999Z').toISOString()
      : null;
    loadReports(start, end);
  };

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

  const periodLabel = PERIODS.find(p => p.key === period)?.label || 'All Time';

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
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

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodChange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === key
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStart}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : !reports ? (
        <div className="text-center text-gray-400 py-12">Failed to load reports</div>
      ) : (
        <>
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
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" />
                Lead Leaderboard
              </h2>
              <span className="text-xs text-gray-400">{periodLabel}</span>
            </div>
            {reports.leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Send size={36} className="mx-auto mb-2" />
                <p className="text-sm">No leads sent in this period</p>
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

          {/* All Leads Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Clock size={18} className="text-gray-500" />
                All Leads Sent
              </h2>
              <span className="text-xs text-gray-400">
                {reports.recent_sends.length} lead{reports.recent_sends.length !== 1 ? 's' : ''} &middot; {periodLabel}
              </span>
            </div>
            {reports.recent_sends.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Clock size={36} className="mx-auto mb-2" />
                <p className="text-sm">No leads sent in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Agent</th>
                      <th className="px-4 py-2 hidden sm:table-cell">Property</th>
                      <th className="px-4 py-2">Partner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.recent_sends.map((send, index) => {
                      const isMainland = send.action === 'lead_sent_mainland';
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                            {new Date(send.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            {send.user_name}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell truncate max-w-[200px]">
                            {send.property_address || '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white ${
                              isMainland ? 'bg-[#1e3a5f]' : 'bg-[#1b3c6b]'
                            }`}>
                              {isMainland ? <Send size={10} /> : <TrendingDown size={10} />}
                              {isMainland ? 'Mainland' : 'Annie Mac'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
