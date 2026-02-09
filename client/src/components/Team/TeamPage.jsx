import { useState, useEffect } from 'react';
import { Users, UserPlus } from 'lucide-react';
import * as teamsApi from '../../api/teams';
import { useAuth } from '../../contexts/AuthContext';
import MemberList from './MemberList';
import Modal from '../Shared/Modal';
import LoadingSpinner from '../Shared/LoadingSpinner';
import StatusToast from '../Shared/StatusToast';

export default function TeamPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviteLink, setInviteLink] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const loadTeams = async () => {
    try {
      const data = await teamsApi.getAll();
      const teamsList = data.teams || [];
      if (teamsList.length > 0) {
        const activeTeam = teamsList[0];
        setTeam(activeTeam);
        await loadMembers(activeTeam.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (teamId) => {
    try {
      const data = await teamsApi.getMembers(teamId);
      setMembers(data.members || []);
    } catch (err) {
      showToast(err.message || 'Failed to load members', 'error');
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await teamsApi.create({ name: newTeamName.trim() });
      showToast('Team created successfully!', 'success');
      setNewTeamName('');
      await loadTeams();
    } catch (err) {
      showToast(err.message || 'Failed to create team', 'error');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!team) return;
    try {
      const data = await teamsApi.invite(team.id, inviteEmail, inviteRole);
      setInviteLink(data.invite?.link || '');
      showToast('Invitation sent!', 'success');
      setInviteEmail('');
      await loadMembers(team.id);
    } catch (err) {
      showToast(err.message || 'Failed to send invite', 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!team) return;
    try {
      await teamsApi.removeMember(team.id, memberId);
      showToast('Member removed successfully', 'success');
      await loadMembers(team.id);
    } catch (err) {
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleChangeRole = async (memberId, role) => {
    if (!team) return;
    try {
      await teamsApi.changeMemberRole(team.id, memberId, role);
      showToast('Role updated successfully', 'success');
      await loadMembers(team.id);
    } catch (err) {
      showToast(err.message || 'Failed to change role', 'error');
    }
  };

  const closeInviteModal = () => {
    setShowInvite(false);
    setInviteLink('');
    setInviteEmail('');
    setInviteRole('agent');
  };

  if (loading) return <LoadingSpinner />;

  // No team - show create team card
  if (!team) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <Users size={48} className="mx-auto mb-3 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Team</h2>
            <p className="text-gray-600">Get started by creating a team to collaborate with others.</p>
          </div>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
              <input
                type="text"
                required
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-base"
                placeholder="My Awesome Team"
              />
            </div>
            <button
              type="submit"
              className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)]"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Create Team
            </button>
          </form>
        </div>
        <StatusToast message={toast.message} type={toast.type} show={toast.show} />
      </div>
    );
  }

  // Has team - show team page
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-gray-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">{team.name}</h2>
            <p className="text-sm text-gray-500">
              {members.length} member{members.length !== 1 ? 's' : ''}
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

      {members.length > 0 ? (
        <MemberList
          members={members}
          currentUserId={user?.id}
          onRemove={handleRemoveMember}
          onChangeRole={handleChangeRole}
        />
      ) : (
        <div className="text-center text-gray-400 py-12">
          <Users size={48} className="mx-auto mb-3" />
          <p className="text-lg font-medium">No team members yet</p>
          <p className="text-sm">Invite your first team member to get started.</p>
        </div>
      )}

      <Modal isOpen={showInvite} onClose={closeInviteModal} title="Invite Team Member">
        {inviteLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Invitation created!</p>
              <p className="text-xs text-green-700 mb-3">Share this link with your team member:</p>
              <div className="bg-white p-3 rounded border border-green-300 break-all text-sm font-mono text-gray-800">
                {inviteLink}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                showToast('Link copied to clipboard!', 'success');
              }}
              className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)]"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Copy Link
            </button>
            <button
              onClick={closeInviteModal}
              className="w-full py-3 rounded-lg font-semibold text-base text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        ) : (
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
                <option value="agent">Agent</option>
                <option value="team_lead">Team Lead</option>
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
        )}
      </Modal>

      <StatusToast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  );
}
