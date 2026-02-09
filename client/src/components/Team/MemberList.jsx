import { useState } from 'react';
import { Trash2, Shield, User } from 'lucide-react';

const ROLE_STYLES = {
  owner: 'bg-purple-100 text-purple-800',
  team_lead: 'bg-yellow-100 text-yellow-800',
  agent: 'bg-blue-100 text-blue-800',
  transaction_coordinator: 'bg-teal-100 text-teal-800',
  isa: 'bg-orange-100 text-orange-800',
};

const ROLE_LABELS = {
  owner: 'Owner',
  team_lead: 'Team Lead',
  agent: 'Agent',
  transaction_coordinator: 'TC',
  isa: 'ISA',
};

export default function MemberList({ members, currentUserId, onRemove, onChangeRole }) {
  const [changingRoleFor, setChangingRoleFor] = useState(null);

  const handleRemoveClick = (member) => {
    if (window.confirm(`Remove ${member.name} from the team?`)) {
      onRemove(member.id);
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    onChangeRole(memberId, newRole);
    setChangingRoleFor(null);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 hidden sm:table-cell">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const showingRoleSelect = changingRoleFor === member.id;

            return (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {member.name?.charAt(0)?.toUpperCase() || <User size={14} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-500 sm:hidden">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{member.email}</td>
                <td className="px-4 py-3">
                  {showingRoleSelect ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      onBlur={() => setChangingRoleFor(null)}
                      autoFocus
                      className="text-xs font-medium px-2 py-1 rounded border border-gray-300 bg-white"
                    >
                      <option value="owner">Owner</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="agent">Agent</option>
                      <option value="transaction_coordinator">Transaction Coordinator</option>
                      <option value="isa">ISA</option>
                    </select>
                  ) : (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        ROLE_STYLES[member.role] || ROLE_STYLES.agent
                      }`}
                    >
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!isCurrentUser && (onRemove || onChangeRole) && (
                    <div className="flex items-center justify-end gap-2">
                      {onChangeRole && (
                        <button
                          onClick={() => setChangingRoleFor(member.id)}
                          title="Change role"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Shield size={16} />
                        </button>
                      )}
                      {onRemove && (
                        <button
                          onClick={() => handleRemoveClick(member)}
                          title="Remove member"
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
