import {
  AlertTriangle,
  Camera,
  FastForward,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Wind,
} from 'lucide-react';
import { AvatarPlayState, CameraPreset, PlaybackSpeed, SignSequenceItem } from '../../types/avatar.ts';

interface AvatarControlsProps {
  playState: AvatarPlayState;
  currentSign: SignSequenceItem | null;
  sequence: SignSequenceItem[];
  currentIndex: number;
  currentTime: number;
  totalDuration: number;
  speed: PlaybackSpeed;
  cameraPreset: CameraPreset;
  reducedMotion: boolean;
  isFullscreen: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onToggleReducedMotion: () => void;
  onToggleFullscreen: () => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function AvatarControls({
  playState,
  currentSign,
  sequence,
  currentIndex,
  currentTime,
  totalDuration,
  speed,
  cameraPreset,
  reducedMotion,
  isFullscreen,
  onPlay,
  onPause,
  onReplay,
  onPrevious,
  onNext,
  onSeek,
  onSpeedChange,
  onCameraPresetChange,
  onToggleReducedMotion,
  onToggleFullscreen,
}: AvatarControlsProps) {
  const isPlaying = playState === 'playing';

  // Format time as M:SS.S
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const m = Math.floor(safeSecs / 60);
    const s = (safeSecs % 60).toFixed(1);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(clickRatio * totalDuration);
  };

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-xl p-4 flex flex-col gap-3 select-none shadow-xl">
      {/* Current Sign Gloss Label & Review Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">CURRENT SIGN:</span>
          {currentSign ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-cyan-400 tracking-wide font-mono">
                {currentSign.gloss}
              </span>
              {currentSign.isSupported ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
                  Demo Sign: Pending Review
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-800 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Unsupported Sign
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">None selected</span>
          )}
        </div>

        {/* Sequence Progress Counter */}
        {sequence.length > 0 && (
          <div className="text-xs text-gray-400 font-mono">
            Sign {currentIndex + 1} of {sequence.length}
          </div>
        )}
      </div>

      {/* Unsupported Sign Alert Notification (Honesty Rule 2) */}
      {currentSign && !currentSign.isSupported && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-red-300">
              Honesty Rule 2: Explicit Unsupported Sign Notice
            </div>
            <p className="text-gray-300 leading-relaxed">
              {currentSign.unsupportedMessage ||
                `The gloss "${currentSign.gloss}" is not yet catalogued in the verified ISL vocabulary. The avatar has halted in neutral rest pose rather than inventing an unverified gesture.`}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Timeline Scrubber with Sign Cue Markers */}
      <div className="space-y-1.5 pt-1">
        <div
          role="slider"
          aria-label="Timeline Scrubber"
          aria-valuemin={0}
          aria-valuemax={totalDuration}
          aria-valuenow={currentTime}
          tabIndex={0}
          onClick={handleTimelineClick}
          className="relative w-full h-3 bg-gray-900 rounded-full border border-gray-700/80 cursor-pointer overflow-hidden group hover:border-cyan-500/50 transition-colors"
        >
          {/* Cue Markers for Each Sign */}
          {sequence.map((item) => {
            const leftPct = totalDuration > 0 ? (item.startTime / totalDuration) * 100 : 0;
            return (
              <div
                key={item.id + item.startTime}
                style={{ left: `${leftPct}%` }}
                className={`absolute top-0 bottom-0 w-[2px] z-10 ${
                  item.isSupported ? 'bg-gray-600' : 'bg-red-500'
                }`}
                title={`${item.gloss} (${formatTime(item.startTime)})`}
              />
            );
          })}

          {/* Filled Progress Bar */}
          <div
            style={{
              width: `${totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0}%`,
            }}
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75 relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md" />
          </div>
        </div>

        {/* Timestamp Indicator */}
        <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Main Playback & Navigation Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReplay}
            aria-label="Replay from start"
            title="Replay from start"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex <= 0}
            aria-label="Previous sign"
            title="Previous sign"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-gray-200 hover:text-white transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-cyan-500/20"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span className="text-xs">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span className="text-xs">Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= sequence.length - 1}
            aria-label="Next sign"
            title="Next sign"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 text-gray-200 hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
          <FastForward className="w-3.5 h-3.5 text-gray-400 ml-1 mr-0.5" />
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                speed === s
                  ? 'bg-cyan-500 text-gray-950 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Camera Presets & Accessibility Modes */}
        <div className="flex items-center gap-1.5">
          {/* Camera Angles */}
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
            <Camera className="w-3.5 h-3.5 text-gray-400 ml-1 mr-0.5" />
            <button
              type="button"
              onClick={() => onCameraPresetChange('front')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                cameraPreset === 'front'
                  ? 'bg-cyan-900/80 text-cyan-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Default Front: Full upper body and face"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('upper')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                cameraPreset === 'upper'
                  ? 'bg-cyan-900/80 text-cyan-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Upper Body: Torso and head focus"
            >
              Upper
            </button>
            <button
              type="button"
              onClick={() => onCameraPresetChange('hands')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                cameraPreset === 'hands'
                  ? 'bg-cyan-900/80 text-cyan-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Hand Zoom: Focus on finger articulation"
            >
              Hands
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <button
            type="button"
            onClick={onToggleReducedMotion}
            aria-pressed={reducedMotion}
            title={reducedMotion ? 'Reduced Motion: ON (suppresses rapid movements)' : 'Reduced Motion: OFF'}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              reducedMotion
                ? 'bg-cyan-950 border-cyan-700 text-cyan-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Wind className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewer'}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
