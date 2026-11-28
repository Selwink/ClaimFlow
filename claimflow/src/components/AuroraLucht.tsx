import { useEffect, useRef } from "react";

const AURORA = ["#0E5E73", "#2E9CB2", "#1B2A6B", "#5A1E6E", "#DA2F24", "#2E9CB2"];
const GROEN = ["#0F5C45", "#3FD39A", "#1E7A5F", "#2A9D78", "#DA2F24", "#3FD39A"];
const PAREL = ["#9FDDE8", "#D9C9FF", "#FFD3CC", "#BFE6F0", "#E9D9FF", "#CDEFF5"];

/** Living background: soft colour clouds that drift slowly and lean a little towards the pointer.
 *  Only drawn in the Aurora and Parel appearances; pauses when the tab is hidden; still for reduced motion. */
export function AuroraLucht() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; const x = c?.getContext("2d");
    if (!c || !x) return;
    const stil = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    const wolken = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: .42 + Math.random() * .25, f: i * 1.3 }));
    let mx = .5, my = .4, id = 0, laatst = 0;
    const maat = () => { c.width = Math.round(innerWidth / 3); c.height = Math.round(innerHeight / 3); };
    const beweeg = (e: PointerEvent) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; };
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
    const teken = (t: number) => {
      id = stil ? 0 : requestAnimationFrame(teken);
      if (t - laatst < 33 && !stil) return; // about 30 frames a second is plenty for slow clouds
      laatst = t;
      const parel = html.dataset.parel === "1", aan = parel || html.dataset.sfeer === "aurora";
      c.style.opacity = aan ? "" : "0";
      if (!aan) return;
      const kl = parel ? PAREL : html.dataset.aurora === "groen" ? GROEN : AURORA;
      const w = c.width, h = c.height;
      x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, w, h);
      x.globalCompositeOperation = parel ? "source-over" : "lighter";
      wolken.forEach((b, i) => {
        const px = (b.x + Math.sin(t / 9000 + b.f) * .14 + (mx - .5) * .08) * w, py = (b.y + Math.cos(t / 11000 + b.f) * .12 + (my - .5) * .06) * h, R = b.r * Math.max(w, h);
        const g = x.createRadialGradient(px, py, 0, px, py, R);
        g.addColorStop(0, `rgba(${rgb(kl[i])},${parel ? .55 : .42})`); g.addColorStop(1, `rgba(${rgb(kl[i])},0)`);
        x.fillStyle = g; x.fillRect(0, 0, w, h);
      });
    };
    const zicht = () => { cancelAnimationFrame(id); if (!document.hidden) id = requestAnimationFrame(teken); };
    maat(); id = requestAnimationFrame(teken);
    addEventListener("resize", maat); addEventListener("pointermove", beweeg, { passive: true });
    document.addEventListener("visibilitychange", zicht);
    const obs = new MutationObserver(() => { if (stil) requestAnimationFrame(teken); });
    obs.observe(html, { attributes: true, attributeFilter: ["data-sfeer", "data-aurora", "data-parel"] });
    return () => { cancelAnimationFrame(id); removeEventListener("resize", maat); removeEventListener("pointermove", beweeg); document.removeEventListener("visibilitychange", zicht); obs.disconnect(); };
  }, []);
  return <canvas ref={ref} className="aurora-lucht" aria-hidden="true" />;
}
