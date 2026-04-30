"""Anthropic Client — Haiku + Sonnet"""
from __future__ import annotations
import logging
from typing import Any
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
from anthropic import Anthropic, RateLimitError, APIConnectionError, AuthenticationError, APITimeoutError
from anthropic.types import TextBlock

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

    def ask(self, model: str, user_text: str, tool_results: list | None = None,
            mood_addon: str = "", vision_image: str | None = None,
            max_tokens: int = 1024) -> str:
        system = self.base_personality + mood_addon
        if tool_results:
            user_text += "\n\n[Risultati tool di sistema]\n" + "\n".join(tool_results)

        content: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
        if vision_image:
            content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": vision_image}})

        try:
            resp = self.client.messages.create(
                model=model, max_tokens=max_tokens, temperature=0.7,
                system=system, messages=[{"role": "user", "content": content}]  # type: ignore
            )
            if resp.content and len(resp.content) > 0:
                first_block = resp.content[0]
                if isinstance(first_block, TextBlock):
                    return first_block.text
            return "Mi scusi, Signore, la risposta del server è vuota."
        except RateLimitError as e:
            logger.error(f"RateLimitError: {e}")
            return "Mi scusi, Signore, il sistema è momentaneamente sovraccarico."
        except APITimeoutError as e:
            logger.error(f"APITimeoutError: {e}")
            return "Mi scusi, Signore, il server sta impiegando troppo tempo a rispondere."
        except APIConnectionError as e:
            logger.error(f"APIConnectionError: {e}")
            return "Mi scusi, Signore, la connessione con il server centrale è instabile."
        except AuthenticationError as e:
            logger.error(f"AuthenticationError: {e}")
            return "Mi scusi, Signore, le credenziali di accesso non sono valide."
        except Exception as e:
            logger.error(f"Unexpected error in JarvisLLM.ask: {e}")
            return "Mi scusi, Signore, ho riscontrato un malfunzionamento tecnico."
