"""Response-curve wiskunde. Puur Python, geen Windows-afhankelijkheden."""
import math
from dataclasses import dataclass, asdict

SHAPES = ("linear", "classic", "expo", "dynamic", "scurve", "dual", "custom")


@dataclass
class StickConfig:
    shape: str = "linear"
    deadzone: float = 0.0       # binnen-deadzone, 0..0.5
    outer: float = 0.0          # outer threshold, 0..0.5
    exponent: float = 1.6       # alleen voor shape "custom"
    anti_deadzone: float = 0.0  # compenseert de vaste deadzone van een game, 0..0.5

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, d):
        cfg = cls(**{k: v for k, v in (d or {}).items() if k in cls.__dataclass_fields__})
        if cfg.shape not in SHAPES:
            cfg.shape = "linear"
        return cfg


def shape_fn(shape: str, t: float, exponent: float = 1.6) -> float:
    """Vorm van de curve op genormaliseerde invoer t in 0..1."""
    if shape == "linear":
        return t
    if shape == "classic":
        return t ** 1.6
    if shape == "expo":
        return t ** 2.2
    if shape == "dynamic":  # omgekeerde S: snelle aanzet, vlak midden, snelle rand
        return 0.45 * t + 0.55 * (0.5 + 4 * (t - 0.5) ** 3)
    if shape == "scurve":
        return 0.35 * t + 0.65 * t * t * (3 - 2 * t)
    if shape == "dual":  # trage binnenzone, snelle buitenring
        return 0.5 * (t / 0.82) ** 1.25 if t < 0.82 else 0.5 + 0.5 * (t - 0.82) / 0.18
    return t ** max(0.1, exponent)


def apply_magnitude(mag: float, cfg: StickConfig) -> float:
    """Stick-uitslag 0..1 -> uitvoer 0..1."""
    lo, hi = cfg.deadzone, 1.0 - cfg.outer
    if mag <= lo or hi <= lo:
        return 0.0
    t = 1.0 if mag >= hi else (mag - lo) / (hi - lo)
    out = min(1.0, max(0.0, shape_fn(cfg.shape, t, cfg.exponent)))
    if out > 0 and cfg.anti_deadzone > 0:
        out = cfg.anti_deadzone + (1.0 - cfg.anti_deadzone) * out
    return out


def apply_stick(x: float, y: float, cfg: StickConfig):
    """Radiale curve: de richting blijft gelijk, alleen de uitslag verandert."""
    mag = math.hypot(x, y)
    if mag < 1e-9:
        return 0.0, 0.0
    out = apply_magnitude(min(1.0, mag), cfg)
    k = out / mag
    return x * k, y * k


def apply_trigger(v: float, deadzone: float = 0.0, hair: bool = False) -> float:
    """Trigger 0..1. hair=True: volle uitvoer zodra de deadzone voorbij is."""
    if v <= deadzone:
        return 0.0
    if hair:
        return 1.0
    return (v - deadzone) / (1.0 - deadzone)
