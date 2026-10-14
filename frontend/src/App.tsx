import { useEffect, useState } from "react";
import { Activity, Camera, Layers, ShieldCheck, Upload, Video, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthStatus, setHealthStatus] = useState<"loading" | "connected" | "offline">("loading");

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/v1/health");
        if (res.ok) {
          const data: HealthData = await res.json();
          if (isMounted) {
            setHealth(data);
            setHealthStatus("connected");
          }
        } else {
          if (isMounted) setHealthStatus("offline");
        }
      } catch {
        if (isMounted) setHealthStatus("offline");
      }
    };

    fetchHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800 bg-[#111827]/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
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
              Verified Architecture Scaffold
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

        {/* System & Architecture Status Panel */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">System Architecture & Service Probes</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Frontend App</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">Vite + React + TS</div>
              <p className="text-xs text-gray-500 mt-1">Tailwind CSS & Vitest ready</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Backend API</span>
                {healthStatus === "connected" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="text-sm font-semibold text-white">FastAPI Factory</div>
              <p className="text-xs text-gray-500 mt-1">Pydantic v2 + Pytest ready</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Database & Cache</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">PostgreSQL 16 & Redis 7</div>
              <p className="text-xs text-gray-500 mt-1">Docker Compose configured</p>
            </div>

            <div className="p-4 rounded-lg bg-[#0b0f19] border border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Media & Email</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-semibold text-white">MinIO & Mailpit</div>
              <p className="text-xs text-gray-500 mt-1">S3 Private Storage + SMTP</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#111827] px-6 py-4 text-center text-xs text-gray-400">
        AI SignBridge © 2026. Built with integrity and accessible design.
      </footer>
    </div>
  );
}

export default App;
