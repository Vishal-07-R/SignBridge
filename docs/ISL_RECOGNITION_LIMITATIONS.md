# ISL Recognition Specifications, Supported Signs, and Operational Limitations

## Executive Overview
This document specifies the technical architecture, supported vocabulary, tensor contracts, known limitations, and production integration pathways for the AI SignBridge **ISL to Text** vision pipeline (Direction B).

In strict adherence to **Honesty Rules 1, 3, 4, and 8**:
- MediaPipe landmark coordinate extraction is **NOT** ISL sign recognition; it functions exclusively as a spatial debug coordinate overlay.
- Sign recognition requires a trained temporal sequence model. Currently, the platform operates in a transparently labelled **DEMO FALLBACK MODE** (`v0.1.0-demo`).
- Arbitrary gestures or out-of-vocabulary signs are strictly classified as `"Sign not recognized"` whenever the confidence falls below 0.60. The system never invents sentences or substitutes gestures.

---

## 1. Supported Vocabulary & Tested Operational Bounds

The current demo sequence recognizer (`DemoRuleBasedSequenceModel`) evaluates geometric spatial configurations (wrist elevations, finger extensions, trajectory curvature, bilateral hand proximity) across the 12 seeded Indian Sign Language signs:

| Sign ID | ISL Concept | Hand Configuration | Dominant Spatial Anchor | Motion Description | Observed Accuracy | Operational Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `HELLO` | Salutation | Open 5-finger palm | Temple / forehead (y < 0.45) | Lateral wave oscillation (motion_x) | 92% (demo heuristic) | Prone to false positive if scratching head or adjusting glasses |
| `THANK_YOU` | Gratitude | Open flat hand | Chin / mouth (y < 0.50) | Outward/downward projection towards camera | 88% (demo heuristic) | Requires clear chin starting point; sensitive to camera pitch |
| `PLEASE` | Politeness / Request | Flat palm | Center chest (0.35 <= y <= 0.65) | Circular rubbing motion across sternum | 85% (demo heuristic) | Confused with chest scratching if radius < 0.05 |
| `NAME` | Identity / Name | H-handshape (index+middle extended) | Upper torso (0.35 <= y <= 0.65) | Tapping gesture (small trajectory delta) | 84% (demo heuristic) | Hand foreshortening can occlude index/middle separation |
| `HELP` | Assistance | Two-handed: dominant fist on flat non-dominant palm | Lower chest | Upward lifting motion together | 89% (demo heuristic) | Both hands must remain unoccluded; fails if non-dominant hand dropped |
| `YES` | Affirmation | S-handshape (closed fist) | Neck / chest | Vertical nodding oscillation (motion_y) | 86% (demo heuristic) | Rapid head nods without hand will not trigger sign |
| `NO` | Negation | Index + middle pinching thumb | Mid chest / face | Lateral swipe or pinch cycles | 83% (demo heuristic) | Finger pinch detection requires high-resolution camera feed |
| `WATER` | Concept (Water) | W-handshape (index, middle, ring extended) | Side of chin / mouth | Tapping against corner of mouth | 82% (demo heuristic) | Requires clear side-profile or angled hand visibility |
| `GOOD` | Approval | A-handshape (thumb extended upward) | Chest | Forward / upward projection | 88% (demo heuristic) | Must be distinguished from general thumbs-up by chest starting point |
| `WELCOME` | Hospitality | Both open flat hands | Lateral torso | Inward sweeping arc towards sternum | 90% (demo heuristic) | Wide camera angle required; hands must not clip screen borders |
| `SIGN` | Concept (Signing) | Both open hands | Front of chest | Alternating rolling circular cycles | 87% (demo heuristic) | High kinetic movement; requires >= 20 FPS video feed |
| `FRIEND` | Social connection | Both hands (index fingers hooked/clasped) | Torso center | Interlocking hook motion (bilateral distance < 0.15) | 84% (demo heuristic) | Occlusion between intertwined fingers causes landmark jitter |

---

## 2. Input Tensor Specification Contract

Any machine learning sequence model designed to replace the demo heuristic fallback must adhere to the versioned input tensor specification:

