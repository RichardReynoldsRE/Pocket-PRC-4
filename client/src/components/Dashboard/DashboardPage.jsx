import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as checklistsApi from '../../api/checklists';
import ChecklistCard from './ChecklistCard';
import LoadingSpinner from '../Shared/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checklistsApi
      .getAll()
      .then((data) => setChecklists(data.checklists || data || []))
      .catch(() => setChecklists([]))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (checklistId, newStatus) => {
    setChecklists((prev) =>
      prev.map((c) => (c.id === checklistId ? { ...c, status: newStatus } : c))
    );
  };

  const drafts = checklists.filter((c) => c.status === 'draft').length;
  const completed = checklists.filter((c) => c.status === 'completed').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Hello, {user?.name?.split(' ')[0] || 'Agent'}
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <FileText size={24} className="mx-auto mb-1 text-gray-500" />
          <p className="text-2xl font-bold text-gray-800">{checklists.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <Clock size={24} className="mx-auto mb-1 text-yellow-500" />
          <p className="text-2xl font-bold text-gray-800">{drafts}</p>
          <p className="text-xs text-gray-500">Drafts</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <CheckCircle size={24} className="mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold text-gray-800">{completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      <button
        onClick={() => navigate('/checklist/new')}
        className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] flex items-center justify-center gap-2 shadow-md mb-6 transition-colors"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <PlusCircle size={22} />
        New Checklist
      </button>

      {checklists.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <FileText size={48} className="mx-auto mb-3" />
          <p className="text-lg font-medium">No checklists yet</p>
          <p className="text-sm">Create your first Public Records Checklist above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist.id} checklist={checklist} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
