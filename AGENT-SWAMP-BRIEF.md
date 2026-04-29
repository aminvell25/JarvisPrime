# 📡 BRIEF TECNICO — J.A.R.V.I.S. Prime (Demo → Produzione)
**Destinatario:** Kimi 2.6 Agent Swamp  
**Proprietario:** Amine | Signore  
**Data:** 2026-04-30  
**Scope:** Trasformare la demo attuale in un assistente AI personale completo, modulare e production-ready.

---

## 1. EXECUTIVE SUMMARY

Questo progetto è una **demo funzionante** di un assistente vocale personale ispirato a J.A.R.V.I.S. dell'MCU. Attualmente gira in locale su Windows (laptop RTX 3080 + Ryzen 5800H) ed è composta da:

- **Backend Python/FastAPI** con pipeline audio real-time, dual WebSocket, routing LLM locale/remoto, TTS neurale offline, memoria episodica SQLite, e tool di sistema.
- **Frontend Electron + Three.js** che renderizza un Orb 3D animato con shader custom, HUD futuristica, waveform audio e riproduzione TTS.
- **VS Code Extension** (TypeScript/WebSocket) che funge da ponte per inserimento codice e diagnostica.

**Obiettivo:** Evolvere questa base in un Jarvis "vero e proprio": autonomo, estensibile, con memoria a lungo termine, capacità proattive, integrazione OS-level, e architettura pronta per plugin/moduli aggiuntivi.

---

## 2. STACK TECNOLOGICO COMPLETO

### 2.1 Backend
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| **Python** | 3.10+ | Runtime principale |
| **FastAPI** | ≥0.104 | Web framework + WebSocket nativi |
| **Uvicorn** | ≥0.24 | ASGI server |
| **websockets** | ≥12.0 | Client WebSocket (Deepgram, VS Code) |
| **anthropic** | ≥0.21.0 | Client API Claude (Haiku/Sonnet) |
| **deepgram-sdk** | ≥3.0.0, <4.0.0 | STT streaming (Nova-2) + TTS fallback (Aura) |
| **openwakeword** | ≥0.6.0 | Wake word detection ONNX + Silero VAD |
| **pyaudio** | ≥0.2.11 | Accesso microfono (legacy/futuro uso diretto) |
| **numpy** | ≥1.24.0 | Processing audio (PCM, FFT) |
| **requests** | ≥2.31.0 | HTTP per Ollama e Deepgram TTS |
| **psutil** | ≥5.9.0 | Monitoraggio sistema (CPU/RAM) |
| **Pillow** | ≥10.0.0 | Image processing (screen capture) |
| **mss** | ≥9.0.0 | Screen capture multi-piattaforma |
| **Ollama** | latest | Inference LLM locale (llama3.1:8b) |
| **SQLite** | built-in | Memoria episodica L3 |

### 2.2 Frontend
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| **Electron** | ^28.0.0 | Shell app desktop (fullscreen, transparent, frameless) |
| **Three.js** | ^0.160.0 | Render engine 3D (Orb + anelli + particelle) |
| **Web Audio API** | native | Analyser node, TTS playback, resampling mic |
| **WebSocket** | native | Dual socket verso backend |

### 2.3 VS Code Extension
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| **TypeScript** | ^5.0.0 | Sorgente |
| **VS Code API** | ^1.80.0 | Estensione nativa |
| **ws** | ^8.20.0 | WebSocket server (porta 9001) |
| **Node.js** | 20.x | Runtime estensione |

### 2.4 Modelli ML/ONNX
| Modello | Percorso | Scopo |
|---------|----------|-------|
| `it_IT-riccardo-x_low.onnx` | `./models/` | TTS italiano offline (Piper) |
| `hey_jarvis.onnx` (fallback) | `./models/` | Wake word custom (openwakeword) |
| `llama3.1:8b` | Ollama | Routing locale + possibile fallback LLM |

---

## 3. STRUTTURA DIRECTORY DETTAGLIATA

