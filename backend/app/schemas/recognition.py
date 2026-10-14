"""Pydantic v2 schemas for ISL to Text landmark recognition and video analysis."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class LandmarkPoint(BaseModel):
    """Single 3D landmark coordinate with optional visibility confidence."""

    model_config = ConfigDict(extra="ignore")

    x: float = Field(..., description="Normalized horizontal coordinate [0.0, 1.0]")
    y: float = Field(..., description="Normalized vertical coordinate [0.0, 1.0]")
    z: float = Field(default=0.0, description="Normalized depth coordinate")
    visibility: float | None = Field(
        default=None, description="Landmark detection confidence / visibility score [0.0, 1.0]"
    )


class FrameLandmarks(BaseModel):
    """Captured landmarks for a single video frame."""

    model_config = ConfigDict(extra="ignore")

    timestamp_ms: float = Field(..., description="Frame timestamp in milliseconds")
    left_hand: list[LandmarkPoint] | None = Field(
        default=None, description="21 landmarks of the left hand"
    )
    right_hand: list[LandmarkPoint] | None = Field(
        default=None, description="21 landmarks of the right hand"
    )
    pose: list[LandmarkPoint] | None = Field(
        default=None, description="Key upper-body pose landmarks (shoulders, elbows, wrists, nose)"
    )


class LandmarkSequenceRequest(BaseModel):
    """Temporal sequence of frame landmarks sent from browser camera or video sampler."""

    model_config = ConfigDict(extra="ignore")

    frames: list[FrameLandmarks] = Field(
        ..., min_length=1, max_length=120, description="Temporal window of landmark frames (15-60 frames typical)"
    )
    model_version: str | None = Field(
        default=None, description="Optional specific model version identifier to query"
    )
    language: str = Field(default="en", description="Target text gloss language (en, hi)")


class RecognitionAlternative(BaseModel):
    """Alternative candidate prediction with confidence score."""

    gloss: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class RecognitionPrediction(BaseModel):
    """Prediction outcome for a recognized sign gesture."""

    gloss: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    start_time_ms: float | None = None
    end_time_ms: float | None = None
    is_demo: bool = True
    alternatives: list[RecognitionAlternative] = []


class RecognitionResponse(BaseModel):
    """Response payload for real-time landmark sequence recognition."""

    success: bool = True
    is_recognized: bool
    prediction: RecognitionPrediction | None = None
    message: str | None = None
    model_version: str
    is_demo: bool = True
    latency_ms: float = 0.0


class VideoRecognitionSegment(BaseModel):
    """Recognized sign segment from an uploaded video."""

    id: int
    start: float
    end: float
    gloss: str
    confidence: float
    is_demo: bool = True


class VideoRecognitionJobResponse(BaseModel):
    """Status and output for an asynchronous signing video recognition job."""

    job_id: str
    status: str  # queued, processing, completed, failed, cancelled
    progress: int = 0
    segments: list[VideoRecognitionSegment] = []
    full_transcript: str = ""
    message: str | None = None
    error_message: str | None = None


class ModelMetadataResponse(BaseModel):
    """Versioned model metadata, input tensor specifications, and honest limitations."""

    model_id: str
    model_version: str
    is_demo: bool
    supported_vocabulary: list[str]
    input_tensor_format: dict[str, Any]
    limitations: list[str]
    documentation_url: str = "/docs/ISL_RECOGNITION_LIMITATIONS.md"
