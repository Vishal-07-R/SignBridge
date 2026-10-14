import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Laptop,
  LogOut,
  Smartphone,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';

interface UserDashboardProps {
  currentUser: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
    is_verified: boolean;
  } | null;
  onLogout: () => void;
}

export function UserDashboardPage({ currentUser, onLogout }: UserDashboardProps) {
  const { defaultAvatarSpeed, defaultCameraPreset, setDefaultAvatarSpeed, setDefaultCameraPreset } =
    useAccessibility();

  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess-current',
      device: 'Desktop Browser (Chromium / Linux)',
      ip: '127.0.0.1 (Localhost)',
      createdAt: 'Just now',
      isCurrent: true,
    },
    {
      id: 'sess-prev',
      device: 'Mobile Browser (Mobile WebKit)',
      ip: '192.168.1.104',
      createdAt: 'Yesterday, 14:32',
      isCurrent: false,
    },
  ]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRevokeSession = (id: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExportData = () => {
    const userData = {
      profile: currentUser,
      exportTimestamp: new Date().toISOString(),
      activeSessions,
      notice: 'User data exported in accordance with SignBridge privacy controls.',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'signbridge_user_data.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!currentUser) {
    return (
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-8 text-center text-gray-400">
        <UserIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
        <h3 className="text-base font-bold text-white mb-1">User Account Dashboard</h3>
        <p className="text-xs mb-4">Please sign in to view your profile, manage sessions, and configure personal preferences.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-2xl shadow-inner">
            {currentUser.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{currentUser.full_name}</h2>
              {currentUser.is_verified && (
                <span title="Email Verified" className="text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{currentUser.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] uppercase">
                {currentUser.roles[0] || 'User'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-red-400 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Preferences */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">
            Avatar & Translation Preferences
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-gray-300 block mb-1.5 font-medium">
                Default Avatar Speed:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0.75, 1.0, 1.25].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setDefaultAvatarSpeed(speed as any)}
                    className={`py-1.5 rounded border font-mono transition-colors ${
                      defaultAvatarSpeed === speed
                        ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-bold'
                        : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-300 block mb-1.5 font-medium">
                Default Camera View Preset:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['front', 'upper', 'hands'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDefaultCameraPreset(preset)}
                    className={`py-1.5 rounded border capitalize transition-colors ${
                      defaultCameraPreset === preset
                        ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-bold'
                        : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3 flex items-center justify-between">
            <span>Active Login Sessions</span>
            <span className="text-xs font-mono text-cyan-400">{activeSessions.length} active</span>
          </h3>

          <div className="space-y-3">
            {activeSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {sess.isCurrent ? (
                    <Laptop className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-gray-500" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-200">
                      {sess.device}{' '}
                      {sess.isCurrent && (
                        <span className="text-[10px] text-cyan-400 font-mono">(This device)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {sess.ip} • {sess.createdAt}
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Data Privacy & Actions */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">
          Data Privacy & Account Controls
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md space-y-1">
            <div className="text-xs font-bold text-gray-200">Export Personal Data</div>
            <p className="text-[11px] text-gray-400">
              Download a machine-readable JSON archive of your account profile, preferences, and session activity.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Archive</span>
          </button>
        </div>

        <div className="pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md space-y-1">
            <div className="text-xs font-bold text-red-400">Delete Account</div>
            <p className="text-[11px] text-gray-400">
              Permanently remove your account, translation history, and private data. This action is irreversible.
            </p>
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 font-semibold">Are you sure?</span>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-bold"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-xs text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
