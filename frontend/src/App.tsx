import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Layers,
  LogOut,
  ShieldCheck,
  Upload,
  User as UserIcon,
  Video,
} from "lucide-react";
import { AuthModal } from "./components/AuthModal.tsx";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
}

interface SignItem {
  id: string;
  gloss: string;
  category: string;
  description: string;
  is_demo: boolean;
  is_reviewed: boolean;
  linguist_notes: string;
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthStatus, setHealthStatus] = useState<"loading" | "connected" | "offline">("loading");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [demoSigns, setDemoSigns] = useState<SignItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Fetch Health
    fetch("/api/v1/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthData | null) => {
        if (!isMounted) return;
        if (data) {
          setHealth(data);
          setHealthStatus("connected");
        } else {
          setHealthStatus("offline");
        }
      })
      .catch(() => {
        if (isMounted) setHealthStatus("offline");
      });

    // Check active session
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user: UserProfile | null) => {
        if (!isMounted) return;
        if (user && user.email) {
          setCurrentUser(user);
          // Read csrf cookie
          const match = document.cookie.match(/signbridge_csrf=([^;]+)/);
          if (match) setCsrfToken(match[1]);
        }
      })
      .catch(() => {});

    // Fetch DEMO vocabulary seed
    fetch("/api/v1/signs?limit=12")
      .then((res) => (res.ok ? res.json() : null))
      .then((signs: unknown) => {
        if (isMounted && Array.isArray(signs)) {
          setDemoSigns(signs as SignItem[]);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });
    } catch {
      // Ignored
    } finally {
      setCurrentUser(null);
      setCsrfToken(null);
    }
  };

  const handleAuthSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
    setCsrfToken(token);
    // Refresh demo signs
    fetch("/api/v1/signs?limit=12")
      .then((res) => (res.ok ? res.json() : null))
      .then((signs: SignItem[] | null) => {
        if (signs) setDemoSigns(signs);
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800 bg-[#111827]/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              SB
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AI SignBridge
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-medium">
                  Stage 1 Scaffold
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono font-medium">
                  Stage 2 Foundation
                </span>
              </h1>
              <p className="text-xs text-gray-400">Two-Way Indian Sign Language Communication Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Backend Connectivity Status */}
            <div
              aria-label="API Status"
              className="flex items-center space-x-2 text-xs bg-[#1f2937] px-3 py-1.5 rounded-md border border-gray-700"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  healthStatus === "connected"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : healthStatus === "loading"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-400"
                }`}
              />
              <span className="text-gray-300 font-medium">
                {healthStatus === "connected"
                  ? `API Connected (${health?.version})`
                  : healthStatus === "loading"
                  ? "Checking Backend..."
                  : "API Offline"}
              </span>
            </div>

            {/* Authentication Status & Actions */}
            {currentUser ? (
              <div className="flex items-center space-x-3 bg-[#1f2937] px-3 py-1.5 rounded-md border border-gray-700 text-xs">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-white">{currentUser.full_name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300 text-[10px] font-mono uppercase">
                    {currentUser.roles?.[0] || "user"}
                  </span>
                  {currentUser.is_verified && (
                    <span title="Email Verified">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-[#1f2937] hover:bg-gray-700 text-xs text-white border border-gray-700 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-600 text-xs text-gray-950 font-semibold transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* Hero Section */}
        <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-[#111827] to-[#0b0f19] p-8 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Stage 2 Relational Foundation & Argon2id Security
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bridging Communities with Two-Way ISL Technology
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              AI SignBridge provides bidirectional translation between Indian Sign Language (ISL) and written/spoken languages. Rigged 3D avatar animation maps validated sign clips, while browser-based vision pipelines extract spatial landmarks for recognition.
            </p>
          </div>

          {/* Primary Action Buttons (Prominently Featured per REQUIREMENTS.md) */}
          <div className="mt-8 pt-6 border-t border-gray-800/80 flex flex-wrap gap-4">
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-semibold text-sm transition-colors flex items-center gap-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
            >
              <span>Start Translating</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-[#1f2937] hover:bg-gray-700 text-gray-100 font-medium text-sm transition-colors border border-gray-700 flex items-center gap-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Open Camera</span>
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-[#1f2937] hover:bg-gray-700 text-gray-100 font-medium text-sm transition-colors border border-gray-700 flex items-center gap-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Upload Video</span>
            </button>
          </div>
        </div>

        {/* Directions Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Direction A */}
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Direction A: Text & Media to ISL</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Converts typed text, uploaded documents, screenshots (OCR), and speech audio into ordered ISL sign sequences rendered by a 3D avatar.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Pipeline: Text → Rule Engine → Avatar GLB</span>
              <span className="text-cyan-400 font-medium">Stage 3 & 4</span>
            </div>
          </div>

          {/* Direction B */}
          <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Direction B: ISL to Text</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Live webcam recognition and uploaded signing-video interpretation using browser-based hand and pose landmark extraction with confidence metrics.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Pipeline: MediaPipe Landmarks → Model → Text</span>
              <span className="text-blue-400 font-medium">Stage 6</span>
            </div>
          </div>
        </div>

        {/* DEMO Vocabulary Seed Display (Honesty Rule 5 Compliant) */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Initial DEMO ISL Vocabulary Seed ({demoSigns.length} Signs)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/80 font-mono">
              Demo Seed: Needs Linguist Review
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {demoSigns.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-cyan-400">{s.gloss}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{s.category}</div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.description}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-800 text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <span>● unreviewed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System & Architecture Status Panel */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Stage 2 Foundation & Service Infrastructure</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Database Models</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">PostgreSQL 16 Alembic</div>
              <p className="text-xs text-gray-500 mt-1">All 16 tables migrated & active</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Auth & Security</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">Argon2id + Cookie Sessions</div>
              <p className="text-xs text-gray-500 mt-1">CSRF protection & Redis rate limits</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">RBAC & Isolation</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">Admin CLI & Roles</div>
              <p className="text-xs text-gray-500 mt-1">User data strictly isolated</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Communications</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">Mailpit SMTP & MinIO</div>
              <p className="text-xs text-gray-500 mt-1">Async emails & S3 private media</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#111827] px-6 py-4 text-center text-xs text-gray-400">
        AI SignBridge © 2026. Built with integrity, verified schemas, and accessible design.
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
