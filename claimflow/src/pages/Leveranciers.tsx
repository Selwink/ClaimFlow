import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useStore } from "../state/Store";
import { levKleur, levLetters, overTermijn, perLeverancier } from "../lib/claims";
import { euroKort, meervoud } from "../lib/format";
import { ClaimKaarten, ClaimTabel, sorteer } from "../components/ClaimLijst";
import { Icon } from "../components/Icon";
import { Kpi, Leeg, PaginaKop, Voortgang } from "../components/ui";
import { useBreed } from "../lib/useBreed";
import { logoVan } from "../lib/levlogo";
import { claimMaand } from "../lib/team";
import { som } from "../lib/claims";

export const LevAvatar = ({ naam, groot }: { naam: string; groot?: boolean }) => (
  logoVan(naam) ? <span className={`levavatar levavatar-logo${groot ? " levavatar-groot" : ""}`} aria-hidden="true"><img src={logoVan(naam)!} alt="" /></span>
    : <span className={`levavatar${groot ? " levavatar-groot" : ""}`} style={{ background: levKleur(naam) }} aria-hidden="true">{levLetters(naam)}</span>
);

/** Six small bars: what was claimed at this supplier per month. */
function LevGrafiek({ waarden, kleur }: { waarden: number[]; kleur: string }) {
  const max = Math.max(1, ...waarden);
  return (
    <svg className="levgrafiek" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
      {waarden.map((v, i) => <rect key={i} x={i * 20 + 3} y={34 - (v / max) * 30} width="14" height={Math.max(2, (v / max) * 30)} rx="3" fill={kleur} opacity={i === waarden.length - 1 ? 1 : .55} style={{ animationDelay: `${i * 70}ms` }} />)}
    </svg>
  );
}

export function Leveranciers() {
  const { actief, inst } = useStore();
  const stats = useMemo(() => perLeverancier(actief), [actief]);
  // score 0–100: mostly how often claims are honoured, minus claims stuck past the deadline
  const scores = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const s of stats) {
      const eigen = actief.filter((c) => ((c.leverancier || "").trim() || "Zonder leverancier") === s.naam);
      const laat = eigen.filter((c) => overTermijn(c, inst.dagen)).length, beoordeeld = s.gehN + s.afgN;
      m.set(s.naam, beoordeeld || s.openN ? Math.max(5, Math.min(99, Math.round((beoordeeld ? s.gehN / beoordeeld : .7) * 70 + (1 - laat / Math.max(1, s.openN)) * 30))) : null);
    }
    return m;
  }, [stats, actief, inst.dagen]);
  const maanden = useMemo(() => {
    const nu = new Date(); const ks = Array.from({ length: 6 }, (_, i) => { const x = new Date(nu.getFullYear(), nu.getMonth() - 5 + i, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; });
    const m = new Map<string, number[]>();
    for (const c of actief) { const n = (c.leverancier || "").trim() || "Zonder leverancier"; const k = ks.indexOf(claimMaand(c)); if (k < 0) continue; const r = m.get(n) || [0, 0, 0, 0, 0, 0]; r[k] += som([c]); m.set(n, r); }
    return m;
  }, [actief]);
  return (
    <div className="pagina">
      <PaginaKop boven={meervoud(stats.length, "leverancier", "leveranciers")} titel="Leveranciers" />
      {stats.length === 0 ? <Leeg titel="Nog geen leveranciers" /> : (
        <div className="levraster">
          {stats.map((s) => {
            const beoordeeld = s.gehN + s.afgN;
            return (
              <Link key={s.naam} to={`/leveranciers/${encodeURIComponent(s.naam)}`} className="levkaart">
                <div className="levkaart-kop"><LevAvatar naam={s.naam} /><span className="levkaart-naam"><b>{s.naam}</b>{scores.get(s.naam) != null && <span className={`lev-score ${scores.get(s.naam)! >= 80 ? "goed" : scores.get(s.naam)! >= 60 ? "mid" : "laag"}`} title="Score: honorering en claims op tijd">● score {scores.get(s.naam)}</span>}</span><Icon naam="verder" maat={18} /></div>
                <div className="levkaart-geld"><span>Totaal</span><b>{euroKort(s.totaal)}</b><small className={s.open ? "t-rood" : undefined}>{euroKort(s.open)} open</small></div>
                <LevGrafiek waarden={maanden.get(s.naam) || [0, 0, 0, 0, 0, 0]} kleur={levKleur(s.naam)} />
                <Voortgang deel={s.totaal ? (s.totaal - s.open) / s.totaal : 0} licht label={`${s.naam}: afgehandeld deel`} />
                <dl className="levkaart-cijfers">
                  <div><dt>Claims</dt><dd>{s.n}</dd></div>
                  <div><dt>Open</dt><dd>{s.openN}</dd></div>
                  <div><dt>Honorering</dt><dd>{beoordeeld ? `${Math.round((s.gehN / beoordeeld) * 100)}%` : "—"}</dd></div>
                  <div><dt>Doorloop</dt><dd>{s.doorloop != null ? `${s.doorloop} d` : "—"}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LeverancierDetail() {
  const { naam = "" } = useParams();
  const { actief, inst } = useStore();
  const breed = useBreed();
  const lijst = useMemo(() => actief.filter((c) => ((c.leverancier || "").trim() || "Zonder leverancier") === naam), [actief, naam]);
  const s = perLeverancier(lijst)[0];
  if (!s) return <div className="pagina"><Leeg titel="Leverancier niet gevonden"><Link className="knop knop-zacht" to="/leveranciers">Alle leveranciers</Link></Leeg></div>;
  const beoordeeld = s.gehN + s.afgN;
  const gesorteerd = sorteer(lijst, { veld: "dagen", omhoog: false });
  return (
    <div className="pagina">
      <Link to="/leveranciers" className="terugknop terugknop-donker"><Icon naam="terug" maat={18} /> Leveranciers</Link>
      <PaginaKop boven={inst.uitbesteedLev.includes(naam) ? "Uitbesteed" : "Leverancier"} titel={<span className="lev-titel"><LevAvatar naam={naam} groot />{naam}</span>}>
        <Link className="knop knop-zacht" to={`/claims?lev=${encodeURIComponent(naam)}`}><Icon naam="lijst" maat={18} /> In claimlijst</Link>
      </PaginaKop>
      <section className="kpi-rij kpi-rij-4">
        <Kpi donker label="Open" waarde={euroKort(s.open)} sub={meervoud(s.openN, "claim", "claims")} />
        <Kpi label="Totaal" waarde={euroKort(s.totaal)} sub={meervoud(s.n, "claim", "claims")} />
        <Kpi label="Honorering" waarde={beoordeeld ? `${Math.round((s.gehN / beoordeeld) * 100)}%` : "—"} toon="turk" sub={`${s.gehN} gehonoreerd · ${s.afgN} afgewezen`} />
        <Kpi label="Doorlooptijd" waarde={s.doorloop != null ? `${s.doorloop} d` : "—"} sub={s.oudste ? `oudste open: ${s.oudste} d` : "geen open claims"} toon={s.oudste >= inst.dagen ? "rood" : undefined} />
      </section>
      {breed ? <ClaimTabel claims={gesorteerd} termijn={inst.dagen} /> : <ClaimKaarten claims={gesorteerd} termijn={inst.dagen} />}
    </div>
  );
}
