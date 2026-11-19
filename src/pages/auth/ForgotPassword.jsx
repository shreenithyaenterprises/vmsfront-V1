import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword } from '../../services/authService.js';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword({ userId, oldPassword, newPassword });
      setSuccess('Password updated. Please sign in again.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err?.message || 'Unable to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f3ef] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 right-10 h-72 w-72 rounded-full bg-[#c6d8f7] blur-3xl opacity-70" />
        <div className="pointer-events-none absolute bottom-16 left-10 h-64 w-64 rounded-full bg-[#f7c7a8] blur-3xl opacity-70" />

        <div className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
          <div className="w-full rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur">
            <div className="mb-6 space-y-2">
              <h1 className="text-3xl font-semibold text-slate-900">Reset password</h1>
              <p className="text-sm text-slate-500">
                Enter your current credentials to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700">User ID</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Current password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">New password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Confirm new password</label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
              <span>Need help? Contact your administrator.</span>
              <Link className="font-medium text-slate-700 hover:text-slate-900" to="/login">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
