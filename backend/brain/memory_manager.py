"""Memory Manager — L1-L4"""
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

class MemoryManager:
    def __init__(self, base_path="./memory"):
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)
        self.session = []
        self.working = self._load_json("working.json", {})
        self.episodic = sqlite3.connect(str(self.base / "episodic.db"))
        self._init_db()

    def _load_json(self, name, default):
        p = self.base / name
        return json.loads(p.read_text()) if p.exists() else default

    def _save_json(self, name, data):
        (self.base / name).write_text(json.dumps(data, indent=2))

    def _init_db(self):
        self.episodic.execute("CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY, ts TEXT, category TEXT, content TEXT, sentiment REAL, tags TEXT)")
        self.episodic.commit()

    def add_turn(self, user: str, jarvis: str):
        self.session.append({"user": user, "jarvis": jarvis, "ts": datetime.now().isoformat()})
        self.session = self.session[-10:]

    def get_context(self) -> str:
        return "\n".join(
            f"Signore: {t['user']}\nJ.A.R.V.I.S.: {t['jarvis']}"
            for t in self.session[-5:]
        )

    def record_episode(self, category: str, content: str, sentiment: float = 0):
        self.episodic.execute("INSERT INTO episodes (ts, category, content, sentiment, tags) VALUES (?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), category, content, sentiment, ""))
        self.episodic.commit()

    def recall(self, query: str, days: int = 7) -> str:
        since = (datetime.now() - timedelta(days=days)).isoformat()
        c = self.episodic.execute("SELECT content FROM episodes WHERE ts > ? AND content LIKE ? ORDER BY ts DESC LIMIT 1", (since, f"%{query}%"))
        row = c.fetchone()
        return row[0] if row else ""
