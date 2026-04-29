# ROADMAP CONSIGLIATA — Prossimi 3 Step

## STEP 1 — Fix stabilità (prima di tutto)
- [ ] Fix import Three.js (bundler Vite o importmap)
- [ ] Fix TTS WAV vs PCM path
- [ ] Fix AudioContext sampleRate
- [ ] Aggiungere preload.js + contextIsolation
- [ ] ScriptProcessorNode → AudioWorklet
- [ ] Heartbeat WebSocket
- [ ] Cleanup WebGL dispose

## STEP 2 — Orb ibrido (quello che chiedi tu)
- [ ] Mantieni orb shader centrale
- [ ] Aggiungi particle cloud esterna (1500-2000 particelle sferiche)
- [ ] Aggiungi linee di connessione tra particelle vicine
- [ ] Aggiungi elettroni che viaggiano sulle linee (solo THINKING)
- [ ] Fai reagire particelle a bass/mid del TTS
- [ ] Aggiungi depth breathing Z-axis
- [ ] Aggiungi tumble su cambio stato

## STEP 3 — Produttizzazione
- [ ] Build .exe con electron-builder
- [ ] Suoni professionali (sostituire WAV generati)
- [ ] Google Calendar API reale
- [ ] News RSS (Hacker News, Reddit, gaming)
- [ ] Piper fallback offline integrato

---

# PROMPT PRONTI PER KIMI VS CODE

Copia e incolla questi prompt nell'estensione Kimi 2.6 del tuo VS Code. Ogni prompt è isolato e pronto.

## PROMPT 1 — Fix AudioWorklet + ScriptProcessor

Nel progetto JARVIS Prime in frontend/renderer.js, sostituisci ScriptProcessorNode (deprecato) con AudioWorklet.
Crea un nuovo file frontend/audio-worklet.js con un AudioWorkletProcessor che:
1. Riceve audio a 48kHz (o qualsiasi sample rate del dispositivo)
2. Fa resampling a 16kHz con interpolazione lineare
3. Converte Float32 in Int16
4. Invia il buffer via postMessage al thread principale
In renderer.js, registra il worklet con audioCtx.audioWorklet.addModule('./audio-worklet.js').
Mantieni tutto il resto del codice invariato.

## PROMPT 2 — Fix Three.js Import (Bundler)

Nel progetto JARVIS Prime, configura Vite come bundler per il frontend Electron.
1. Crea frontend/vite.config.ts con base: './', build: { outDir: 'dist', emptyOutDir: true }
2. Sposta renderer.js in src/renderer.ts (TypeScript opzionale ma consigliato)
3. Cambia import * as THREE from 'three' (invece del path relativo a node_modules)
4. Aggiungi "type": "module" in package.json se manca
5. Crea script npm "build": "vite build" e "dev": "vite"
Non modificare la logica dell'orb, solo l'infrastruttura di build.

## PROMPT 3 — Fix TTS Audio Path (WAV vs PCM)

Nel progetto JARVIS Prime in frontend/renderer.js, separa nettamente il path WAV dal path PCM.
La funzione playTTSBase64(payload, format, sr) deve:
1. Se format === 'wav': fare decodeAudioData su ArrayBuffer, poi buffer source
2. Se format === 'linear16': convertire base64 → Uint8Array → Int16Array → Float32Array, poi createBuffer
NON passare mai un WAV container alla funzione playTTS() che fa Int16Array(pcm).
Aggiungi validazione: se i primi 4 byte sono "RIFF", è WAV, usa decodeAudioData.
Mantieni tutto il resto invariato.

## PROMPT 4 — Aggiungi Particle Cloud + Linee (stile ethan)

Nel progetto JARVIS Prime in frontend/renderer.js, aggiungi un sistema particellare esterno all'orb esistente.
REQUISITI:
1. 1500 particelle in distribuzione sferica (raggio iniziale 3.5) attorno all'orb centrale
2. Ogni particella ha velocità propria, phase random, damping 0.992
3. Linee di connessione tra particelle vicine (distanza < 6) usando LineSegments
4. Max 4000 linee per frame per performance
5. Elettroni bianchi (max 3 alive) che viaggiano lungo linee attive, velocità 0.003-0.006
6. Le particelle reagiscono al bass audio (espansione su bass > 0.05)
7. Colore particelle: #4ca8e8 (cyan), additive blending
8. Il sistema ruota insieme all'orb esistente
NON modificare l'orb shaderizzato centrale (è già perfetto).
NON modificare HUD o WebSocket.

## PROMPT 5 — Aggiungi Depth Breathing + Tumble

Nel progetto JARVIS Prime in frontend/renderer.js, aggiungi due effetti:
1. DEPTH BREATHING: il gruppo completo orb+particelle si muove in Z con sinusoide:
   - IDLE: Math.sin(t * 0.12) * 8
   - THINKING: Math.sin(t * 0.3) * 15 + Math.sin(t * 0.9) * 6
   - SPEAKING: Math.sin(t * 0.15) * 6 - bass * 10
   Applica cloudZ a scene.position.z o a un Group parent.
2. TUMBLE ON STATE CHANGE: quando curState cambia, applica rotazione caotica temporanea:
   - spinX += 0.012 * sin(t*1.7) * transitionEnergy
   - spinY += 0.015 * transitionEnergy
   - decay di transitionEnergy per 0.985 ogni frame
   Dura circa 2-3 secondi.
Mantieni tutto il resto invariato.

## PROMPT 6 — Electron Preload + ContextIsolation

Nel progetto JARVIS Prime, aggiungi sicurezza Electron.
1. Crea frontend/preload.js che espone via contextBridge:
   - window.electronAPI.sendAudio(buffer)
   - window.electronAPI.onMessage(callback)
2. Modifica main.js (se esiste) o crea frontend/main.ts:
   - nodeIntegration: false
   - contextIsolation: true
   - preload: path.join(__dirname, 'preload.js')
3. Se renderer.js usa require('fs') o process, sposta in preload
Non rompere la comunicazione WebSocket esistente.
