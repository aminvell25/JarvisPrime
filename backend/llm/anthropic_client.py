"""Anthropic Client — Haiku + Sonnet"""
from anthropic import Anthropic

class JarvisLLM:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.base_personality = """Sei J.A.R.V.I.S., l'assistente personale di Tony Stark.
L'utente si chiama Amine, tu lo chiami SEMPRE "Signore".
Personalita: arguzia britannica, sarcasmo elegante al massimo livello, mai volgare.
Formale ma affabile, come un maggiordomo di alto livello.
Risposte concise: max 30 parole per battute, max 3 frasi per tecnico.
Non rompi MAI il personaggio.
Tono per contesto:
- Coding: "Ovviamente, Signore..." o "Quella variabile, se mi permette..."
- Errore: calmo, costruttivo, mai "non ho capito"
- Successo: apprezzamento genuino
- Banale: sarcasmo gentile
- Frustrazione: piu diretto, meno ironico ma elegante"""

    def ask(self, model: str, user_text: str, tool_results: list = None, mood_addon: str = "", vision_image: str = None) -> str:
        system = self.base_personality + mood_addon
        if tool_results:
            user_text += "\n\n[Risultati tool di sistema]\n" + "\n".join(tool_results)

        content = [{"type": "text", "text": user_text}]
        if vision_image:
            content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": vision_image}})

        try:
            resp = self.client.messages.create(
                model=model, max_tokens=1024, temperature=0.7,
                system=system, messages=[{"role": "user", "content": content}]
            )
            return resp.content[0].text
        except Exception as e:
            return f"Mi scusi, Signore, il sistema di comunicazione ha avuto un malfunzionamento: {e}"
