"""Barge-In Controller"""
import time

class BargeInController:
    def __init__(self, timeout=10.0):
        self.session_active = False
        self.session_timeout = timeout
        self.last_interaction = 0.0
        self.tts_playing = False

    def on_user_speak(self):
        self.last_interaction = time.time()
        self.session_active = True
        if self.tts_playing:
            self.tts_playing = False
            return True
        return False

    def should_require_wake_word(self) -> bool:
        if not self.session_active:
            return True
        if time.time() - self.last_interaction > self.session_timeout:
            self.session_active = False
            return True
        return False

    def on_tts_start(self):
        self.tts_playing = True

    def on_tts_end(self):
        self.tts_playing = False
