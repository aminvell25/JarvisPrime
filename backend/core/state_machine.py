"""State Machine"""
from enum import Enum
import asyncio
from backend.core.event_bus import JarvisEvent

class State(Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    THINKING = "THINKING"
    SPEAKING = "SPEAKING"
    BANTER = "BANTER"
    ALERT = "ALERT"
    SYSTEM = "SYSTEM"
    INTRO = "INTRO"

class JarvisStateMachine:
    def __init__(self, event_bus):
        self.state = State.IDLE
        self.bus = event_bus
        self._listeners = []

    def on_state_change(self, callback):
        self._listeners.append(callback)

    def transition(self, new_state: State, data: dict = None):
        old = self.state
        self.state = new_state
        payload = {"from": old.value, "to": new_state.value, "data": data or {}}
        for cb in self._listeners:
            try:
                if asyncio.iscoroutinefunction(cb):
                    asyncio.create_task(cb(payload))
                else:
                    cb(payload)
            except Exception:
                pass
        asyncio.create_task(self.bus.publish(
            JarvisEvent.SYSTEM_ALERT if new_state == State.ALERT else JarvisEvent.THINKING_STARTED,
            payload
        ))
