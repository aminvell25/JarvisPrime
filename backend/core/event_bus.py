"""Event Bus — Cuore pulsante"""
import asyncio
from enum import Enum
from typing import Callable, Dict, List

class JarvisEvent(Enum):
    WAKE_DETECTED = "wake_detected"
    USER_SPEAKING = "user_speaking"
    SILENCE_DETECTED = "silence_detected"
    LONG_SILENCE = "long_silence"
    TRANSCRIPT_FINAL = "transcript_final"
    THINKING_STARTED = "thinking_started"
    RESPONSE_READY = "response_ready"
    TTS_STARTED = "tts_started"
    TTS_FINISHED = "tts_finished"
    SYSTEM_ALERT = "system_alert"
    SCREEN_CHANGED = "screen_changed"
    CODE_ERROR = "code_error"
    BANTER_TRIGGERED = "banter_triggered"
    MOOD_CHANGED = "mood_changed"
    BRIEFING_REQUEST = "briefing_request"
    INTRO_MODE = "intro_mode"

class EventBus:
    def __init__(self):
        self._subs: Dict[JarvisEvent, List[Callable]] = {e: [] for e in JarvisEvent}
        self._queue = asyncio.Queue()
        self._running = False

    def subscribe(self, event: JarvisEvent, callback: Callable):
        self._subs[event].append(callback)

    async def publish(self, event: JarvisEvent, data: dict = None):
        await self._queue.put((event, data or {}))

    async def run(self):
        self._running = True
        while self._running:
            event, data = await self._queue.get()
            for cb in self._subs[event]:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        asyncio.create_task(cb(data))
                    else:
                        cb(data)
                except Exception as e:
                    print(f"[EventBus] Errore handler {event}: {e}")

    def stop(self):
        self._running = False
