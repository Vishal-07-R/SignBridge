"""Video processing and speech-to-text transcription service using ffmpeg and faster-whisper."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Cached Whisper model instance for low-latency re-use
_WHISPER_MODEL = None


def get_whisper_model():
    """Lazily load faster-whisper model on CPU with int8 quantization."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        from faster_whisper import WhisperModel

        logger.info("Initializing faster-whisper model (tiny, cpu, int8)...")
        _WHISPER_MODEL = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _WHISPER_MODEL


def extract_audio_from_video(video_path: Path, output_wav_path: Path) -> tuple[bool, str | None]:
    """Safely extract 16kHz mono audio stream using explicit argument list (no shell injection).

    Returns:
        (True, None) if audio extracted successfully.
        (False, "no_audio_stream") if video file has no audio track.
        (False, error_message) for other ffmpeg extraction failures.
    """
    cmd = [
        "/usr/bin/ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output_wav_path),
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        stderr_text = result.stderr.lower()
        if (
            "does not contain any stream" in stderr_text
            or "matches no streams" in stderr_text
            or "output file does not contain any stream" in stderr_text
            or "audio:0kb" in stderr_text
        ):
            return False, "no_audio_stream"
        return False, f"ffmpeg audio extraction error: {result.stderr.strip()}"

    if not output_wav_path.exists() or output_wav_path.stat().st_size <= 44:
        return False, "no_audio_stream"

    return True, None


def transcribe_audio_segments(audio_path: Path, language: str = "en") -> list[dict[str, Any]]:
    """Transcribe audio file into timestamped segments using faster-whisper.

    Returns a list of segments with id, start, end, and text.
    """
    model = get_whisper_model()
    whisper_lang = language if language in ("en", "hi") else None

    segments_gen, _ = model.transcribe(
        str(audio_path),
        language=whisper_lang,
        beam_size=1,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    results: list[dict[str, Any]] = []
    for idx, seg in enumerate(segments_gen):
        clean_text = seg.text.strip()
        if clean_text:
            results.append(
                {
                    "id": f"seg-{idx + 1}",
                    "start": round(float(seg.start), 2),
                    "end": round(float(seg.end), 2),
                    "text": clean_text,
                }
            )

    return results
