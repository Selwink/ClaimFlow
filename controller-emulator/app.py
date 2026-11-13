"""Curve Lab Emulator: venster om profielen te kiezen, curves af te stellen en de emulator te starten."""
import json
import os
import tkinter as tk
from tkinter import messagebox, ttk

from curves import SHAPES, StickConfig, apply_magnitude
from emulator import Emulator, Profile

HERE = os.path.dirname(os.path.abspath(__file__))
PROFILES = os.path.join(HERE, "profiles.json")
NAMES = {"linear": "Lineair", "classic": "Classic", "expo": "Exponentieel", "dynamic": "Dynamic",
         "scurve": "S-curve", "dual": "Dual zone", "custom": "Eigen (exponent)"}
G = 260  # grootte van de grafiek in pixels


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Curve Lab Emulator")
        self.resizable(False, False)
        self.profiles = self._load()
        self.profile = Profile()
        self.emu = Emulator(self.profile)
        self.stick = tk.StringVar(value="right")
        self.vars = {k: tk.DoubleVar() for k in ("deadzone", "outer", "exponent", "anti_deadzone")}
        self.shape = tk.StringVar()
        self.trig_dz = tk.DoubleVar()
        self.hair = tk.BooleanVar()
        self._loading = False
        self._build()
        self.pick.set(next(iter(self.profiles)))
        self._select_profile()
        self.protocol("WM_DELETE_WINDOW", self._close)
        self.after(33, self._tick)

    # ---------- profielen ----------
    def _load(self):
        try:
            with open(PROFILES, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            data = {}
        return data or {"Standaard": {}}

    def _save(self):
        name = self.pick.get().strip() or "Mijn profiel"
        self.profiles[name] = self.profile.to_dict()
        with open(PROFILES, "w", encoding="utf-8") as f:
            json.dump(self.profiles, f, indent=2, ensure_ascii=False)
        self.pick["values"] = list(self.profiles)
        self.status.set(f"Profiel opgeslagen: {name}")

    def _select_profile(self, *_):
        loaded = Profile.from_dict(self.profiles.get(self.pick.get(), {}))
        # Wijzig het bestaande object, zodat een draaiende emulator direct meeverandert.
        self.profile.left, self.profile.right = loaded.left, loaded.right
        self.profile.trigger_deadzone, self.profile.hair_triggers = loaded.trigger_deadzone, loaded.hair_triggers
        self._show_stick()

    # ---------- UI ----------
    def _build(self):
        pad = {"padx": 10, "pady": 4}
        top = ttk.Frame(self)
        top.grid(row=0, column=0, columnspan=2, sticky="ew", **pad)
        ttk.Label(top, text="Profiel").pack(side="left")
        self.pick = ttk.Combobox(top, values=list(self.profiles), width=38)
        self.pick.pack(side="left", padx=6)
        self.pick.bind("<<ComboboxSelected>>", self._select_profile)
        ttk.Button(top, text="Opslaan", command=self._save).pack(side="left")

        self.canvas = tk.Canvas(self, width=G + 40, height=G + 40, bg="#111829", highlightthickness=0)
        self.canvas.grid(row=1, column=0, rowspan=2, padx=10, pady=6)

        box = ttk.Frame(self)
        box.grid(row=1, column=1, sticky="n", **pad)
        row = ttk.Frame(box)
        row.pack(anchor="w")
        for val, txt in (("right", "Rechterstick (richten)"), ("left", "Linkerstick (bewegen)")):
            ttk.Radiobutton(row, text=txt, value=val, variable=self.stick, command=self._show_stick).pack(side="left")
        ttk.Label(box, text="Curve").pack(anchor="w", pady=(8, 0))
        self.shape_box = ttk.Combobox(box, state="readonly", values=[NAMES[s] for s in SHAPES], width=24)
        self.shape_box.pack(anchor="w")
        self.shape_box.bind("<<ComboboxSelected>>", self._changed)
        self.value_labels = {}
        for key, txt, hi in (("deadzone", "Deadzone (binnen)", 0.30), ("outer", "Outer threshold", 0.20),
                             ("exponent", "Exponent (bij Eigen)", 3.0), ("anti_deadzone", "Anti-deadzone", 0.30)):
            head = ttk.Frame(box)
            head.pack(fill="x", pady=(8, 0))
            ttk.Label(head, text=txt).pack(side="left")
            self.value_labels[key] = ttk.Label(head, text="")
            self.value_labels[key].pack(side="right")
            lo = 1.0 if key == "exponent" else 0.0
            ttk.Scale(box, from_=lo, to=hi, variable=self.vars[key], length=250, command=self._changed).pack()
        head = ttk.Frame(box)
        head.pack(fill="x", pady=(12, 0))
        ttk.Label(head, text="Trigger-deadzone").pack(side="left")
        self.value_labels["trig"] = ttk.Label(head, text="")
        self.value_labels["trig"].pack(side="right")
        ttk.Scale(box, from_=0, to=0.5, variable=self.trig_dz, length=250, command=self._changed).pack()
        ttk.Checkbutton(box, text="Hair triggers (direct volle uitslag)", variable=self.hair,
                        command=self._changed).pack(anchor="w", pady=4)

        bottom = ttk.Frame(self)
        bottom.grid(row=2, column=1, sticky="sew", **pad)
        self.toggle = ttk.Button(bottom, text="Start emulator", command=self._toggle)
        self.toggle.pack(fill="x")
        self.status = tk.StringVar(value="Gestopt. Kies een profiel en druk op Start.")
        ttk.Label(self, textvariable=self.status, wraplength=560).grid(row=3, column=0, columnspan=2, sticky="w", **pad)

    def _cfg(self) -> StickConfig:
        return self.profile.right if self.stick.get() == "right" else self.profile.left

    def _show_stick(self):
        self._loading = True
        cfg = self._cfg()
        self.shape_box.set(NAMES[cfg.shape])
        for k, v in self.vars.items():
            v.set(getattr(cfg, k))
        self.trig_dz.set(self.profile.trigger_deadzone)
        self.hair.set(self.profile.hair_triggers)
        self._loading = False
        self._changed()

    def _changed(self, *_):
        if self._loading:
            return
        cfg = self._cfg()
        cfg.shape = next(s for s in SHAPES if NAMES[s] == self.shape_box.get())
        for k, v in self.vars.items():
            setattr(cfg, k, round(v.get(), 2))
        self.profile.trigger_deadzone = round(self.trig_dz.get(), 2)
        self.profile.hair_triggers = self.hair.get()
        for k in ("deadzone", "outer", "anti_deadzone"):
            self.value_labels[k]["text"] = f"{getattr(cfg, k) * 100:.0f}%"
        self.value_labels["exponent"]["text"] = f"{cfg.exponent:.1f}"
        self.value_labels["trig"]["text"] = f"{self.profile.trigger_deadzone * 100:.0f}%"
        self._draw()

    # ---------- grafiek ----------
    def _pt(self, x, y):
        return 30 + x * G, 10 + G - y * G

    def _draw(self, live=None):
        c, cfg = self.canvas, self._cfg()
        c.delete("all")
        for i in range(5):
            v = i / 4
            c.create_line(*self._pt(v, 0), *self._pt(v, 1), fill="#2b3452")
            c.create_line(*self._pt(0, v), *self._pt(1, v), fill="#2b3452")
            c.create_text(self._pt(v, 0)[0], G + 24, text=str(int(v * 100)), fill="#98a2be", font=("Consolas", 8))
            c.create_text(14, self._pt(0, v)[1], text=str(int(v * 100)), fill="#98a2be", font=("Consolas", 8))
        c.create_line(*self._pt(0, 0), *self._pt(1, 1), fill="#4fd1e0", dash=(4, 4))
        pts = []
        for i in range(101):
            pts.extend(self._pt(i / 100, apply_magnitude(i / 100, cfg)))
        c.create_line(*pts, fill="#ff5c93", width=3)
        if live is not None:
            x, y = self._pt(live, apply_magnitude(live, cfg))
            c.create_oval(x - 6, y - 6, x + 6, y + 6, fill="#e8ecf6", outline="")

    # ---------- emulator ----------
    def _toggle(self):
        if self.emu.running:
            self.emu.stop()
            self.toggle["text"] = "Start emulator"
            self.status.set("Gestopt.")
            return
        try:
            self.emu.start()
        except ImportError:
            messagebox.showerror("Curve Lab Emulator", "vgamepad ontbreekt. Voer uit: pip install -r requirements.txt "
                                 "(dat installeert ook de ViGEmBus-driver).")
            return
        except Exception as exc:
            messagebox.showerror("Curve Lab Emulator", str(exc))
            return
        self.toggle["text"] = "Stop emulator"
        self.status.set(f"Actief: leest controller {self.emu.source + 1} en stuurt een virtuele Xbox 360-controller aan. "
                        "Verberg de fysieke controller met HidHide, anders ziet de game dubbele invoer.")

    def _tick(self):
        if self.emu.error:
            self.status.set(f"Gestopt door fout: {self.emu.error}")
            self.emu.error = None
            self.toggle["text"] = "Start emulator"
        if self.emu.running:
            x, y = self.emu.last_in if self.stick.get() == "right" else (0.0, 0.0)
            self._draw(min(1.0, (x * x + y * y) ** 0.5))
        self.after(33, self._tick)

    def _close(self):
        if self.emu.running:
            self.emu.stop()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
