"""Mood Tracker — Stabile con hysteresis"""
import json
import random
from pathlib import Path
from datetime import datetime

class MoodTracker:
    def __init__(self, path="./memory/mood.json"):
        self.path = Path(path)
        self.data = self._load()

    def _load(self):
        if self.path.exists():
            return json.loads(self.path.read_text())
        return {"interactions": [], "current_mood": "neutral", "mood_history": [], "banter_freq": 0.5}

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2))

    def analyze(self, text: str) -> float:
        pos = ["grazie", "bravo", "ottimo", "perfetto", "bello", "geniale", "bene", "fantastico", "amore"]
        neg = ["male", "odio", "non funziona", "rotto", "errore", "cazzo", "merda", "schifo", "stupido", "peggio"]
        text_l = text.lower()
        p = sum(1 for x in pos if x in text_l)
        n = sum(1 for x in neg if x in text_l)
        if p + n == 0:
            return 0.0
        return (p - n) / (p + n)

    def record(self, user_text: str, response: str):
        sent = self.analyze(user_text)
        self.data["interactions"].append({"ts": datetime.now().isoformat(), "sent": sent, "text": user_text[:80]})
        self.data["interactions"] = self.data["interactions"][-20:]
        recent = self.data["interactions"][-3:]
        if len(recent) >= 3:
            avg = sum(x["sent"] for x in recent) / 3
            if all(x["sent"] > 0.2 for x in recent):
                new_mood = "friendly"
            elif all(x["sent"] < -0.2 for x in recent):
                new_mood = "sarcastic"
            else:
                new_mood = "neutral"
            if new_mood != self.data["current_mood"]:
                self.data["mood_history"].append({"ts": datetime.now().isoformat(), "from": self.data["current_mood"], "to": new_mood})
                self.data["current_mood"] = new_mood
        self.data["banter_freq"] = 0.3 + (self.analyze(user_text) + 1) * 0.35
        self.save()

    def addon(self) -> str:
        m = self.data["current_mood"]
        return {
            "friendly": " L'utente e di buon umore. Puo essere piu rilassato e scherzoso.",
            "sarcastic": " L'utente sembra frustrato. Usa sarcasmo costruttivo, stile Tony Stark.",
            "neutral": " Mantieni il tuo tono professionale abituale."
        }.get(m, "")

    def should_banter(self) -> bool:
        return random.random() < self.data["banter_freq"]
