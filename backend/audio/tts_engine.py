"""TTS Engine — Piper Giorgio + Deepgram fallback"""
import subprocess
import tempfile
import os
from pathlib import Path

class TTSEngine:
    def __init__(self, config):
        self.cfg = config
        self.piper_model = f"./models/{config.TTS_VOICE}.onnx"
        self.piper_json = f"./models/{config.TTS_VOICE}.onnx.json"
        local_piper = Path("./tools/piper/piper/piper.exe")
        self.piper_bin = str(local_piper) if local_piper.exists() else "piper"

    def speak(self, text: str, speed: float = None) -> bytes:
        if self.cfg.TTS_ENGINE == "piper" and os.path.exists(self.piper_model):
            return self._piper_tts(text, speed or self.cfg.TTS_SPEED)
        return self._deepgram_tts(text)

    def _piper_tts(self, text: str, speed: float) -> bytes:
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                out_path = f.name
            cmd = [
                self.piper_bin,
                "--model", self.piper_model,
                "--config", self.piper_json,
                "--output_file", out_path,
                "--length_scale", str(1.0 / speed)
            ]
            subprocess.run(cmd, input=text.encode(), timeout=30, capture_output=True)
            with open(out_path, "rb") as f:
                data = f.read()
            os.unlink(out_path)
            return data
        except Exception:
            return self._deepgram_tts(text)

    def _deepgram_tts(self, text: str) -> bytes:
        import requests
        if not self.cfg.DEEPGRAM_API_KEY:
            return b""
        url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=24000&container=none"
        headers = {"Authorization": f"Token {self.cfg.DEEPGRAM_API_KEY}", "Content-Type": "application/json"}
        try:
            resp = requests.post(url, headers=headers, json={"text": text}, timeout=30)
            return resp.content if resp.status_code == 200 else b""
        except Exception:
            return b""
