import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  isSignSupported,
  getSignClip,
  buildSignSequence,
  normalizeSignKey,
} from '../components/avatar/clipMapper.ts';
import { AvatarControls } from '../components/avatar/AvatarControls.tsx';
import { AvatarSequenceList } from '../components/avatar/AvatarSequenceList.tsx';
import { AssetDocModal } from '../components/avatar/AssetDocModal.tsx';
import { AccessibilityProvider, useAccessibility } from '../context/AccessibilityContext.tsx';
import { App } from '../App.tsx';

describe('ISL Clip Mapper & Honesty Rule 2 (Unsupported Signs)', () => {
  it('normalizes sign keys accurately', () => {
    expect(normalizeSignKey('hello')).toBe('HELLO');
    expect(normalizeSignKey('thank you')).toBe('THANK_YOU');
    expect(normalizeSignKey('   water! ')).toBe('WATER');
  });

  it('validates supported seeded signs', () => {
    expect(isSignSupported('HELLO')).toBe(true);
    expect(isSignSupported('THANK_YOU')).toBe(true);
    expect(isSignSupported('PLEASE')).toBe(true);
    expect(isSignSupported('WATER')).toBe(true);
    expect(isSignSupported('HELP')).toBe(true);
    expect(isSignSupported('FRIEND')).toBe(true);
  });

  it('strictly rejects unverified signs with explicit unsupported status (Honesty Rule 2)', () => {
    expect(isSignSupported('UNICORN')).toBe(false);
    expect(isSignSupported('ASTRONAUT')).toBe(false);
    expect(getSignClip('NONEXISTENT_SIGN')).toBeNull();
  });

  it('builds sign sequences with cumulative timing and unsupported warnings', () => {
    const seq = buildSignSequence(['HELLO', 'UNICORN', 'WATER']);
    expect(seq).toHaveLength(3);

    // First sign: HELLO
    expect(seq[0].gloss).toBe('HELLO');
    expect(seq[0].isSupported).toBe(true);
    expect(seq[0].startTime).toBe(0);
    expect(seq[0].endTime).toBe(seq[0].duration);

    // Second sign: UNICORN (Unsupported!)
    expect(seq[1].gloss).toBe('UNICORN');
    expect(seq[1].isSupported).toBe(false);
    expect(seq[1].unsupportedMessage).toContain('Unsupported sign "UNICORN"');
    expect(seq[1].startTime).toBe(seq[0].endTime);

    // Third sign: WATER
    expect(seq[2].gloss).toBe('WATER');
    expect(seq[2].isSupported).toBe(true);
    expect(seq[2].startTime).toBe(seq[1].endTime);
  });
});

