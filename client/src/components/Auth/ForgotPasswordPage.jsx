import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { forgotPassword } from '../../api/auth';
import Logo from '../Shared/Logo';

export default function ForgotPasswordPage() {
  const { brandConfig } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        {submitted ? (
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-green-800 mb-2">Check Your Email</h2>
              <p className="text-sm text-green-700">
                If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
                Please check your inbox and spam folder.
              </p>
            </div>
            <p className="text-sm text-gray-500">The link will expire in 1 hour.</p>
            <Link
              to="/login"
              className="block w-full py-3 rounded-lg font-bold text-base text-center text-[var(--brand-text-on-primary)]"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-gray-800 text-center">Forgot Password</h2>
            <p className="text-sm text-gray-600 text-center">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

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

            <button
              type="submit"
              disabled={loading}
              className="action-button w-full py-3 rounded-lg font-bold text-base text-[var(--brand-text-on-primary)] transition-colors disabled:opacity-50"
              style={{ backgroundColor: loading ? undefined : 'var(--brand-primary)' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
