import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { PageRoute } from '../types/navigation.ts';

interface AuthPageProps {
  onAuthSuccess: (user: any, token: string) => void;
  onNavigate: (route: PageRoute) => void;
}

export function AuthPage({ onAuthSuccess, onNavigate }: AuthPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const endpoint = tab === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body =
        tab === 'login'
          ? { email, password }
          : { email, password, full_name: fullName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please verify credentials.');
      }

      if (tab === 'login') {
        const csrfToken = data.csrf_token || '';
        onAuthSuccess(data.user, csrfToken);
        onNavigate('workspace');
      } else {
        setSuccessMsg('Account registered successfully! Please sign in with your credentials.');
        setTab('login');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-8 shadow-2xl space-y-6">
        {/* Branding & Title */}
        <div className="text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            SB
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {tab === 'login' ? 'Sign in to AI SignBridge' : 'Create an Account'}
          </h2>
          <p className="text-xs text-gray-400">
            Protected by Argon2id password encryption & HttpOnly cookie sessions
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-[#0b0f19] p-1 border border-gray-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === 'login' ? 'bg-cyan-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === 'register' ? 'bg-cyan-500 text-gray-950 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {tab === 'register' && (
            <div>
              <label className="text-gray-300 font-medium block mb-1">Full Name:</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-gray-300 font-medium block mb-1">Email Address:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-300 font-medium">Password:</label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => onNavigate('verify-reset')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Badge */}
        <div className="pt-4 border-t border-gray-800/80 flex items-center justify-center gap-1.5 text-[11px] font-mono text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Dual CSRF validation & Argon2id memory-hard protection</span>
        </div>
      </div>
    </div>
  );
}
