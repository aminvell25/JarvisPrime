"""OpenWakeWord"""
import numpy as np

class WakeWordEngine:
    def __init__(self):
        self.available = False
        self.model = None
        try:
            from openwakeword.model import Model
            try:
                self.model = Model(wakeword_models=["hey_jarvis"], inference_framework="onnx")
                self.available = True
            except Exception:
                try:
                    self.model = Model(wakeword_models=["./models/hey_jarvis.onnx"], inference_framework="onnx")
                    self.available = True
                except Exception:
                    pass
        except ImportError:
            pass

    def predict(self, pcm: np.ndarray) -> float:
        if not self.available or self.model is None:
            return 0.0
        try:
            result = self.model.predict(pcm.astype(np.int16, copy=False))
            return max(result.values()) if result else 0.0
        except Exception:
            return 0.0
