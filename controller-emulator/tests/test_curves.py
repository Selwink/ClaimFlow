import math, os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from curves import SHAPES, StickConfig, apply_magnitude, apply_stick, apply_trigger
from emulator import Profile, process


def test_endpoints_and_monotonic():
    for s in SHAPES:
        cfg = StickConfig(shape=s, deadzone=0.05, outer=0.02)
        assert apply_magnitude(0.0, cfg) == 0 and apply_magnitude(0.05, cfg) == 0
        assert abs(apply_magnitude(1.0, cfg) - 1) < 1e-9 and abs(apply_magnitude(0.98, cfg) - 1) < 1e-9
        prev = 0
        for i in range(101):
            v = apply_magnitude(i / 100, cfg)
            assert 0 <= v <= 1 and v >= prev - 1e-9, (s, i)
            prev = v


def test_direction_kept():
    x, y = apply_stick(0.3, -0.4, StickConfig(shape="expo", deadzone=0.1))
    assert abs(math.atan2(y, x) - math.atan2(-0.4, 0.3)) < 1e-9
    assert apply_stick(0.01, 0.01, StickConfig(deadzone=0.1)) == (0.0, 0.0)


def test_anti_deadzone_and_trigger():
    cfg = StickConfig(anti_deadzone=0.2)
    assert apply_magnitude(0, cfg) == 0 and abs(apply_magnitude(0.001, cfg) - 0.2008) < 1e-3
    assert apply_trigger(0.05, 0.1) == 0 and apply_trigger(0.2, 0.1, hair=True) == 1
    assert abs(apply_trigger(0.55, 0.1) - 0.5) < 1e-9


def test_process_passthrough():
    pad = types.SimpleNamespace(wButtons=0x1001, bLeftTrigger=128, bRightTrigger=255,
                                sThumbLX=32767, sThumbLY=-32768, sThumbRX=1000, sThumbRY=0)
    out = process(pad, Profile.from_dict({}))
    assert out["wButtons"] == 0x1001 and out["bLeftTrigger"] == 128 and out["bRightTrigger"] == 255
    assert out["sThumbRX"] == 1000 and -32767 <= out["sThumbLY"] <= 32767
