import { ArrowRight, BookOpen, Camera, Layers, ShieldCheck, Sparkles, Upload, Video } from 'lucide-react';
import { PageRoute } from '../types/navigation.ts';
import { AvatarViewer } from '../components/avatar/AvatarViewer.tsx';
import { useState } from 'react';

interface LandingPageProps {
  onNavigate: (route: PageRoute) => void;
  demoSigns: Array<{
    id: string;
    gloss: string;
    category: string;
    description: string;
    is_demo: boolean;
    is_reviewed: boolean;
    linguist_notes: string;
  }>;
}

export function LandingPage({ onNavigate, demoSigns }: LandingPageProps) {
  const [previewGlosses, setPreviewGlosses] = useState<string[]>(['HELLO', 'FRIEND', 'WELCOME']);

  return (
    <div className="flex flex-col gap-10">
      {/* Hero Section */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#0b0f19] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Stage 3: Full UI & R3F 3D Avatar Viewer Ready</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Bridging Communities with Two-Way ISL Technology
          </h1>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
            AI SignBridge delivers bidirectional translation between Indian Sign Language (ISL) and written/spoken languages. Rigged 3D avatar animation maps validated sign clips, while browser vision pipelines extract spatial landmarks for recognition.
          </p>
        </div>

        {/* Primary Action Buttons (Prominently Featured per REQUIREMENTS.md) */}
        <div className="mt-8 pt-6 border-t border-gray-800/80 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => onNavigate('workspace')}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
          >
            <span>Start Translating</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('camera')}
            className="px-6 py-3 rounded-xl bg-[#1f2937] hover:bg-gray-700 text-gray-100 font-semibold text-sm transition-all border border-gray-700 flex items-center gap-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Open Camera</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('video-to-isl')}
            className="px-6 py-3 rounded-xl bg-[#1f2937] hover:bg-gray-700 text-gray-100 font-semibold text-sm transition-all border border-gray-700 flex items-center gap-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Avatar Demo Showcase */}
      <div className="rounded-2xl border border-gray-800 bg-[#111827] p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Interactive 3D Avatar Viewer</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Test procedural sign keyframes, timeline scrubbing, speed control, and unsupported sign fallback.
            </p>
          </div>

          {/* Quick Sign Presets to Test */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-mono mr-1">Try preset:</span>
            <button
              type="button"
              onClick={() => setPreviewGlosses(['HELLO', 'FRIEND', 'WELCOME'])}
              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 font-mono cursor-pointer border border-gray-700"
            >
              Greeting
            </button>
            <button
              type="button"
              onClick={() => setPreviewGlosses(['THANK_YOU', 'HELP', 'PLEASE'])}
              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 font-mono cursor-pointer border border-gray-700"
            >
              Courtesy
            </button>
            <button
              type="button"
              onClick={() => setPreviewGlosses(['WATER', 'PLEASE', 'GOOD'])}
              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 font-mono cursor-pointer border border-gray-700"
            >
              Needs
            </button>
            <button
              type="button"
              onClick={() => setPreviewGlosses(['HELLO', 'UNICORN', 'SIGN'])}
              title="Test Honesty Rule 2: Explicit Unsupported Sign Notice for UNICORN"
              className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-mono cursor-pointer"
            >
              Test Unsupported (UNICORN)
            </button>
          </div>
        </div>

        {/* 3D Avatar Viewer Component */}
        <AvatarViewer
          initialGlosses={previewGlosses}
          autoPlay={false}
          heightClassName="h-[460px]"
          showSequenceList={true}
        />
      </div>

      {/* Two-Way Directions Overview */}
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
            <button
              type="button"
              onClick={() => onNavigate('text-to-isl')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Direction A</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
            <button
              type="button"
              onClick={() => onNavigate('camera')}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Direction B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* DEMO Vocabulary Seed Display (Honesty Rule 5 Compliant) */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Initial DEMO ISL Vocabulary Seed ({demoSigns.length} Signs)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/80 font-mono">
              Demo Seed: Needs Linguist Review
            </span>
            <button
              type="button"
              onClick={() => onNavigate('vocabulary')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline"
            >
              View Vocabulary Centre
            </button>
          </div>
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
    </div>
  );
}
