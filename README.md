# J.A.R.V.I.S. Prime

Assistente AI personale ispirato a J.A.R.V.I.S. dell'MCU.

## Architettura
- **Backend**: Python/FastAPI + Dual WebSocket
- **Frontend**: Electron + Three.js Orb
- **LLM**: Llama 3.1 (router locale) + Claude Haiku/Sonnet
- **STT**: Deepgram Nova-2 streaming
- **TTS**: Piper Giorgio (italiano) + Deepgram Aura fallback
- **Vision**: Screen capture on-demand
- **Memory**: SQLite + ChromaDB + Obsidian Vault

## Setup
```bash
python setup.py
```

## Avvio
```powershell
# Terminal 1
$env:ANTHROPIC_API_KEY="..."
$env:DEEPGRAM_API_KEY="..."
python backend/main.py

# Terminal 2
cd frontend
npm start
```

## VS Code Extension
```bash
cd vscode-extension
npm run compile
# Poi F5 in VS Code per debug, o vsce package per installare
```

## Proprietario
Amine — Signore
