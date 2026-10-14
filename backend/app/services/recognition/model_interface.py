"""Abstract base interface for versioned ISL sequence recognition models."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.recognition import (
    LandmarkSequenceRequest,
    ModelMetadataResponse,
    RecognitionResponse,
)


class ISLRecognitionModelInterface(ABC):
    """Abstract interface for all ISL sequence recognition model implementations.

    Production models (e.g., PyTorch BiLSTM, Spatio-Temporal Graph Convolutional
    Networks, or Transformer encoders) must inherit from this interface and adhere
    to the expected tensor contract.
    """

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Unique model identifier."""
        ...

    @property
    @abstractmethod
    def model_version(self) -> str:
        """SemVer model release version."""
        ...

    @property
    @abstractmethod
    def is_demo(self) -> bool:
        """Flag indicating whether this model is a heuristic demo fallback."""
        ...

    @abstractmethod
    def get_supported_vocabulary(self) -> list[str]:
        """Return list of supported ISL glosses."""
        ...

    @abstractmethod
    def get_input_tensor_format(self) -> dict[str, Any]:
        """Return specification of input tensor dimensions and normalization rules."""
        ...

    @abstractmethod
    def get_limitations(self) -> list[str]:
        """Return explicit documentation of known operational limitations and caveats."""
        ...

    @abstractmethod
    def get_metadata(self) -> ModelMetadataResponse:
        """Return full model metadata object."""
        ...

    @abstractmethod
    async def predict(self, sequence: LandmarkSequenceRequest) -> RecognitionResponse:
        """Perform inference on a single temporal sequence of frame landmarks."""
        ...

    @abstractmethod
    async def batch_predict(
        self, sequences: list[LandmarkSequenceRequest]
    ) -> list[RecognitionResponse]:
        """Perform batched inference on multiple temporal sequences."""
        ...
