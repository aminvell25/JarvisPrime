"""Adaptive VAD with Silero fallback."""
import numpy as np

class AdaptiveVAD:
    def __init__(
        self,
        threshold=0.015,
        silero_enabled=True,
        speech_threshold=0.45,
        silence_threshold=0.25,
        speech_start_frames=3,
        speech_end_frames=18,
    ):
        self.th = threshold
        self.silero_enabled = silero_enabled
        self.speech_threshold = speech_threshold
        self.silence_threshold = silence_threshold
        self.speech_start_frames = speech_start_frames
        self.speech_end_frames = speech_end_frames
        self.utterance_dur = 0
        self.frame_count = 0
        self.silence_frames = 0
        self.speech_frames = 0
        self.is_speaking = False
        self.last_score = 0.0
        self._silero = None
        self._use_silero = False

        if self.silero_enabled:
            try:
                from openwakeword.vad import VAD
                self._silero = VAD()
                self._use_silero = True
            except Exception as e:
                print(f"Silero VAD unavailable, using energy VAD: {e}", flush=True)

    def process(self, pcm: np.ndarray) -> bool:
        if self._use_silero:
            return self._process_silero(pcm)
        return self._process_energy(pcm)

    def _process_silero(self, pcm: np.ndarray) -> bool:
        self.frame_count += 1
        frame = pcm.astype(np.int16, copy=False)
        remainder = len(frame) % 480
        if remainder:
            frame = np.pad(frame, (0, 480 - remainder))

        try:
            score = float(self._silero.predict(frame, frame_size=480))
        except Exception as e:
            print(f"Silero VAD error, using energy VAD: {e}", flush=True)
            self._use_silero = False
            return self._process_energy(pcm)

        self.last_score = score
        if score >= self.speech_threshold:
            self.speech_frames += 1
            self.silence_frames = 0
            if self.speech_frames >= self.speech_start_frames:
                self.is_speaking = True
                self.utterance_dur += 1
            return False

        if self.is_speaking and score <= self.silence_threshold:
            self.silence_frames += 1
            if self.silence_frames >= self.speech_end_frames:
                self.reset()
                return True
        elif not self.is_speaking:
            self.speech_frames = 0
            self.silence_frames = 0

        return False

    def _process_energy(self, pcm: np.ndarray) -> bool:
        energy = np.sqrt(np.mean(pcm.astype(np.float32)**2)) / 32768.0
        self.frame_count += 1
        if energy > self.th:
            self.utterance_dur += 1
            self.silence_frames = 0
            self.is_speaking = True
            return False
        self.silence_frames += 1
        end_th = 60 if self.utterance_dur > 100 else 100
        if self.silence_frames > end_th:
            self.utterance_dur = 0
            self.silence_frames = 0
            self.is_speaking = False
            return True
        return False

    def reset(self):
        self.utterance_dur = 0
        self.silence_frames = 0
        self.speech_frames = 0
        self.is_speaking = False