```
jarvis-prime/
├── backend/
│   ├── main.py                 # Entry point FastAPI (444 righe), inizializza tutto
│   ├── requirements.txt        # 12 dipendenze Python
│   ├── core/
│   │   ├── config.py           # Singleton costanti (API keys, path, soglie, mood)
│   │   ├── event_bus.py        # EventBus async + JarvisEvent enum
│   │   └── state_machine.py    # JarvisStateMachine (IDLE, LISTENING, THINKING, SPEAKING, ...)
│   ├── audio/
│   │   ├── wake_word.py        # WakeWordEngine (openwakeword ONNX, score>0.25)
│   │   ├── clap_detector.py    # ClapDetector (FFT energy + spectral ratio, 1clap=intro, 2clap=wake)
│   │   ├── vad.py              # AdaptiveVAD (Silero + fallback energy-based)
│   │   ├── deepgram_stt.py     # DeepgramSTT streaming (nova-2, it-IT, 16kHz)
│   │   ├── tts_engine.py       # TTSEngine (Piper primario, Deepgram fallback)
│   │   ├── emotion_detector.py # EmotionDetector (RMS + pitch → mood/tts_speed)
│   │   └── barge_in.py         # BargeInController (interruzione durante TTS)
│   ├── llm/
│   │   ├── router.py           # LLMRouter (Ollama llama3.1:8b → target+tools, JSON)
│   │   └── anthropic_client.py # JarvisLLM (Claude Haiku/Sonnet, vision, persona MCU)
│   ├── personality/
│   │   ├── banter_engine.py    # BanterEngine (9 categorie regex, frasi italiane MCU)
│   │   └── mood_tracker.py     # MoodTracker (sentiment keyword IT, hysteresis L3)
│   ├── brain/
│   │   ├── memory_manager.py   # MemoryManager (L1 working JSON, L2 session list, L3 SQLite)
│   │   └── obsidian_bridge.py  # ObsidianBridge (vault Markdown ~/Documents/JarvisVault)
│   └── tools/
│       ├── mcp_tools.py        # MCPTools (shell, open_app, browser, system_status, obsidian)
│       ├── vscode_bridge.py    # VSCodeBridge (WS client → localhost:9001)
│       └── screen_capture.py   # ScreenCapture (mss + Pillow → PNG base64)
│
├── frontend/
│   ├── index.html              # UI HUD futuristica (CSS inline, canvas-container)
│   ├── main.js                 # Entry Electron (BrowserWindow fullscreen transparent)
│   ├── renderer.js             # Three.js Orb + shader custom + WebSocket dual + audio
│   ├── package.json            # Electron app, dipendenze: three, electron, electron-builder
│   └── sounds/                 # 5 WAV (alert, banter, success, thinking, wake)
│
├── vscode-extension/
│   ├── src/extension.ts        # WS server porta 9001, comandi insert/replace/get_diagnostics
│   ├── package.json            # Manifest estensione, comandi: insertCode, showDiagnostics
│   ├── tsconfig.json           # strict, ES2020, outDir=out
│   └── out/extension.js        # Output compilato
│
├── memory/
│   ├── episodic.db             # SQLite (tabella episodes: id, ts, category, content, sentiment, tags)
│   └── mood.json               # Stato mood corrente + history + banter_freq
│
├── models/
│   ├── it_IT-riccardo-x_low.onnx       # TTS neurale italiano (~27MB)
│   └── it_IT-riccardo-x_low.onnx.json  # Config modello (16kHz, 130 simboli)
│
├── tools/piper/                # Eseguibile Piper + DLL ONNX + espeak-ng-data multilingua
│
├── logs/
│   ├── backend-runtime.log     # Log stdout backend
│   ├── backend-runtime.err.log # Log stderr backend
│   ├── frontend-runtime.log    # Log stdout Electron
│   └── frontend-runtime.err.log
│
├── setup.py                    # Setup automatizzato (pip, ollama, npm, dirs)
├── setup.sh                    # Setup bash (Unix)
├── README.md                   # Panoramica progetto
├── JARVIS-AVVIO-ISTRUZIONI.md  # Manuale avvio dettagliato (Windows)
└── API-KEYS-DOVE-METTERLE.md   # Guida API key Anthropic/Deepgram
```

---

## 4. ARCHITETTURA BACKEND — DEEP DIVE

### 4.1 Dual WebSocket
Il backend espone **due endpoint WebSocket separati** su `ws://localhost:8000`:

- **`/socket-a` — Audio Binary Stream**  
  Riceve chunk audio dal frontend: PCM 16-bit, 16kHz, mono. Il frontend usa `ScriptProcessorNode` (4096 samples) e converte Float32 → Int16 prima di inviare.

- **`/socket-b` — JSON Command & Control**  
  Scambia messaggi JSON: stati UI, transcript, risposte testuali, comandi utente, HUD updates.

