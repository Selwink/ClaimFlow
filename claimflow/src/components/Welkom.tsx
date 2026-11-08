import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { Icon, type IconNaam } from "./Icon";

/**
 * Unfolding welcome tour, shown every time the app opens (and after logging in), once the opening screen is gone.
 * Can be reopened from Beheer with `toonWelkom()`.
 */
const NA_INLOGGEN = "claimflow-welkom-tonen";
const OPNIEUW = "claimflow-welkom-opnieuw";
/** Called right after a successful login; the tour opens once the register has loaded. */
export const welkomNaInloggen = () => { try { sessionStorage.setItem(NA_INLOGGEN, "1"); } catch { /* private mode */ } };
export const toonWelkom = () => window.dispatchEvent(new Event(OPNIEUW));

interface Stap { icoon: IconNaam; toon: "rood" | "turk" | "oker" | "nacht" | "aub"; titel: string; tekst: string; punten: Array<[IconNaam, string]> }

function stappen(voornaam: string, magBewerken: boolean): Stap[] {
  return [
    { icoon: "vink", toon: "rood", titel: `Welkom${voornaam ? `, ${voornaam}` : ""}!`,
      tekst: "ClaimFlow houdt alle garantieclaims van Meppel bij, zodat er geen claim meer over de termijn gaat.",
      punten: [["klok", "Elke claim heeft 42 dagen; de app telt mee"], ["persoon", "Je naam staat bij alles wat je doet"], ["slot", "Je blijft 30 dagen ingelogd op dit apparaat"]] },
    { icoon: "huis", toon: "aub", titel: "Werkbak",
      tekst: "Je startscherm: alles wat er moet gebeuren, met de knop erbij.",
      punten: [["waarschuwing", "Rood = over de termijn: tijd om informatie bij de VAM op te vragen"], ["vink", "Tik op VAM gevraagd, Indienen of Inkoopnr invullen en de taak is klaar"], ["klok", "Later schuift een taak een week op"]] },
    magBewerken
      ? { icoon: "plus", toon: "rood", titel: "Claim toevoegen",
          tekst: "Tik op de rode + onderin. Kies hoe je begint:",
          punten: [["camera", "Foto van de LGAR: de velden vullen zich vanzelf"], ["upload", "LGAR-pdf inlezen"], ["potlood", "Zelf invullen; vaste bedragen gaan automatisch"]] }
      : { icoon: "lijst", toon: "nacht", titel: "Alles bekijken",
          tekst: "Je account kan alles zien. Wil je ook claims toevoegen of wijzigen? Vraag het aan een beheerder.",
          punten: [["lijst", "Claims: zoeken, filteren en sorteren"], ["fabriek", "Leveranciers: cijfers per leverancier"], ["download", "Exporteren naar Excel"]] },
    { icoon: "klok", toon: "turk", titel: "Een claim volgen",
      tekst: "Open een claim om alles te zien en bij te werken.",
      punten: [["klok", "De ring toont hoeveel dagen er nog over zijn"], ["vink", magBewerken ? "Met één tik naar Ingediend of Gehonoreerd" : "De status en de hele tijdlijn"], ["camera", "Foto’s en notities als bewijs voor de leverancier"]] },
    { icoon: "grafiek", toon: "oker", titel: "Overzicht houden",
      tekst: "Je hoeft niets bij te houden in Excel.",
      punten: [["mail", "Elke maandag een weekoverzicht per mail"], ["grafiek", "Cijfers: het teamdoel, wat terugkomt en per leverancier"], ["persoon", "Ik: je account, wachtwoord en instellingen"]] },
  ];
}

export function Welkom() {
  const { naam, rol, geladen, magBewerken } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [stap, setStap] = useState(0);
  const [richting, setRichting] = useState<1 | -1>(1);
  const knop = useRef<HTMLButtonElement>(null);
  const lijst = stappen((naam || "").split(" ")[0], magBewerken);
  const laatste = stap === lijst.length - 1;

  const getoond = useRef(false);
  useEffect(() => {
    if (!rol || !geladen || getoond.current) return;
    try { sessionStorage.removeItem(NA_INLOGGEN); } catch { /* private mode */ }
    // wait until the opening screen has gone, so the card visibly unfolds
    const t = setInterval(() => {
      if (document.documentElement.dataset.splash || document.querySelector(".splash")) return;
      clearInterval(t);
      getoond.current = true;
      setTimeout(() => { setStap(0); setOpen(true); }, 250);
    }, 150);
    return () => clearInterval(t);
  }, [rol, geladen]);
  useEffect(() => {
    const opnieuw = () => { setStap(0); setOpen(true); };
    window.addEventListener(OPNIEUW, opnieuw);
    return () => window.removeEventListener(OPNIEUW, opnieuw);
  }, []);
  useEffect(() => { if (open) knop.current?.focus(); }, [open, stap]);

  const sluit = (naar?: string) => {
    setOpen(false);
    if (naar) nav(naar);
  };
  const ga = (n: number) => { setRichting(n > stap ? 1 : -1); setStap(n); };

  if (!open) return null;
  const s = lijst[stap];
  return (
    <div className="welkom-achter" onClick={(e) => { if (e.target === e.currentTarget) sluit(); }} onKeyDown={(e) => { if (e.key === "Escape") sluit(); if (e.key === "ArrowRight" && !laatste) ga(stap + 1); if (e.key === "ArrowLeft" && stap > 0) ga(stap - 1); }}>
      <div className="welkom" role="dialog" aria-modal="true" aria-labelledby="welkom-titel" aria-describedby="welkom-tekst">
        <button type="button" className="welkom-sluit" onClick={() => sluit()} aria-label="Uitleg sluiten"><Icon naam="kruis" maat={18} /></button>
        <div className={`welkom-stap richting-${richting}`} key={stap}>
          <span className={`welkom-ic wic-${s.toon}`} aria-hidden="true"><Icon naam={s.icoon} maat={34} /></span>
          <p className="welkom-teller">Stap {stap + 1} van {lijst.length}</p>
          <h2 id="welkom-titel">{s.titel}</h2>
          <p id="welkom-tekst" className="welkom-tekst">{s.tekst}</p>
          <ul className="welkom-punten">
            {s.punten.map(([ic, t], i) => (
              <li key={t} style={{ animationDelay: `${180 + i * 90}ms` }}><span aria-hidden="true"><Icon naam={ic} maat={18} /></span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="welkom-stippen" role="tablist" aria-label="Stappen">
          {lijst.map((x, i) => <button key={x.titel} type="button" role="tab" aria-selected={i === stap} aria-label={`Stap ${i + 1}: ${x.titel}`} onClick={() => ga(i)} />)}
        </div>
        <div className="welkom-voet">
          {stap === 0
            ? <button type="button" className="knop knop-zacht" onClick={() => sluit()}>Overslaan</button>
            : <button type="button" className="knop knop-zacht" onClick={() => ga(stap - 1)}><Icon naam="terug" maat={18} /> Terug</button>}
          {laatste
            ? <button ref={knop} type="button" className="knop knop-rood" onClick={() => sluit(magBewerken ? "/nieuw" : "/claims")}>{magBewerken ? "Eerste claim toevoegen" : "Bekijk de claims"} <Icon naam="pijl" maat={18} /></button>
            : <button ref={knop} type="button" className="knop knop-rood" onClick={() => ga(stap + 1)}>Volgende <Icon naam="pijl" maat={18} /></button>}
        </div>
        {laatste && <button type="button" className="knop-link welkom-later" onClick={() => sluit()}>Naar Vandaag</button>}
      </div>
    </div>
  );
}
