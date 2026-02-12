import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { acceptInvite } from '../../api/auth';
import Logo from '../Shared/Logo';

export default function LoginPage() {
  const { login, updateUser } = useAuth();
  const { brandConfig } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);

      // If there's an invite token, accept it after login
      if (inviteToken) {
        try {
          const data = await acceptInvite(inviteToken);
          if (data.user) updateUser(data.user);
        } catch {
          // If invite fails (expired, already used), still proceed with login
        }
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div
        className="text-[var(--brand-text-on-primary)] p-8 text-center"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <div className="mx-auto mb-3 w-fit"><Logo size={64} /></div>
        <h1 className="text-2xl font-bold">{brandConfig.app_name || 'Pocket PRC'}</h1>
        <p className="text-sm opacity-75 mt-1">Public Records Checklist</p>
      </div>

      <div className="flex-1 flex items-start justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-xl font-bold text-gray-800 text-center">Sign In</h2>

          {inviteToken && (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-200">
              Sign in to join your team!
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
              placeholder="Enter password"
            />
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium"
              style={{ color: 'var(--brand-primary)' }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] transition-colors disabled:opacity-50"
            style={{ backgroundColor: loading ? undefined : 'var(--brand-primary)' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              to={inviteToken ? `/register?invite=${inviteToken}` : '/register'}
              className="font-semibold"
              style={{ color: 'var(--brand-primary)' }}
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
