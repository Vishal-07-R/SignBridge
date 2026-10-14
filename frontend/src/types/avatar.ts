export type CameraPreset = 'front' | 'upper' | 'hands';

export type PlaybackSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;

export type AvatarPlayState = 'idle' | 'playing' | 'paused' | 'completed' | 'unsupported' | 'error';

export interface SignClipItem {
  id: string;
  gloss: string;
  category: string;
  duration: number; // in seconds
  isDemo: boolean;
  isReviewed: boolean;
  linguistNotes: string;
  isSupported: boolean;
}

export interface SignSequenceItem {
  id: string;
  gloss: string;
  isSupported: boolean;
  duration: number;
  startTime: number;
  endTime: number;
  isDemo: boolean;
  linguistReviewRequired: boolean;
  unsupportedMessage?: string;
}

export interface AvatarPlaybackOptions {
  speed: PlaybackSpeed;
  loop: boolean;
  reducedMotion: boolean;
  cameraPreset: CameraPreset;
}
