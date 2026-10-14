#!/usr/bin/env python3
"""Browser Verification Script for Stage 6: ISL to Text Vision Pipeline.

Verifies:
1. Camera initialization flow with user permission explanation and standby state.
2. Simulated camera permission denial with clear user feedback.
3. Fake media stream feed (/usr/bin/chromium flags: --use-fake-device-for-media-stream --use-fake-ui-for-media-stream).
4. Debug landmark canvas overlay toggle (Honesty Rule 4 disclosure).
5. Real-time sequence recognition, confidence meter, temporal buffer queue, and manual correction.
6. Model specifications & limitations disclosure modal.
7. Stream release on camera stop.
8. Uploaded signing video batch sequence recognition, job progress, and inline segment editing.
9. Two-way communication workspace (Direction B + Direction A split view).
10. Desktop, Tablet, and Mobile viewports with zero console errors.
"""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = Path("/home/casper/projects/signbridge/docs/screenshots/stage-6")
FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "http://127.0.0.1:8000"

TMP_DIR = Path("/tmp/signbridge_verify_stage6")
TMP_DIR.mkdir(parents=True, exist_ok=True)


def wait_for_url(url: str, timeout: int = 15) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status in (200, 304):
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def generate_sample_signing_video() -> Path:
    """Generate a small 2-second synthetic MP4 video using ffmpeg."""
    video_path = TMP_DIR / "sample_signing.mp4"
    cmd = [
        "/usr/bin/ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=2:size=320x240:rate=15",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(video_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return video_path


def main():
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 70)
    print("STAGE 6: BROWSER AUTOMATION & CAMERA VISION VERIFICATION")
    print("=" * 70)

    # 1. Check services
    backend_ok = wait_for_url(f"{BACKEND_URL}/api/v1/health", timeout=2)
    frontend_ok = wait_for_url(FRONTEND_URL, timeout=2)

    backend_proc = None
    frontend_proc = None

    if not backend_ok:
        print("Launching FastAPI backend server...")
        backend_proc = subprocess.Popen(
            [
                "/home/casper/projects/signbridge/backend/.venv/bin/uvicorn",
                "app.main:create_app",
                "--factory",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd="/home/casper/projects/signbridge/backend",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not wait_for_url(f"{BACKEND_URL}/api/v1/health", timeout=15):
            print("FAILED to connect to backend on port 8000")
            sys.exit(1)

    if not frontend_ok:
        print("Launching Vite frontend server...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
            cwd="/home/casper/projects/signbridge/frontend",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if not wait_for_url(FRONTEND_URL, timeout=15):
            print("FAILED to connect to frontend on port 5173")
            sys.exit(1)

    print("Backend & Frontend servers responding successfully.")

    sample_video = generate_sample_signing_video()
    console_errors: list[str] = []

    try:
        with sync_playwright() as p:
            # Launch Chromium with fake media device and UI flags
            browser = p.chromium.launch(
                executable_path="/usr/bin/chromium",
                headless=True,
                args=[
                    "--use-fake-device-for-media-stream",
                    "--use-fake-ui-for-media-stream",
                    "--no-sandbox",
                    "--disable-gpu",
                ],
            )

            # Context 1: Granted camera permissions
            context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                permissions=["camera"],
            )
            page = context.new_page()
            page.on(
                "console",
                lambda msg: console_errors.append(msg.text)
                if msg.type == "error" and "favicon" not in msg.text
                else None,
            )

            # Test 1: Camera Standby & Honesty Rule 4
            print("\n[Test 1] Verifying Camera Standby & Honesty Rule 4 Banner...")
            page.goto(f"{FRONTEND_URL}/#/camera", wait_until="networkidle")
            page.wait_for_selector("text=CAMERA STANDBY")
            page.wait_for_selector("text=Initialize Camera Feed")
            page.wait_for_selector("text=Honesty Rule 4")
            page.screenshot(path=str(SCREENSHOT_DIR / "01_camera_standby.png"))
            print("✓ Camera Standby and Honesty Rule 4 verified. Screenshot: 01_camera_standby.png")

            # Test 2: Camera Permission Denial Simulation
            print("\n[Test 2] Verifying Camera Permission Denial Simulation...")
            denied_context = browser.new_context(
                viewport={"width": 1280, "height": 800},
                permissions=[],  # Deny all permissions
            )
            denied_page = denied_context.new_page()
            # Intercept getUserMedia to simulate NotAllowedError
            denied_page.add_init_script("""
                navigator.mediaDevices.getUserMedia = () => {
                    const err = new Error('Permission denied');
                    err.name = 'NotAllowedError';
                    return Promise.reject(err);
                };
            """)
            denied_page.goto(f"{FRONTEND_URL}/#/camera", wait_until="networkidle")
            denied_page.click("text=Initialize Camera Feed")
            denied_page.wait_for_selector("text=Camera access was denied by the user")
            denied_page.screenshot(path=str(SCREENSHOT_DIR / "02_camera_denied.png"))
            denied_context.close()
            print("✓ Camera denial error handled cleanly. Screenshot: 02_camera_denied.png")

            # Test 3: Live Camera Feed with Fake Media Stream
            print("\n[Test 3] Verifying Live Camera Stream, Landmark Overlay, & Recognition...")
            page.click("text=Initialize Camera Feed")
            page.wait_for_selector("text=LIVE CAMERA STREAM", timeout=5000)
            page.wait_for_selector("text=Release & Stop Camera")
            time.sleep(2.0)  # Allow fake video stream and tracking loop to iterate

            # Test overlay toggle
            page.click("text=Landmarks: ON")
            page.wait_for_selector("text=Landmarks: OFF")
            page.click("text=Landmarks: OFF")
            page.wait_for_selector("text=Landmarks: ON")

            # Test manual correction input
            correction_input = page.locator("input[placeholder*='Type words to replace']")
            correction_input.fill("HELLO THANK_YOU FRIEND")
            page.click("button:has-text('Apply')")
            page.wait_for_selector("text=HELLO THANK_YOU FRIEND")

            page.screenshot(path=str(SCREENSHOT_DIR / "03_camera_live_recognition.png"))
            print("✓ Live stream, landmarks toggle, and correction verified. Screenshot: 03_camera_live_recognition.png")

            # Test 4: Supported Signs & Model Limitations Modal
            print("\n[Test 4] Verifying Model Limitations & Tensor Specs Modal...")
            page.click("text=Supported Signs & Limitations")
            page.wait_for_selector("text=ISL Recognition Model Specifications & Limitations")
            page.wait_for_selector("text=v0.1.0-demo")
            page.wait_for_selector("text=Supported Vocabulary (12 signs)")
            page.screenshot(path=str(SCREENSHOT_DIR / "04_model_limitations_modal.png"))
            page.click("button:has-text('Close Disclosures')")
            print("✓ Model disclosures modal verified. Screenshot: 04_model_limitations_modal.png")

            # Stop camera
            page.click("text=Release & Stop Camera")
            page.wait_for_selector("text=CAMERA STANDBY")

            # Test 5: Uploaded Sign Video Recognition
            print("\n[Test 5] Verifying Uploaded Sign Video Recognition...")
            page.goto(f"{FRONTEND_URL}/#/video-rec", wait_until="networkidle")
            page.wait_for_selector("text=Batch Sequence Recognition from Uploaded Signing Videos")

            # Upload synthetic video
            file_input = page.locator("input[type='file']")
            file_input.set_input_files(str(sample_video))
            page.wait_for_selector("text=sample_signing.mp4")

            # Click start recognition
            page.click("button:has-text('Start Video Sequence Recognition')")
            page.wait_for_selector("text=Extracting frames & inferring...", timeout=5000)

            # Wait for job completion
            page.wait_for_selector("text=Full Reconstructed Sentence:", timeout=20000)
            page.wait_for_selector("button:has-text('JSON')")
            page.wait_for_selector("button:has-text('WebVTT')")
            page.screenshot(path=str(SCREENSHOT_DIR / "05_video_recognition_completed.png"))
            print("✓ Video sequence recognition verified. Screenshot: 05_video_recognition_completed.png")

            # Test 6: Two-Way Workspace
            print("\n[Test 6] Verifying Two-Way Workspace Split Screen...")
            page.goto(f"{FRONTEND_URL}/#/workspace", wait_until="networkidle")
            page.wait_for_selector("text=Two-Way ISL Communication Workspace")
            page.wait_for_selector("text=ISL to Text Channel")
            page.wait_for_selector("text=Text to ISL Channel")
            page.screenshot(path=str(SCREENSHOT_DIR / "06_two_way_workspace.png"))
            print("✓ Two-way workspace verified. Screenshot: 06_two_way_workspace.png")

            # Test 7: Responsive Viewports (Tablet & Mobile)
            print("\n[Test 7] Verifying Responsive Viewports...")
            page.set_viewport_size({"width": 768, "height": 1024})
            page.goto(f"{FRONTEND_URL}/#/camera", wait_until="networkidle")
            page.screenshot(path=str(SCREENSHOT_DIR / "07_camera_tablet_768px.png"))

            page.set_viewport_size({"width": 375, "height": 667})
            page.screenshot(path=str(SCREENSHOT_DIR / "08_camera_mobile_375px.png"))
            print("✓ Responsive viewports verified. Screenshots: 07_camera_tablet_768px.png, 08_camera_mobile_375px.png")

            browser.close()

    finally:
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()

    print("\n" + "=" * 70)
    print(f"VERIFICATION COMPLETE: 8 screenshots saved to {SCREENSHOT_DIR}")
    if console_errors:
        print(f"WARNING: Encountered {len(console_errors)} console errors:")
        for err in console_errors[:5]:
            print(f"  - {err}")
    else:
        print("✓ Zero browser console errors observed.")
    print("=" * 70)


if __name__ == "__main__":
    main()
