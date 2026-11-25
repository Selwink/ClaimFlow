import { useEffect, useRef } from "react";

const KLEUREN = ["#8FE3F0", "#2E9CB2", "#D9C3FF", "#5A1E6E", "#FF7A6E", "#DA2F24", "#F2C14E", "#FFFFFF"];

/** Confetti bursting from the middle of the screen, in the Aurora colours. Draws for about four seconds. */
export function Confetti({ kleuren = KLEUREN }: { kleuren?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current!; const x = c.getContext("2d")!;
    const d = Math.min(devicePixelRatio || 1, 2);
    const maat = () => { c.width = innerWidth * d; c.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); };
    maat(); addEventListener("resize", maat);
    const w = innerWidth, h = innerHeight;
    const stukjes = Array.from({ length: 170 }, (_, i) => {
      const hoek = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1, v = 7 + Math.random() * 11;
      const vanaf = i % 3; // middle, left corner, right corner
      return { x: vanaf === 0 ? w / 2 : vanaf === 1 ? 0 : w, y: vanaf === 0 ? h * .55 : h,
        vx: vanaf === 0 ? Math.cos(hoek) * v : (vanaf === 1 ? 1 : -1) * (3 + Math.random() * 7), vy: vanaf === 0 ? Math.sin(hoek) * v : -(10 + Math.random() * 9),
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, b: 6 + Math.random() * 6, k: kleuren[i % kleuren.length], rond: Math.random() < .3 };
    });
    const begin = performance.now(); let id = 0;
    const stap = (nu: number) => {
      const t = nu - begin; x.clearRect(0, 0, w, h);
      for (const s of stukjes) {
        s.vy += .28; s.vx *= .99; s.vy *= .99; s.x += s.vx; s.y += s.vy; s.r += s.vr;
        x.save(); x.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2600) / 1400); x.translate(s.x, s.y); x.rotate(s.r); x.fillStyle = s.k;
        if (s.rond) { x.beginPath(); x.arc(0, 0, s.b / 2.4, 0, 7); x.fill(); } else { x.scale(1, Math.cos(s.r * 3)); x.fillRect(-s.b / 2, -s.b / 4, s.b, s.b / 2); }
        x.restore();
      }
      if (t < 4000) id = requestAnimationFrame(stap); else x.clearRect(0, 0, w, h);
    };
    id = requestAnimationFrame(stap);
    return () => { cancelAnimationFrame(id); removeEventListener("resize", maat); };
  }, [kleuren]);
  return <canvas ref={ref} className="confetti-doek" aria-hidden="true" />;
}
