"""J.A.R.V.I.S. Prime — Configurazione"""
import os
from pathlib import Path

class Config:
    OWNER_NAME = "Amine"
    OWNER_TITLE = "Signore"
    OS = "windows"

    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL = "llama3.1:8b"
    CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001"
    CLAUDE_SONNET_MODEL = "claude-sonnet-4-6"

    SAMPLE_RATE = 16000
    CHUNK_MS = 80
    FRAME_SIZE = int(SAMPLE_RATE * 0.08)
    VAD_THRESHOLD = 0.015
    SILERO_VAD_ENABLED = True
    SILERO_SPEECH_THRESHOLD = 0.45
    SILERO_SILENCE_THRESHOLD = 0.25
    SPEECH_START_FRAMES = 3
    SPEECH_END_FRAMES = 18
    LISTENING_TIMEOUT = 12.0
    NO_SPEECH_TIMEOUT = 5.0

    WAKE_WORD_MODEL = "hey_jarvis"
    WAKE_THRESHOLD = 0.25
    CLAP_ENABLED = True

    WS_HOST = "0.0.0.0"
    WS_PORT = 8000

    TTS_ENGINE = "piper"  # piper | deepgram
    TTS_VOICE = "it_IT-riccardo-x_low"
    TTS_SPEED = 0.95

    VAULT_PATH = Path.home() / "Documents" / "JarvisVault"
    MEMORY_PATH = Path("./memory")
    LOGS_PATH = Path("./logs")
    MUSIC_INTRO_PATH = Path.home() / "Music" / "JarvisIntro"

    SARCASM_LEVEL = 10
    PROACTIVITY_LEVEL = 8
    BANTER_FREQUENCY = 0.7
    SESSION_TIMEOUT = 10.0
    BARGE_IN_ENABLED = True

    SCREEN_CAPTURE_ENABLED = True
    SCREEN_CAPTURE_ON_DEMAND = True

    @classmethod
    def ensure_dirs(cls):
        for p in [cls.VAULT_PATH, cls.MEMORY_PATH, cls.LOGS_PATH, cls.MUSIC_INTRO_PATH]:
            p.mkdir(parents=True, exist_ok=True)

