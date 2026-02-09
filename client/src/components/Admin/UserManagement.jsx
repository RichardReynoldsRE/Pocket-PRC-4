import { useState, useEffect } from 'react';
import { User, Shield } from 'lucide-react';
import * as adminApi from '../../api/admin';
import StatusToast from '../Shared/StatusToast';

const ROLE_LABELS = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  agent: 'Agent',
};

const ROLE_BADGE_STYLES = {
  admin: 'bg-purple-100 text-purple-800',
  team_lead: 'bg-yellow-100 text-yellow-800',
  agent: 'bg-blue-100 text-blue-800',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await adminApi.getUsers();
      setUsers(data.users || []);
    } catch (error) {
      showToast('Failed to load users', 'error');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Optimistic update
    const previousUsers = [...users];
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      await adminApi.updateUser(userId, { role: newRole });
      showToast(`Updated ${user.name}'s role to ${ROLE_LABELS[newRole]}`, 'success');
    } catch (error) {
      // Revert on error
      setUsers(previousUsers);
      showToast('Failed to update role', 'error');
      console.error('Error updating role:', error);
    }
  }

  async function handleToggleActive(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = !user.is_active;

    // Confirm deactivation
    if (!newStatus) {
      if (!window.confirm(`Deactivate ${user.name}?`)) {
        return;
      }
    }

    // Optimistic update
    const previousUsers = [...users];
    setUsers(users.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));

    try {
      await adminApi.updateUser(userId, { is_active: newStatus });
      showToast(
        `${user.name} ${newStatus ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error) {
      // Revert on error
      setUsers(previousUsers);
      showToast(`Failed to ${newStatus ? 'activate' : 'deactivate'} user`, 'error');
      console.error('Error toggling user status:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">
        <p className="text-lg font-medium">Loading users...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={16} className="text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500 hidden sm:block">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    >
                      <option value="admin">Admin</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="agent">Agent</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">
                    {user.team_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className={`text-sm font-medium action-button ${
                        user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <User size={48} className="mx-auto mb-3" />
            <p className="text-lg font-medium">No users found</p>
          </div>
        )}
      </div>

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </>
  );
}
