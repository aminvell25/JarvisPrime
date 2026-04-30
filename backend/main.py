"""
J.A.R.V.I.S. Prime — Backend Core
Proprietario: Amine | Signore
"""
import asyncio
import base64
import io
import json
import os
import random
import sys
import time
import traceback
import wave
from datetime import datetime
from pathlib import Path

import numpy as np
import pyaudio
import psutil
import websockets
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# Core
from backend.core.config import Config
from backend.core.event_bus import EventBus, JarvisEvent
from backend.core.state_machine import JarvisStateMachine, State

# Audio
from backend.audio.wake_word import WakeWordEngine
from backend.audio.clap_detector import ClapDetector
from backend.audio.vad import AdaptiveVAD
from backend.audio.emotion_detector import EmotionDetector
from backend.audio.barge_in import BargeInController
from backend.audio.deepgram_stt import DeepgramSTT
from backend.audio.tts_engine import TTSEngine

# LLM + Personality
from backend.llm.router import LLMRouter
from backend.llm.anthropic_client import JarvisLLM
from backend.personality.banter_engine import BanterEngine
from backend.personality.mood_tracker import MoodTracker

# Tools + Brain
from backend.tools.mcp_tools import MCPTools
from backend.tools.vscode_bridge import VSCodeBridge
from backend.tools.screen_capture import ScreenCapture
from backend.brain.memory_manager import MemoryManager
from backend.brain.obsidian_bridge import ObsidianBridge

# ============================================================
# INIT
# ============================================================
Config.ensure_dirs()
app = FastAPI(title="J.A.R.V.I.S. Prime", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"ok": True, "service": "jarvis-prime"}

# Componenti
bus = EventBus()
state_machine = JarvisStateMachine(bus)
mood = MoodTracker()
banter = BanterEngine()
memory = MemoryManager()
obsidian = ObsidianBridge(Config.VAULT_PATH)
tools = MCPTools(Config.VAULT_PATH)
vscode = VSCodeBridge()
screen = ScreenCapture()
router = LLMRouter(Config.OLLAMA_HOST, Config.OLLAMA_MODEL)
llm = JarvisLLM(Config.ANTHROPIC_API_KEY)
tts = TTSEngine(Config)
wake = WakeWordEngine()
clap = ClapDetector()
vad = AdaptiveVAD(
    Config.VAD_THRESHOLD,
    Config.SILERO_VAD_ENABLED,
    Config.SILERO_SPEECH_THRESHOLD,
    Config.SILERO_SILENCE_THRESHOLD,
    Config.SPEECH_START_FRAMES,
    Config.SPEECH_END_FRAMES,
)
emotion = EmotionDetector()
barge = BargeInController(Config.SESSION_TIMEOUT)

clients = set()
audio_clients = set()

# ============================================================
# SUONI FUTURISTICI (placeholder, sostituire con file reali)
# ============================================================
def play_sound(sound_type: str):
    """Riproduce suono di sistema. Su Windows usa winsound o pygame."""
    pass  # TODO: implementare con file WAV in frontend/sounds/

# ============================================================
# BROADCAST
# ============================================================
async def broadcast(msg: dict):
    dead = []
    for ws in clients:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)

async def broadcast_tts_audio(audio: bytes):
    if not audio:
        return
    fmt = "wav" if audio[:4] == b"RIFF" else "linear16"
    await broadcast({
        "type": "tts_chunk",
        "audio": base64.b64encode(audio).decode("ascii"),
        "format": fmt,
        "sample_rate": 24000
    })

def estimate_audio_duration(audio: bytes, fallback_sample_rate: int = 24000) -> float:
    if not audio:
        return 0.0
    if audio[:4] == b"RIFF":
        try:
            with wave.open(io.BytesIO(audio), "rb") as wf:
                rate = wf.getframerate() or fallback_sample_rate
                return wf.getnframes() / rate
        except Exception:
            return 0.0
    return len(audio) / 2 / fallback_sample_rate

