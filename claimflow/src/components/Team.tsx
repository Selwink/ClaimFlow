import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { dezeMaand, euroKort, ls, periodLabel } from "../lib/format";
import { dezeMaandTerug, dezeWeek, teruggehaaldPerMaand, totaalTerug } from "../lib/team";
import { Icon } from "./Icon";
import { Optel } from "./Optel";

/** Start page: the total the claims have brought in so far. */
export function TotaalKaart() {
  const { actief } = useStore();
  const t = useMemo(() => totaalTerug(actief), [actief]);
  return (
    <section className="totaalkaart" aria-labelledby="totaal-kop">
      <span className="totaal-ic" aria-hidden="true"><Icon naam="vink" maat={22} /></span>
      <div>
        <small className="bovenschrift" id="totaal-kop">Totaal teruggehaald</small>
        <b className="totaal-bedrag"><Optel waarde={t.bedrag} opmaak={euroKort} ms={1300} /></b>
        <span className="totaal-sub">{t.aantal === 1 ? "1 claim" : `${t.aantal} claims`} gehonoreerd · geld is binnen</span>
      </div>
    </section>
  );
}

/** Vandaag card: the team's progress toward this month's goal, and what everyone did together this week. */
export function TeamKaart() {
  const { actief, inst, naam } = useStore();
  const maand = useMemo(() => dezeMaandTerug(actief), [actief]);
  const week = useMemo(() => dezeWeek(actief, naam), [actief, naam]);
  const doel = inst.maanddoel;
  const deel = doel ? Math.min(1, maand.bedrag / doel) : 0;
  const gehaald = maand.bedrag >= doel;
  const maandNaam = periodLabel(dezeMaand()).split(" ")[0].toLowerCase();
  const mijn = [week.ik.toegevoegd && `${week.ik.toegevoegd} toegevoegd`, week.ik.ingediend && `${week.ik.ingediend} ingediend`, week.ik.gehonoreerd && `${week.ik.gehonoreerd} gehonoreerd`].filter(Boolean);

  return (
    <section className={`teamkaart${gehaald ? " teamkaart-gehaald" : ""}`} aria-labelledby="team-kop">
      <div className="teamkaart-kop">
        <span className="team-ic" aria-hidden="true"><Icon naam={gehaald ? "vink" : "persoon"} maat={22} /></span>
        <div>
          <small className="bovenschrift" id="team-kop">Samen in {maandNaam}</small>
          <b className="team-bedrag"><Optel waarde={maand.bedrag} opmaak={euroKort} ms={1100} /> <span>van {euroKort(doel)}</span></b>
        </div>
      </div>
      <div className="balk balk-licht team-balk" role="progressbar" aria-label="Maanddoel" aria-valuenow={Math.round(deel * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.round(deel * 100)}%` }} /></div>
      <p className="team-regel">{gehaald ? <><b>Maanddoel gehaald!</b> Mooi werk, team.</> : <>Nog <b>{euroKort(doel - maand.bedrag)}</b> tot het maanddoel.</>}</p>
      <div className="team-week" aria-label="Deze week samen">
        <div><b><Optel waarde={week.team.toegevoegd} /></b><span>toegevoegd</span></div>
        <div><b><Optel waarde={week.team.ingediend} /></b><span>ingediend</span></div>
        <div><b className="t-turk"><Optel waarde={week.team.gehonoreerd} /></b><span>gehonoreerd</span></div>
      </div>
      <p className="team-ik"><Icon naam="persoon" maat={14} /> {mijn.length ? <>Jouw week: {mijn.join(", ")}. Dank je!</> : <>Deze week nog niets van jou. Elke claim telt mee voor het bedrijf.</>}</p>
    </section>
  );
}

/** Celebration for everyone, once per month, when the team reaches the monthly goal. */
export function DoelGehaald() {
  const { actief, inst, geladen, rol } = useStore();
  const maand = useMemo(() => dezeMaandTerug(actief), [actief]);
  const [feest, setFeest] = useState(false);
  useEffect(() => {
    if (!geladen || !rol || maand.bedrag < inst.maanddoel) return;
    const k = `claimflow-doel-${dezeMaand()}`;
    if (ls.get(k)) return;
    ls.set(k, "1");
    // wait for the opening screen and the welcome tour (which appears shortly after it) to be gone
    let rustig = 0;
    const t = setInterval(() => {
      if (document.querySelector(".splash, .welkom")) { rustig = 0; return; }
      rustig += 300;
      if (rustig < 1200) return;
      clearInterval(t); setFeest(true);
    }, 300);
    return () => clearInterval(t);
  }, [geladen, rol, maand.bedrag, inst.maanddoel]);
  if (!feest) return null;
  return (
    <div className="feest" role="dialog" aria-modal="true" aria-labelledby="doel-titel" onClick={() => setFeest(false)}>
      <div className="confetti" aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      <div className="feest-kaart" onClick={(e) => e.stopPropagation()}>
        <span className="team-ic team-ic-groot" aria-hidden="true"><Icon naam="vink" maat={36} /></span>
        <small className="bovenschrift rood">Maanddoel gehaald!</small>
        <h2 id="doel-titel">{euroKort(maand.bedrag)} teruggehaald</h2>
        <p className="t-zacht">Het team heeft het doel van {euroKort(inst.maanddoel)} voor {periodLabel(dezeMaand()).toLowerCase()} gehaald. Mooi werk, iedereen!</p>
        <button type="button" className="knop knop-rood knop-vol" onClick={() => setFeest(false)} autoFocus>Top!</button>
      </div>
    </div>
  );
}

/** Rapportage: what the team got back each month against the goal. */
export function TeamPerMaand() {
  const { actief, inst } = useStore();
  const maanden = useMemo(() => [...teruggehaaldPerMaand(actief).entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 6), [actief]);
  if (!maanden.length) return <p className="t-zacht">Nog niets teruggehaald.</p>;
  const max = Math.max(inst.maanddoel, ...maanden.map(([, v]) => v.bedrag));
  return (
    <>
      <ul className="team-maanden">
        {maanden.map(([m, v]) => {
          const gehaald = v.bedrag >= inst.maanddoel;
          return (
            <li key={m}>
              <span className="tm-maand">{periodLabel(m)}</span>
              <span className="tm-balk" aria-hidden="true"><i style={{ width: `${(v.bedrag / max) * 100}%` }} className={gehaald ? "gehaald" : ""} /><em style={{ left: `${(inst.maanddoel / max) * 100}%` }} /></span>
              <span className="tm-bedrag mono">{euroKort(v.bedrag)}</span>
              <span className={`tm-doel${gehaald ? " gehaald" : ""}`} aria-label={gehaald ? "doel gehaald" : "doel niet gehaald"}>{gehaald ? "✓" : "–"}</span>
            </li>
          );
        })}
      </ul>
      <p className="t-zacht tm-uitleg">Het streepje is het maanddoel van {euroKort(inst.maanddoel)}. <Link to="/beheer">Aanpassen in Beheer</Link></p>
    </>
  );
}
