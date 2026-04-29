"""VS Code Bridge"""
import asyncio
import json

class VSCodeBridge:
    def __init__(self, port=9001):
        self.port = port
        self.ws = None

    async def connect(self):
        try:
            import websockets
            self.ws = await websockets.connect(f"ws://localhost:{self.port}")
        except Exception:
            pass

    async def send(self, action: str, params: dict):
        if self.ws:
            await self.ws.send(json.dumps({"action": action, "params": params}))

    async def insert_code(self, code: str):
        await self.send("insert", {"text": code})

    async def get_diagnostics(self):
        await self.send("get_diagnostics", {})
