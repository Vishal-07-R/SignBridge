import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraRecognitionPage } from '../pages/CameraRecognitionPage.tsx';
import { VideoRecognitionPage } from '../pages/VideoRecognitionPage.tsx';
import * as recognitionApi from '../api/recognition.ts';

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
};
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

describe('CameraRecognitionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API
    vi.spyOn(recognitionApi, 'getModelMetadata').mockResolvedValue({
      model_id: 'isl-heuristic-demo',
      model_version: 'v0.1.0-demo',
      is_demo: true,
      supported_vocabulary: [
        'HELLO', 'THANK_YOU', 'PLEASE', 'NAME', 'HELP', 'YES',
        'NO', 'WATER', 'GOOD', 'WELCOME', 'SIGN', 'FRIEND'
      ],
      input_tensor_format: { shape: '(batch, 30, 75)' },
      limitations: ['Operating in labelled DEMO MODE via geometric heuristics.'],
      documentation_url: '/docs/ISL_RECOGNITION_LIMITATIONS.md',
    });

    vi.spyOn(recognitionApi, 'recognizeLandmarkSequence').mockResolvedValue({
      success: true,
      is_recognized: true,
      prediction: {
        gloss: 'HELLO',
        confidence: 0.88,
        is_demo: true,
        alternatives: [],
      },
      model_version: 'v0.1.0-demo',
      is_demo: true,
      latency_ms: 12.5,
    });
  });

  it('renders header, standby indicator, and Honesty Rule 4 disclosure banner', () => {
    render(<CameraRecognitionPage />);

    expect(screen.getByText(/Live Camera ISL Sign Recognition/i)).toBeInTheDocument();
    expect(screen.getByText(/Direction B: Real-time Camera Vision Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Honesty Rule 4: Landmark Extraction vs. Semantic Sign Recognition/i)).toBeInTheDocument();
    expect(screen.getByText(/CAMERA STANDBY/i)).toBeInTheDocument();
    expect(screen.getByText(/Initialize Camera Feed/i)).toBeInTheDocument();
  });

  it('handles camera permission rejection with clear error message', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(error),
      },
      writable: true,
      configurable: true,
    });

    render(<CameraRecognitionPage />);

    const startBtn = screen.getByText(/Initialize Camera Feed/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Camera access was denied by the user. Please grant permission in browser settings./i)
      ).toBeInTheDocument();
    });
  });

  it('starts camera feed on user action and releases tracks on stop', async () => {
    const stopMock = vi.fn();
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: stopMock }]),
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    render(<CameraRecognitionPage />);

    const startBtn = screen.getByText(/Initialize Camera Feed/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/LIVE CAMERA STREAM/i)).toBeInTheDocument();
      expect(screen.getByText(/Release & Stop Camera/i)).toBeInTheDocument();
    });

    // Test toggle landmark overlay
    const overlayToggle = screen.getByText(/Landmarks: ON/i);
    fireEvent.click(overlayToggle);
    expect(screen.getByText(/Landmarks: OFF/i)).toBeInTheDocument();

    // Release camera
    const stopBtn = screen.getByText(/Release & Stop Camera/i);
    fireEvent.click(stopBtn);

    expect(stopMock).toHaveBeenCalled();
    expect(screen.getByText(/CAMERA STANDBY/i)).toBeInTheDocument();
  });

  it('supports manual correction and sentence editing', async () => {
    render(<CameraRecognitionPage />);

    const input = screen.getByPlaceholderText(/Type words to replace or correct transcript.../i);
    const applyBtn = screen.getByText('Apply');

    await userEvent.type(input, 'THANK YOU FRIEND');
    fireEvent.click(applyBtn);

    expect(screen.getByText('THANK YOU FRIEND')).toBeInTheDocument();
  });

  it('opens and closes Supported Signs & Limitations modal', async () => {
    render(<CameraRecognitionPage />);

    const infoBtn = screen.getByText(/Supported Signs & Limitations/i);
    fireEvent.click(infoBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/ISL Recognition Model Specifications & Limitations/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Supported Vocabulary \(12 signs\)/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByText(/Close Disclosures/i);
    fireEvent.click(closeBtn);

    expect(
      screen.queryByText(/ISL Recognition Model Specifications & Limitations/i)
    ).not.toBeInTheDocument();
  });
});

describe('VideoRecognitionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-video');
    window.URL.revokeObjectURL = vi.fn();

    vi.spyOn(recognitionApi, 'uploadSigningVideoForRecognition').mockResolvedValue({
      job_id: 'mock-recog-job-123',
      status: 'queued',
      progress: 5,
      message: 'Video recognition job queued.',
    });

    vi.spyOn(recognitionApi, 'pollVideoRecognitionJob').mockResolvedValue({
      job_id: 'mock-recog-job-123',
      status: 'completed',
      progress: 100,
      segments: [
        { id: 1, start: 0.0, end: 1.5, gloss: 'HELLO', confidence: 0.94, is_demo: true },
        { id: 2, start: 1.5, end: 3.0, gloss: 'FRIEND', confidence: 0.88, is_demo: true },
      ],
      full_transcript: 'HELLO FRIEND',
      message: 'Job completed successfully.',
    });

    vi.spyOn(recognitionApi, 'cancelVideoRecognitionJob').mockResolvedValue({
      job_id: 'mock-recog-job-123',
      status: 'cancelled',
      message: 'Job cancelled.',
    });
  });

  it('renders upload dropzone, sampling selectors, and honesty disclosures', () => {
    render(<VideoRecognitionPage />);

    expect(
      screen.getByText(/Batch Sequence Recognition from Uploaded Signing Videos/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Choose video file \(MP4, WebM\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '15 FPS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '32 frames' })).toBeInTheDocument();
  });

  it('uploads video, polls job progress, and renders recognized sequence', async () => {
    render(<VideoRecognitionPage />);

    const file = new File(['fake-mp4-data'], 'signing_test.mp4', { type: 'video/mp4' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    expect(screen.getByText('signing_test.mp4')).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /Start Video Sequence Recognition/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(recognitionApi.uploadSigningVideoForRecognition).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('HELLO FRIEND')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('WebVTT')).toBeInTheDocument();
      expect(screen.getByDisplayValue('HELLO')).toBeInTheDocument();
      expect(screen.getByDisplayValue('FRIEND')).toBeInTheDocument();
    });
  });

  it('updates reconstructed sentence when editing segment gloss inline', async () => {
    render(<VideoRecognitionPage />);

    const file = new File(['fake-mp4-data'], 'signing_test.mp4', { type: 'video/mp4' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    const startBtn = screen.getByRole('button', { name: /Start Video Sequence Recognition/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('HELLO')).toBeInTheDocument();
    });

    const helloInput = screen.getByDisplayValue('HELLO');
    fireEvent.change(helloInput, { target: { value: 'WELCOME' } });

    expect(screen.getByText('WELCOME FRIEND')).toBeInTheDocument();
  });
});
