import React, { createContext, useContext, useEffect, useState } from 'react';
import { CameraPreset, PlaybackSpeed } from '../types/avatar.ts';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  defaultAvatarSpeed: PlaybackSpeed;
  defaultCameraPreset: CameraPreset;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setReducedMotion: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;
  setFontSize: (val: 'normal' | 'large' | 'xlarge') => void;
  setDefaultAvatarSpeed: (val: PlaybackSpeed) => void;
  setDefaultCameraPreset: (val: CameraPreset) => void;
}

const STORAGE_KEY = 'signbridge_a11y_v1';

const defaultSettings: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  fontSize: 'normal',
  defaultAvatarSpeed: 1.0,
  defaultCameraPreset: 'front',
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    // Check system prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      ...defaultSettings,
      reducedMotion: Boolean(prefersReducedMotion),
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage error
    }

    // Apply high contrast and font scaling to root HTML document element
    const root = document.documentElement;
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    root.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
    root.classList.add(`font-scale-${settings.fontSize}`);
  }, [settings]);

  const setReducedMotion = (val: boolean) => setSettings((s) => ({ ...s, reducedMotion: val }));
  const setHighContrast = (val: boolean) => setSettings((s) => ({ ...s, highContrast: val }));
  const setFontSize = (val: 'normal' | 'large' | 'xlarge') => setSettings((s) => ({ ...s, fontSize: val }));
  const setDefaultAvatarSpeed = (val: PlaybackSpeed) => setSettings((s) => ({ ...s, defaultAvatarSpeed: val }));
  const setDefaultCameraPreset = (val: CameraPreset) => setSettings((s) => ({ ...s, defaultCameraPreset: val }));

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        setReducedMotion,
        setHighContrast,
        setFontSize,
        setDefaultAvatarSpeed,
        setDefaultCameraPreset,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
