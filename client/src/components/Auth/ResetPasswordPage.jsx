import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { resetPassword } from '../../api/auth';
import Logo from '../Shared/Logo';

export default function ResetPasswordPage() {
  const { brandConfig } = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may be expired.');
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
        {!token ? (
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-red-800 mb-2">Invalid Link</h2>
              <p className="text-sm text-red-700">
                This password reset link is missing a token. Please request a new reset link.
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="block w-full py-3 rounded-lg font-bold text-base text-center text-[var(--brand-text-on-primary)]"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Request New Link
            </Link>
          </div>
        ) : success ? (
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-green-800 mb-2">Password Reset!</h2>
              <p className="text-sm text-green-700">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 rounded-lg font-bold text-base text-center text-[var(--brand-text-on-primary)]"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-800 text-center">Set New Password</h2>
            <p className="text-sm text-gray-600 text-center">
              Enter your new password below.
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                placeholder="Min. 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] transition-colors disabled:opacity-50"
              style={{ backgroundColor: loading ? undefined : 'var(--brand-primary)' }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link to="/login" className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
