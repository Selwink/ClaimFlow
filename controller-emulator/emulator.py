"""Leest de fysieke controller, past de curves toe en stuurt een virtuele Xbox 360-controller aan."""
import threading
import time

from curves import StickConfig, apply_stick, apply_trigger


def _norm(v: int) -> float:
    return max(-1.0, v / 32767.0)


def _short(v: float) -> int:
    return int(round(max(-1.0, min(1.0, v)) * 32767))


class Profile:
    def __init__(self, left=None, right=None, trigger_deadzone=0.0, hair_triggers=False):
        self.left = left or StickConfig()
        self.right = right or StickConfig()
        self.trigger_deadzone = trigger_deadzone
        self.hair_triggers = hair_triggers

    @classmethod
    def from_dict(cls, d):
        return cls(
            StickConfig.from_dict(d.get("left")),
            StickConfig.from_dict(d.get("right")),
            float(d.get("trigger_deadzone", 0.0)),
            bool(d.get("hair_triggers", False)),
        )

    def to_dict(self):
        return {
            "left": self.left.to_dict(),
            "right": self.right.to_dict(),
            "trigger_deadzone": self.trigger_deadzone,
            "hair_triggers": self.hair_triggers,
        }


def process(pad, profile: Profile) -> dict:
    """Zet een ruwe XInput-state om in de waarden voor de virtuele controller."""
    lx, ly = apply_stick(_norm(pad.sThumbLX), _norm(pad.sThumbLY), profile.left)
    rx, ry = apply_stick(_norm(pad.sThumbRX), _norm(pad.sThumbRY), profile.right)
    lt = apply_trigger(pad.bLeftTrigger / 255.0, profile.trigger_deadzone, profile.hair_triggers)
    rt = apply_trigger(pad.bRightTrigger / 255.0, profile.trigger_deadzone, profile.hair_triggers)
    return {
        "wButtons": pad.wButtons,
        "bLeftTrigger": int(round(lt * 255)),
        "bRightTrigger": int(round(rt * 255)),
        "sThumbLX": _short(lx), "sThumbLY": _short(ly),
        "sThumbRX": _short(rx), "sThumbRY": _short(ry),
    }


class Emulator:
    """Draait de lees-/schrijflus in een eigen thread."""

    def __init__(self, profile: Profile, rate_hz: int = 1000):
        self.profile = profile
        self.rate_hz = rate_hz
        self.running = False
        self.error = None
        self.source = None
        self.last_in = (0.0, 0.0)   # rechterstick ruw, voor de live-weergave
        self.last_out = (0.0, 0.0)
        self._thread = None

    def start(self, source_index=None):
        import xinput  # pas hier: werkt alleen op Windows
        import vgamepad

        pads = xinput.connected()
        if not pads:
            raise RuntimeError("Geen XInput-controller gevonden. Sluit je controller aan en probeer opnieuw.")
        # Kies het fysieke slot vóór de virtuele controller bestaat, anders lezen we onszelf terug.
        self.source = source_index if source_index in pads else pads[0]
        self._virtual = vgamepad.VX360Gamepad()
        self._xinput = xinput
        self.running = True
        self.error = None
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        period = 1.0 / self.rate_hz
        nxt = time.perf_counter()
        try:
            while self.running:
                pad = self._xinput.get_state(self.source)
                if pad is not None:
                    out = process(pad, self.profile)
                    rep = self._virtual.report
                    for k, v in out.items():
                        setattr(rep, k, v)
                    self._virtual.update()
                    self.last_in = (_norm(pad.sThumbRX), _norm(pad.sThumbRY))
                    self.last_out = (out["sThumbRX"] / 32767.0, out["sThumbRY"] / 32767.0)
                nxt += period
                delay = nxt - time.perf_counter()
                if delay > 0:
                    time.sleep(delay)
                else:
                    nxt = time.perf_counter()
        except Exception as exc:  # toon de fout in de UI in plaats van stil te stoppen
            self.error = str(exc)
            self.running = False

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=1)
            self._thread = None
        if getattr(self, "_virtual", None) is not None:
            self._virtual.reset()
            self._virtual.update()
            del self._virtual  # verwijdert de virtuele controller uit Windows
