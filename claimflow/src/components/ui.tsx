import { useEffect, useRef, type ReactNode } from "react";
import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import type { Toon } from "../lib/claims";
import { Icon } from "./Icon";
import { LogoMerk } from "./LogoMerk";

export function Logo({ licht = true, klein = false }: { licht?: boolean; klein?: boolean }) {
  return (
    <span className={`logo${licht ? " logo-licht" : ""}${klein ? " logo-klein" : ""}`}>
      <span className="logo-merk" aria-hidden="true"><LogoMerk maat={klein ? 24 : 30} /></span>
      <span className="logo-woord">ClaimFlow <span className="logo-mp">Medipoint</span></span>
    </span>
  );
}

/** Small uppercase mono label, e.g. "VRIJDAG 7 NOVEMBER". */
export const Bovenschrift = ({ children, rood }: { children: ReactNode; rood?: boolean }) => (
  <small className={`bovenschrift${rood ? " rood" : ""}`}>{children}</small>
);

export const Chip = ({ toon, children }: { toon: Toon; children: ReactNode }) => <span className={`chip chip-${toon}`}>{children}</span>;

const STATUS_TOON: Record<Status, Toon> = { nieuw: "grijs", ingediend: "oker", gehonoreerd: "turk", afgewezen: "rood" };
export const StatusPil = ({ status }: { status: Status }) => <Chip toon={STATUS_TOON[status]}>{STATUS_LABEL[status]}</Chip>;

export function Leeg({ titel, tekst, children, kop, icoon }: { titel: string; tekst?: string; children?: ReactNode; kop?: "h1" | "h2"; icoon?: ReactNode }) {
  const Kop = kop || "b";
  return (
    <div className="leeg">
      <span className="leeg-beeld" aria-hidden="true">
        <svg viewBox="0 0 160 120" width="160" height="120">
          <defs>
            <linearGradient id="leeg-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8FE3F0" /><stop offset=".5" stopColor="#D9C3FF" /><stop offset="1" stopColor="#FF7A6E" /></linearGradient>
            <radialGradient id="leeg-r" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2E9CB2" stopOpacity=".55" /><stop offset="1" stopColor="#5A1E6E" stopOpacity="0" /></radialGradient>
          </defs>
          <circle cx="80" cy="62" r="58" fill="url(#leeg-r)" className="lb-gloed" />
          <ellipse cx="80" cy="62" rx="62" ry="20" fill="none" stroke="url(#leeg-g)" strokeWidth="1.5" strokeDasharray="4 6" className="lb-baan" />
          <g className="lb-blad"><rect x="56" y="26" width="48" height="62" rx="8" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
            <path d="M66 44h28M66 54h28M66 64h18" stroke="rgba(255,255,255,.7)" strokeWidth="3" strokeLinecap="round" /></g>
          <circle cx="112" cy="30" r="5" fill="#FF7A6E" className="lb-ster" /><circle cx="44" cy="84" r="3.5" fill="#8FE3F0" className="lb-ster b" /><circle cx="122" cy="80" r="2.5" fill="#D9C3FF" className="lb-ster c" />
        </svg>
        {icoon && <span className="leeg-orb">{icoon}</span>}
      </span>
      <Kop className="leeg-titel">{titel}</Kop>
      {tekst && <span>{tekst}</span>}
      {children}
    </div>
  );
}

/** Modal sheet: bottom sheet on phones, centred dialog from tablet up. */
export function Sheet({ titel, open, sluit, children, voet }: { titel: string; open: boolean; sluit: () => void; children: ReactNode; voet?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={sluit} onClick={(e) => { if (e.target === ref.current) sluit(); }}>
      <div className="sheet-kop">
        <h2>{titel}</h2>
        <button type="button" className="icoonknop" onClick={sluit} aria-label="Sluiten"><Icon naam="kruis" /></button>
      </div>
      <div className="sheet-inhoud" tabIndex={0}>{children}</div>
      {voet && <div className="sheet-voet">{voet}</div>}
    </dialog>
  );
}

export function Kpi({ label, waarde, toon, sub, donker, children }: {
  label: string; waarde: ReactNode; toon?: "rood" | "turk" | "oker"; sub?: ReactNode; donker?: boolean; children?: ReactNode;
}) {
  return (
    <div className={`kpi${donker ? " kpi-donker" : ""}`}>
      <Bovenschrift>{label}</Bovenschrift>
      <b className={toon ? `t-${toon}` : undefined}>{waarde}</b>
      {sub && <span className="kpi-sub">{sub}</span>}
      {children}
    </div>
  );
}

export function Voortgang({ deel, licht, label }: { deel: number; licht?: boolean; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(deel * 100)));
  return (
    <div className={`balk${licht ? " balk-licht" : ""}`} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Page titles in the signature style: the last word in a gradient script letter with a full stop ("Claims" → "Claims." with the dot accented). */
function sierTitel(t: string): ReactNode {
  const w = t.trim().split(/\s+/);
  if (w.length === 1) return <em className="sier sier-heel">{w[0]}.</em>;
  return <>{w.slice(0, -1).join(" ")} <em className="sier">{w[w.length - 1]}.</em></>;
}

export function PaginaKop({ boven, titel, children }: { boven?: ReactNode; titel: ReactNode; children?: ReactNode }) {
  return (
    <header className="paginakop">
      <div>
        {boven && <Bovenschrift>{boven}</Bovenschrift>}
        <h1>{typeof titel === "string" ? sierTitel(titel) : titel}</h1>
      </div>
      {children && <div className="paginakop-acties">{children}</div>}
    </header>
  );
}
