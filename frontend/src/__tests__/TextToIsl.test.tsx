// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import { TextToIslPage } from '../pages/TextToIslPage.tsx';
import { AccessibilityProvider } from '../context/AccessibilityContext.tsx';

describe('Text-to-ISL Translation Pipeline & Honesty Compliance', () => {
  const mockTranslateResponse = {
    translation_id: 'trans-1234-uuid',
    source_text: 'Hello friend welcome',
    source_language: 'en',
    target_language: 'ISL',
    normalized_tokens: ['hello', 'friend', 'welcome'],
    reordered_glosses: ['HELLO', 'FRIEND', 'WELCOME'],
    grammar_rules_applied: [
      {
        rule_id: 'RULE_SOV_ORDER',
        description: 'Reordered tokens to ISL SOV pattern',
        linguist_notes: 'needs linguist review',
        original_order: ['hello', 'friend', 'welcome'],
        transformed_order: ['HELLO', 'FRIEND', 'WELCOME'],
      },
    ],
    segments: [
      {
        sequence_order: 0,
        source_token: 'hello',
        gloss: 'HELLO',
        sign_id: 'sign-hello-uuid',
        is_supported: true,
        duration_ms: 1000,
        timestamp_start_ms: 0,
        timestamp_end_ms: 1000,
      },
      {
        sequence_order: 1,
        source_token: 'friend',
        gloss: 'FRIEND',
        sign_id: 'sign-friend-uuid',
        is_supported: true,
        duration_ms: 1000,
        timestamp_start_ms: 1000,
        timestamp_end_ms: 2000,
      },
      {
        sequence_order: 2,
        source_token: 'welcome',
        gloss: 'WELCOME',
        sign_id: 'sign-welcome-uuid',
        is_supported: true,
        duration_ms: 1000,
        timestamp_start_ms: 2000,
        timestamp_end_ms: 3000,
      },
    ],
    coverage: {
      total_tokens: 3,
      supported_tokens: 3,
      unsupported_tokens: [],
      coverage_percentage: 100,
    },
    honesty_notice:
      "ISL grammar reordering is rule-based and flagged 'needs linguist review'. Unsupported words are never replaced with hallucinated signs.",
    created_at: new Date().toISOString(),
  };

  const mockUnsupportedResponse = {
    ...mockTranslateResponse,
    translation_id: 'trans-unsupported-uuid',
    source_text: 'Hello unicorn friend',
    normalized_tokens: ['hello', 'unicorn', 'friend'],
    reordered_glosses: ['HELLO', 'UNICORN', 'FRIEND'],
    segments: [
      {
        sequence_order: 0,
        source_token: 'hello',
        gloss: 'HELLO',
        sign_id: 'sign-hello-uuid',
        is_supported: true,
        duration_ms: 1000,
        timestamp_start_ms: 0,
        timestamp_end_ms: 1000,
      },
      {
        sequence_order: 1,
        source_token: 'unicorn',
        gloss: 'UNICORN',
        sign_id: null,
        is_supported: false,
        duration_ms: 0,
        timestamp_start_ms: 1000,
        timestamp_end_ms: 1000,
      },
      {
        sequence_order: 2,
        source_token: 'friend',
        gloss: 'FRIEND',
        sign_id: 'sign-friend-uuid',
        is_supported: true,
        duration_ms: 1000,
        timestamp_start_ms: 1000,
        timestamp_end_ms: 2000,
      },
    ],
    coverage: {
      total_tokens: 3,
      supported_tokens: 2,
      unsupported_tokens: ['UNICORN'],
      coverage_percentage: 66.7,
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/v1/translate/text')) {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          if (body.text && body.text.includes('unicorn')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockUnsupportedResponse),
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTranslateResponse),
          });
        }

        if (url.includes('/feedback')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'fb-uuid-123',
                translation_id: 'trans-1234-uuid',
                rating: 5,
                feedback_text: 'Test feedback',
                created_at: new Date().toISOString(),
              }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Text-to-ISL header, language selector, textarea, and action buttons', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    expect(screen.getByText(/Direction A: Text to ISL/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule-Based Text to Sign Translation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source Language:/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Type your sentence here/i);
    expect(textarea).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Translate to ISL/i })).toBeInTheDocument();
    });
    expect(screen.getByTitle(/Read input aloud via TTS/i)).toBeInTheDocument();
  });


  it('updates character and word count as user types', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    const textarea = screen.getByPlaceholderText(/Type your sentence here/i);
    fireEvent.change(textarea, { target: { value: 'Good morning friend' } });

    expect(screen.getByText(/19 characters \| 3 words/i)).toBeInTheDocument();
  });

  it('executes translation API call and renders coverage meter', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/100% Dictionary Coverage/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/3 supported/i)).toBeInTheDocument();
  });

  it('displays Honesty Rule 2 warning when unsupported words exist', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    // Click quick example containing unicorn
    const unicornBtn = screen.getByRole('button', { name: /Hello unicorn friend/i });
    fireEvent.click(unicornBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Honesty Rule 2: Unsupported Signs Detected/i)
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/UNICORN/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/66.7% Dictionary Coverage/i)).toBeInTheDocument();
  });

  it('displays Honesty Rule 5 linguist notes in grammar transformations', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('RULE_SOV_ORDER')).toBeInTheDocument();
    });

    expect(screen.getByText('needs linguist review')).toBeInTheDocument();
  });

  it('opens Translation Feedback Modal, fills out rating, and submits', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    // Wait for initial translation to complete so translationId is set
    await waitFor(() => {
      expect(screen.getByText(/100% Dictionary Coverage/i)).toBeInTheDocument();
    });

    const rateBtn = screen.getByRole('button', { name: /Rate Translation/i });
    fireEvent.click(rateBtn);

    expect(screen.getByText(/Rate Translation Accuracy/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Thank you! Your feedback has been recorded for linguist review/i)
      ).toBeInTheDocument();
    });
  });


  it('switches source language to Hindi and presents Hindi examples', async () => {
    render(
      <AccessibilityProvider>
        <TextToIslPage />
      </AccessibilityProvider>
    );

    const langSelect = screen.getByLabelText(/Source Language:/i);
    fireEvent.change(langSelect, { target: { value: 'hi' } });

    expect(screen.getByRole('button', { name: 'नमस्ते दोस्त स्वागत' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'धन्यवाद सहायता' })).toBeInTheDocument();
  });
});
