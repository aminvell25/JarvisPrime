#!/usr/bin/env bash
# J.A.R.V.I.S. Prime — Setup Script

echo "⚡ J.A.R.V.I.S. Prime Setup"
echo "Signore, inizio installazione..."

# Python backend
echo "📦 Installo dipendenze Python..."
pip install fastapi uvicorn websockets anthropic deepgram-sdk openwakeword pyaudio numpy requests psutil Pillow mss

# Ollama
echo "🧠 Verifico Ollama..."
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama non trovato. Installalo da https://ollama.com"
else
    ollama pull llama3.1:8b
fi

# Frontend
echo "🖥️  Installo frontend..."
cd frontend
npm install
cd ..

# VS Code Extension
echo "💻 VS Code Extension..."
cd vscode-extension
npm install
npm run compile
cd ..

# Dirs
mkdir -p memory logs

echo ""
echo "✅ Setup completato, Signore."
echo ""
echo "Prossimi passi:"
echo "1. Esporta le API key:"
echo "   export ANTHROPIC_API_KEY='sk-ant-...'"
echo "   export DEEPGRAM_API_KEY='...'"
echo "2. Avvia il backend: python backend/main.py"
echo "3. Avvia il frontend: cd frontend && npm start"
echo "4. Installa l'estensione VS Code: cd vscode-extension && vsce package"
echo ""
echo "J.A.R.V.I.S. è pronto."
