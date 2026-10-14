"""Tests for ISL to Text sequence recognition, model-serving interface, and video jobs."""

from __future__ import annotations

import io
import math
import subprocess
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.schemas.recognition import FrameLandmarks, LandmarkPoint, LandmarkSequenceRequest
from app.services.recognition.demo_model import DemoRuleBasedSequenceModel


def _make_sample_frame(
    t_ms: float,
    rw_y: float = 0.35,
    rw_x: float = 0.65,
    extended: bool = True,
    two_handed: bool = False,
) -> FrameLandmarks:
    """Helper to synthesize frame landmark geometry."""
    ext_y = -0.06 if extended else 0.02
    right_points = [
        LandmarkPoint(
            x=rw_x + (i % 4) * 0.01,
            y=rw_y + (i // 4) * 0.02 + (ext_y if i in (8, 12, 16, 20) else 0.0),
            z=0.0,
            visibility=0.95,
        )
        for i in range(21)
    ]

    left_points = None
    if two_handed:
        left_points = [
            LandmarkPoint(
                x=0.35 + (i % 4) * 0.01,
                y=rw_y + (i // 4) * 0.02 + (ext_y if i in (8, 12, 16, 20) else 0.0),
                z=0.0,
                visibility=0.92,
            )
            for i in range(21)
        ]

    return FrameLandmarks(
        timestamp_ms=t_ms,
        right_hand=right_points,
        left_hand=left_points,
        pose=[
            LandmarkPoint(x=0.50, y=0.25, z=0.0, visibility=0.99),
            LandmarkPoint(x=0.38, y=0.40, z=0.0, visibility=0.98),
            LandmarkPoint(x=0.62, y=0.40, z=0.0, visibility=0.98),
        ],
    )


@pytest.mark.asyncio
async def test_demo_model_metadata():
    """Verify model metadata conforms to Honesty Rules and tensor specifications."""
    model = DemoRuleBasedSequenceModel()
    meta = model.get_metadata()

    assert meta.is_demo is True
    assert meta.model_version == "v0.1.0-demo"
    assert len(meta.supported_vocabulary) == 12
    assert "HELLO" in meta.supported_vocabulary
    assert "THANK_YOU" in meta.supported_vocabulary
    assert meta.input_tensor_format["feature_dim"] == 75
    assert len(meta.limitations) >= 5
    # Strict check: limitation mentions demo fallback and spatial coordinates vs recognition
    assert any("DEMO MODE" in lim for lim in meta.limitations)
    assert any("NOT sign recognition" in lim for lim in meta.limitations)


@pytest.mark.asyncio
async def test_demo_model_no_hands_detected():
    """Honesty Rule: verify empty landmarks or zero hands strictly emit rejection."""
    model = DemoRuleBasedSequenceModel()

    # 1. Pydantic validation rejects empty frame list
    with pytest.raises(Exception):
        LandmarkSequenceRequest(frames=[], language="en")

    # 2. Frames with pose only, no hands
    pose_only_frames = [
        FrameLandmarks(
            timestamp_ms=float(i * 33),
            right_hand=None,
            left_hand=None,
            pose=[LandmarkPoint(x=0.5, y=0.3, z=0.0, visibility=0.99)],
        )
        for i in range(15)
    ]
    res_no_hands = await model.predict(
        LandmarkSequenceRequest(frames=pose_only_frames, language="en")
    )
    assert res_no_hands.is_recognized is False
    assert "No hands detected" in (res_no_hands.message or "")


@pytest.mark.asyncio
async def test_demo_model_confident_hello_prediction():
    """Verify confident classification of HELLO wave geometry above threshold."""
    model = DemoRuleBasedSequenceModel()

    # HELLO: hand raised at temple (y < 0.45) with lateral motion (motion_x wave) and open fingers
    frames = [
        _make_sample_frame(
            t_ms=float(i * 33),
            rw_y=0.32,
            rw_x=0.60 + math.sin(i * 0.5) * 0.08,
            extended=True,
        )
        for i in range(25)
    ]
    req = LandmarkSequenceRequest(frames=frames, language="en")
    res = await model.predict(req)

    assert res.is_recognized is True
    assert res.prediction is not None
    assert res.prediction.gloss == "HELLO"
    assert res.prediction.confidence >= 0.60
    assert res.prediction.is_demo is True
    assert res.is_demo is True


@pytest.mark.asyncio
async def test_demo_model_low_confidence_uncertainty_rejection():
    """Honesty Rule: gestures with ambiguous or low confidence (<0.60) must not invent signs."""
    model = DemoRuleBasedSequenceModel()

    # Hand hanging very low near waist (y=0.85), static, curled fingers
    frames = [
        _make_sample_frame(
            t_ms=float(i * 33),
            rw_y=0.85,
            rw_x=0.50,
            extended=False,
        )
        for i in range(15)
    ]
    req = LandmarkSequenceRequest(frames=frames, language="en")
    res = await model.predict(req)

    # Strictly verify rejection
    assert res.is_recognized is False
    assert res.prediction is None
    assert "Sign not recognized with certainty" in (res.message or "")


@pytest.mark.asyncio
async def test_api_get_model_info(async_client: AsyncClient):
    """Verify GET /api/v1/recognize/model-info endpoint."""
    resp = await async_client.get("/api/v1/recognize/model-info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_id"] == "isl-heuristic-demo"
    assert data["is_demo"] is True
    assert len(data["supported_vocabulary"]) == 12
    assert "SIGN" in data["supported_vocabulary"]


@pytest.mark.asyncio
async def test_api_recognize_landmarks_endpoint(async_client: AsyncClient):
    """Verify POST /api/v1/recognize/landmarks endpoint with synthetic payload."""
    frames = [
        {
            "timestamp_ms": float(i * 33),
            "right_hand": [
                {"x": 0.65, "y": 0.35, "z": 0.0, "visibility": 0.95} for _ in range(21)
            ],
            "pose": [{"x": 0.50, "y": 0.25, "z": 0.0, "visibility": 0.99}],
        }
        for i in range(20)
    ]
    resp = await async_client.post("/api/v1/recognize/landmarks", json={"frames": frames})
    assert resp.status_code == 200
    data = resp.json()
    assert "is_recognized" in data
    assert data["is_demo"] is True
    assert "model_version" in data


@pytest.mark.asyncio
async def test_video_recognition_upload_and_cancellation(async_client: AsyncClient, tmp_path: Path):
    """Test video recognition job upload, polling, and cancellation workflow."""
    # Generate a small 1-second synthetic MP4 video using ffmpeg
    test_video_path = tmp_path / "test_signing.mp4"
    cmd = [
        "/usr/bin/ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=1:size=320x240:rate=15",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(test_video_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    with open(test_video_path, "rb") as f:
        video_bytes = f.read()

    # 1. Upload video to recognize endpoint
    resp = await async_client.post(
        "/api/v1/recognize/video",
        files={"file": ("signing.mp4", io.BytesIO(video_bytes), "video/mp4")},
        data={"sampling_fps": "15", "batch_size": "16"},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    job_id = data["job_id"]

    # 2. Check initial job status
    poll_resp = await async_client.get(f"/api/v1/recognize/video/{job_id}")
    assert poll_resp.status_code == 200
    poll_data = poll_resp.json()
    assert poll_data["job_id"] == job_id
    assert poll_data["status"] in ("queued", "processing", "completed")

    # 3. Cancel the job
    cancel_resp = await async_client.post(f"/api/v1/recognize/video/{job_id}/cancel")
    # Might return 200 or 400 if already completed in fast test execution
    assert cancel_resp.status_code in (200, 400)


@pytest.mark.asyncio
async def test_video_recognition_job_user_isolation(
    authenticated_client: tuple[AsyncClient, str, any],
    admin_client: tuple[AsyncClient, str, any],
    async_client: AsyncClient,
    tmp_path: Path,
):
    """Verify strict user data isolation: other users cannot access private recognition jobs."""
    auth_cli, _, _ = authenticated_client
    adm_cli, _, _ = admin_client

    test_video_path = tmp_path / "private_signing.mp4"
    cmd = [
        "/usr/bin/ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=1:size=320x240:rate=15",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(test_video_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    with open(test_video_path, "rb") as f:
        video_bytes = f.read()

    # User uploads private job
    resp = await auth_cli.post(
        "/api/v1/recognize/video",
        files={"file": ("private.mp4", io.BytesIO(video_bytes), "video/mp4")},
        data={"sampling_fps": "15", "batch_size": "16"},
    )
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]

    # Owner can access it
    owner_poll = await auth_cli.get(f"/api/v1/recognize/video/{job_id}")
    assert owner_poll.status_code == 200

    # Unauthenticated / different guest user is forbidden (403)
    unauth_poll = await async_client.get(f"/api/v1/recognize/video/{job_id}")
    assert unauth_poll.status_code == 403

    # Admin is granted access
    admin_poll = await adm_cli.get(f"/api/v1/recognize/video/{job_id}")
    assert admin_poll.status_code == 200
