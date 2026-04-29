"""MCP Tools — Shell, App, System, Obsidian"""
import subprocess
import sys
import psutil
from pathlib import Path

class MCPTools:
    def __init__(self, vault_path: Path):
        self.vault = vault_path
        self.system = sys.platform

    def shell(self, cmd: str, timeout=30) -> str:
        try:
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
            out = (r.stdout.strip()[:2000] + "\n" + r.stderr.strip()[:500]).strip()
            return out if out else "(nessun output)"
        except Exception as e:
            return f"Errore: {e}"

    def open_app(self, app: str) -> str:
        try:
            if self.system == "win32":
                subprocess.run(["start", app], shell=True, check=True)
            else:
                subprocess.run([app], check=True)
            return f"✅ {app} avviato, Signore."
        except Exception as e:
            return f"❌ Impossibile avviare {app}: {e}"

    def system_status(self) -> str:
        try:
            cpu = psutil.cpu_percent(interval=0.5)
            ram = psutil.virtual_memory()
            return f"🖥️ CPU {cpu}% | RAM {ram.percent}% ({ram.used//1024**3}GB / {ram.total//1024**3}GB)"
        except Exception:
            return "Sistemi operativi, Signore."

    def obsidian_read(self, note: str) -> str:
        path = self.vault / f"{note}.md"
        return path.read_text(encoding="utf-8")[:3000] if path.exists() else f"Nota '{note}' non trovata."

    def obsidian_write(self, title: str, content: str) -> str:
        d = self.vault / "Jarvis" / "AutoNotes"
        d.mkdir(parents=True, exist_ok=True)
        fp = d / f"{title.replace(' ', '_')}.md"
        from datetime import datetime
        note = f"# {title}\n\n*{datetime.now().strftime('%Y-%m-%d %H:%M')} — J.A.R.V.I.S. Log*\n\n{content}"
        fp.write_text(note, encoding="utf-8")
        return f"📝 Salvato in {fp}"

    def open_browser(self, url: str) -> str:
        import webbrowser
        webbrowser.open(url)
        return f"🌐 Apro {url}, Signore."
