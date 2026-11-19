import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService.js';

const Login = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ userId, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#f4f4f2] text-[#1c1f22]">
      {/* Left — brand / visual panel */}
      <div className="relative hidden overflow-hidden bg-[#14181c] lg:flex lg:flex-col">
        {/* subtle steel-plate texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 28px)',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#e2632a] opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-1 flex-col justify-between px-12 py-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#e2632a]/40 bg-[#1d2227]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path d="M3 21V9l9-6 9 6v12" stroke="#e2632a" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M9 21v-7h6v7" stroke="#e2632a" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide text-white">
                  SKY STEEL &amp; POWER
                </p>
                <p className="text-[11px] text-[#8b9299]">Private Limited</p>
              </div>
            </div>

            <h1 className="mt-16 max-w-md text-3xl font-semibold leading-snug text-white">
              Every visitor, logged, badged and accounted for on the plant floor.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#a7adb3]">
              Sign in to check visitors in and out, issue passes and keep a
              live record of who is on site.
            </p>
          </div>

          {/* Visitor illustration */}
          <div className="relative mx-auto w-full max-w-sm">
            <svg viewBox="0 0 360 260" className="w-full" fill="none">
              {/* reception desk */}
              <rect x="40" y="180" width="280" height="14" rx="2" fill="#232a30" />
              <rect x="55" y="194" width="250" height="46" rx="4" fill="#1d2227" stroke="#2c343b" />
              {/* gate posts */}
              <rect x="70" y="70" width="10" height="110" fill="#2c343b" />
              <rect x="280" y="70" width="10" height="110" fill="#2c343b" />
              <rect x="70" y="66" width="220" height="8" rx="2" fill="#e2632a" opacity="0.85" />
              {/* visitor figure */}
              <circle cx="150" cy="118" r="16" fill="#3a434b" />
              <path d="M124 176c2-22 14-34 26-34s24 12 26 34" stroke="#3a434b" strokeWidth="10" strokeLinecap="round" />
              {/* badge on visitor */}
              <rect x="141" y="140" width="18" height="22" rx="3" fill="#e2632a" />
              <circle cx="150" cy="148" r="3" fill="#14181c" />
              {/* host figure */}
              <circle cx="222" cy="122" r="14" fill="#556069" />
              <path d="M200 176c2-20 12-30 22-30s20 10 22 30" stroke="#556069" strokeWidth="9" strokeLinecap="round" />
              {/* id card floating */}
              <g transform="translate(250,150) rotate(8)">
                <rect x="0" y="0" width="34" height="22" rx="3" fill="#1d2227" stroke="#e2632a" strokeWidth="1.4" />
                <circle cx="9" cy="9" r="4" fill="#e2632a" opacity="0.7" />
                <rect x="17" y="6" width="12" height="2.2" rx="1" fill="#556069" />
                <rect x="17" y="11" width="9" height="2.2" rx="1" fill="#3a434b" />
              </g>
            </svg>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-[#71787f]">
            <span>Role-based access</span>
            <span className="h-1 w-1 rounded-full bg-[#3a434b]" />
            <span>Encrypted sessions</span>
            <span className="h-1 w-1 rounded-full bg-[#3a434b]" />
            <span>Audit-ready logs</span>
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#14181c]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M3 21V9l9-6 9 6v12" stroke="#e2632a" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 21v-7h6v7" stroke="#e2632a" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#14181c]">SKY STEEL &amp; POWER</p>
              <p className="text-[11px] text-[#6b7178]">Private Limited</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#14181c]">Sign in</h2>
            <p className="mt-1.5 text-sm text-[#6b7178]">Use your staff credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[#3a434b]">User ID</label>
              <input
                className="mt-2 w-full rounded-lg border border-[#d8d9d6] bg-white px-4 py-3 text-sm text-[#14181c] outline-none transition focus:border-[#e2632a] focus:ring-2 focus:ring-[#e2632a]/20"
                placeholder="Enter your user id"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#3a434b]">Password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-lg border border-[#d8d9d6] bg-white px-4 py-3 text-sm text-[#14181c] outline-none transition focus:border-[#e2632a] focus:ring-2 focus:ring-[#e2632a]/20"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#6b7178]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#d8d9d6] text-[#e2632a] focus:ring-[#e2632a]"
                />
                Remember me
              </label>
              <Link className="font-medium text-[#e2632a] hover:text-[#c8531f]" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#14181c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d2227] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-[#9aa0a6]">
            © {new Date().getFullYear()} Sky Steel &amp; Power Private Limited — Visitor Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;