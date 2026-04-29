"""Deepgram STT Streaming"""
import asyncio
import inspect
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents

class DeepgramSTT:
    def __init__(self, api_key: str, loop):
        self.dg = DeepgramClient(api_key)
        self.conn = None
        self.loop = loop
        self.queue = asyncio.Queue()
        self._final = ""

    async def connect(self):
        self._final = ""
        self.conn = self.dg.listen.websocket.v("1")
        def on_transcript(*args, **kwargs):
            result = kwargs.get("result") or (args[0] if args else None)
            if result is None:
                return
            text = result.channel.alternatives[0].transcript
            if result.is_final:
                self._final += " " + text
                self.loop.call_soon_threadsafe(self.queue.put_nowait, {"type": "final", "text": text})
            else:
                self.loop.call_soon_threadsafe(self.queue.put_nowait, {"type": "interim", "text": text})
        def on_utterance_end(*args, **kwargs):
            self.loop.call_soon_threadsafe(self.queue.put_nowait, {"type": "utterance_end"})
        self.conn.on(LiveTranscriptionEvents.Transcript, on_transcript)
        self.conn.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
        started = self.conn.start(LiveOptions(
            model="nova-2", language="it-IT", smart_format=True,
            interim_results=True, utterance_end_ms="1200",
            vad_events=True, encoding="linear16", sample_rate=16000, channels=1
        ))
        if inspect.isawaitable(started):
            started = await started
        if started is False:
            raise RuntimeError("Deepgram STT connection rejected")

    def send(self, chunk: bytes):
        if self.conn:
            self.conn.send(chunk)

    async def close(self):
        if self.conn:
            finished = self.conn.finish()
            if inspect.isawaitable(finished):
                await finished

    @property
    def final_transcript(self):
        return self._final.strip()