**Perché duali?** Per separare il flusso audio ad alta frequenza (binario, continuo) dai messaggi di controllo a bassa frequenza (JSON, event-driven). Evita serializzazione inutile e latenza sul controllo.

### 4.2 Pipeline Audio End-to-End
```
Mic (frontend)
  → ScriptProcessorNode (4096 samples, 16kHz)
  → Int16 PCM
  → WebSocket /socket-a
  → main.py
      → BargeIn check (se TTS attivo + VAD)
      → WakeWordEngine.predict()  (openwakeword ONNX, soglia 0.25)
      → ClapDetector.detect()     (FFT RMS > 0.12 + ratio > 1.8)
      → Se wake: inizia ascolto
          → AdaptiveVAD.process() (Silero 0.45/0.25 + energy fallback)
          → DeepgramSTT.send(chunk) (streaming nova-2 it-IT)
          → UtteranceEnd / silence → final_transcript
      → process_input(text)
```

**Parametri critici** (`backend/core/config.py`):
- `WAKE_THRESHOLD = 0.25`
- `LISTENING_TIMEOUT = 12.0` s
- `NO_SPEECH_TIMEOUT = 5.0` s
- `SESSION_TIMEOUT = 10.0` s (barge-in senza wake word)
- `VAD_THRESHOLD = 0.015`
- `SILERO_SPEECH_THRESHOLD = 0.45`, `SILERO_SILENCE_THRESHOLD = 0.25`
- `SPEECH_END_FRAMES = 18`

### 4.3 Pipeline di Processing (`process_input` in `main.py`)
1. **Banter Check** — regex su input → se match e `mood.should_banter()` (freq 0.65) → risposta predefinita MCU, salta LLM.
2. **Routing** — `LLMRouter.route(user_text)` chiama Ollama (llama3.1:8b, temp 0.1, timeout 8s) per decidere:
   - `target`: `haiku` | `sonnet` | `direct` | `banter`
   - `tools`: lista tool da eseguire
3. **Tool Execution** — per ogni tool in lista, chiama `execute_tool()`.
4. **LLM Generation** — `JarvisLLM.ask(model, user_text, tool_results, mood_addon, vision_image)` chiama Anthropic API.
5. **Delivery** — `deliver_response()`:
   - Genera TTS (`tts.speak()` → bytes WAV/linear16)
   - Broadcast audio base64 su `/socket-b`
   - Broadcast testo risposta + metadati (model_used, tools_used)
6. **Memory & Mood** — `mood.record()`, `memory.add_turn()`

### 4.4 Sistema LLM

#### Router Locale (`backend/llm/router.py`)
- **Motore:** Ollama `llama3.1:8b` su `http://localhost:11434/api/generate`
- **Prompt di system:** istruisce il modello a restituire SOLO JSON con `target` e `tools`.
- **Timeout:** 8 secondi. Fallback a `{"target":"haiku","tools":[]}`.
- **Scopo:** Evitare costi API su chiacchere semplici o comandi diretti; usare API cloud solo quando necessario.

#### Client Remoto (`backend/llm/anthropic_client.py`)
- **Client:** `anthropic.Anthropic`
- **Modelli:**
  - `claude-haiku-4-5-20251001` — chitchat, comandi diretti
  - `claude-sonnet-4-6` — coding, debugging, vision
- **Persona hardcoded:** J.A.R.V.I.S. di Tony Stark. Chiama utente "Signore". Sarcasmo elegante. Max 30 parole per battute, max 3 frasi per tecnico.
- **Vision:** Supporta immagini base64 PNG nel content Anthropic (`image` block). Usato in `do_screen_analysis()`.

### 4.5 TTS Engine (`backend/audio/tts_engine.py`)
- **Primario — Piper:**
  - Eseguibile: `./tools/piper/piper/piper.exe` (o `piper` in PATH)
  - Modello: `./models/it_IT-riccardo-x_low.onnx` + `.onnx.json`
  - Output: WAV 16kHz o linear16 (a seconda del flusso)
  - Parametro `length_scale` inverso alla velocità
- **Fallback — Deepgram TTS:**
  - Voce: `aura-asteria-en`
  - Formato: linear16, 24kHz
  - Via REST API (non streaming)

Il frontend riceve il payload audio base64 e lo decodifica in due modalità:
- `format == "wav"` → `AudioContext.decodeAudioData()`
- `format == "linear16"` → conversione manuale Int16→Float32 + `createBuffer`

