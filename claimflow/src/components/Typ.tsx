import { useEffect, useState } from "react";

const stil = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Types a recognised value letter by letter after `na` ms, like the scan fills it in. */
export function Typ({ tekst, na = 0 }: { tekst: string; na?: number }) {
  const [n, setN] = useState(() => (stil() ? tekst.length : 0));
  useEffect(() => {
    if (stil()) { setN(tekst.length); return; }
    setN(0);
    let i = 0, t = 0;
    const stap = () => { i++; setN(i); if (i < tekst.length) t = window.setTimeout(stap, 26); };
    t = window.setTimeout(stap, na);
    return () => window.clearTimeout(t);
  }, [tekst, na]);
  return <>{tekst.slice(0, n)}{n < tekst.length && <span className="typ-cursor" aria-hidden="true" />}</>;
}
