"""Emotion Detection"""
import numpy as np

class EmotionDetector:
    def analyze(self, pcm: np.ndarray, sr=16000) -> dict:
        pcm_f = pcm.astype(np.float32)
        rms = np.sqrt(np.mean(pcm_f**2)) / 32768.0
        corr = np.correlate(pcm_f, pcm_f, mode='full')
        corr = corr[len(corr)//2:]
        peaks = np.where((corr[1:-1] > corr[:-2]) & (corr[1:-1] > corr[2:]) & (corr[1:-1] > 0.3 * corr.max()))[0]
        pitch = sr / peaks[0] if len(peaks) > 0 else 0
        if rms > 0.1 and pitch > 300:
            mood = "stressed_urgent"; speed = 1.15; tone = "direct"
        elif rms < 0.03 and pitch < 150:
            mood = "reflective"; speed = 0.92; tone = "calm"
        else:
            mood = "neutral"; speed = 1.0; tone = "normal"
        return {"mood": mood, "rms": rms, "pitch": pitch, "tts_speed": speed, "tts_tone": tone}