### 4.6 Memoria (3 Livelli)

| Livello | Storage | Scopo | Implementazione |
|---------|---------|-------|-----------------|
| **L1** | `memory/working.json` | Contesto immediato, variabili di sessione | Dizionario Python generico (uso minimo attuale) |
| **L2** | RAM (`self.session` list) | Ultimi 10 turni di conversazione | Lista in-memory, accesso ultimi 5 via `get_context()` |
| **L3** | `memory/episodic.db` (SQLite) | Memoria a lungo termine, ricerca temporale | Tabella `episodes` con full-text LIKE e filtro `days` |

**Schema SQLite:**
```sql
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY,
  ts TEXT,
  category TEXT,
  content TEXT,
  sentiment REAL,
  tags TEXT
);
```

**Mood Tracker:**
- File: `memory/mood.json`
- Analisi: keyword positive/negative in italiano → score [-1, 1]
- Hysteresis: media ultimi 3 turni → stati `friendly` | `neutral` | `sarcastic`
- Addon: appende istruzione tono al system prompt Claude

### 4.7 Tool System (`backend/tools/mcp_tools.py`)
Tool attualmente mappati in `execute_tool()`:

| Tool | Stato | Descrizione |
|------|-------|-------------|
| `system_status` | ✅ Funzionante | CPU/RAM via psutil |
| `shell` | ⚠️ Stub | Ritorna "richiede conferma", nessuna esecuzione reale |
| `open_app` | ⚠️ Parziale | Hardcoded su `notepad` |
| `obsidian_read` | ✅ Funzionante | Legge nota dal vault Markdown |
| `obsidian_write` | ✅ Funzionante | Scrive nota datata nel vault |
| `vscode` | ✅ Funzionante | Richiede diagnostiche all'estensione |
| `screen_analyze` | ⚠️ Stub | Placeholder, l'on-demand funziona via `do_screen_analysis()` |
| `briefing` | ⚠️ Simulato | News AI/Gaming hardcoded, nessuna fonte reale |

### 4.8 Event Bus & State Machine
- **EventBus (`backend/core/event_bus.py`):** pub/sub async. Eventi: `SYSTEM_ALERT`, `LONG_SILENCE`.
- **StateMachine (`backend/core/state_machine.py`):** stati `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `BANTER`, `ALERT`, `SYSTEM`, `INTRO`. Transizioni validate.

---

## 5. ARCHITETTURA FRONTEND — DEEP DIVE

### 5.1 Electron Shell (`frontend/main.js`)
- Finestra: `1200x800`, `transparent: true`, `frameless: false`, `fullscreen: true`
- `nodeIntegration: true`, `contextIsolation: false` (semplificato, attenzione sicurezza)
- Permission handler: accetta solo `media` (microfono)
- Forward console log renderer → main process

### 5.2 Renderer 3D (`frontend/renderer.js`)
**Scene Three.js:**
- **Orb principale:** `IcosahedronGeometry(1.5, 4)` con `ShaderMaterial` custom.
  - Vertex shader: Simplex noise 3D per displacement dinamico.
  - Fragment shader: Fresnel + pulse + emissive. Alpha 0.85. Additive blending.
- **Anelli:** 4 `TorusGeometry` con rotazione indipendente e velocità variabili.
- **Particelle:** 800 punti in `BufferGeometry`, distribuzione randomica cubica 12x12x12.
- **Glow sprite:** CanvasTexture radiale, additive blending.
- **Luci:** Ambient + 3 PointLight (core, rim, bottom).
- **Camera:** Perspective 45°, posizione (0,0,6), reattiva al mouse.

**Stati Orb (`STATES` object):**
Ogni stato definisce: colore (hex), speed (noise), noise (ampiezza), scale, emissive.
Transizioni: lerp su colore, noise, speed, emissive, scala. Transizione ~0.4s.

**Mappatura stati → UI:**
| Stato | Colore | Label HUD |
|-------|--------|-----------|
| IDLE | `#00ff9f` | ONLINE |
| LISTENING | `#00d9ff` | LISTENING |
| THINKING | `#ffaa00` | PROCESSING |
| SPEAKING | `#00ff9f` | SPEAKING |
| BANTER | `#ff44aa` | BANTER |
| ALERT | `#ff0040` | ALERT |
| INTRO | `#ffffff` | INTRO |

