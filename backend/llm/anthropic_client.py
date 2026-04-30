"""Anthropic Client — Haiku + Sonnet"""
import logging
from anthropic import Anthropic, RateLimitError, APIConnectionError

logger = logging.getLogger(__name__)

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

    def ask(self, model: str, user_text: str, tool_results: list = None, mood_addon: str = "", vision_image: str = None, max_tokens: int = 1024) -> str:
        system = self.base_personality + mood_addon
        if tool_results:
            user_text += "\n\n[Risultati tool di sistema]\n" + "\n".join(tool_results)

        content = [{"type": "text", "text": user_text}]
        if vision_image:
            content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": vision_image}})

        try:
            resp = self.client.messages.create(
                model=model, max_tokens=max_tokens, temperature=0.7,
                system=system, messages=[{"role": "user", "content": content}]
            )
            if resp.content and len(resp.content) > 0 and hasattr(resp.content[0], 'text'):
                return resp.content[0].text
            return "Mi scusi, Signore, la risposta del server è vuota."
        except RateLimitError as e:
            logger.error(f"RateLimitError: {e}")
            return "Mi scusi, Signore, il sistema è momentaneamente sovraccarico."
        except APIConnectionError as e:
            logger.error(f"APIConnectionError: {e}")
            return "Mi scusi, Signore, la connessione con il server centrale è instabile."
        except Exception as e:
            logger.error(f"Unexpected error in JarvisLLM.ask: {e}")
            return "Mi scusi, Signore, ho riscontrato un malfunzionamento tecnico."
