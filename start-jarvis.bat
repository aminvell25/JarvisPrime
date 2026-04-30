@echo off
chcp 65001 >nul
title J.A.R.V.I.S. Prime - Avvio
echo.
echo ╔═══════════════════════════════════════════╗
echo ║   J.A.R.V.I.S. Prime v1.0.0              ║
echo ║   Signore, attenda...                     ║
echo ╚═══════════════════════════════════════════╝
echo.

:: === CONFIGURAZIONE ===
set "JARVIS_DIR=C:\Applicazioni GAME\jarvis-prime"
set "ANTHROPIC_API_KEY=la-tua-chiave-qui"
set "DEEPGRAM_API_KEY=la-tua-chiave-qui"

:: === 1. AVVIA OLLAMA ===
echo [1/4] Avvio Ollama (LLM locale)...
start /min "Ollama" powershell -NoProfile -WindowStyle Hidden -Command "ollama serve 2>$null"
timeout /t 2 /nobreak >nul

:: === 2. AVVIA BACKEND ===
echo [2/4] Avvio Backend FastAPI...
start /min "JARVIS Backend" powershell -NoProfile -Command "Set-Location -LiteralPath '%JARVIS_DIR%'; $env:ANTHROPIC_API_KEY='%ANTHROPIC_API_KEY%'; $env:DEEPGRAM_API_KEY='%DEEPGRAM_API_KEY%'; py -m backend.main"
timeout /t 4 /nobreak >nul

:: === 3. VERIFICA BACKEND ===
echo [3/4] Verifica connessione backend...
powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://localhost:8000/health' -TimeoutSec 5 -ErrorAction SilentlyContinue).StatusCode" >nul 2>&1
if %errorlevel% neq 0 (
    echo Backend non pronto, attendo ulteriori 3 secondi...
    timeout /t 3 /nobreak >nul
)

:: === 4. AVVIA FRONTEND ===
echo [4/4] Avvio Frontend Electron...
cd /d "%JARVIS_DIR%\frontend"
npm start

echo.
echo ╔═══════════════════════════════════════════╗
echo ║   J.A.R.V.I.S. Prime avviato             ║
echo ║   Signore, sono ai suoi ordini.           ║
echo ╚═══════════════════════════════════════════╝
pause
