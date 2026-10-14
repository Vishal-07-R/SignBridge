"""Heuristic geometric ISL sequence recognition model operating in labelled DEMO MODE."""

from __future__ import annotations

import math
import time
from typing import Any

from app.schemas.recognition import (
    FrameLandmarks,
    LandmarkSequenceRequest,
    ModelMetadataResponse,
    RecognitionAlternative,
    RecognitionPrediction,
    RecognitionResponse,
)
from app.services.recognition.model_interface import ISLRecognitionModelInterface


class DemoRuleBasedSequenceModel(ISLRecognitionModelInterface):
    """Rule-based heuristic sequence recognition model.

    STRICT HONESTY DISCLOSURE (Honesty Rules 4 & 8):
    This model evaluates geometric spatial properties of MediaPipe hand and pose
    landmarks (elevation, finger curl/extension, velocity, bilateral distance)
    to classify gestures across the 12 seeded vocabulary items. It does NOT
    substitute for a certified machine learning model trained on native ISL signers.
    Low-confidence gestures return an explicit "Sign not recognized" state rather
    than fabricating a result.
    """

    MODEL_ID = "isl-heuristic-demo"
    MODEL_VERSION = "v0.1.0-demo"
    IS_DEMO = True

    SUPPORTED_VOCABULARY = [
        "HELLO",
        "THANK_YOU",
        "PLEASE",
        "NAME",
        "HELP",
        "YES",
        "NO",
        "WATER",
        "GOOD",
        "WELCOME",
        "SIGN",
        "FRIEND",
    ]

    CONFIDENCE_THRESHOLD = 0.60

    @property
    def model_id(self) -> str:
        return self.MODEL_ID

    @property
    def model_version(self) -> str:
        return self.MODEL_VERSION

    @property
    def is_demo(self) -> bool:
        return self.IS_DEMO

    def get_supported_vocabulary(self) -> list[str]:
        return list(self.SUPPORTED_VOCABULARY)

    def get_input_tensor_format(self) -> dict[str, Any]:
        return {
            "tensor_shape": "(batch_size, sequence_length, 75)",
            "sequence_length": "15 to 60 frames (0.5s to 2.0s at 30 FPS)",
            "feature_dim": 75,
            "feature_breakdown": {
                "right_hand_landmarks": "21 points x 3 (x, y, z) = 63 dims",
                "pose_anchor_points": "4 points (left/right shoulder, nose, mid-hip) x 3 = 12 dims",
            },
            "normalization": "Normalized [0.0, 1.0] viewport coordinates; origin relative to mid-shoulder",
            "frame_rate_recommended": 30,
        }

    def get_limitations(self) -> list[str]:
        return [
            "Operating in labelled DEMO MODE via geometric heuristics (Honesty Rule 8).",
            "MediaPipe landmark extraction is a spatial coordinate overlay, NOT sign recognition (Honesty Rule 4).",
            "Recognizes only the 12 seeded vocabulary items under unobstructed frontal framing.",
            "Does not detect non-manual signals (facial expressions, mouthings, eyebrow shifts).",
            "Sensitive to extreme hand foreshortening, poor lighting, or camera boundary clipping.",
            "Gestures falling below 60% confidence threshold strictly emit 'Sign not recognized'.",
        ]

    def get_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_id=self.model_id,
            model_version=self.model_version,
            is_demo=self.is_demo,
            supported_vocabulary=self.get_supported_vocabulary(),
            input_tensor_format=self.get_input_tensor_format(),
            limitations=self.get_limitations(),
            documentation_url="/docs/ISL_RECOGNITION_LIMITATIONS.md",
        )

    async def predict(self, sequence: LandmarkSequenceRequest) -> RecognitionResponse:
        start_time = time.perf_counter()
        frames = sequence.frames

        if not frames:
            return RecognitionResponse(
                success=True,
                is_recognized=False,
                message="Empty frame sequence provided.",
                model_version=self.model_version,
                is_demo=True,
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )

        # 1. Filter frames with hand landmarks
        valid_frames = [
            f for f in frames if (f.right_hand is not None or f.left_hand is not None)
        ]

        if not valid_frames:
            return RecognitionResponse(
                success=True,
                is_recognized=False,
                message="No hands detected in the frame sequence. Ensure hands are clearly visible.",
                model_version=self.model_version,
                is_demo=True,
                latency_ms=round((time.perf_counter() - start_time) * 1000, 2),
            )

        # 2. Extract geometric statistics across the temporal window
        features = self._extract_features(frames)

        # 3. Compute heuristic confidence scores for each supported sign
        scores: dict[str, float] = {}
        for gloss in self.SUPPORTED_VOCABULARY:
            score = self._score_gloss(gloss, features)
            scores[gloss] = score

        # Rank predictions
        sorted_scores = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        top_gloss, top_score = sorted_scores[0]

        alternatives = [
            RecognitionAlternative(gloss=g, confidence=round(s, 2))
            for g, s in sorted_scores[1:4]
            if s > 0.30
        ]

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        if top_score >= self.CONFIDENCE_THRESHOLD:
            prediction = RecognitionPrediction(
                gloss=top_gloss,
                confidence=round(top_score, 2),
                start_time_ms=frames[0].timestamp_ms,
                end_time_ms=frames[-1].timestamp_ms,
                is_demo=True,
                alternatives=alternatives,
            )
            return RecognitionResponse(
                success=True,
                is_recognized=True,
                prediction=prediction,
                model_version=self.model_version,
                is_demo=True,
                latency_ms=latency_ms,
            )
        else:
            return RecognitionResponse(
                success=True,
                is_recognized=False,
                message=(
                    f"Sign not recognized with certainty (top candidate '{top_gloss}' "
                    f"confidence {top_score:.2f} < {self.CONFIDENCE_THRESHOLD:.2f}). "
                    "Please re-sign gesture clearly."
                ),
                prediction=None,
                model_version=self.model_version,
                is_demo=True,
                latency_ms=latency_ms,
            )

    async def batch_predict(
        self, sequences: list[LandmarkSequenceRequest]
    ) -> list[RecognitionResponse]:
        results: list[RecognitionResponse] = []
        for seq in sequences:
            res = await self.predict(seq)
            results.append(res)
        return results

    def _extract_features(self, frames: list[FrameLandmarks]) -> dict[str, Any]:
        """Compute aggregated spatial and kinetic features across the sequence."""
        right_hands = [f.right_hand for f in frames if f.right_hand is not None]
        left_hands = [f.left_hand for f in frames if f.left_hand is not None]

        # Use dominant hand (prefer right if present, otherwise left)
        active_hands = right_hands if len(right_hands) >= len(left_hands) else left_hands
        is_two_handed = bool(len(right_hands) > len(frames) * 0.3 and len(left_hands) > len(frames) * 0.3)

        if not active_hands:
            return {"valid": False}

        # Average wrist position (landmark 0)
        avg_wrist_y = sum(h[0].y for h in active_hands) / len(active_hands)
        avg_wrist_x = sum(h[0].x for h in active_hands) / len(active_hands)

        # Motion delta: displacement from beginning to end of sequence
        motion_y = active_hands[-1][0].y - active_hands[0][0].y
        motion_x = active_hands[-1][0].x - active_hands[0][0].x

        # Kinetic variance: total trajectory distance traversed by wrist
        traj_distance = 0.0
        for i in range(1, len(active_hands)):
            dx = active_hands[i][0].x - active_hands[i - 1][0].x
            dy = active_hands[i][0].y - active_hands[i - 1][0].y
            traj_distance += math.sqrt(dx * dx + dy * dy)

        # Finger extension check on the final active frame
        # In normalized screen space, y=0 is top, y=1 is bottom. Extended fingers have tip.y < pip.y.
        final_hand = active_hands[-1]
        thumb_extended = final_hand[4].y < final_hand[3].y
        index_extended = final_hand[8].y < final_hand[6].y
        middle_extended = final_hand[12].y < final_hand[10].y
        ring_extended = final_hand[16].y < final_hand[14].y
        pinky_extended = final_hand[20].y < final_hand[18].y

        extended_count = sum(
            [thumb_extended, index_extended, middle_extended, ring_extended, pinky_extended]
        )

        # Bilateral distance between hands if two-handed
        bilateral_dist = 1.0
        if is_two_handed:
            paired_dists = []
            for f in frames:
                if f.right_hand and f.left_hand:
                    rw = f.right_hand[0]
                    lw = f.left_hand[0]
                    d = math.sqrt((rw.x - lw.x) ** 2 + (rw.y - lw.y) ** 2)
                    paired_dists.append(d)
            if paired_dists:
                bilateral_dist = sum(paired_dists) / len(paired_dists)

        return {
            "valid": True,
            "is_two_handed": is_two_handed,
            "avg_wrist_y": avg_wrist_y,
            "avg_wrist_x": avg_wrist_x,
            "motion_y": motion_y,
            "motion_x": motion_x,
            "traj_distance": traj_distance,
            "extended_count": extended_count,
            "thumb_extended": thumb_extended,
            "index_extended": index_extended,
            "middle_extended": middle_extended,
            "ring_extended": ring_extended,
            "pinky_extended": pinky_extended,
            "bilateral_dist": bilateral_dist,
        }

    def _score_gloss(self, gloss: str, feat: dict[str, Any]) -> float:
        """Heuristic rule-based scoring function for supported ISL signs."""
        if not feat.get("valid"):
            return 0.0

        score = 0.20  # Base prior

        y = feat["avg_wrist_y"]
        my = feat["motion_y"]
        mx = feat["motion_x"]
        traj = feat["traj_distance"]
        ext = feat["extended_count"]
        two_h = feat["is_two_handed"]
        b_dist = feat["bilateral_dist"]

        # In MediaPipe screen space:
        # y < 0.40: Head/Face level
        # 0.40 <= y <= 0.65: Chest/Torso level
        # y > 0.65: Lower body / Waist level

        if gloss == "HELLO":
            # Raised hand near temple/face with open palm and lateral waving motion
            if y < 0.45 and not two_h:
                score += 0.35
            if ext >= 4:
                score += 0.25
            if abs(mx) > 0.03 or traj > 0.15:
                score += 0.25

        elif gloss == "THANK_YOU":
            # Hand starts at chin/mouth and moves forward/downward
            if y < 0.50 and not two_h:
                score += 0.30
            if my > 0.04:  # Downward/forward projection
                score += 0.35
            if ext >= 3:
                score += 0.20

        elif gloss == "PLEASE":
            # Hand flat on chest with circular/rubbing motion
            if 0.35 <= y <= 0.65 and not two_h:
                score += 0.35
            if ext >= 4:
                score += 0.25
            if 0.05 < traj < 0.35:
                score += 0.25

        elif gloss == "YES":
            # Fist nodding vertically up and down
            if ext <= 1:  # Fist
                score += 0.35
            if abs(my) > 0.03:  # Vertical motion
                score += 0.35
            if not two_h and y < 0.65:
                score += 0.15

        elif gloss == "NO":
            # Pinching fingers or lateral negative shake at face/chest level
            if ext in (2, 3):  # Index + middle pinch against thumb
                score += 0.35
            if abs(mx) > 0.04:  # Lateral swipe
                score += 0.30
            if y < 0.55:
                score += 0.20

        elif gloss == "NAME":
            # Two-finger H-handshape (index + middle) tapping
            if feat["index_extended"] and feat["middle_extended"] and not feat["ring_extended"]:
                score += 0.45
            if 0.35 <= y <= 0.65:
                score += 0.25
            if traj < 0.25:
                score += 0.15

        elif gloss == "HELP":
            # Two-handed: dominant fist on flat non-dominant palm, moving upwards
            if two_h:
                score += 0.35
            if b_dist < 0.25:  # Hands close together
                score += 0.25
            if my < -0.03:  # Moving upward together
                score += 0.25

        elif gloss == "WATER":
            # W-handshape (index, middle, ring extended) tapping chin/mouth
            if feat["index_extended"] and feat["middle_extended"] and feat["ring_extended"]:
                score += 0.40
            if y < 0.42:  # Near mouth/chin
                score += 0.35
            if not two_h:
                score += 0.10

        elif gloss == "GOOD":
            # Thumbs up handshape moving forward/up from chest
            if feat["thumb_extended"] and ext <= 2:
                score += 0.45
            if 0.35 <= y <= 0.65:
                score += 0.25
            if my < 0.0:  # Moving upward/forward
                score += 0.15

        elif gloss == "WELCOME":
            # Two hands sweeping inward towards the chest
            if two_h:
                score += 0.40
            if 0.40 <= y <= 0.70:
                score += 0.25
            if ext >= 4:
                score += 0.20

        elif gloss == "SIGN":
            # Two hands rotating/cycling in front of chest
            if two_h:
                score += 0.35
            if 0.35 <= y <= 0.65:
                score += 0.25
            if traj > 0.25:  # High rotational motion
                score += 0.25

        elif gloss == "FRIEND":
            # Two hands with index fingers hooking/clasping together
            if two_h:
                score += 0.35
            if b_dist < 0.20:  # In direct contact
                score += 0.35
            if feat["index_extended"]:
                score += 0.15

        return min(max(score, 0.0), 0.95)