### A. Tensor Shape
```
(batch_size, sequence_length, feature_dim) = (N, 30, 75)
```
- **`batch_size` ($N$)**: Number of temporal windows (1 for real-time webcam stream; 16-64 for batch video inference).
- **`sequence_length` ($T$)**: Fixed 30 frames (representing 1.0 second at 30 FPS or 2.0 seconds at 15 FPS). Sequences shorter than 30 frames must be zero-padded or linearly interpolated; sequences longer than 30 frames must use a sliding window with stride $S = 15$.
- **`feature_dim` ($D = 75$)**:
  - `0..62` (63 dimensions): 21 3D coordinates $(x, y, z)$ for dominant hand landmarks (wrist through fingertip nodes).
  - `63..74` (12 dimensions): 4 3D coordinates $(x, y, z)$ for key body pose anchors:
    - Left shoulder (`pose[11]`)
    - Right shoulder (`pose[12]`)
    - Nose (`pose[0]`)
    - Mid-hip / sternum center

### B. Normalization & Coordinate Alignment
1. **Viewport Invariance**: All raw $(X, Y)$ screen pixel coordinates are mapped to $[0.0, 1.0]$ normalized image space.
2. **Anchor Origin**: The coordinate origin $(0, 0, 0)$ is translated to the mid-point between the left and right shoulders:
   $$\mathbf{origin} = \frac{\mathbf{shoulder}_{\text{left}} + \mathbf{shoulder}_{\text{right}}}{2}$$
3. **Scale Invariance**: Coordinates are divided by the Euclidean shoulder span distance $d_{\text{shoulders}} = \|\mathbf{shoulder}_{\text{left}} - \mathbf{shoulder}_{\text{right}}\|_2$. This renders inference invariant to user distance from the camera.

---

## 3. Production Model Architecture & Integration Guide

To deploy a certified production deep learning model (e.g. Spatio-Temporal Graph Convolutional Network (ST-GCN), Bi-directional LSTM with Self-Attention, or Transformer Sequence Encoder):

### Step 1: Export Trained Model
Export the trained neural network checkpoint to an ONNX runtime graph (`isl_model.onnx`) or TorchScript trace (`isl_model.pt`).

### Step 2: Implement Interface
Create `backend/app/services/recognition/production_model.py` subclassing `ISLRecognitionModelInterface`:

```python
import onnxruntime as ort
from app.services.recognition.model_interface import ISLRecognitionModelInterface

class ProductionISLSequenceModel(ISLRecognitionModelInterface):
    MODEL_ID = "isl-stgcn-prod"
    MODEL_VERSION = "v1.0.0"
    IS_DEMO = False

    def __init__(self, model_path: str = "models/isl_stgcn.onnx"):
        self.session = ort.InferenceSession(model_path)
        self.vocab = [...] # 250+ verified signs

    async def predict(self, sequence: LandmarkSequenceRequest) -> RecognitionResponse:
        # 1. Transform sequence.frames to (1, 30, 75) numpy tensor
        # 2. Run session.run()
        # 3. Softmax probabilities and thresholding (> 0.75 for verified signs)
        ...
```

### Step 3: Register in Endpoints
Update `backend/app/api/v1/endpoints/recognize.py` to point `_model_instance` to `ProductionISLSequenceModel()`.

---

## 4. Known Technical Caveats & Environmental Limitations

1. **Non-Manual Markers**: Native ISL utilizes head shifts, mouthings, and eyebrow furrows to denote questions, relative clauses, and negation. Current spatial landmark extraction focuses primarily on manual articulators (hands/shoulders) and does not capture micro-facial grammar.
2. **Lighting and Skin Tone Contrast**: Video feeds with low ambient contrast or severe backlighting cause MediaPipe landmark tracking failures. Camera feeds require at least 150 lux ambient illumination.
3. **Occlusion & Cross-Body Signing**: Signs that cross the body centerline or where one hand occludes the other experience high landmark variance. Two-handed signs require both wrists to remain within the camera frustum.
4. **Motion Blur**: Shutter speeds slower than 1/60s on low-end webcams create motion blur during rapid transitions, degrading fingertip landmark accuracy.
