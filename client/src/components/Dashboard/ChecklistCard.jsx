import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, User } from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function ChecklistCard({ checklist }) {
  const navigate = useNavigate();

  const status = checklist.status || 'draft';
  const address = checklist.property_address || checklist.propertyAddress || 'No address';
  const date = checklist.updated_at || checklist.created_at;
  const formattedDate = date ? new Date(date).toLocaleDateString() : '';
  const agentName = checklist.assigned_user_name || checklist.completedBy || '';

  return (
    <button
      onClick={() => navigate(`/checklist/${checklist.id}`)}
      className="w-full bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <p className="font-semibold text-gray-800 truncate">{address}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {formattedDate}
              </span>
            )}
            {agentName && (
              <span className="flex items-center gap-1">
                <User size={12} /> {agentName}
              </span>
            )}
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}
        >
          {STATUS_LABELS[status] || status}
        </span>
      </div>
    </button>
  );
}
