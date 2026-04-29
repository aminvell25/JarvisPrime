"""Orchestratore Llama 3.1"""
import json
import re
import requests

class LLMRouter:
    def __init__(self, host="http://localhost:11434", model="llama3.1:8b"):
        self.host = host
        self.model = model

    def route(self, user_input: str) -> dict:
        prompt = f"""Sei il router di J.A.R.V.I.S. Analizza la richiesta e restituisci SOLO JSON valido.
Regole:
- target: "haiku" per saluti, chitchat, comandi diretti, status, briefing
- target: "sonnet" per coding, debugging, analisi complesse, vision
- target: "direct" se banale (orario, stato base)
- target: "banter" se e chiaramente una battuta o chitchat leggero
Tool: shell, open_app, system_status, obsidian_read, obsidian_write, vscode, screen_analyze, briefing
Esempio: {{"target": "haiku", "tools": ["system_status"]}}
Richiesta: "{user_input}"
JSON:"""
        try:
            res = requests.post(f"{self.host}/api/generate", json={
                "model": self.model, "prompt": prompt, "stream": False,
                "options": {"temperature": 0.1, "num_predict": 120}
            }, timeout=8)
            text = res.json().get("response", "").strip()
            m = re.search(r'\{.*\}', text, re.DOTALL)
            if m:
                return json.loads(m.group())
        except Exception:
            pass
        return {"target": "haiku", "tools": []}
