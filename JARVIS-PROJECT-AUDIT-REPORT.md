# J.A.R.V.I.S. Prime - Project Audit Report

Data audit: 2026-05-01  
Workspace: `C:\Applicazioni GAME\jarvis-prime`  
Obiettivo: verificare funzionamento, stabilita, latenza, UI stile JARVIS/orb, sicurezza, dipendenze, elementi deprecati e prossimi interventi.

## 1. Executive Summary

Il progetto ha una base buona per un assistente locale/cloud in stile JARVIS: frontend Electron + Three.js, orb shaderizzato, WebSocket separati per comandi e audio, router locale Ollama, STT Deepgram, TTS Piper/Deepgram, memoria SQLite e bridge VS Code.

Pero, nello stato attuale, non lo considererei ancora "pronto produzione" ne "latenza bassissima". Il rischio maggiore non e l'interfaccia: l'orb e gia convincente. I problemi veri sono pipeline voce bloccante, startup fragile, fallback frontend da fresh clone, alcune API deprecate/vecchie, sicurezza Electron e bug runtime piccoli ma letali.

Aggiornamento post-fix 2026-05-01:

- Risolto bug `random` in `MoodTracker`.
- Aggiunto endpoint `/health` e aggiornato `start-jarvis.bat`.
- Spostati router LLM, chiamate Claude e TTS sincrono fuori dall'event loop con `asyncio.to_thread()`.
- Consumati eventi Deepgram interim/final/utterance_end e inoltrati al frontend.
- Aggiunto barge-in frontend con stop effettivo delle sorgenti TTS.
- Aggiunto analyser TTS separato per orb speech-reactive sulla voce JARVIS.
- Ridotta dimensione chunk AudioWorklet per abbassare latenza microfono -> backend.
- Reso `npm start` affidabile tramite build Vite prima di Electron.
- Aggiornati Electron a `41.3.0` ed electron-builder a `26.8.1`; `npm audit` frontend ora segnala 0 vulnerabilita.
- Build `npm run dist` completata con successo su Windows.

Verdetto sintetico:

| Ambito | Stato | Nota |
|---|---:|---|
| Orb / visual JARVIS | 8/10 | Shader + particelle buoni, serve ottimizzazione e audio-reactivity reale |
| Backend runtime | 6/10 | Compila, ma ha bug `random`, blocchi sincroni e STT interim non consumati |
| Latenza voce | 4/10 | Non streaming end-to-end; TTS e LLM aspettano risposta completa |
| Electron packaging | 5/10 | Build passa, ma Electron 28 e vecchio e `npm start` dipende da `dist` locale |
| Sicurezza | 5/10 | `contextIsolation` ok, ma mancano CSP, navigation guard, update Electron |
| Manutenibilita | 5/10 | Troppa logica in `renderer.js` e `backend/main.py` |
| Stato Git | 7/10 | Branch allineato, restano 2 modifiche locali da decidere |

## 2. Stato Repository

`main` e allineato con `origin/main`.

Modifiche locali ancora presenti:

- `frontend/main.cjs` modificato localmente.
- `frontend/test-electron.cjs` untracked.

Questi due file vanno decisi: committarli, integrarli meglio o eliminarli. Non sono stati inclusi negli ultimi commit.

Build artifact Electron ora ignorati correttamente da `.gitignore`.

## 3. Verifiche Eseguite

| Check | Risultato |
|---|---|
| `py -m compileall -q backend` | OK |
| Import runtime Python principali | OK |
| `py -m pip check` | KO: `resemblyzer` richiede `typing` e `webrtcvad` non installati |
| `npm run build -- --emptyOutDir=false` in `frontend` | OK |
| `npm ls --depth=0` in `frontend` | OK |
| `npm audit --json` in `frontend` | 10 vulnerabilita: 4 low, 6 high |
| `npm run compile -- --noEmit` in `vscode-extension` | OK |
| `npm audit --json` in `vscode-extension` | OK, 0 vulnerabilita |
| `ollama list` | `llama3.1:8b` presente |
| Modello Piper locale | `it_IT-riccardo-x_low.onnx` presente |