describe('Avatar Controls & Playback Pipeline', () => {
  const dummySequence = buildSignSequence(['HELLO', 'FRIEND']);

  it('renders playback transport buttons and handles play/pause triggers', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();

    const { rerender } = render(
      <AvatarControls
        playState="idle"
        currentSign={dummySequence[0]}
        sequence={dummySequence}
        currentIndex={0}
        currentTime={0}
        totalDuration={3.8}
        speed={1.0}
        cameraPreset="front"
        reducedMotion={false}
        isFullscreen={false}
        onPlay={onPlay}
        onPause={onPause}
        onReplay={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSeek={vi.fn()}
        onSpeedChange={vi.fn()}
        onCameraPresetChange={vi.fn()}
        onToggleReducedMotion={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />
    );

    const playBtn = screen.getByRole('button', { name: /^play$/i });
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);
    expect(onPlay).toHaveBeenCalledTimes(1);

    // Rerender in playing state
    rerender(
      <AvatarControls
        playState="playing"
        currentSign={dummySequence[0]}
        sequence={dummySequence}
        currentIndex={0}
        currentTime={1.0}
        totalDuration={3.8}
        speed={1.0}
        cameraPreset="front"
        reducedMotion={false}
        isFullscreen={false}
        onPlay={onPlay}
        onPause={onPause}
        onReplay={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSeek={vi.fn()}
        onSpeedChange={vi.fn()}
        onCameraPresetChange={vi.fn()}
        onToggleReducedMotion={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />
    );

    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('renders camera preset selectors and handles camera angle changes', () => {
    const onCameraChange = vi.fn();

    render(
      <AvatarControls
        playState="idle"
        currentSign={dummySequence[0]}
        sequence={dummySequence}
        currentIndex={0}
        currentTime={0}
        totalDuration={3.8}
        speed={1.0}
        cameraPreset="front"
        reducedMotion={false}
        isFullscreen={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onReplay={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSeek={vi.fn()}
        onSpeedChange={vi.fn()}
        onCameraPresetChange={onCameraChange}
        onToggleReducedMotion={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />
    );

    const handsBtn = screen.getByTitle(/Hand Zoom/i);
    expect(handsBtn).toBeInTheDocument();
    fireEvent.click(handsBtn);
    expect(onCameraChange).toHaveBeenCalledWith('hands');

    const upperBtn = screen.getByTitle(/^Upper Body/i);
    fireEvent.click(upperBtn);
    expect(onCameraChange).toHaveBeenCalledWith('upper');
  });

  it('displays explicit unsupported sign notification banner when current sign is not supported', () => {
    const unsupportedSeq = buildSignSequence(['MYSTERY_SIGN']);

    render(
      <AvatarControls
        playState="unsupported"
        currentSign={unsupportedSeq[0]}
        sequence={unsupportedSeq}
        currentIndex={0}
        currentTime={0}
        totalDuration={1.5}
        speed={1.0}
        cameraPreset="front"
        reducedMotion={false}
        isFullscreen={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onReplay={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSeek={vi.fn()}
        onSpeedChange={vi.fn()}
        onCameraPresetChange={vi.fn()}
        onToggleReducedMotion={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />
    );

    expect(screen.getByText(/Honesty Rule 2: Explicit Unsupported Sign Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Not in verified ISL dictionary/i)).toBeInTheDocument();
  });
});

describe('Avatar Sequence List & Asset Documentation Modal', () => {
  it('renders sequence list and allows jumping to sign index', () => {
    const seq = buildSignSequence(['HELLO', 'THANK_YOU', 'WATER']);
    const onSelect = vi.fn();

    render(
      <AvatarSequenceList sequence={seq} currentIndex={0} onSelectIndex={onSelect} />
    );

    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('THANK YOU')).toBeInTheDocument();
    expect(screen.getByText('WATER')).toBeInTheDocument();

    const waterBtn = screen.getByRole('button', { name: /WATER/i });
    fireEvent.click(waterBtn);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('renders AssetDocModal with Honesty Rule 8 asset requirements', () => {
    const onClose = vi.fn();
    render(<AssetDocModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText(/Honesty Rule 8 Compliance Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Rigged Humanoid Requirements/i)).toBeInTheDocument();
    expect(screen.getByText(/docs\/AVATAR_ASSETS\.md/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /acknowledge & close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Accessibility Context', () => {
  function TestConsumer() {
    const { reducedMotion, highContrast, fontSize, setReducedMotion, setHighContrast, setFontSize } =
      useAccessibility();
    return (
      <div>
        <span data-testid="reduced-motion">{reducedMotion ? 'reduced' : 'normal'}</span>
        <span data-testid="high-contrast">{highContrast ? 'contrast-high' : 'contrast-normal'}</span>
        <span data-testid="font-size">{fontSize}</span>
        <button onClick={() => setReducedMotion(true)}>Enable Reduced Motion</button>
        <button onClick={() => setHighContrast(true)}>Enable High Contrast</button>
        <button onClick={() => setFontSize('xlarge')}>Set Font XLarge</button>
      </div>
    );
  }

  it('provides and updates accessibility settings', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('font-size').textContent).toBe('normal');

    fireEvent.click(screen.getByText('Enable Reduced Motion'));
    expect(screen.getByTestId('reduced-motion').textContent).toBe('reduced');

    fireEvent.click(screen.getByText('Enable High Contrast'));
    expect(screen.getByTestId('high-contrast').textContent).toBe('contrast-high');

    fireEvent.click(screen.getByText('Set Font XLarge'));
    expect(screen.getByTestId('font-size').textContent).toBe('xlarge');
  });
});

describe('Multi-Page Hash Navigation', () => {
  it('switches between pages on hash change', async () => {
    render(<App />);

    // Default: Landing page
    expect(screen.getByText(/Interactive 3D Avatar Viewer/i)).toBeInTheDocument();

    // Navigate to Workspace
    window.location.hash = '#/workspace';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(screen.getByText(/Two-Way ISL Communication Workspace/i)).toBeInTheDocument();
    });

    // Navigate to Accessibility
    window.location.hash = '#/accessibility';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(screen.getByText(/Accessibility & Display Preferences/i)).toBeInTheDocument();
    });

    // Navigate to Vocabulary Centre
    window.location.hash = '#/vocabulary';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(screen.getByText(/Indian Sign Language Vocabulary/i)).toBeInTheDocument();
    });

    // Reset back to Landing
    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() => {
      expect(screen.getByText(/Interactive 3D Avatar Viewer/i)).toBeInTheDocument();
    });
  });
});
