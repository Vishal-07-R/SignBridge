# AI SignBridge - Machine Learning & Vision Architecture

This directory defines the contracts, landmark sequence formats, and inference interfaces for ISL recognition and grammar mapping.

## Pipeline Architecture

### 1. In-Browser Landmark Extraction (Direction B: ISL to Text)
- Hand Landmarks: 21 3D landmarks per hand (x, y, z normalized).
- Pose Landmarks: Upper-body pose landmarks (shoulders, elbows, wrists, nose) to capture spatial signing coordinate frame.
- Landmark overlay: Marked strictly as a **debug overlay**; landmark extraction alone is NOT ISL recognition.

### 2. Temporal Buffer & Model Serving Contract
- Sliding temporal window: Buffer size $T$ frames (e.g. 30–60 frames at 30 fps) capturing the trajectory of a sign.
- Feature vector: Normalized relative to shoulder span and nose anchor to ensure scale and position invariance.
- Confidence thresholds: Predictions below threshold must return `"Sign not recognized"` with confidence score. Never invent signs or words.
- Model interface: Versioned REST / WebSocket endpoint (`/api/recognize/signs`).

### 3. Rule-Based Linguistic Engine (Direction A: Text to ISL)
- ISL grammar differs fundamentally from English word order (Topic-Comment / Subject-Object-Verb tendencies).
- Deterministic rule mapping layer with vocabulary dictionary lookup.
- Every linguistic ordering rule is flagged as **`needs linguist review`**. No unverified LLM / hallucinated sign sequences are permitted.