**Audio nel renderer:**
- `initAudio()`: ottiene mic stream con constraints (16kHz, mono, echoCancellation, noiseSuppression, autoGainControl)
- `startAudioStream()`: crea `ScriptProcessorNode(4096)`, resample a 16kHz, converte in Int16, invia su WS `/socket-a`
- `drawWave()`: disegna waveform su canvas 2D usando `analyser.getByteTimeDomainData` (durante TTS) o `getByteFrequencyData` (in ascolto)
- `playTTSBase64()`: decodifica base64 → AudioBuffer → riproduzione

**HUD:**
- Top: `STARK INDUSTRIES // J.A.R.V.I.S. PRIME v1.0` + orologio live
- Center: testo principale (typewriter effect) + sottotitolo (stato/modello)
- Bottom: status dot (colore stato) + label + metriche sistema (CPU/MEM/GPU)
- Bubbles: effetto "pensiero" con ⚡ che appare in posizioni random attorno all'orb

---

## 6. VS CODE EXTENSION — DEEP DIVE

**Architettura:** WebSocket server passivo sulla porta `9001`.

**Flusso:**
1. VS Code si avvia → estensione attivata (`onStartupFinished`).
2. Avvia `WebSocket.Server` su `localhost:9001`.
3. Backend (`VSCodeBridge`) si connette.
4. Backend invia JSON `{ action, params }`.
5. Estensione esegue:
   - `insert` → inserisce testo alla posizione cursore
   - `replace` → sostituisce selezione
   - `get_diagnostics` → legge `vscode.languages.getDiagnostics(uri)` e risponde con `{ type: "diagnostics", errors: [...] }`

**Limitazioni attuali:**
- Nessuna UI (sidebar, webview, status bar)
- Nessuna riconnessione automatica
- Nessuna coda se backend non connesso
- Comandi nel Command Palette sono stub (handler vuoti)

---

## 7. FLUSSO DATI END-TO-END (SEQUENZA TIPICA)

```
[UTENTE] "Jarvis, come va il sistema?"
         │
         ▼
    Microfono (Windows Audio)
         │
         ▼
    Frontend: ScriptProcessorNode → Int16 PCM 16kHz
         │
         ▼
    WS /socket-a (binary) ───────────────────────────────► Backend
         │                                                   │
         │                                          WakeWordEngine.predict()
         │                                          score = 0.42 > 0.25 ✓
         │                                          broadcast {"type":"wake"}
         │                                          DeepgramSTT.connect()
         │                                          AdaptiveVAD.reset()
         │                                                   │
         │                                          ← Utente parla ─┘
         │                                          STT.send(chunk)
         │                                          VAD.process(chunk)
         │                                          silence detected
         │                                          final_transcript
         │                                                   │
         │                                          process_input("come va il sistema?")
         │                                          banter.detect() → None
         │                                          router.route() → target=haiku, tools=[system_status]
         │                                          execute_tool("system_status") → "CPU 12%, RAM 45%"
         │                                          llm.ask(haiku, text, tool_results, mood_addon)
         │                                          ← "Tutto stabile, Signore. CPU al 12%, memoria al 45%."
         │                                          tts.speak(text) → WAV bytes
         │                                                   │
         │                                          broadcast {"type":"jarvis_response", ...}
         │                                          broadcast {"type":"tts_chunk", audio: base64, ...}
         │                                                   │
    WS /socket-b (JSON) ◄───────────────────────────────────┘
         │
         ▼
    Frontend:
    - setOrb('SPEAKING')
    - typewriter("Tutto stabile, Signore...")
    - playTTSBase64(audio, 'wav', 24000)
    - updateHUD CPU/MEM
         │
         ▼
    [UTENTE] sente risposta vocale + vede Orb verde + testo apparire
```

---

## 8. STATO ATTUALE: COSA FUNZIONA vs COSA È DEMO

### ✅ Funzionante e stabile
- Dual WebSocket backend/frontend
- Wake word "Jarvis" (openwakeword ONNX)
- Clap detection (intro singolo, wake doppio)
- Deepgram STT streaming (italiano)
- Piper TTS offline (voce italiana Riccardo)
- Three.js Orb con shader custom e stati animati
- Barge-in (interruzione durante TTS)
- Adaptive VAD (Silero + energy)
- Mood tracker e banter engine
- Memoria episodica SQLite
- Obsidian vault bridge
- VS Code extension bridge (insert/replace/diagnostics)
- Screen capture on-demand + vision Claude
- Proactive loop (monitor CPU/RAM)

