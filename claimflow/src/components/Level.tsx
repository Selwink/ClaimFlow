import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/Store";
import { ls, meervoud } from "../lib/format";
import { LEVELS, PUNTEN, levelVoor, ranglijst, scoreVan, type Soort } from "../lib/levels";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

/** The logged-in person's score and level, recalculated whenever the claims change. */
export function useMijnLevel() {
  const { actief, prullenbak, naam } = useStore();
  return useMemo(() => {
    const score = scoreVan([...actief, ...prullenbak], naam);
    return { score, ...levelVoor(score.xp) };
  }, [actief, prullenbak, naam]);
}

function LevelUitleg({ open, sluit }: { open: boolean; sluit: () => void }) {
  const { score, level } = useMijnLevel();
  return (
    <Sheet titel="Zo stijg je in level" open={open} sluit={sluit}>
      <p className="t-zacht">Je verdient XP met je werk in ClaimFlow. Per claim telt elke actie maar één keer, dus heen en weer zetten levert niets op.</p>
      <ul className="xp-tabel">
        {(Object.keys(PUNTEN) as Soort[]).map((s) => (
          <li key={s}><span className="xp-ic"><Icon naam={PUNTEN[s].icoon} maat={16} /></span><span>{PUNTEN[s].label}</span><b>+{PUNTEN[s].xp} XP</b><small>{score.perSoort[s]}×</small></li>
        ))}
      </ul>
      <h3 className="sectiekop">Alle levels</h3>
      <ol className="levels-lijst">
        {LEVELS.map((l) => (
          <li key={l.nr} className={l.nr < level.nr ? "gehaald" : l.nr === level.nr ? "nu" : "nog"}>
            <span className="lvl-badge lvl-klein"><Icon naam={l.icoon} maat={14} /></span>
            <span><b>Level {l.nr} · {l.naam}</b><small>vanaf {l.vanaf} XP</small></span>
            {l.nr < level.nr && <Icon naam="vink" maat={16} />}
            {l.nr === level.nr && <span className="chip chip-turk">jij</span>}
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/** Card on the Vandaag page: current level, progress to the next one, and this week's XP. */
export function LevelKaart() {
  const { score, level, volgende, deel, nogNodig } = useMijnLevel();
  const [uitleg, setUitleg] = useState(false);
  return (
    <section className="levelkaart" aria-label="Jouw level">
      <span className={`lvl-badge lvl-${Math.min(level.nr, 8)}`}><Icon naam={level.icoon} maat={22} /><em>{level.nr}</em></span>
      <div className="levelkaart-t">
        <small className="bovenschrift">Jouw level</small>
        <b>{level.naam}</b>
        <div className="balk balk-licht" role="progressbar" aria-label={`Voortgang naar ${volgende?.naam || "het hoogste level"}`} aria-valuenow={Math.round(deel * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${Math.round(deel * 100)}%` }} />
        </div>
        <span className="levelkaart-sub">
          {volgende ? <>Nog <b>{nogNodig} XP</b> tot {volgende.naam}</> : <>Hoogste level bereikt</>}
          {score.dezeWeek > 0 && <span className="xp-week">+{score.dezeWeek} XP deze week</span>}
        </span>
      </div>
      <button type="button" className="icoonknop" onClick={() => setUitleg(true)} aria-label="Hoe verdien ik XP?" title="Hoe verdien ik XP?"><Icon naam="verder" maat={18} /></button>
      <LevelUitleg open={uitleg} sluit={() => setUitleg(false)} />
    </section>
  );
}

/** Celebration when the logged-in person reaches a new level. The first visit only remembers the level. */
export function LevelOmhoog() {
  const { naam, geladen } = useStore();
  const { level } = useMijnLevel();
  const [feest, setFeest] = useState<number | null>(null);
  useEffect(() => {
    if (!naam || !geladen) return;
    const k = `claimflow-level-${naam.toLowerCase()}`;
    const vorig = Number(ls.get(k) || 0);
    if (vorig && level.nr > vorig) setFeest(level.nr);
    if (level.nr !== vorig) ls.set(k, String(level.nr));
  }, [naam, geladen, level.nr]);
  if (!feest) return null;
  const l = LEVELS[feest - 1];
  return (
    <div className="feest" role="dialog" aria-modal="true" aria-labelledby="feest-titel" onClick={() => setFeest(null)}>
      <div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      <div className="feest-kaart" onClick={(e) => e.stopPropagation()}>
        <span className={`lvl-badge lvl-groot lvl-${Math.min(l.nr, 8)}`}><Icon naam={l.icoon} maat={34} /><em>{l.nr}</em></span>
        <small className="bovenschrift rood">Level omhoog!</small>
        <h2 id="feest-titel">Je bent nu {l.naam}</h2>
        <p className="t-zacht">Level {l.nr} van {LEVELS.length}. Goed bezig, elke claim die terugkomt telt.</p>
        <button type="button" className="knop knop-rood knop-vol" onClick={() => setFeest(null)} autoFocus>Top!</button>
      </div>
    </div>
  );
}

/** Leaderboard of everyone who worked in the register. */
export function Ranglijst() {
  const { actief, prullenbak, naam } = useStore();
  const lijst = useMemo(() => ranglijst([...actief, ...prullenbak], naam ? [naam] : []), [actief, prullenbak, naam]);
  if (!lijst.length) return <p className="t-zacht">Nog geen punten verdiend.</p>;
  return (
    <ol className="ranglijst-lvl">
      {lijst.slice(0, 10).map((x, i) => {
        const { level } = levelVoor(x.xp);
        const ik = naam && x.naam.toLowerCase() === naam.toLowerCase();
        return (
          <li key={x.naam} className={ik ? "ik" : undefined}>
            <span className={`plek plek-${i + 1}`}>{i + 1}</span>
            <span className={`lvl-badge lvl-klein lvl-${Math.min(level.nr, 8)}`}><Icon naam={level.icoon} maat={13} /></span>
            <span className="rl-t"><b>{x.naam}{ik ? " (jij)" : ""}</b><small>Level {level.nr} · {level.naam}{x.dezeWeek ? ` · +${x.dezeWeek} deze week` : ""}</small></span>
            <b className="rl-xp">{x.xp} XP</b>
          </li>
        );
      })}
      {lijst.length > 10 && <li className="t-zacht">… en nog {meervoud(lijst.length - 10, "persoon", "personen")}</li>}
    </ol>
  );
}
