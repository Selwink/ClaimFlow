import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useStore } from "../state/Store";
import { levKleur, levLetters, perLeverancier } from "../lib/claims";
import { euroKort, meervoud } from "../lib/format";
import { ClaimKaarten, ClaimTabel, sorteer } from "../components/ClaimLijst";
import { Icon } from "../components/Icon";
import { Kpi, Leeg, PaginaKop, Voortgang } from "../components/ui";
import { useBreed } from "../lib/useBreed";

export const LevAvatar = ({ naam, groot }: { naam: string; groot?: boolean }) => (
  <span className={`levavatar${groot ? " levavatar-groot" : ""}`} style={{ background: levKleur(naam) }} aria-hidden="true">{levLetters(naam)}</span>
);

export function Leveranciers() {
  const { actief } = useStore();
  const stats = useMemo(() => perLeverancier(actief), [actief]);
  return (
    <div className="pagina">
      <PaginaKop boven={meervoud(stats.length, "leverancier", "leveranciers")} titel="Leveranciers" />
      {stats.length === 0 ? <Leeg titel="Nog geen leveranciers" /> : (
        <div className="levraster">
          {stats.map((s) => {
            const beoordeeld = s.gehN + s.afgN;
            return (
              <Link key={s.naam} to={`/leveranciers/${encodeURIComponent(s.naam)}`} className="levkaart">
                <div className="levkaart-kop"><LevAvatar naam={s.naam} /><b>{s.naam}</b><Icon naam="verder" maat={18} /></div>
                <div className="levkaart-geld"><span>Open</span><b className={s.open ? "t-rood" : undefined}>{euroKort(s.open)}</b></div>
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
  const mail = inst.levMail[naam];
  if (!s) return <div className="pagina"><Leeg titel="Leverancier niet gevonden"><Link className="knop knop-zacht" to="/leveranciers">Alle leveranciers</Link></Leeg></div>;
  const beoordeeld = s.gehN + s.afgN;
  const gesorteerd = sorteer(lijst, { veld: "dagen", omhoog: false });
  return (
    <div className="pagina">
      <Link to="/leveranciers" className="terugknop terugknop-donker"><Icon naam="terug" maat={18} /> Leveranciers</Link>
      <PaginaKop boven={inst.uitbesteedLev.includes(naam) ? "Uitbesteed" : "Leverancier"} titel={<span className="lev-titel"><LevAvatar naam={naam} groot />{naam}</span>}>
        {mail && <a className="knop knop-zacht" href={`mailto:${mail}`}><Icon naam="mail" maat={18} /> Mailen</a>}
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