### ⚠️ Parzialmente implementato / Stub
- **Shell tool:** non esegue comandi reali (sicurezza)
- **Open app:** hardcoded su `notepad`
- **Screen analyze tool:** mappato come tool ma l'on-demand è una funzione separata; il tool non è usato nel routing
- **Briefing:** news AI e gaming sono testo hardcoded, nessuna fonte RSS/API reale
- **Browser open:** funziona ma non è trackato
- **Play sound sistema:** `play_sound()` è `pass` (TODO)
- **GPU monitoring:** HUD mostra sempre "--"
- **Emotion detector:** calcola RMS/pitch ma non influenza attivamente il routing (solo TTS speed potenziale)

### ❌ Mancante / Da implementare
- Configurazione runtime (file `.env` / YAML / JSON) invece di variabili d'ambiente + hardcoded
- Plugin system per tool terzi
- Autenticazione / sicurezza API
- Logging strutturato (usa `print`)
- Testing suite (nessun test)
- CI/CD
- Packaging automatico (setup.py funziona ma è basilare)
- Gestione errori robusta (molti `try/except` silenziosi)
- Multi-lingua (solo italiano)
- Memoria vettoriale (ChromaDB menzionato nel README ma non usato)
- Long-term context window management (oltre i 10 turni)
- Schedulazione task (cron/job queue)
- Notifiche proattive push (oltre il long silence)
- App mobile / web companion
- Hot-reload sviluppo

---

## 9. API KEY E DIPENDENZE ESTERNE

| Servizio | Chiave | Costo | Stato |
|----------|--------|-------|-------|
| **Anthropic Claude** | `ANTHROPIC_API_KEY` (sk-ant-...) | A pagamento (API usage) | **Obbligatorio** per risposte intelligenti |
| **Deepgram** | `DEEPGRAM_API_KEY` | Freemium ($200 credito iniziale) | **Obbligatorio** per STT streaming |
| **Ollama** | Nessuna | Gratuito (locale) | **Obbligatorio** per routing locale |
| **Piper TTS** | Nessuna | Gratuito (locale) | **Opzionale** (fallback Deepgram TTS a pagamento) |

