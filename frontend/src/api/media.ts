/**
 * API client for Document/Image OCR, Video Transcription, and Job Management.
 */

import { TextTranslationResponse } from './translation.ts';

export interface OcrMetadata {
  engine: string;
  mime_type: string;
  language: string;
  page_count: number;
  selected_page: number;
  word_count: number;
  char_count: number;
}

export interface OcrTranslationResponse {
  extracted_text: string;
  metadata: OcrMetadata;
  translation?: TextTranslationResponse | null;
}

export interface VideoTranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  glosses: string[];
  unsupported_tokens: string[];
  grammar_audit: Array<{
    rule_id: string;
    description: string;
    linguist_notes: string;
  }>;
}

export interface JobResultData {
  status?: string;
  message?: string;
  segment_count?: number;
  segments?: VideoTranscriptSegment[];
  language?: string;
}

export interface JobStatusResponse {
  id: string;
  job_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error_message: string | null;
  result_data: JobResultData | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentTranslationResponse {
  text: string;
  glosses: string[];
  unsupported_tokens: string[];
  grammar_audit: Array<{
    rule_id: string;
    description: string;
    linguist_notes: string;
  }>;
}

/**
 * Upload an image or PDF document to extract text via Tesseract 5 OCR.
 */
export async function uploadAndOcrDocument(
  file: File,
  language: string = 'en',
  pageNumber?: number,
  autoTranslate: boolean = true
): Promise<OcrTranslationResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_language', language);
  formData.append('auto_translate', String(autoTranslate));
  if (pageNumber !== undefined && pageNumber > 0) {
    formData.append('page_number', String(pageNumber));
  }

  const response = await fetch('/api/v1/translate/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `OCR extraction failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Upload a video file to dispatch audio extraction and Whisper transcription.
 */
export async function uploadVideoForTranscription(
  file: File,
  language: string = 'en'
): Promise<JobStatusResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_language', language);

  const response = await fetch('/api/v1/translate/video', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Video upload failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Poll job status and progress.
 */
export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/v1/jobs/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Job query failed with HTTP ${response.status}`
    );
  }
  return response.json();
}

/**
 * Cancel a pending or running media processing job.
 */
export async function cancelJob(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/v1/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Job cancellation failed with HTTP ${response.status}`
    );
  }
  return response.json();
}

/**
 * Retry a failed or cancelled media processing job.
 */
export async function retryJob(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/v1/jobs/${jobId}/retry`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Job retry failed with HTTP ${response.status}`
    );
  }
  return response.json();
}

/**
 * Re-translate a single transcript segment into ISL glosses.
 */
export async function retranslateSegment(
  text: string,
  language: string = 'en'
): Promise<SegmentTranslationResponse> {
  const response = await fetch('/api/v1/translate/segment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      source_language: language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Segment translation failed with HTTP ${response.status}`
    );
  }

  return response.json();
}