## 4. Architettura Attuale

### Backend

- `backend/main.py`: orchestrazione FastAPI, WebSocket, audio, STT, LLM, TTS, tool.
- `backend/audio/*`: wake word, clap, VAD, Deepgram STT, Piper/Deepgram TTS.
- `backend/llm/*`: router Ollama + client Anthropic.
- `backend/tools/*`: system/app/Obsidian/screen/VS Code bridge.
- `backend/brain/*`: memoria sessione + SQLite + Obsidian.
- `backend/personality/*`: mood e banter.

### Frontend

- `frontend/main.cjs`: processo Electron.
- `frontend/index.html`: HUD + canvas.
- `frontend/src/renderer.js`: Three.js orb, audio capture, WebSocket, TTS playback, state UI.
- `frontend/public/audio-worklet.js`: resampling microfono a 16 kHz.
- `frontend/public/sounds/*.wav`: suoni UI.

### VS Code Extension

- `vscode-extension/src/extension.ts`: WebSocket server su porta `9001`, comandi insert/replace/diagnostics.

## 5. Findings Critici

### P0-1: `MoodTracker.should_banter()` rompe a runtime

File: `backend/personality/mood_tracker.py:57-58`

`should_banter()` usa `random.random()`, ma `random` non e importato. Al primo input che passa da `banter.detect()` puo arrivare un `NameError`.

Fix consigliato:

```python
import random
```

oppure iniettare un RNG testabile.

### P0-2: `npm start` non e affidabile su fresh clone

File: `frontend/main.cjs:32-37`, `frontend/index.html:121`, `frontend/src/renderer.js:25`

Electron carica `frontend/dist/index.html` se esiste, altrimenti `frontend/index.html`. Il file sorgente importa `three` con bare import:

```js
import * as THREE from 'three';
```

Questo funziona dopo Vite build, ma non quando Electron carica direttamente `index.html` da `file://`. Su una macchina pulita senza `frontend/dist`, `npm start` rischia di aprire UI vuota/errore modulo.

Fix consigliato:

- cambiare script `start` in `npm run build && electron .`; oppure
- creare script `dev:electron` con Vite dev server; oppure
- eliminare fallback raw e mostrare errore esplicito se manca `dist`.

### P0-3: TTS blocca il loop async

File: `backend/audio/tts_engine.py:20-37`, `backend/main.py:321`, `backend/main.py:390`, `backend/main.py:402`

`tts.speak()` usa `subprocess.run()` e `requests.post()` sincroni. Viene chiamato dentro coroutine FastAPI. Durante TTS, il loop puo non processare WebSocket/audio/HUD con fluidita.

La documentazione Python consiglia `asyncio.to_thread()` per spostare I/O bloccante fuori dall'event loop quando una chiamata sincrona lo bloccherebbe: https://docs.python.org/3.12/library/asyncio-task.html#asyncio.to_thread

Fix consigliato:

```python
pcm = await asyncio.to_thread(tts.speak, text)
```

Meglio ancora: TTS streaming con chunk audio inviati appena pronti.

### P0-4: STT interim non viene mai inoltrato al frontend

File: `backend/audio/deepgram_stt.py:11`, `backend/audio/deepgram_stt.py:24-28`, `backend/main.py:211-230`

`DeepgramSTT` mette eventi in `self.queue`, ma `ws_audio()` non consuma mai quella queue. Quindi:

- `transcript_interim` nel frontend esiste ma quasi mai arriva.
- `UtteranceEnd` non guida la fine turno.
- La fine parlato dipende da VAD locale/timeout.

Deepgram documenta interim results e endpointing per feedback realtime e rilevamento pause: https://developers.deepgram.com/docs/understand-endpointing-interim-results

Fix consigliato:

- creare task consumer queue quando parte STT;
- broadcastare `transcript_interim`;
- concludere turno su `speech_final`/`UtteranceEnd`;
- usare `endpointing=300` o valore calibrato.

### P0-5: Barge-in backend incompleto lato frontend

File: `backend/main.py:167-173`, `frontend/src/renderer.js:306-324`

Backend invia:

```json
{"type": "barge_in", "action": "stop_tts"}
```

Ma il frontend non ha `case 'barge_in'`. Inoltre `playTTSBase64()` non conserva riferimenti ai `AudioBufferSourceNode`, quindi non puo fermare l'audio gia in riproduzione.

Fix consigliato:

- aggiungere `case 'barge_in'`;
- mantenere `currentTtsSources`;
- su barge-in chiamare `source.stop()` e pulire lista;
- riportare orb a `LISTENING`.

### P0-6: Electron 28 ha vulnerabilita note nel tuo audit npm

File: `frontend/package.json:16`

`npm audit` segnala vulnerabilita dirette su `electron@28.3.3` e `electron-builder@24.13.3`. `npm view` oggi riporta:

- `electron`: `41.3.0`
- `electron-builder`: `26.8.1`

Le release ufficiali Electron mostrano Electron `41.3.0` stabile al 2026-04-22 con Chromium `146.0.7680.188` e Node `24.15.0`: https://releases.electronjs.org/release?channel=stable

Electron raccomanda di tenere il framework aggiornato per ridurre vulnerabilita di Chromium/Node: https://www.electronjs.org/docs/latest/tutorial/security#16-use-a-current-version-of-electron

Fix consigliato:

- aggiornare prima a una major intermedia se serve, poi a Electron 41;
- aggiornare `electron-builder` a 26.x;
- testare permessi microfono, packaging, ASAR e preload.

## 6. Findings Alti

### P1-1: `@app.on_event("startup")` e deprecato

File: `backend/main.py:433`

FastAPI indica `lifespan` come modalita raccomandata; gli eventi alternativi sono deprecati: https://fastapi.tiangolo.com/advanced/events/#alternative-events-deprecated

Fix consigliato:

- migrare startup/shutdown a `lifespan`;
- chiudere correttamente VS Code bridge, task bus, loop proattivo.

### P1-2: Router Ollama blocca e non streamma

File: `backend/llm/router.py:23-26`, `backend/main.py:291`

`requests.post(..., timeout=8)` dentro `process_input()` blocca il loop. Inoltre `stream: False` aumenta latenza percepita.

Fix consigliato:

- spostare router in `asyncio.to_thread()` o usare client async;
- considerare regole deterministic/regex per comandi rapidi;
- usare streaming solo quando serve LLM.

### P1-3: Client Claude non streamma

File: `backend/llm/anthropic_client.py:38-42`

Il codice aspetta l'intera risposta prima di inviare testo/TTS. Anthropic documenta streaming SSE per ricevere incrementi di testo: https://platform.claude.com/docs/en/build-with-claude/streaming

Fix consigliato:

- aggiungere `ask_stream()`;
- mandare token al frontend per typewriter live;
- inviare frasi complete al TTS streaming.

Nota: non ho modificato ne contestato i model id in `config.py`, come richiesto.

### P1-4: TTS non e veramente audio-reactive

File: `frontend/src/renderer.js:404-416`, `frontend/src/renderer.js:273-291`

`getAudioBands()` legge `analyser`, ma l'analyser e collegato al microfono, non all'output TTS. Durante `SPEAKING`, l'orb reagisce al microfono/ambiente, non alla voce JARVIS.

Fix consigliato:

- creare `ttsAnalyser`;
- connettere ogni TTS source a `ttsAnalyser` e poi destination;
- in stato `SPEAKING`, usare bande del TTS analyser.

### P1-5: AudioWorklet chunk troppo grande per latenza minima

File: `frontend/public/audio-worklet.js:10-12`

`targetSize = 4096` campioni al sample rate nativo. A 48 kHz sono circa 85 ms prima di inviare un chunk; poi c'e resampling, WebSocket, VAD, wake, Deepgram.

