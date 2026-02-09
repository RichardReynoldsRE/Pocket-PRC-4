import { useState, useEffect } from 'react';
import { Users, UserPlus } from 'lucide-react';
import * as teamsApi from '../../api/teams';
import MemberList from './MemberList';
import Modal from '../Shared/Modal';
import LoadingSpinner from '../Shared/LoadingSpinner';
import StatusToast from '../Shared/StatusToast';

export default function TeamPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    teamsApi
      .getAll()
      .then((data) => setTeams(data.teams || data || []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!teams.length) return;
    try {
      await teamsApi.invite(teams[0].id, inviteEmail, inviteRole);
      showToast('Invitation sent!', 'success');
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      showToast(err.message || 'Failed to send invite', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const team = teams[0];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-gray-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">{team?.name || 'My Team'}</h2>
            <p className="text-sm text-gray-500">
              {team?.members?.length || 0} member(s)
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="action-button flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-[var(--brand-text-on-primary)] transition-colors"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <UserPlus size={18} />
          Invite
        </button>
      </div>

      {team?.members?.length > 0 ? (
        <MemberList members={team.members} teamId={team.id} />
      ) : (
        <div className="text-center text-gray-400 py-12">
          <Users size={48} className="mx-auto mb-3" />
          <p className="text-lg font-medium">No team members yet</p>
          <p className="text-sm">Invite your first team member to get started.</p>
        </div>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
              placeholder="colleague@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)]"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Send Invitation
          </button>
        </form>
      </Modal>

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  );
}
