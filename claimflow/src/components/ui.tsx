import { useEffect, useRef, type ReactNode } from "react";
import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import type { Toon } from "../lib/claims";
import { Icon } from "./Icon";

export function Logo({ licht = true, klein = false }: { licht?: boolean; klein?: boolean }) {
  return (
    <span className={`logo${licht ? " logo-licht" : ""}${klein ? " logo-klein" : ""}`}>
      <span className="logo-merk" aria-hidden="true"><Icon naam="vink" maat={klein ? 13 : 15} /></span>
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

export function Leeg({ titel, tekst, children }: { titel: string; tekst?: string; children?: ReactNode }) {
  return (
    <div className="leeg">
      <b>{titel}</b>
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
      <div className="sheet-inhoud">{children}</div>
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

export function Voortgang({ deel, licht }: { deel: number; licht?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(deel * 100)));
  return (
    <div className={`balk${licht ? " balk-licht" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PaginaKop({ boven, titel, children }: { boven?: ReactNode; titel: ReactNode; children?: ReactNode }) {
  return (
    <header className="paginakop">
      <div>
        {boven && <Bovenschrift>{boven}</Bovenschrift>}
        <h1>{titel}</h1>
      </div>
      {children && <div className="paginakop-acties">{children}</div>}
    </header>
  );
}
