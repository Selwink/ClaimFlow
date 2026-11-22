import { useEffect, useRef, useState } from "react";

const rustig = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from zero on first show, and glides to its new value when it changes. */
export function Optel({ waarde, opmaak = (n) => String(Math.round(n)), ms = 900 }: { waarde: number; opmaak?: (n: number) => string; ms?: number }) {
  const [getoond, setGetoond] = useState(() => (rustig() ? waarde : 0));
  const van = useRef(getoond);
  useEffect(() => {
    if (rustig()) { setGetoond(waarde); van.current = waarde; return; }
    const begin = van.current, start = performance.now();
    let raf = 0;
    const stap = (t: number) => {
      const f = Math.min(1, (t - start) / ms);
      const w = begin + (waarde - begin) * (1 - Math.pow(1 - f, 3));
      setGetoond(w); van.current = w;
      if (f < 1) raf = requestAnimationFrame(stap);
    };
    raf = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(raf);
  }, [waarde, ms]);
  // one text only: screen readers get the final value via the label, copy/paste gets the visible number
  return <span className="optel" role="img" aria-label={opmaak(waarde)}><span aria-hidden="true">{opmaak(getoond)}</span></span>;
}
