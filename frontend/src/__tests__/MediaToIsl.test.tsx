import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageToIslPage } from '../pages/ImageToIslPage.tsx';
import { VideoToIslPage } from '../pages/VideoToIslPage.tsx';
import { AccessibilityProvider } from '../context/AccessibilityContext.tsx';
import * as mediaApi from '../api/media.ts';

// Mock Three.js / React Three Fiber canvas
vi.mock('../components/avatar/AvatarViewer.tsx', () => ({
  AvatarViewer: ({ initialGlosses }: { initialGlosses: string[] }) => (
    <div data-testid="avatar-viewer">
      <span>Mock Avatar Viewer</span>
      <div data-testid="avatar-glosses">{initialGlosses.join(', ')}</div>
    </div>
  ),
}));

describe('Stage 5 Media Ingestion Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ImageToIslPage', () => {
    it('renders OCR upload dropzone, language selector, and mock avatar viewer', () => {
      render(
        <AccessibilityProvider>
          <ImageToIslPage />
        </AccessibilityProvider>
      );

      expect(screen.getByText(/Extract Text from Documents to Sign Language/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose file or drag & drop/i)).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPEG, WebP, PDF/i)).toBeInTheDocument();
      expect(screen.getByTestId('avatar-viewer')).toBeInTheDocument();
    });

    it('performs OCR extraction when file is selected and button is clicked', async () => {
      const mockOcrResponse: mediaApi.OcrTranslationResponse = {
        extracted_text: 'Hello friend thank you',
        metadata: {
          engine: 'tesseract-5.5.3',
          mime_type: 'image/png',
          language: 'eng',
          page_count: 1,
          selected_page: 1,
          word_count: 4,
          char_count: 22,
        },
        translation: {
          translation_id: 'test-trans-id',
          source_text: 'Hello friend thank you',
          source_language: 'en',
          target_language: 'ISL',
          normalized_tokens: ['hello', 'friend', 'thank', 'you'],
          reordered_glosses: ['HELLO', 'FRIEND', 'THANK_YOU'],
          grammar_rules_applied: [
            {
              rule_id: 'RULE_SOV_ORDER',
              description: 'SOV word order',
              linguist_notes: 'needs linguist review',
              original_order: ['hello', 'friend', 'thank', 'you'],
              transformed_order: ['HELLO', 'FRIEND', 'THANK_YOU'],
            },
          ],
          segments: [
            {
              sequence_order: 1,
              source_token: 'hello',
              gloss: 'HELLO',
              sign_id: 'sign-1',
              is_supported: true,
              duration_ms: 1000,
              timestamp_start_ms: 0,
              timestamp_end_ms: 1000,
            },
            {
              sequence_order: 2,
              source_token: 'friend',
              gloss: 'FRIEND',
              sign_id: 'sign-2',
              is_supported: true,
              duration_ms: 1000,
              timestamp_start_ms: 1000,
              timestamp_end_ms: 2000,
            },
          ],
          coverage: {
            total_tokens: 4,
            supported_tokens: 4,
            unsupported_tokens: [],
            coverage_percentage: 100,
          },
          honesty_notice: 'Honesty notice',
          created_at: new Date().toISOString(),
        },
      };

      vi.spyOn(mediaApi, 'uploadAndOcrDocument').mockResolvedValue(mockOcrResponse);

      render(
        <AccessibilityProvider>
          <ImageToIslPage />
        </AccessibilityProvider>
      );

      const file = new File(['mock_image_bytes'], 'sample.png', { type: 'image/png' });
      const input = screen.getByLabelText(/choose file or drag & drop/i, { selector: 'input' });

      fireEvent.change(input, { target: { files: [file] } });

      const runButton = screen.getByText(/Run Tesseract OCR Extraction/i);
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/Editable OCR Transcript:/i)).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/Review or edit extracted text.../i);
      expect(textarea).toHaveValue('Hello friend thank you');
      expect(screen.getByText(/22 characters/i)).toBeInTheDocument();
      expect(screen.getAllByText(/4 words/i).length).toBeGreaterThanOrEqual(1);
    });

    it('displays error notice when OCR fails or image is unreadable (Honesty Rule 1)', async () => {
      vi.spyOn(mediaApi, 'uploadAndOcrDocument').mockRejectedValue(
        new Error('No readable text detected in document or image.')
      );

      render(
        <AccessibilityProvider>
          <ImageToIslPage />
        </AccessibilityProvider>
      );

      const file = new File(['black_image'], 'blank.png', { type: 'image/png' });
      const input = screen.getByLabelText(/choose file or drag & drop/i, { selector: 'input' });

      fireEvent.change(input, { target: { files: [file] } });

      const runButton = screen.getByText(/Run Tesseract OCR Extraction/i);
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText(/OCR Extraction Notice:/i)).toBeInTheDocument();
        expect(screen.getByText(/No readable text detected/i)).toBeInTheDocument();
      });
    });
  });

  describe('VideoToIslPage', () => {
    it('renders video upload dropzone, segment list, captions toggle, and avatar viewer', () => {
      render(
        <AccessibilityProvider>
          <VideoToIslPage />
        </AccessibilityProvider>
      );

      expect(screen.getByText(/Transcribe Video Audio into ISL Avatar Signing/i)).toBeInTheDocument();
      expect(screen.getByText(/Choose video file \(MP4, WebM, MOV\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Synchronized Transcript Segments:/i)).toBeInTheDocument();
      expect(screen.getByText(/Captions/i)).toBeInTheDocument();
      expect(screen.getAllByTestId('avatar-viewer')).toHaveLength(2);
    });

    it('starts video processing job and displays progress status when uploaded', async () => {
      const mockJob: mediaApi.JobStatusResponse = {
        id: 'mock-video-job-id',
        job_type: 'transcription',
        status: 'processing',
        progress: 45,
        error_message: null,
        result_data: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(mediaApi, 'uploadVideoForTranscription').mockResolvedValue(mockJob);
      vi.spyOn(mediaApi, 'pollJobStatus').mockResolvedValue(mockJob);

      render(
        <AccessibilityProvider>
          <VideoToIslPage />
        </AccessibilityProvider>
      );

      const file = new File(['mock_video_bytes'], 'speech.mp4', { type: 'video/mp4' });
      const input = screen.getByLabelText(/choose video file/i, { selector: 'input' });

      fireEvent.change(input, { target: { files: [file] } });

      const processButton = screen.getByText(/Extract Audio & Transcribe to ISL/i);
      fireEvent.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/Processing video & audio.../i)).toBeInTheDocument();
        expect(screen.getByText(/45%/i)).toBeInTheDocument();
        expect(screen.getByText(/Cancel Processing/i)).toBeInTheDocument();
      });
    });

    it('allows editing segment transcript and updates gloss sequence', async () => {
      const mockSegmentRetranslate: mediaApi.SegmentTranslationResponse = {
        text: 'hello please help',
        glosses: ['HELLO', 'PLEASE', 'HELP'],
        unsupported_tokens: [],
        grammar_audit: [],
      };

      vi.spyOn(mediaApi, 'retranslateSegment').mockResolvedValue(mockSegmentRetranslate);

      render(
        <AccessibilityProvider>
          <VideoToIslPage />
        </AccessibilityProvider>
      );

      // Click on initial segment 1 to open editor
      const segmentText = screen.getAllByText('Hello and welcome friend')[0];
      fireEvent.click(segmentText);

      const input = screen.getByDisplayValue('Hello and welcome friend');
      fireEvent.change(input, { target: { value: 'hello please help' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getAllByText('hello please help').length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
