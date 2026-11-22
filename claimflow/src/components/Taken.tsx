import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { titelVan } from "../lib/claims";
import { GROEP, werkbak, type Reden } from "../lib/werkbak";
import { Icon, type IconNaam } from "./Icon";

/**
 * In-app notice instead of an e-mail: each time the app opens, once the opening screen has gone,
 * a card shows what needs doing right now (from the Werkbak). Nothing to do → no card.
 */
const SOORT: Partial<Record<Reden, { icoon: IconNaam; toon: string }>> = {
  termijn: { icoon: "waarschuwing", toon: "wic-rood" },
  inkoop: { icoon: "potlood", toon: "wic-oker" },
  indienen: { icoon: "upload", toon: "wic-oker" },
  bijna: { icoon: "klok", toon: "wic-turk" },
};

export function TakenPopup() {
  const { actief, inst, rol, geladen, naam } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const taken = useMemo(() => werkbak(actief, inst.dagen).filter((t) => t.bak !== "wacht"), [actief, inst.dagen]);
  const groepen = useMemo(() => {
    const m = new Map<Reden, string[]>();
    for (const t of taken) m.set(t.reden, [...(m.get(t.reden) || []), titelVan(t.claim)]);
    return [...m.entries()];
  }, [taken]);

  const getoond = useRef(false);
  const heeftTaken = taken.length > 0;
  useEffect(() => {
    if (!rol || !geladen || getoond.current || !heeftTaken) return;
    const t = setInterval(() => {
      if (document.documentElement.dataset.splash || document.querySelector(".splash")) return;
      clearInterval(t);
      getoond.current = true;
      setTimeout(() => setOpen(true), 250);
    }, 150);
    return () => clearInterval(t);
  }, [rol, geladen, heeftTaken]);
  useEffect(() => { if (open) knop.current?.focus(); }, [open]);

  if (!open) return null;
  const sluit = (naar?: string) => { setOpen(false); if (naar) nav(naar); };
  const voornaam = (naam || "").split(" ")[0];
  const laat = taken.filter((t) => t.reden === "termijn").length;

  return (
    <div className="welkom-achter" onClick={(e) => { if (e.target === e.currentTarget) sluit(); }} onKeyDown={(e) => { if (e.key === "Escape") sluit(); }}>
      <div className="welkom taken-pop" role="dialog" aria-modal="true" aria-labelledby="taken-titel">
        <button type="button" className="welkom-sluit" onClick={() => sluit()} aria-label="Sluiten"><Icon naam="kruis" maat={18} /></button>
        <div className="taken-kop">
          <span className={`taken-hoofd ${laat ? "wic-rood" : "wic-aub"}`} aria-hidden="true"><Icon naam={laat ? "waarschuwing" : "lijst"} maat={26} /></span>
          <div>
            <p className="taken-hoi">{voornaam ? `Hoi ${voornaam}` : "Vandaag"}</p>
            <h2 id="taken-titel">Dit moet er gebeuren</h2>
          </div>
        </div>
        <p className="taken-samenvatting"><b>{taken.length}</b> {taken.length === 1 ? "taak staat" : "taken staan"} klaar op Home</p>
        <ul className="taken-groepen">
          {groepen.map(([reden, titels], i) => {
            const s = SOORT[reden] || { icoon: "lijst" as IconNaam, toon: "wic-aub" };
            const meer = titels.length - 2;
            return (
              <li key={reden} style={{ animationDelay: `${150 + i * 80}ms` }}>
                <span className={`taken-ic ${s.toon}`} aria-hidden="true"><Icon naam={s.icoon} maat={18} /></span>
                <span className="taken-t">
                  <b>{GROEP[reden]}</b>
                  <span>{titels.slice(0, 2).join(", ")}{meer > 0 ? ` en nog ${meer}` : ""}</span>
                </span>
                <span className="taken-n" aria-label={`${titels.length} taken`}>{titels.length}</span>
              </li>
            );
          })}
        </ul>
        <div className="taken-acties">
          <button ref={knop} type="button" className="knop knop-rood knop-groot-vol" onClick={() => sluit("/")}>Naar Home <Icon naam="pijl" maat={18} /></button>
          <button type="button" className="taken-later" onClick={() => sluit()}>Later</button>
        </div>
      </div>
    </div>
  );
}
