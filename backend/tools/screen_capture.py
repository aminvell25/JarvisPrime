"""Screen Capture — MSS on-demand"""
import base64
from io import BytesIO

class ScreenCapture:
    def capture(self) -> str:
        try:
            import mss
            with mss.mss() as sct:
                monitor = sct.monitors[1]
                img = sct.grab(monitor)
                from PIL import Image
                pil_img = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
                buf = BytesIO()
                pil_img.save(buf, format="PNG")
                return base64.b64encode(buf.getvalue()).decode()
        except Exception:
            return ""