AudioWorklet e la scelta giusta: MDN indica che `ScriptProcessorNode` e deprecato e sostituito da AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode/audioprocess_event

Fix consigliato per bassa latenza:

- provare `targetSize = 1024` o `2048`;
- misurare CPU/packet overhead;
- inviare chunk 20-40 ms a 16 kHz quando possibile.

### P1-6: VS Code bridge non riconnette

File: `backend/tools/vscode_bridge.py:10-19`, `backend/main.py:435`, `vscode-extension/src/extension.ts:7-14`

Il backend tenta `connect()` una sola volta all'avvio. Se VS Code parte dopo, il bridge resta muto. `send()` ignora il caso disconnesso.

Fix consigliato:

- `ensure_connected()` prima di ogni `send`;
- retry/backoff;
- ping/pong;
- gestione close/error.

### P1-7: Script startup verifica endpoint inesistente

File: `start-jarvis.bat:26-31`

Lo script verifica `http://localhost:8000`, ma il backend non definisce `GET /`. FastAPI potrebbe rispondere 404, e lo script interpreta male la prontezza.

Fix consigliato:

```python
@app.get("/health")
def health():
    return {"ok": True}
```

Poi lo script deve chiamare `/health`.

### P1-8: Sicurezza Electron incompleta

Elementi buoni:

- `nodeIntegration: false` in `frontend/main.cjs:17`.
- `contextIsolation: true` in `frontend/main.cjs:18`.
- `preload` separato in `frontend/main.cjs:19`.

Mancano:

- Content Security Policy in `index.html`.
- blocco navigazione esterna.
- blocco `window.open`.
- validazione sender IPC.
- sandbox esplicito.

Electron segnala che XSS e navigazioni non controllate hanno impatto maggiore nelle app desktop: https://www.electronjs.org/docs/latest/tutorial/security

## 7. Findings Medi

### P2-1: `play_sound()` e morto e punta al path vecchio

File: `backend/main.py:89-91`

TODO cita `frontend/sounds/`, ma i suoni sono ora in `frontend/public/sounds/`. La funzione non viene usata.

### P2-2: `StateMachine.transition()` pubblica evento sbagliato

File: `backend/core/state_machine.py:37-39`

Ogni transizione non-ALERT pubblica `THINKING_STARTED`, anche `IDLE`, `LISTENING`, `SPEAKING`. Questo rende l'event bus semanticamente poco affidabile.

### P2-3: `EmotionDetector` e istanziato ma inutilizzato

File: `backend/main.py:80`, `backend/audio/emotion_detector.py`

Puo diventare utile per TTS speed/tone, ma al momento non incide su mood o risposta.

### P2-4: Memoria non entra nel prompt

File: `backend/brain/memory_manager.py`, `backend/main.py:309-315`

`memory.add_turn()` conserva sessione in RAM, ma `memory.get_context()` non viene passato a Claude/Ollama. SQLite episodico e presente ma non usato per conversazioni ordinarie.

### P2-5: Deepgram fallback TTS usa voce inglese

File: `backend/audio/tts_engine.py:43`

Fallback:

```text
model=aura-asteria-en
```

Per un assistente italiano maschile, il fallback rischia voce/lingua non coerente. Deepgram offre streaming TTS Aura via WebSocket e REST audio streaming: https://developers.deepgram.com/docs/streaming-text-to-speech

### P2-6: Intro music con path Windows locale

File: `backend/main.py:258-263`, `frontend/src/renderer.js:321-322`

Backend manda path filesystem assoluto. `new Audio(file)` nel renderer potrebbe non gestire bene path Windows raw con backslash/spazi. Meglio convertire a `file://` sicuro via preload o servire asset dal backend.

### P2-7: Docs/setup non allineati

File:

