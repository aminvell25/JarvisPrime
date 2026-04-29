"""Clap Detector — Singolo = Intro, Doppio = Wake"""
import time
import numpy as np

class ClapDetector:
    def __init__(self, sr=16000):
        self.sr = sr
        self.last_clap = 0.0
        self.cooldown = 0.6
        self.count = 0
        self.energy_th = 0.12
        self.spec_ratio_th = 1.8
        self.intro_timeout = 1.5

    def detect(self, pcm: np.ndarray):
        pcm_f = pcm.astype(np.float32) / 32768.0
        energy = np.sqrt(np.mean(pcm_f ** 2))
        now = time.time()
        if now - self.last_clap > self.intro_timeout:
            self.count = 0
        if energy < self.energy_th:
            return None
        fft = np.fft.rfft(pcm_f)
        freqs = np.fft.rfftfreq(len(pcm_f), 1.0 / self.sr)
        high = np.abs(fft[(freqs > 2000) & (freqs < 8000)]).mean()
        low = np.abs(fft[(freqs > 100) & (freqs < 1000)]).mean() + 1e-10
        ratio = high / low
        if ratio < self.spec_ratio_th:
            return None
        if now - self.last_clap > self.cooldown:
            self.count += 1
            self.last_clap = now
            if self.count == 1:
                return "intro"
            elif self.count >= 2:
                self.count = 0
                return "wake"
        return None