**Nota:** Il backend legge le chiavi da variabili d'ambiente. Su Windows PowerShell:
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:DEEPGRAM_API_KEY="..."
```

---

## 10. PROPOSTA DI EVOLUZIONE — DA DEMO A JARVIS "VERO"

### 10.1 Pillastro 1: Configurazione & Infrastruttura
- **Config manager:** YAML/JSON/TOML con hot-reload (es. `config.yaml` + `config.local.yaml` per secrets)
- **Secrets manager:** `.env` nativo, integrazione con Windows Credential Manager / macOS Keychain / Linux secret-service
- **Logging:** `structlog` o `loguru` con rotazione, livelli, JSON format
- **Testing:** `pytest` + `pytest-asyncio` per tutti i moduli audio/LLM/tool
- **Packaging:** `pyinstaller` o `cx_Freeze` per eseguibile unico backend; `electron-builder` già configurato per frontend

### 10.2 Pillastro 2: Modularizzazione & Plugin System
- **Plugin registry:** caricamento dinamico di tool da cartella `plugins/` (Python entry points)
- **Interfaccia tool standard:** `@dataclass` o `Protocol` con `name`, `description`, `schema`, `execute()`
- **Tool suggestion engine:** LLM genera tool call strutturate (function calling Anthropic / Ollama tools)
- **Sandbox tool:** containerizzazione o restricted Python per `shell` e `open_app`

### 10.3 Pillastro 3: Memoria & Contesto
- **ChromaDB / Qdrant:** embedding delle conversazioni per RAG (memoria a lungo termine semantica)
- **Summarization:** riassunto periodico della sessione per ridurre context window
- **Entity extraction:** riconoscimento nomi, progetti, deadline → scrittura automatica in Obsidian
- **Temporal memory:** "Cosa stavo facendo ieri?" → query SQLite + embedding

### 10.4 Pillastro 4: Autonomia & Proattività
- **Scheduler:** `APScheduler` o `celery` per task programmati (briefing mattutino reale con API meteo/calendario)
- **Event listener OS:** watchdog su file system, notifiche email, calendario (Google Calendar API / Outlook)
- **Proactive alerts:** "Signore, ha una riunione tra 10 minuti" o "CPU sopra 80% da 5 minuti"
- **Agent loop:** capacità di eseguire sequenze multi-step autonomamente (pianifica → esegue tool → verifica → itera)

### 10.5 Pillastro 5: Audio Avanzato
- **Speaker diarization:** riconoscere chi parla (utente vs altri in stanza)
- **TTS streaming:** passare da WAV chunk a streaming continuo (minore latenza)
- **TTS multi-voce:** switch voce in base al contesto (formale, sarcastico, urgente)
- **Noise robustness:** RNNoise o filtri avanzati pre-STT
- **Audio output routing:** selezione dispositivo audio (cuffie vs casse)

### 10.6 Pillastro 6: Frontend & UX
- **Settings UI:** pannello Electron per configurare API key, soglie, voci, tool attivi
- **Multi-screen:** supporto monitor multipli per screen capture
- **Overlay mode:** finestra sempre-on-top trasparente (non solo fullscreen)
- **Touch support:** per tablet / touch screen
- **Tema:** toggle light/dark/custom (attualmente solo dark futuristica)

### 10.7 Pillastro 7: VS Code Extension Evoluta
- **Inline completion:** integrazione con GitHub Copilot-like o LLM locale per autocomplete
- **Chat panel:** webview sidebar con chat interattiva Jarvis
- **Code action provider:** quick fix generati da LLM
- **Debug assistant:** analisi stack trace automatica + suggerimento fix

### 10.8 Pillastro 8: Security & Privacy
- **Cifratura memoria:** SQLite cifrato (SQLCipher) per conversazioni sensibili
- **Local-first mode:** opzione per disattivare completamente API cloud (solo Ollama + Piper)
- **Audit log:** tracciamento di ogni azione eseguita da Jarvis
- **Whitelisting tool:** conferma utente per tool pericolosi (shell, file delete, ecc.)

---

## 11. NOTE CRITICHE PER LO SVILUPPO

1. **Windows-centric:** Molti tool usano `start`, `winsound`, path Windows. Se si vuole cross-platform serve astrazione OS.
2. **Electron security:** `nodeIntegration: true` e `contextIsolation: false` sono comodi ma pericolosi. Per produzione usare `preload.js` + `contextBridge`.
3. **PyAudio fragile:** Installazione su Windows è notoriamente problematica (wheel non sempre disponibile). Considerare `sounddevice` + `soundfile` o `pyaudio` tramite `pipwin`.
4. **Deepgram streaming:** La SDK v3 è usata. La v4 ha breaking changes. Se si aggiorna, refactor di `deepgram_stt.py`.
5. **Ollama coupling:** Il router dipende da Ollama in locale. Se Ollama non gira, il routing cade nel fallback ma non ha graceful degradation avanzata.
6. **Hardcoded persona:** La personalità J.A.R.V.I.S. è scritta in stringhe nel codice. Estrarre in file di configurazione per permettere custom persona.
7. **Session timeout:** `SESSION_TIMEOUT = 10s` è corto. Per conversazioni naturali, aumentare a 60-120s o rendere adattivo.
8. **No test:** Aggiungere test PRIMA di ogni refactor massiccio.

---

## 12. CHECKLIST MIGRAZIONE

- [ ] Sostituire `print` con logging strutturato
- [ ] Creare `config.yaml` con validazione Pydantic
- [ ] Implementare `.env` loader + secrets manager
- [ ] Refactor `execute_tool()` in dispatcher dinamico con schema
- [ ] Aggiungere ChromaDB/Qdrant per RAG memoria
- [ ] Implementare function calling Anthropic (tool use nativo)
- [ ] Aggiungere APScheduler per task proattivi
- [ ] Implementare TTS streaming (chunk progressivi)
- [ ] Aggiungere preload.js e abilitare contextIsolation in Electron
- [ ] Aggiungere test suite pytest (coverage > 70%)
- [ ] Creare plugin loader dinamico
- [ ] Aggiungere UI settings in Electron
- [ ] Implementare conferma utente per tool pericolosi
- [ ] Aggiungere supporto multi-monitor screen capture
- [ ] Cifrare SQLite episodic.db
- [ ] Documentare API WebSocket con OpenAPI/AsyncAPI

---

**Fine del brief.**

*Signore, questo è tutto ciò che c'è da sapere sulla base attuale. Ora tocca a voi costruirci sopra qualcosa di leggendario.* ⚡
