# 🚀 J.A.R.V.I.S. Prime — Istruzioni di Avvio
## Per: Amine (Signore) | Hardware: Laptop RTX 3080 + Ryzen 5800H | OS: Windows

> Cartella progetto attuale: `C:\Applicazioni GAME\jarvis-prime`

---



## 🔧 STEP 1: Installa Prerequisiti

### 1.1 Python 3.10+ (se non ce l'hai)
- Scarica da: https://www.python.org/downloads/
- **IMPORTANTE**: Durante installazione, spunta "Add Python to PATH"
- Su questo PC Python è disponibile tramite launcher `py`. Se `python` non funziona, usa `py`.

### 1.2 Node.js + npm (per il frontend Electron)
- Scarica da: https://nodejs.org/ (scarica LTS)
- Verifica: apri PowerShell e scrivi:
  ```powershell
  node --version
  npm --version
  ```

### 1.3 Ollama (per il cervello locale)
- Scarica da: https://ollama.com/download/windows
- Installa e riavvia il PC

### 1.4 Git (opzionale, ma consigliato)
- Scarica da: https://git-scm.com/download/win

---

## 📥 STEP 2: Installa Dipendenze

Apri **PowerShell** (tasto destro su Start → "Windows PowerShell" o "Terminal")

```powershell
# Vai nella cartella del progetto
cd "C:\Applicazioni GAME\jarvis-prime"

# Installa dipendenze Python
py -m pip install --upgrade pip
py -m pip install -r backend\requirements.txt

# Se pyaudio da errore, prova prima:
py -m pip install pipwin
pipwin install pyaudio

# Installa dipendenze frontend
cd frontend
npm install
cd ..

# Installa dipendenze VS Code Extension (opzionale)
cd vscode-extension
npm install
npm run compile
cd ..
```

---

## 🧠 STEP 3: Scarica il Modello Locale

Apri un **nuovo** PowerShell/Terminal:

```powershell
ollama pull llama3.1:8b
```

Attendi il download. Quando finisce, il modello è pronto.

> Nota: il backend attuale usa `llama3.1:8b` in `backend\core\config.py`.
> Se vuoi usare `qwen3:1.7b`, devi prima modificare `OLLAMA_MODEL` nella config.

**Per verificare**:
```powershell
ollama list
# Deve mostrare: llama3.1:8b
```

---

## 🔑 STEP 4: Configura API Key

Devi ottenere 2 API key:

### 4.1 Anthropic API Key (per Claude Haiku/Sonnet)
- Vai su: https://console.anthropic.com/
- Registrati / Accedi
- Crea una API key
- Copia la key (inizia con `sk-ant-...`)

### 4.2 Deepgram API Key (per STT + TTS fallback)
- Vai su: https://console.deepgram.com/
- Registrati / Accedi
- Crea un progetto
- Copia la API key

### 4.3 Piper TTS (voce locale italiana)

Il backend attuale usa Piper come TTS predefinito:

```python
TTS_ENGINE = "piper"
TTS_VOICE = "it_IT-riccardo-x_low"
```

Scarica Piper da:
https://github.com/rhasspy/piper/releases

Poi scarica il modello italiano `it_IT-riccardo-x_low` e metti questi file nella cartella `models` del progetto:

```text
C:\Applicazioni GAME\jarvis-prime\models\it_IT-riccardo-x_low.onnx
C:\Applicazioni GAME\jarvis-prime\models\it_IT-riccardo-x_low.onnx.json
```

Se preferisci usare Deepgram anche per il TTS, modifica `backend\core\config.py`:

```python
TTS_ENGINE = "deepgram"
```

---

## 🎵 STEP 5: Prepara la Musica per l'Intro (Opzionale ma Consigliato)

Crea questa cartella:
```
%USERPROFILE%\Music\JarvisIntro\
```

Metti dentro 2-3 file MP3 di musica epica/cinematografica.
Quando fai **singolo clap**, JARVIS:
1. Dice una frase iconica MCU
2. Parte una di queste canzoni
3. L'orb fa animazione spettacolo

---

## 🚀 STEP 6: AVVIO (3 Terminali)

Devi aprire **3 finestre PowerShell separate** e lasciarle aperte.

### TERMINALE 1 — Ollama (il cervello locale)
```powershell
ollama serve
```
Lascialo aperto. Non chiuderlo.

### TERMINALE 2 — Backend Python
```powershell
cd "C:\Applicazioni GAME\jarvis-prime"
$env:ANTHROPIC_API_KEY = "sk-ant-INSERISCI-QUI"
$env:DEEPGRAM_API_KEY = "INSERISCI-QUI"
py -m backend.main
```

Dovresti vedere:
```
============================================================
   J.A.R.V.I.S. Prime Online
   Signore, sono pronto.
============================================================
```

### TERMINALE 3 — Frontend Electron
```powershell
cd "C:\Applicazioni GAME\jarvis-prime\frontend"
npm start
```

Si apre una finestra fullscreen nera con l'Orb blu al centro.

---

## 🚀 STEP 6B: Avvio Automatico Windows

In alternativa ai 3 terminali, puoi usare lo script:

```text
C:\Applicazioni GAME\jarvis-prime\start-jarvis.bat
```

Prima di usarlo:

