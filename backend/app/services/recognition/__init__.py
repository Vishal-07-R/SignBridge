"""ISL to Text Recognition Services and Model-Serving Interfaces."""

from app.services.recognition.demo_model import DemoRuleBasedSequenceModel
from app.services.recognition.model_interface import ISLRecognitionModelInterface

__all__ = ["DemoRuleBasedSequenceModel", "ISLRecognitionModelInterface"]