- `README.md:12`: cita ChromaDB, ma non c'e dipendenza/uso ChromaDB.
- `README.md:24`: dice `python backend/main.py`, ma il percorso corretto e `py -m backend.main`.
- `setup.py:51`: cita modello Piper `it_IT-giorgio-medium`, ma config usa `it_IT-riccardo-x_low`.
- `setup.sh:42`: stesso problema avvio backend.

### P2-8: openWakeWord da calibrare

File: `backend/core/config.py:30-31`, `backend/audio/wake_word.py`

Config threshold `0.25`, mentre il progetto openWakeWord indica che i modelli inclusi sono addestrati per funzionare bene con default `0.5`, da calibrare per ambiente/use case: https://github.com/dscripka/openWakeWord

Con `0.25` avrai wake piu sensibile ma piu falsi positivi.

### P2-9: Three.js cleanup assente

File: `frontend/src/renderer.js`

Non e grave in fullscreen single-window, ma non c'e cleanup di geometrie/materiali/audio stream su chiusura o reload. Three.js specifica che risorse WebGL vanno liberate con `dispose()`: https://threejs.org/manual/en/cleanup.html

### P2-10: Particle connection loop costoso

File: `frontend/src/renderer.js:449-465`

Il loop connessioni e O(n^2) su subset step=3. Su RTX 3080 va bene; su laptop meno potente potrebbe scendere di frame. Miglioria: spatial grid / k-nearest / aggiornare linee ogni 2-3 frame.

## 8. Elementi Buoni

- Orb shaderizzato con fresnel/noise: buona base estetica JARVIS.
- Particle cloud e linee danno identita visiva tecnica.
- AudioWorklet gia usato: scelta moderna rispetto a ScriptProcessor.
- WebSocket separati per comandi e audio: architettura pulita.
- Vite build funzionante e `base: './'` corretto per Electron packaged.
- `contextIsolation` e `nodeIntegration: false` gia impostati.
- Suoni spostati in `frontend/public/sounds` e build extraResources corretta.
- Piper locale presente: utile per privacy e fallback offline.
- Ollama locale presente: router locale riduce roundtrip cloud per decisioni semplici.
- VS Code extension compila e ha audit pulito.
- `.gitignore` ora pulito e build outputs ignorati.

## 9. Roadmap Per Orb JARVIS + Latenza Bassissima

### Fase 1 - Stabilita immediata

1. Fix `import random` in `MoodTracker`.
2. Rendere `npm start` robusto: build automatico o dev server.
3. Aggiungere `/health` e usare quello nello script.
4. Committare/risolvere `frontend/main.cjs` e `frontend/test-electron.cjs`.
5. Consumare queue Deepgram e inviare interim al frontend.

### Fase 2 - Latenza percepita sotto controllo

Target realistico:

| Segmento | Target |
|---|---:|
| Audio chunk browser -> backend | 20-40 ms |
| Wake/clap detection | 80-150 ms |
| STT partial/interim | 200-500 ms |
| End-of-speech | 300-700 ms dopo pausa |
| LLM first token | 300-1000 ms, dipende dal modello |
| TTS first audio | 200-700 ms |

Interventi:

- Ridurre `targetSize` AudioWorklet.
- Usare Deepgram interim + endpointing.
- Usare Anthropic streaming oppure Ollama streaming.
- Mandare testo al frontend prima del TTS completo.
- Usare Deepgram streaming TTS o Piper persistente/non subprocess per frase.
- Usare `asyncio.to_thread()` finche restano componenti sincroni.

### Fase 3 - Audio e barge-in veri

1. Tracciare e fermare `AudioBufferSourceNode`.
2. Connettere TTS a analyser separato.
3. Implementare `barge_in` lato frontend.
4. Aggiungere cancellazione task TTS/LLM quando l'utente interrompe.

### Fase 4 - Sicurezza e packaging

1. Upgrade Electron/electron-builder.
2. CSP in `index.html`.
3. Bloccare navigation/window.open.
4. Validare IPC sender.
5. Valutare protocollo custom invece di `file://`.

## 10. Tecnologie Da Aggiornare