1. Clic destro su `start-jarvis.bat` → Modifica.
2. Sostituisci `la-tua-chiave-qui` con le tue API key reali.
3. Salva e chiudi.
4. Doppio clic su `start-jarvis.bat`.

Lo script avvia in sequenza Ollama, backend FastAPI e frontend Electron.

---

## 🎮 STEP 7: Come Usarlo

| Azione | Come si fa |
|--------|-----------|
| **Wake Word** | Di "Jarvis" vicino al microfono |
| **Clap Singolo** 👏 | Batti le mani UNA volta → Modalità spettacolo (frase MCU + musica) |
| **Clap Doppio** 👏👏 | Batti le mani DUE volte → Wake normale, inizia ad ascoltare |
| **Parla** | Dopo il wake, parla normalmente |
| **Interrompi** | Se JARVIS sta parlando e tu inizi a parlare, si ferma immediatamente |
| **Briefing mattutino** | "Jarvis, briefing" |
| **Analizza schermo** | "Jarvis, guarda questo errore" |
| **Coding** | "Jarvis, scrivi una funzione per..." |
| **Status sistema** | "Jarvis, come va tutto?" |

---

## ✅ PARTE A: Checklist Test End-to-End

### TEST 1: Orb visivo

| Check | Come verificare |
|-------|-----------------|
| Orb centrale visibile | Dovrebbe essere un cerchio glowing cyan |
| Anelli rotanti | 4 anelli concentrici in movimento |
| Particelle esterne | Nuvola di punti cyan attorno all'orb |
| Linee di connessione | Dovrebbero apparire in stato THINKING |
| HUD in alto | Testo "Sistemi operativi, Signore." |
| Orologio live | Orario che si aggiorna |

### TEST 2: Audio

| Check | Come verificare |
|-------|-----------------|
| Boot sound | Senti il suono power-up all'avvio |
| Wake sound | Dici "Ehi Jarvis" → chime |
| Error sound | Aspetta timeout → alert |
| TTS voce Cesare | Chiedi qualcosa → voce italiana maschile |

### TEST 3: WebSocket

| Check | Come verificare |
|-------|-----------------|
| Nessun errore rosso in console DevTools | Premi `Ctrl+Shift+I` → tab Console |
| Connected status | Punto verde in HUD |
| Riconnessione automatica | Chiudi backend 2s → riapri → si riconnette |

### TEST 4: Comandi vocali

| Comando | Risultato atteso |
|---------|------------------|
| "Come stai?" | Risposta sarcastica JARVIS, max 30 parole |
| "Apri VS Code" | Comando inviato a VS Code bridge |
| "Cosa c'è in agenda?" | Richiesta a Claude + risposta |

### TEST 5: Stati orb

| Stato | Trigger | Visivo |
|-------|---------|--------|
| IDLE | Default | Rotazione lenta, breathing Z |
| LISTENING | "Ehi Jarvis" | Particelle più attive |
| THINKING | Dopo comando | Linee + elettroni bianchi |
| SPEAKING | Risposta TTS | Pulsazione audio-driven |

### Screenshot dei risultati

Dopo aver completato i test, annota:

- Quanti test sono passati, per esempio `4/5`.
- Quali sono falliti e cosa hai visto.
- Eventuali errori in console, copiati dalla tab Console di DevTools.

---

## ❌ Troubleshooting

### "Module not found" o errori Python
```powershell
cd "C:\Applicazioni GAME\jarvis-prime"
py -m pip install --upgrade pip
py -m pip install -r backend\requirements.txt
```

### PyAudio non si installa
```powershell
pip install pipwin
pipwin install pyaudio
```

### Ollama non trova il modello
```powershell
ollama pull llama3.1:8b
# Fallback più leggero:
ollama pull llama3.2:3b
```

### Frontend non si apre / errore Electron
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
npm start
```

### Deepgram errore / STT non ascolta
- Verifica che la API key sia inserita correttamente
- Verifica che ci siano crediti su https://console.deepgram.com/
- Deepgram offre $200 di credito gratis all'inizio

### TTS non parla
- Se usi Piper, verifica che `piper.exe` sia nel PATH oppure avvialo da una cartella dove il comando `piper` funziona
- Verifica che i file `it_IT-riccardo-x_low.onnx` e `it_IT-riccardo-x_low.onnx.json` siano dentro `models`
- Se vuoi saltare Piper, imposta `TTS_ENGINE = "deepgram"` in `backend\core\config.py`

### Il microfono non sente / Clap non funziona
- Apri Impostazioni Windows → Sistema → Suono → Verifica che il microfono funzioni
- Parla più vicino al laptop
- Il clap deve essere secco e forte (tipo battito di mani, non strofinamento)

---

## 🎯 Checklist Prima dell'Avvio

- [ ] Python installato con PATH
- [ ] Node.js installato
- [ ] Ollama installato e riavviato
- [ ] `ollama pull llama3.1:8b` completato
- [ ] API Key Anthropic copiata
- [ ] API Key Deepgram copiata
- [ ] Piper installato oppure `TTS_ENGINE = "deepgram"` configurato
- [ ] Cartella `%USERPROFILE%\Music\JarvisIntro\` creata (opzionale)
- [ ] 3 terminali pronti

---

**Signore, una volta avviato, JARVIS è in ascolto.**
⚡
