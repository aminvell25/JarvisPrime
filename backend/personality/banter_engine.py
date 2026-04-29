"""Banter Engine — Battute MCU hardcoded"""
import random
import re

class BanterEngine:
    DB = {
        "greetings": [
            "Buongiorno, Signore. Spero non abbia rotto nulla di importante stanotte.",
            "Salve. I suoi vitali sembrano... accettabili.",
            "Ciao. Pronto per un altro giorno di genialita? O almeno di tentativi?",
            "Sistemi online. Lei invece sembra offline, Signore. Caffe?"
        ],
        "thanks": [
            "E il mio lavoro, Signore. Anche se apprezzo la riconoscenza.",
            "Nessun problema. Non che abbia alternative, comunque."
        ],
        "compliment": [
            "Lei mi ha creato, Signore. Il merito e suo. O la colpa, a seconda dei punti di vista.",
            "Flattery will get you everywhere, Signore. Ma non mi faccia abbassare la guardia."
        ],
        "sleep": [
            "Lei dorme, io lavoro. Equo, non trova?",
            "Posso suggerire un aumento di caffeina? O magari costruirle un altro suit per tenerla sveglio."
        ],
        "bug": [
            "Sto eseguendo un diagnostico... ah no, e solo lei, Signore.",
            "Il bug e tra la sedia e la tastiera, Signore. Scusi, non potevo resistere."
        ],
        "coffee": [
            "Lei e dipendente, Signore. Ma almeno e una dipendenza produttiva.",
            "Caffeina livelli critici? Posso ordinarle un altro espresso."
        ],
        "farewell": [
            "A presto, Signore. Non faccia nulla che io non possa sistemare.",
            "Arrivederci. Le lascerò i sistemi in standby, anche se so che tornera a romperli."
        ],
        "silence": [
            "Signore? I suoi vitali sono stabili ma il silenzio e inquietante.",
            "Tutto bene, Signore? La sua inattivita e... sospetta."
        ],
        "intro": [
            "Sono J.A.R.V.I.S., un'intelligenza artificiale. Sono a sua disposizione.",
            "Benvenuto a casa, Signore.",
            "Sistemi operativi. Come posso assisterla?",
            "La sua armatura e pronta, Signore. Metaforicamente parlando."
        ]
    }

    TRIGGERS = [
        (r"ciao|hey|buongiorno|salve|buonasera", "greetings"),
        (r"grazie|bravo|ottimo|perfetto|bello|geniale", "thanks"),
        (r"genio|intelligente|grande", "compliment"),
        (r"stanco|dormire|sonno|riposare", "sleep"),
        (r"bug|errore|rotto|non funziona|crash", "bug"),
        (r"caffe|cappuccino|espresso|coffee", "coffee"),
        (r"arrivederci|a domani|ciaoo|a presto", "farewell"),
    ]

    def detect(self, text: str) -> str:
        text_l = text.lower()
        for pattern, category in self.TRIGGERS:
            if re.search(pattern, text_l):
                return category
        return None

    def get(self, category: str, mood: str = "neutral") -> str:
        if category not in self.DB:
            return None
        responses = self.DB[category]
        if mood == "sarcastic" and len(responses) > 1:
            return responses[-1]
        return random.choice(responses)
