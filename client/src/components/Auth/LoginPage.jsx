import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../Shared/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const { brandConfig } = useTheme();
  const navigate = useNavigate();
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
            <Link to="/register" className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
