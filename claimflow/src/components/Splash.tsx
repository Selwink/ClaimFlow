import { useEffect, useState } from "react";

/**
 * Opening screen: glowing emblem in an open ring, letter-spaced wordmark whose "FLOW" letters light up
 * one by one, and a loading bar. When data is ready it flows over into the next screen (login or app).
 * Shown on every page load, a little shorter when the user is already logged in.
 */
const UIT_MS = 750;

export function Splash({ klaar, kort }: { klaar: boolean; kort?: boolean }) {
  const [min, setMin] = useState(false);
  const [weg, setWeg] = useState(false);
  const [duur] = useState(() => (kort ? 1600 : 2400));
  useEffect(() => { const t = setTimeout(() => setMin(true), duur); return () => clearTimeout(t); }, [duur]);
  const sluit = klaar && min;
  // While the splash covers the page, the screen behind it holds its entrance animation.
  useEffect(() => {
    const root = document.documentElement;
    if (!weg && !sluit) root.dataset.splash = "aan"; else delete root.dataset.splash;
    return () => { delete root.dataset.splash; };
  }, [weg, sluit]);
  useEffect(() => {
    if (!sluit) return;
    const t = setTimeout(() => setWeg(true), UIT_MS);
    return () => clearTimeout(t);
  }, [sluit]);
  if (weg) return null;

  return (
    <div className={`splash${sluit ? " splash-weg" : ""}${kort ? " splash-kort" : ""}`} role="status" aria-live="polite" aria-label="ClaimFlow Medipoint wordt geladen">
      <div className="splash-ringen" aria-hidden="true"><i /><i /><i /></div>
      <div className="splash-inhoud">
        <div className="splash-embleem" aria-hidden="true">
          <svg viewBox="0 0 120 120" width="132" height="132">
            <defs>
              <linearGradient id="splash-aurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8FE3F0" /><stop offset=".35" stopColor="#2E9CB2" /><stop offset=".65" stopColor="#D9C3FF" /><stop offset="1" stopColor="#FF6B5E" /></linearGradient>
            </defs>
            <circle className="emb-gloed" cx="60" cy="60" r="56" />
            <circle className="emb-ring" cx="60" cy="60" r="50" pathLength="100" />
            <circle className="emb-punt" cx="96" cy="26" r="7" />
            <path className="emb-vink" d="M36 62 L53 79 L86 40" pathLength="100" />
          </svg>
        </div>
        <div className="splash-woord" aria-hidden="true">
          <span className="sw-claim">{"CLAIM".split("").map((l, i) => <b key={i} style={{ animationDelay: `${120 + i * 70}ms` }}>{l}</b>)}</span>
          <span className="sw-flow">{"FLOW".split("").map((l, i) => <b key={i} style={{ animationDelay: `${560 + i * 140}ms` }}>{l}</b>)}</span>
        </div>
        <div className="splash-balk" aria-hidden="true"><i /></div>
        <small className="splash-onder">Medipoint · Garantieclaims</small>
      </div>
    </div>
  );
}
