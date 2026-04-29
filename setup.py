#!/usr/bin/env python3
"""J.A.R.V.I.S. Prime — Setup"""
import subprocess
import sys
import os
from pathlib import Path

print("⚡ J.A.R.V.I.S. Prime Setup")
print("Signore, inizio installazione...")

# Python deps
print("📦 Installo dipendenze Python...")
subprocess.run([sys.executable, "-m", "pip", "install", "-r", "backend/requirements.txt"])

# Ollama
print("🧠 Verifico Ollama...")
try:
    subprocess.run(["ollama", "pull", "llama3.1:8b"], check=True)
except Exception:
    print("⚠️  Ollama non trovato o llama3.1 non installato. Scaricalo da https://ollama.com")

# Frontend
print("🖥️  Installo frontend...")
os.chdir("frontend")
subprocess.run(["npm", "install"])
os.chdir("..")

# VS Code Extension
print("💻 VS Code Extension...")
os.chdir("vscode-extension")
subprocess.run(["npm", "install"])
subprocess.run(["npm", "run", "compile"])
os.chdir("..")

# Dirs
Path("memory").mkdir(exist_ok=True)
Path("logs").mkdir(exist_ok=True)
Path("models").mkdir(exist_ok=True)
Path.home().joinpath("Music", "JarvisIntro").mkdir(parents=True, exist_ok=True)
Path.home().joinpath("Documents", "JarvisVault").mkdir(parents=True, exist_ok=True)

print("")
print("✅ Setup completato, Signore.")
print("")
print("Prossimi passi:")
print("1. Esporta le API key:")
print("   $env:ANTHROPIC_API_KEY='sk-ant-...'")
print("   $env:DEEPGRAM_API_KEY='...'")
print("2. Scarica il modello Piper TTS:")
print("   https://github.com/rhasspy/piper/releases")
print("   Modello: it_IT-giorgio-medium")
print("   Mettilo in ./models/")
print("3. Avvia il backend: python backend/main.py")
print("4. Avvia il frontend: cd frontend && npm start")
print("5. Installa l'estensione VS Code: cd vscode-extension && vsce package")
print("")
print("J.A.R.V.I.S. è pronto.")
