import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** Opening screen with a loading bar; fades out once data is ready and the minimum time has passed. */
const GEZIEN = "claimflow-splash";
const alGezien = () => { try { return !!sessionStorage.getItem(GEZIEN); } catch { return false; } };

export function Splash({ klaar }: { klaar: boolean }) {
  const [min, setMin] = useState(false);
  const [weg, setWeg] = useState(alGezien);
  useEffect(() => { const t = setTimeout(() => setMin(true), 1100); return () => clearTimeout(t); }, []);
  const sluit = klaar && min;
  useEffect(() => {
    if (!sluit) return;
    try { sessionStorage.setItem(GEZIEN, "1"); } catch { /* privémodus */ }
    const t = setTimeout(() => setWeg(true), 450);
    return () => clearTimeout(t);
  }, [sluit]);
  if (weg) return null;
  return (
    <div className={`splash${sluit ? " splash-weg" : ""}`} aria-hidden={sluit} role="status" aria-label="ClaimFlow Medipoint wordt geladen">
      <div className="splash-merk"><Icon naam="vink" maat={34} /></div>
      <div className="splash-naam">{"ClaimFlow".split("").map((l, i) => <span key={i} style={{ animationDelay: `${i * 45}ms` }}>{l}</span>)}</div>
      <div className="splash-balk"><i /></div>
      <div className="splash-mp">Medipoint</div>
      <small>Garantieclaims</small>
    </div>
  );
}