| Tecnologia | Attuale | Ultima vista | Priorita |
|---|---:|---:|---|
| Electron | 28.3.3 | 41.3.0 | Alta |
| electron-builder | 24.13.3 | 26.8.1 | Alta |
| Vite | 8.0.10 | 8.0.10 | OK |
| Three.js | 0.160.1 | 0.184.0 | Media, testare shader/API |
| Deepgram STT | nova-2 | docs spingono Nova-3 per nuovi use case | Media |
| Piper rhasspy | repo archiviato | sviluppo spostato a OHF-Voice/piper1-gpl | Media |

Fonte Piper: repo archiviato il 2025-10-06 e sviluppo spostato: https://github.com/rhasspy/piper

Vite 8 usa `^8.0.0`; la migration ufficiale indica il passaggio a Vite 8 e deprecazioni su optimizer esbuild options: https://vite.dev/guide/migration.html

## 11. Note Per Interfaccia JARVIS Migliore

L'interfaccia ha gia forma e atmosfera. Per farla sembrare "viva" come JARVIS:

- Stato `LISTENING`: visualizzare input audio reale, non solo state color.
- Stato `THINKING`: linee/elettroni piu frequenti, ma non sempre al massimo.
- Stato `SPEAKING`: mouthless speech-reactivity su TTS analyser.
- HUD: aggiungere piccole righe diagnostiche transienti: STT confidence, model, latency ms.
- Aggiungere profiler interno: `wake_ms`, `stt_ms`, `llm_first_token_ms`, `tts_first_audio_ms`.
- Evitare troppi popup/testi: JARVIS deve sembrare operativo, non una dashboard rumorosa.

## 12. Prossimi Commit Consigliati

### Commit 1: stabilita runtime

- `import random` in mood tracker.
- `/health`.
- `npm start` robusto.
- docs setup minime allineate.

Messaggio:

```text
fix: stabilize startup and banter runtime
```

### Commit 2: low latency STT

- consumare queue Deepgram;
- broadcast interim;
- endpointing;
- ridurre chunk AudioWorklet.

Messaggio:

```text
feat: stream interim speech results with lower audio latency
```

### Commit 3: TTS/barge-in reale

- `asyncio.to_thread` per TTS;
- frontend `barge_in`;
- source tracking;
- TTS analyser.

Messaggio:

```text
feat: add interruptible tts and speech-reactive orb
```

### Commit 4: Electron security upgrade

- Electron/electron-builder upgrade;
- CSP;
- navigation/window open guard;
- IPC validation.

Messaggio:

```text
chore: upgrade electron and harden renderer security
```

## 13. Conclusione

La direzione e giusta. Il progetto non ha bisogno di "piu feature" ora; ha bisogno di trasformare una demo molto bella in una pipeline realtime robusta.

La priorita assoluta e: stabilita startup, STT interim, TTS non bloccante, barge-in vero, Electron aggiornato. Dopo questi interventi l'orb potra sembrare davvero reattivo, non solo animato.

Fonti principali consultate:

- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron releases: https://releases.electronjs.org/release?channel=stable
- FastAPI lifespan: https://fastapi.tiangolo.com/advanced/events/
- MDN ScriptProcessor deprecato: https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode/audioprocess_event
- Deepgram endpointing/interim: https://developers.deepgram.com/docs/understand-endpointing-interim-results
- Deepgram streaming TTS: https://developers.deepgram.com/docs/streaming-text-to-speech
- Deepgram audio output streaming: https://developers.deepgram.com/docs/streaming-the-audio-output
- Anthropic streaming: https://platform.claude.com/docs/en/build-with-claude/streaming
- Python `asyncio.to_thread`: https://docs.python.org/3.12/library/asyncio-task.html#asyncio.to_thread
- Three.js cleanup: https://threejs.org/manual/en/cleanup.html
- Vite migration: https://vite.dev/guide/migration.html
- openWakeWord: https://github.com/dscripka/openWakeWord
- Piper: https://github.com/rhasspy/piper
