import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Key,
  Lock,
  Mail,
} from 'lucide-react';
import { PageRoute } from '../types/navigation.ts';

export function VerifyResetPage({ onNavigate }: { onNavigate: (route: PageRoute) => void }) {
  const [activeTab, setActiveTab] = useState<'verify' | 'forgot' | 'reset'>('verify');
  const [verifyToken, setVerifyToken] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(verifyToken)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Email verification failed.');
      setStatusMessage('Your email address has been successfully verified! You may now sign in.');
      setVerifyToken('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification token invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset request failed.');
      setStatusMessage(
        'If an account exists for this email, a password reset link has been dispatched to Mailpit.'
      );
      setForgotEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset failed.');
      setStatusMessage('Password updated successfully! You can now log in with your new password.');
      setResetToken('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset token invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold">
            <Key className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Account Verification & Recovery
          </h2>
          <p className="text-xs text-gray-400">
            Verify your registered email address or recover access to your account.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-[#0b0f19] p-1 border border-gray-800 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('verify');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeTab === 'verify'
                ? 'bg-cyan-500 text-gray-950 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Verify Email
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('forgot');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeTab === 'forgot'
                ? 'bg-cyan-500 text-gray-950 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Request Reset
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reset');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              activeTab === 'reset'
                ? 'bg-cyan-500 text-gray-950 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Set Password
          </button>
        </div>

        {/* Alert Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab 1: Verify Email */}
        {activeTab === 'verify' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Verification Token:</label>
              <input
                type="text"
                required
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Paste token received in email..."
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Verify Email Address</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 2: Forgot Password */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Account Email Address:</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Dispatch Password Reset Link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 3: Reset Password */}
        {activeTab === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="text-gray-300 font-medium block mb-1">Reset Token:</label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste token from reset email..."
                className="w-full px-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-gray-300 font-medium block mb-1">New Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-gray-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Update Password</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Back to Sign In */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            ← Back to Sign In / Register
          </button>
        </div>

        {/* Local Mailpit Helper Notice */}
        <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 text-[11px] font-mono text-gray-400 flex items-center justify-between">
          <span>Local dev emails captured in Mailpit</span>
          <a
            href="http://localhost:8025"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans font-medium"
          >
            <span>Open Mailpit UI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
