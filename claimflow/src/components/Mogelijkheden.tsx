import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { werkbak } from "../lib/werkbak";
import { Icon, type IconNaam } from "./Icon";

/**
 * Pop-up "Wat kun je hier": opens when you log in and each time you open the app (once per session),
 * listing what this account can do and see, each with a direct link. Also opens from Profiel.
 */
const GEZIEN = "claimflow-uitleg-gezien";
const OPEN = "claimflow-uitleg-open";
export const toonMogelijkheden = () => window.dispatchEvent(new Event(OPEN));
/** Called on login so the pop-up shows again, even within the same session. */
export const naInloggenUitleg = () => { try { sessionStorage.removeItem(GEZIEN); } catch { /* geen opslag */ } };

type Item = { icoon: IconNaam; titel: string; tekst: string; naar: string };

export function Mogelijkheden() {
  const { rol, geladen, magBewerken, actief, inst } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const taken = useMemo(() => werkbak(actief, inst.dagen).filter((t) => t.bak === "nu").length, [actief, inst.dagen]);

  useEffect(() => {
    const opnieuw = () => setOpen(true);
    window.addEventListener(OPEN, opnieuw);
    return () => window.removeEventListener(OPEN, opnieuw);
  }, []);
  useEffect(() => {
    if (!rol || !geladen) return;
    try { if (sessionStorage.getItem(GEZIEN)) return; } catch { /* geen opslag */ }
    const t = setInterval(() => {
      if (document.documentElement.dataset.splash || document.querySelector(".splash")) return;
      clearInterval(t);
      try { sessionStorage.setItem(GEZIEN, "1"); } catch { /* geen opslag */ }
      setTimeout(() => setOpen(true), 250);
    }, 150);
    return () => clearInterval(t);
  }, [rol, geladen]);
  useEffect(() => { if (open) knop.current?.focus(); }, [open]);
  if (!open) return null;

  const items: Item[] = magBewerken ? [
    { icoon: "document", titel: "LGAR-bon inlezen", tekst: "Pdf of foto: de velden vullen zichzelf in en de bon blijft bij de claim.", naar: "/nieuw?bron=camera" },
    { icoon: "lijst", titel: "Claims beheren", tekst: "Zoeken, indienen, op gehonoreerd zetten en notities schrijven.", naar: "/claims" },
    { icoon: "afbeelding", titel: "Bonnen en foto’s", tekst: "Bij elke claim de bon en foto’s bekijken of toevoegen.", naar: "/claims" },
    { icoon: "extern", titel: "Uitbesteed", tekst: "Alles wat een leverancier verder zelf oppakt.", naar: "/uitbesteed" },
    { icoon: "grafiek", titel: "Rapportage", tekst: "Cijfers per maand en een maandrapport als PDF.", naar: "/rapportage" },
    { icoon: "robot", titel: "Assistent Flow", tekst: "Vraag wat er openstaat of wat er moet gebeuren.", naar: "/assistent" },
    { icoon: "persoon", titel: "Profiel", tekst: "Meldingen, mail, weergave en kleuren instellen.", naar: "/beheer" },
  ] : [
    { icoon: "lijst", titel: "Claims inzien", tekst: "Alle claims zoeken, filteren en openen.", naar: "/claims" },
    { icoon: "document", titel: "Bonnen inzien", tekst: "Open een claim om de gekoppelde LGAR-bon te bekijken of te downloaden.", naar: "/claims" },
    { icoon: "afbeelding", titel: "Foto’s bekijken", tekst: "De foto’s die bij een claim horen.", naar: "/claims" },
    { icoon: "extern", titel: "Uitbesteed", tekst: "Alles wat een leverancier verder zelf oppakt.", naar: "/uitbesteed" },
    { icoon: "fabriek", titel: "Leveranciers", tekst: "Cijfers en claims per leverancier.", naar: "/leveranciers" },
    { icoon: "grafiek", titel: "Rapportage", tekst: "Cijfers per maand en een maandrapport als PDF.", naar: "/rapportage" },
    { icoon: "persoon", titel: "Profiel", tekst: "Weergave en kleuren instellen. Claims wijzigen? Vraag een beheerder.", naar: "/beheer" },
  ];
  const sluit = (naar?: string) => { setOpen(false); if (naar) nav(naar); };

  return (
    <div className="welkom-achter" onClick={(e) => { if (e.target === e.currentTarget) sluit(); }} onKeyDown={(e) => { if (e.key === "Escape") sluit(); }}>
      <div className="welkom taken-pop mg-pop" role="dialog" aria-modal="true" aria-labelledby="mg-titel">
        <button type="button" className="welkom-sluit" onClick={() => sluit()} aria-label="Sluiten"><Icon naam="kruis" maat={18} /></button>
        <div className="taken-kop">
          <span className="taken-hoofd wic-rood" aria-hidden="true"><Icon naam="vink" maat={26} /></span>
          <div><p className="taken-hoi">{magBewerken ? "Beheerder" : "Alleen inzien"}</p><h2 id="mg-titel">Wat kun je hier?</h2></div>
        </div>
        {magBewerken && taken > 0 && (
          <button type="button" className="mg-taken" onClick={() => sluit("/")}><Icon naam="waarschuwing" maat={16} /> {taken} {taken === 1 ? "taak staat" : "taken staan"} klaar op Home <Icon naam="pijl" maat={14} /></button>
        )}
        <ul className="taken-groepen mg-lijst">
          {items.map((it, i) => (
            <li key={it.titel} style={{ animationDelay: `${120 + i * 50}ms` }}>
              <button type="button" onClick={() => sluit(it.naar)}>
                <span className="taken-ic wic-aub" aria-hidden="true"><Icon naam={it.icoon} maat={18} /></span>
                <span className="taken-t"><b>{it.titel}</b><span>{it.tekst}</span></span>
                <Icon naam="pijl" maat={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="taken-acties"><button ref={knop} type="button" className="knop knop-rood knop-groot-vol" onClick={() => sluit()}>Aan de slag <Icon naam="pijl" maat={18} /></button></div>
      </div>
    </div>
  );
}
