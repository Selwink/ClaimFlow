import { useEffect, useState } from "react";

export type PopSoort = "nieuw" | "ingediend" | "gehonoreerd";
interface Pop { id: number; titel: string; sub?: string; soort: PopSoort }

/** Shows the animated "claimed" card at the bottom of the screen (after saving a claim or changing its status). */
export function toonClaimPop(titel: string, sub?: string, soort: PopSoort = "nieuw") {
  window.dispatchEvent(new CustomEvent("claimflow-pop", { detail: { titel, sub, soort } }));
}

export function ClaimPop() {
  const [pop, setPop] = useState<Pop | null>(null);
  const [weg, setWeg] = useState(false);
  useEffect(() => {
    let t1 = 0, t2 = 0;
    const h = (e: Event) => {
      const d = (e as CustomEvent<Omit<Pop, "id">>).detail;
      window.clearTimeout(t1); window.clearTimeout(t2);
      setWeg(false); setPop({ ...d, id: Date.now() });
      try { navigator.vibrate?.(12); } catch { /* not available */ }
      t1 = window.setTimeout(() => setWeg(true), 3400);
      t2 = window.setTimeout(() => setPop(null), 3800);
    };
    window.addEventListener("claimflow-pop", h);
    return () => { window.removeEventListener("claimflow-pop", h); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  if (!pop) return null;
  return (
    <div key={pop.id} className={`claim-pop claim-pop-${pop.soort}${weg ? " weg" : ""}`} role="status" aria-live="polite" onClick={() => setWeg(true)}>
      <span className="claim-pop-vink" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      <span className="claim-pop-tekst"><b>{pop.titel}</b>{pop.sub && <small>{pop.sub}</small>}</span>
      <span className="claim-pop-glans" aria-hidden="true" />
    </div>
  );
}
