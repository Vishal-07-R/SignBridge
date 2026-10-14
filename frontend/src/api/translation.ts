/**
 * API client for Text-to-ISL translation, linguistic inspection, and user feedback.
 */

export interface GrammarRuleApplied {
  rule_id: string;
  description: string;
  linguist_notes: string;
  original_order: string[];
  transformed_order: string[];
}

export interface TranslationSegment {
  id?: string;
  sequence_order: number;
  source_token: string;
  gloss: string;
  sign_id: string | null;
  is_supported: boolean;
  duration_ms: number;
  timestamp_start_ms: number;
  timestamp_end_ms: number;
  animation_asset?: {
    id: string;
    asset_url: string;
    format: string;
    duration_seconds: number;
    is_approved: boolean;
    version: number;
  } | null;
}

export interface CoverageMetrics {
  total_tokens: number;
  supported_tokens: number;
  unsupported_tokens: string[];
  coverage_percentage: number;
}


export interface TextTranslationRequest {
  text: string;
  source_language?: string;
  save_history?: boolean;
}

export interface TextTranslationResponse {
  translation_id: string;
  source_text: string;
  source_language: string;
  target_language: string;
  normalized_tokens: string[];
  reordered_glosses: string[];
  grammar_rules_applied: GrammarRuleApplied[];
  segments: TranslationSegment[];
  coverage: CoverageMetrics;
  honesty_notice: string;
  created_at: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  status: string;
  notes: string;
}

export interface TranslationFeedbackCreate {
  rating: number; // 1 to 5
  feedback_text?: string;
  error_category?: string; // 'wrong_sign' | 'bad_grammar' | 'unrecognized' | 'timing' | 'other'
}

export interface TranslationFeedbackResponse {
  id: string;
  translation_id: string;
  user_id?: string | null;
  rating: number;
  feedback_text?: string | null;
  error_category?: string | null;
  created_at: string;
}

/**
 * Translate text into ISL sign sequence via backend API.
 */
export async function translateText(
  request: TextTranslationRequest
): Promise<TextTranslationResponse> {
  const response = await fetch('/api/v1/translate/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: request.text,
      source_language: request.source_language || 'en',
      save_history: request.save_history ?? true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Translation failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Retrieve supported source languages.
 */
export async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
  const response = await fetch('/api/v1/translate/languages');
  if (!response.ok) {
    throw new Error(`Failed to load languages: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Submit user rating and qualitative feedback for a translation.
 */
export async function submitTranslationFeedback(
  translationId: string,
  feedback: TranslationFeedbackCreate
): Promise<TranslationFeedbackResponse> {
  const response = await fetch(`/api/v1/translate/${translationId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Feedback submission failed: HTTP ${response.status}`
    );
  }

  return response.json();
}
