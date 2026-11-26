import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { dagenOpen, geenBedrag, isOpen, metRegel, overTermijn, titelVan } from "../lib/claims";
import { euro, vandaag } from "../lib/format";
import { LANG_OPEN_DAGEN } from "../lib/export";
import { Icon } from "./Icon";
import { Confetti } from "./Confetti";
import { agendaLink, openOutlook } from "./AgendaKoppelen";
import { useToast } from "../state/Toast";

const NAGEKEKEN = "Nagekeken bij de maandagcheck";

/** Monday of this week as YYYY-MM-DD. */
function maandag(): string {
  const d = new Date(`${vandaag()}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weeknummer(): number {
  const d = new Date(`${vandaag()}T12:00:00`); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
const nagekeken = (c: Claim, vanaf: string) => (c.notities || []).some((n) => n.t === NAGEKEKEN && n.d >= vanaf);

/** Home: the weekly agenda item "Claims nakijken" — every claim open 21+ days, to be ticked off one by one this week. */
export function MaandagCheck() {
  const { actief, inst, naam, magBewerken, bewaar } = useStore();
  const [alles, setAlles] = useState(false);
  const [feest, setFeest] = useState(false);
  const toast = useToast();
  const naarOutlook = async () => {
    try { openOutlook(await agendaLink({ termijnen: false, maandag: true }), "ClaimFlow maandagcheck"); }
    catch (e) { toast(`Outlook openen lukte niet${e instanceof Error && e.message ? `: ${e.message}` : ""}`); }
  };
  const vanaf = maandag();
  const lijst = useMemo(() => actief.filter((c) => isOpen(c) && !c.uitbesteed && (dagenOpen(c)?.dagen ?? 0) >= LANG_OPEN_DAGEN)
    .sort((a, b) => (dagenOpen(b)?.dagen ?? 0) - (dagenOpen(a)?.dagen ?? 0)), [actief]);
  if (!lijst.length) return null;
  const klaar = lijst.filter((c) => nagekeken(c, vanaf)).length;
  const isMaandag = new Date().getDay() === 1;

  const vink = async (c: Claim) => {
    if (!magBewerken) return;
    if (nagekeken(c, vanaf)) {
      const n = [...(c.notities || [])]; const i = n.map((x) => x.t === NAGEKEKEN && x.d >= vanaf).lastIndexOf(true);
      if (i >= 0) n.splice(i, 1);
      await bewaar([{ ...c, notities: n }]);
    } else {
      const ok = await bewaar([metRegel(c, NAGEKEKEN, naam)]);
      if (ok && klaar + 1 === lijst.length) { setFeest(true); window.setTimeout(() => setFeest(false), 4200); }
    }
  };

  if (klaar === lijst.length && !isMaandag) {
    return <div className="mc mc-klaar" role="status"><Icon naam="vink" maat={18} /> <span><b>Maandagcheck klaar</b> · alle {lijst.length} lang openstaande claims zijn deze week nagekeken.</span></div>;
  }
  const zichtbaar = alles ? lijst : lijst.slice(0, 5);
  return (
    <section className={`mc${klaar === lijst.length ? " mc-af" : ""}`} aria-labelledby="mc-titel">
      {feest && <Confetti />}
      <div className="mc-kop">
        <span className="mc-dag" aria-hidden="true"><small>ma</small><b>{weeknummer()}</b></span>
        <div className="mc-t">
          <h2 id="mc-titel">Claims nakijken</h2>
          <span>Week {weeknummer()} · {LANG_OPEN_DAGEN} dagen of langer open · {klaar} van {lijst.length} nagekeken</span>
        </div>
        <span className="mc-ring" style={{ ["--p" as string]: `${(klaar / lijst.length) * 100}%` }} aria-hidden="true"><b>{klaar}/{lijst.length}</b></span>
      </div>
      <ul className="mc-lijst">
        {zichtbaar.map((c) => {
          const af = nagekeken(c, vanaf), dagen = dagenOpen(c)?.dagen ?? 0, laat = overTermijn(c, inst.dagen);
          return (
            <li key={c.id} className={af ? "af" : ""}>
              <button type="button" className="mc-vink" role="checkbox" aria-checked={af} disabled={!magBewerken} onClick={() => void vink(c)}
                aria-label={`${titelVan(c)} ${af ? "niet meer als nagekeken markeren" : "markeren als nagekeken"}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </button>
              <Link to={`/claims/${c.id}`} className="mc-claim">
                <b>{titelVan(c)}</b>
                <small>{[c.leverancier, c.inkoopnummer && `ink ${c.inkoopnummer}`, !geenBedrag(c) && euro(c.bedrag)].filter(Boolean).join(" · ")}</small>
              </Link>
              <span className={`mc-dagen${laat ? " laat" : ""}`}>{dagen} d{laat ? " · over termijn" : ""}</span>
            </li>
          );
        })}
      </ul>
      <div className="mc-voet">
        {lijst.length > 5 ? <button type="button" className="knop-link mc-meer" onClick={() => setAlles((a) => !a)}>{alles ? "Minder tonen" : `Toon alle ${lijst.length}`}</button> : <span />}
        <button type="button" className="mc-outlook" onClick={() => void naarOutlook()}><Icon naam="agenda" maat={16} /> Elke maandag in Outlook</button>
      </div>
      {!magBewerken && <p className="mc-uitleg">Alleen een beheerder kan claims afvinken.</p>}
    </section>
  );
}