def speech_energy_detected(pcm: np.ndarray) -> bool:
    energy = np.sqrt(np.mean(pcm.astype(np.float32) ** 2)) / 32768.0
    return energy > max(Config.VAD_THRESHOLD * 1.5, 0.025)

# ============================================================
# SOCKET B — Comandi + Risposte + UI State
# ============================================================
@app.websocket("/socket-b")
async def ws_cmd(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    print("Socket B connesso")

    try:
        while True:
            msg = await websocket.receive_json()

            if msg.get("type") == "mood_sync":
                pass
            elif msg.get("type") == "request_briefing":
                await do_briefing()
            elif msg.get("type") == "request_screen":
                await do_screen_analysis(msg.get("context", ""))
            elif msg.get("type") == "user_text":
                await process_input(msg.get("text", ""), websocket)

    except Exception as e:
        print(f"Socket B error: {e}")
    finally:
        clients.discard(websocket)
        print("Socket B disconnesso")

# ============================================================
# SOCKET A — Audio Binary Stream
# ============================================================
@app.websocket("/socket-a")
async def ws_audio(websocket: WebSocket):
    await websocket.accept()
    audio_clients.add(websocket)
    print("Socket A connesso")

    loop = asyncio.get_running_loop()
    stt = None
    buffer = []
    is_listening = False
    listen_started = 0.0
    last_wake_debug = 0.0
    best_wake_score = 0.0

    try:
        while True:
            data = await websocket.receive_bytes()
            pcm = np.frombuffer(data, dtype=np.int16)

            # Barge-in
            if barge.tts_playing and speech_energy_detected(pcm):
                interrupted = barge.on_user_speak()
                if interrupted:
                    await broadcast({"type": "barge_in", "action": "stop_tts"})
                    barge.on_tts_end()
                    state_machine.transition(State.LISTENING)

            # Clap / Wake detection
            if not is_listening and barge.should_require_wake_word():
                clap_result = clap.detect(pcm) if Config.CLAP_ENABLED else None
                wake_score = wake.predict(pcm)
                best_wake_score = max(best_wake_score, wake_score)
                now = time.time()
                if now - last_wake_debug > 5:
                    print(f"Wake debug: score={best_wake_score:.3f}, threshold={Config.WAKE_THRESHOLD:.2f}", flush=True)
                    best_wake_score = 0.0
                    last_wake_debug = now
                is_wake = wake_score > Config.WAKE_THRESHOLD

                if clap_result == "intro":
                    await do_intro_mode()
                    continue
                elif clap_result == "wake" or is_wake:
                    src = "voice" if is_wake else "clap"
                    await broadcast({"type": "wake", "source": src})
                    barge.on_user_speak()
                    is_listening = True
                    listen_started = time.time()
                    buffer = []
                    vad.reset()
                    stt = DeepgramSTT(Config.DEEPGRAM_API_KEY, loop)
                    try:
                        await stt.connect()
                    except Exception as e:
                        await broadcast({
                            "type": "system_alert",
                            "text": f"Deepgram STT non disponibile: {e}"
                        })
                        is_listening = False
                        stt = None
                    continue

            # Accumula audio
            if is_listening and stt:
                stt.send(data)
                buffer.append(pcm)

                should_finish = False
                while not stt.queue.empty():
                    event = stt.queue.get_nowait()
                    event_type = event.get("type")
                    event_text = event.get("text", "")
                    if event_type == "interim" and event_text:
                        await broadcast({"type": "transcript_interim", "text": event_text})
                    elif event_type == "final" and event_text:
                        await broadcast({"type": "transcript_interim", "text": event_text})
                    elif event_type == "utterance_end":
                        should_finish = True

                vad_finished = vad.process(pcm)
                if len(buffer) > 10 and vad_finished:
                    should_finish = True
                if time.time() - listen_started > Config.NO_SPEECH_TIMEOUT and not vad.is_speaking and not stt.final_transcript:
                    should_finish = True
                if time.time() - listen_started > Config.LISTENING_TIMEOUT:
                    should_finish = True

                if should_finish:
                    await stt.close()
                    text = stt.final_transcript
                    print(f"Listening ended: text_len={len(text)}, vad_score={vad.last_score:.3f}", flush=True)
                    if text:
                        await broadcast({"type": "transcript_final", "text": text})
                        await process_input(text, websocket)
                    else:
                        await broadcast({"type": "listening_timeout"})
                        state_machine.transition(State.IDLE)
                    is_listening = False
                    stt = None
                    buffer = []

    except Exception as e:
        print(f"Socket A error: {e}")
    finally:
        audio_clients.discard(websocket)
        if stt:
            await stt.close()
        print("Socket A disconnesso")

# ============================================================
# INTRO MODE — Clap Singolo
# ============================================================
async def do_intro_mode():
    state_machine.transition(State.INTRO)
    await broadcast({"type": "intro", "state": "started"})

    # Frase iconica
    phrase = banter.get("intro", "neutral")
    await broadcast({"type": "jarvis_response", "text": phrase, "model_used": "intro", "tools_used": []})

    # Musica
    music_dir = Config.MUSIC_INTRO_PATH
    if music_dir.exists():
        files = list(music_dir.glob("*.mp3")) + list(music_dir.glob("*.wav"))
        if files:
            # Notifica frontend di riprodurre musica
            await broadcast({"type": "play_music", "file": str(random.choice(files))})

    # TTS frase
    pcm = await asyncio.to_thread(tts.speak, phrase)
    if pcm:
        await broadcast_tts_audio(pcm)

    await asyncio.sleep(3)
    state_machine.transition(State.IDLE)
    await broadcast({"type": "intro", "state": "ended"})

# ============================================================
# PROCESSING PIPELINE
# ============================================================
async def process_input(user_text: str, websocket):
    # 1. BANTER
    ctx = banter.detect(user_text)
    if ctx and mood.should_banter():
        resp = banter.get(ctx, mood.data["current_mood"])
        if resp:
            await deliver_response(resp, "banter", [], websocket)
            mood.record(user_text, resp)
            return

    # 2. ROUTING
    state_machine.transition(State.THINKING)
    await broadcast({"type": "thinking", "text": "Analizzo..."})

    decision = await asyncio.to_thread(router.route, user_text)
    target = decision.get("target", "haiku")
    tool_names = decision.get("tools", [])

    # 3. TOOLS
    tool_results = []
    if tool_names:
        await broadcast({"type": "thinking", "text": "Eseguo tool..."})
        for t in tool_names:
            r = await execute_tool(t, user_text)
            tool_results.append(f"[{t}]: {r}")

    # 4. LLM
    if target == "sonnet":
        model = Config.CLAUDE_SONNET_MODEL
    else:
        model = Config.CLAUDE_HAIKU_MODEL

    mood_addon = mood.addon()
    response = await asyncio.to_thread(llm.ask, model, user_text, tool_results, mood_addon)

    # 5. DELIVER
    await deliver_response(response, target, tool_names, websocket)
    mood.record(user_text, response)
    memory.add_turn(user_text, response)

async def deliver_response(text: str, model_used: str, tools_used: list, websocket):
    state_machine.transition(State.SPEAKING)
    barge.on_tts_start()

    await broadcast({
        "type": "jarvis_response",
        "text": text,
        "model_used": model_used,
        "tools_used": tools_used
    })

    pcm = await asyncio.to_thread(tts.speak, text)
    if pcm:
        await broadcast_tts_audio(pcm)
        await asyncio.sleep(min(estimate_audio_duration(pcm), 30.0))

    if barge.tts_playing:
        barge.on_tts_end()
        state_machine.transition(State.IDLE)

async def execute_tool(name: str, user_text: str) -> str:
    if name == "system_status":
        return tools.system_status()
    elif name == "shell":
        return "Comando shell richiede conferma, Signore."
    elif name == "open_app":
        return tools.open_app("notepad")
    elif name == "obsidian_read":
        return tools.obsidian_read("Inbox")
    elif name == "obsidian_write":
        return tools.obsidian_write("Log", "Test automatico")
    elif name == "vscode":
        await vscode.get_diagnostics()
        return "VS Code connesso."
    elif name == "screen_analyze":
        return "Analisi schermo on-demand."
    elif name == "briefing":
        await do_briefing()
        return "Briefing completato."
    return "Tool non implementato."

# ============================================================
# BRIEFING MATTUTINO
# ============================================================
async def do_briefing():
    status = tools.system_status()
    cal = "3 eventi oggi, Signore."
    weather = "24°C, soleggiato."

    # AI News (simulato — integrare RSS/API reali)
    ai_news = "Novita AI: Claude 4 annunciato, nuove capacita di reasoning. Llama 4 in arrivo. Deepgram migliora il TTS streaming."

    # Gaming News (simulato)
    gaming = "Videogiochi: patch major per Cyberpunk 2077, nuovo trailer GTA VI."

    text = f"""Buongiorno, Signore. Ecco il briefing delle {datetime.now().strftime('%H:%M')}.

{status}
Calendario: {cal}
Meteo: {weather}

Novita AI:
{ai_news}

Videogiochi:
{gaming}

Il suo ambiente e pronto, Signore. Oggi e una buona giornata per costruire."""

    await broadcast({"type": "jarvis_response", "text": text, "model_used": "briefing", "tools_used": ["briefing"]})

    # Apre pagine nel browser
    tools.open_browser("https://news.ycombinator.com")
    tools.open_browser("https://www.reddit.com/r/LocalLLaMA/")

    pcm = await asyncio.to_thread(tts.speak, text)
    if pcm:
        await broadcast_tts_audio(pcm)

# ============================================================
# SCREEN ANALYSIS
# ============================================================
async def do_screen_analysis(context: str):
    img = screen.capture()
    if img:
        response = await asyncio.to_thread(
            llm.ask,
            Config.CLAUDE_SONNET_MODEL,
            f"Analizza lo schermo. Contesto: {context}",
            vision_image=img,
        )
        await broadcast({"type": "jarvis_response", "text": response, "model_used": "sonnet-vision", "tools_used": ["screen_analyze"]})
        pcm = await asyncio.to_thread(tts.speak, response)
        if pcm:
            await broadcast_tts_audio(pcm)

# ============================================================
# PROACTIVE LOOP
# ============================================================
async def proactive_loop():
    silence_start = time.time()
    while True:
        await asyncio.sleep(5)

        # Monitoraggio sistema
        try:
            cpu = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory()
            await broadcast({"type": "hud_update", "cpu": round(cpu,1), "mem": round(ram.percent,1), "gpu": "--"})

            if cpu > 80:
                await bus.publish(JarvisEvent.SYSTEM_ALERT, {"message": f"CPU al {cpu}%, Signore. Qualcosa di pesante in background?"})
        except Exception:
            pass

        # Long silence
        if barge.session_active and time.time() - barge.last_interaction > 30:
            await bus.publish(JarvisEvent.LONG_SILENCE, {})
            barge.session_active = False

# ============================================================
# STARTUP
# ============================================================
@app.on_event("startup")
async def startup():
    await vscode.connect()
    asyncio.create_task(bus.run())
    asyncio.create_task(proactive_loop())
    print("=" * 60)
    print("   J.A.R.V.I.S. Prime Online")
    print("   Signore, sono pronto.")
    print("=" * 60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=Config.WS_HOST, port=Config.WS_PORT)
