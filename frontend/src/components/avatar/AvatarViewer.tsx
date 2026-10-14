import { useEffect, useRef, useState } from 'react';
import {
  AvatarPlayState,
  CameraPreset,
  PlaybackSpeed,
  SignSequenceItem,
} from '../../types/avatar.ts';
import { buildSignSequence } from './clipMapper.ts';
import { AvatarCanvas } from './AvatarCanvas.tsx';
import { AvatarControls } from './AvatarControls.tsx';
import { AvatarSequenceList } from './AvatarSequenceList.tsx';
import { useAccessibility } from '../../context/AccessibilityContext.tsx';

interface AvatarViewerProps {
  initialGlosses?: string[];
  autoPlay?: boolean;
  heightClassName?: string;
  showSequenceList?: boolean;
  onSignChange?: (gloss: string | null) => void;
}

export function AvatarViewer({
  initialGlosses = ['HELLO', 'FRIEND', 'WELCOME'],
  autoPlay = false,
  heightClassName = 'h-[440px]',
  showSequenceList = true,
  onSignChange,
}: AvatarViewerProps) {
  const {
    reducedMotion: a11yReducedMotion,
    defaultAvatarSpeed,
    defaultCameraPreset,
  } = useAccessibility();

  const containerRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [sequence, setSequence] = useState<SignSequenceItem[]>(() =>
    buildSignSequence(initialGlosses)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playState, setPlayState] = useState<AvatarPlayState>('idle');
  const [speed, setSpeed] = useState<PlaybackSpeed>(defaultAvatarSpeed);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(defaultCameraPreset);
  const [reducedMotion, setReducedMotion] = useState(a11yReducedMotion);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync a11y settings
  useEffect(() => {
    setReducedMotion(a11yReducedMotion);
  }, [a11yReducedMotion]);

  useEffect(() => {
    setSpeed(defaultAvatarSpeed);
  }, [defaultAvatarSpeed]);

  useEffect(() => {
    setCameraPreset(defaultCameraPreset);
  }, [defaultCameraPreset]);

  // Update sequence whenever initialGlosses change
  useEffect(() => {
    const seq = buildSignSequence(initialGlosses);
    setSequence(seq);
    setCurrentIndex(0);
    setCurrentTime(0);
    setPlayState(autoPlay ? 'playing' : 'idle');
  }, [initialGlosses, autoPlay]);

  const totalDuration = sequence.length > 0 ? sequence[sequence.length - 1].endTime : 0;
  const currentSign = sequence[currentIndex] || null;

  // Notify parent on sign change
  useEffect(() => {
    onSignChange?.(currentSign ? currentSign.gloss : null);
  }, [currentSign, onSignChange]);

  // Calculate normalized progress within the current sign
  let signProgress = 0;
  if (currentSign && currentSign.duration > 0) {
    signProgress = Math.max(0, Math.min(1, (currentTime - currentSign.startTime) / currentSign.duration));
  }

  // Animation playback frame loop
  useEffect(() => {
    if (playState !== 'playing') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prevTime) => {
        const nextTime = prevTime + delta * speed;

        if (nextTime >= totalDuration) {
          setPlayState('completed');
          return totalDuration;
        }

        // Check which sign index we are currently in
        const newIdx = sequence.findIndex(
          (item) => nextTime >= item.startTime && nextTime < item.endTime
        );
        if (newIdx !== -1 && newIdx !== currentIndex) {
          setCurrentIndex(newIdx);

          // If the newly entered sign is unsupported, immediately halt (Honesty Rule 2)
          if (!sequence[newIdx].isSupported) {
            setPlayState('unsupported');
          }
        }

        return nextTime;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playState, speed, totalDuration, sequence, currentIndex]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlay = () => {
    if (playState === 'completed' || currentTime >= totalDuration) {
      setCurrentTime(0);
      setCurrentIndex(0);
    }
    setPlayState('playing');
  };

  const handlePause = () => {
    setPlayState('paused');
  };

  const handleReplay = () => {
    setCurrentTime(0);
    setCurrentIndex(0);
    setPlayState('playing');
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentTime(sequence[prevIdx].startTime);
    }
  };

  const handleNext = () => {
    if (currentIndex < sequence.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentTime(sequence[nextIdx].startTime);
    }
  };

  const handleSeek = (time: number) => {
    const safeTime = Math.max(0, Math.min(totalDuration, time));
    setCurrentTime(safeTime);
    const newIdx = sequence.findIndex(
      (item) => safeTime >= item.startTime && safeTime <= item.endTime
    );
    if (newIdx !== -1) {
      setCurrentIndex(newIdx);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col gap-4 ${
        isFullscreen ? 'p-6 bg-[#0b0f19] h-screen justify-between overflow-y-auto' : ''
      }`}
    >
      {/* 3D Canvas Viewport */}
      <div className={`w-full ${isFullscreen ? 'flex-1 min-h-[500px]' : heightClassName}`}>
        <AvatarCanvas
          currentGloss={currentSign && currentSign.isSupported ? currentSign.id : null}
          progress={signProgress}
          isPlaying={playState === 'playing'}
          cameraPreset={cameraPreset}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Playback Controls & Timeline */}
      <AvatarControls
        playState={playState}
        currentSign={currentSign}
        sequence={sequence}
        currentIndex={currentIndex}
        currentTime={currentTime}
        totalDuration={totalDuration}
        speed={speed}
        cameraPreset={cameraPreset}
        reducedMotion={reducedMotion}
        isFullscreen={isFullscreen}
        onPlay={handlePlay}
        onPause={handlePause}
        onReplay={handleReplay}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={handleSeek}
        onSpeedChange={setSpeed}
        onCameraPresetChange={setCameraPreset}
        onToggleReducedMotion={() => setReducedMotion((v) => !v)}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Sign Sequence Playlist */}
      {showSequenceList && sequence.length > 0 && (
        <AvatarSequenceList
          sequence={sequence}
          currentIndex={currentIndex}
          onSelectIndex={(idx) => {
            setCurrentIndex(idx);
            setCurrentTime(sequence[idx].startTime);
          }}
        />
      )}
    </div>
  );
}
