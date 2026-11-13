"""Leest een fysieke XInput-controller via ctypes (alleen Windows)."""
import ctypes
from ctypes import wintypes


class XINPUT_GAMEPAD(ctypes.Structure):
    _fields_ = [
        ("wButtons", wintypes.WORD),
        ("bLeftTrigger", ctypes.c_ubyte),
        ("bRightTrigger", ctypes.c_ubyte),
        ("sThumbLX", ctypes.c_short),
        ("sThumbLY", ctypes.c_short),
        ("sThumbRX", ctypes.c_short),
        ("sThumbRY", ctypes.c_short),
    ]


class XINPUT_STATE(ctypes.Structure):
    _fields_ = [("dwPacketNumber", wintypes.DWORD), ("Gamepad", XINPUT_GAMEPAD)]


def _load():
    for name in ("xinput1_4", "xinput1_3", "xinput9_1_0"):
        try:
            return getattr(ctypes.windll, name)
        except (OSError, AttributeError):
            continue
    raise OSError("Geen XInput-DLL gevonden. Deze app werkt alleen op Windows.")


_dll = None


def get_state(index: int):
    """Geeft XINPUT_GAMEPAD terug, of None als slot `index` leeg is."""
    global _dll
    if _dll is None:
        _dll = _load()
    state = XINPUT_STATE()
    if _dll.XInputGetState(index, ctypes.byref(state)) != 0:
        return None
    return state.Gamepad


def connected():
    """Lijst met bezette XInput-slots (0..3)."""
    return [i for i in range(4) if get_state(i) is not None]
