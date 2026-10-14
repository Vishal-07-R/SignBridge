/**
 * API client for ISL to Text landmark sequence recognition and video analysis.
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface FrameLandmarks {
  timestamp_ms: number;
  left_hand?: LandmarkPoint[] | null;
  right_hand?: LandmarkPoint[] | null;
  pose?: LandmarkPoint[] | null;
}

export interface RecognitionAlternative {
  gloss: string;
  confidence: number;
}

export interface RecognitionPrediction {
  gloss: string;
  confidence: number;
  start_time_ms?: number;
  end_time_ms?: number;
  is_demo: boolean;
  alternatives: RecognitionAlternative[];
}

export interface RecognitionResponse {
  success: boolean;
  is_recognized: boolean;
  prediction?: RecognitionPrediction | null;
  message?: string | null;
  model_version: string;
  is_demo: boolean;
  latency_ms: number;
}

export interface VideoRecognitionSegment {
  id: number;
  start: number;
  end: number;
  gloss: string;
  confidence: number;
  is_demo: boolean;
}

export interface VideoRecognitionJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  segments: VideoRecognitionSegment[];
  full_transcript: string;
  message?: string | null;
  error_message?: string | null;
}

export interface ModelMetadataResponse {
  model_id: string;
  model_version: string;
  is_demo: boolean;
  supported_vocabulary: string[];
  input_tensor_format: Record<string, any>;
  limitations: string[];
  documentation_url: string;
}

/**
 * Fetch versioned ISL recognition model metadata and input tensor specifications.
 */
export async function getModelMetadata(): Promise<ModelMetadataResponse> {
  const response = await fetch('/api/v1/recognize/model-info');
  if (!response.ok) {
    throw new Error(`Failed to fetch model metadata with HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Send real-time temporal sequence of frame landmarks from webcam to recognition service.
 */
export async function recognizeLandmarkSequence(
  frames: FrameLandmarks[],
  modelVersion?: string,
  language: string = 'en'
): Promise<RecognitionResponse> {
  const response = await fetch('/api/v1/recognize/landmarks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      frames,
      model_version: modelVersion,
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Landmark recognition failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Upload pre-recorded video of signing for asynchronous batch sequence recognition.
 */
export async function uploadSigningVideoForRecognition(
  file: File,
  samplingFps: number = 15,
  batchSize: number = 32,
  language: string = 'en'
): Promise<{ job_id: string; status: string; progress: number; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sampling_fps', String(samplingFps));
  formData.append('batch_size', String(batchSize));
  formData.append('language', language);

  const response = await fetch('/api/v1/recognize/video', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Video recognition upload failed with HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Poll progress and extracted segments for an asynchronous signing video recognition job.
 */
export async function pollVideoRecognitionJob(
  jobId: string
): Promise<VideoRecognitionJobResponse> {
  const response = await fetch(`/api/v1/recognize/video/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Recognition job polling failed with HTTP ${response.status}`
    );
  }
  return response.json();
}

/**
 * Cancel a running or pending video recognition job.
 */
export async function cancelVideoRecognitionJob(
  jobId: string
): Promise<{ job_id: string; status: string; message: string }> {
  const response = await fetch(`/api/v1/recognize/video/${jobId}/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Recognition job cancellation failed with HTTP ${response.status}`
    );
  }

  return response.json();
}
