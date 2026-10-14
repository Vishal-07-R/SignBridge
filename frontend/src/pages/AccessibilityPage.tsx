import { useState } from 'react';
import {
  Eye,
  Keyboard,
  Sliders,
  Type,
  Volume2,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';
import { PlaybackSpeed } from '../types/avatar.ts';

export function AccessibilityPage() {
  const {
    reducedMotion,
    highContrast,
    fontSize,
    defaultAvatarSpeed,
    setReducedMotion,
    setHighContrast,
    setFontSize,
    setDefaultAvatarSpeed,
  } = useAccessibility();

  const [announcementText, setAnnouncementText] = useState('');

  const testScreenReaderAnnouncement = () => {
    setAnnouncementText('Screen reader announcement test: AI SignBridge accessibility mode is fully active.');
    setTimeout(() => setAnnouncementText(''), 4000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono">
            <Sliders className="w-3.5 h-3.5" />
            <span>WCAG 2.1 AA Compliant Controls</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Accessibility & Display Preferences</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Customize motion, contrast, typography scaling, and keyboard controls to optimize your communication experience.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual & Motion Controls */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Visual & Motion Settings</span>
          </h3>

          {/* Reduced Motion Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="reduced-motion-toggle" className="text-xs font-bold text-gray-200 block">
                Reduced Motion Mode
              </label>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Suppresses rapid avatar transitions, halts idle breathing, and dampens screen animations.
              </p>
            </div>
            <button
              id="reduced-motion-toggle"
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                reducedMotion ? 'bg-cyan-500 justify-end' : 'bg-gray-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* High Contrast Mode */}
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-gray-800">
            <div className="space-y-1">
              <label htmlFor="high-contrast-toggle" className="text-xs font-bold text-gray-200 block">
                High Contrast Theme
              </label>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Boosts text contrast, sharpens borders, and maximizes handshape visibility.
              </p>
            </div>
            <button
              id="high-contrast-toggle"
              type="button"
              role="switch"
              aria-checked={highContrast}
              onClick={() => setHighContrast(!highContrast)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                highContrast ? 'bg-cyan-500 justify-end' : 'bg-gray-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Typography Scale */}
          <div className="space-y-2 pt-4 border-t border-gray-800">
            <label className="text-xs font-bold text-gray-200 block flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interface Font Scaling:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={`py-2 rounded-lg text-xs capitalize border transition-colors ${
                    fontSize === size
                      ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-bold'
                      : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Avatar Playback & Assistive Tech */}
        <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Avatar Speed & Screen Readers</span>
          </h3>

          {/* Default Speed */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-200 block">
              Default Signing Speed:
            </label>
            <p className="text-[11px] text-gray-400">
              Slower speeds make finger-spelling and complex hand configurations easier to discern.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {([0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as PlaybackSpeed[]).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setDefaultAvatarSpeed(spd)}
                  className={`py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                    defaultAvatarSpeed === spd
                      ? 'bg-cyan-950 border-cyan-800 text-cyan-300 font-bold'
                      : 'bg-[#0b0f19] border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Screen Reader ARIA Live Test */}
          <div className="space-y-2 pt-4 border-t border-gray-800">
            <label className="text-xs font-bold text-gray-200 block flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Screen Reader Announcements:</span>
            </label>
            <p className="text-[11px] text-gray-400">
              Test ARIA live region updates for assistive screen reader technology.
            </p>
            <button
              type="button"
              onClick={testScreenReaderAnnouncement}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-cyan-400 border border-gray-700 transition-colors cursor-pointer"
            >
              Trigger Test Announcement
            </button>

            {/* Live region */}
            <div aria-live="polite" className="text-xs font-mono text-emerald-400 pt-1">
              {announcementText}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Cheat Sheet */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span>Keyboard Shortcuts Reference</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Play / Pause Avatar</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              Space
            </kbd>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Next Sign</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              → (Right)
            </kbd>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Previous Sign</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              ← (Left)
            </kbd>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Toggle Fullscreen</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              F
            </kbd>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Cycle Camera Presets</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              C
            </kbd>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300">Replay Sequence</span>
            <kbd className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-cyan-300 font-mono text-[11px]">
              R
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
