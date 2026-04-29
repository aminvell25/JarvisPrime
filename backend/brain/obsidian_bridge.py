"""Obsidian Bridge — Bidirezionale"""
from pathlib import Path
from datetime import datetime

class ObsidianBridge:
    def __init__(self, vault: Path):
        self.vault = vault
        self.vault.mkdir(parents=True, exist_ok=True)

    def read(self, note: str) -> str:
        p = self.vault / f"{note}.md"
        return p.read_text(encoding="utf-8") if p.exists() else ""

    def write(self, title: str, content: str, folder="Jarvis/AutoNotes"):
        d = self.vault / folder
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{datetime.now().strftime('%Y-%m-%d')}_{title.replace(' ', '_')}.md"
        p.write_text(
            f"# {title}\n\n*{datetime.now().strftime('%H:%M')} — J.A.R.V.I.S.*\n\n{content}",
            encoding="utf-8",
        )
        return str(p)
