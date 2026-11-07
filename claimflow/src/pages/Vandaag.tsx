import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { dagenOpen, isOpen, overTermijn, som, statusVan, titelVan, afgehandeldOp } from "../lib/claims";
import { datum, euroKort, meervoud } from "../lib/format";
import { aandachtVan, ClaimTabel } from "../components/ClaimLijst";
import { Icon } from "../components/Icon";
import { Bovenschrift, Kpi, Leeg, Voortgang } from "../components/ui";

function groet() {
  const u = new Date().getHours();
  return u < 6 ? "Goedenacht" : u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
}

/** Start screen: a short briefing of what needs doing today. */
export function Vandaag() {
  const { actief, inst, naam, magBewerken } = useStore();
  const nav = useNavigate();
  const open = actief.filter(isOpen);
  const terug = actief.filter((c) => statusVan(c) === "gehonoreerd");
  const afgewezen = actief.filter((c) => statusVan(c) === "afgewezen");
  const nogTerug = som(open.filter((c) => !c.uitbesteed));
  const teruggehaald = som(terug);
  const deel = teruggehaald + nogTerug ? teruggehaald / (teruggehaald + nogTerug) : 0;
  const laat = open.filter((c) => overTermijn(c, inst.dagen));
  const taken = open.map((c) => ({ c, a: aandachtVan(c, inst.dagen) })).filter((x) => x.a)
    .sort((x, y) => (x.a!.toon === "rood" ? 0 : 1) - (y.a!.toon === "rood" ? 0 : 1));
  const honorering = terug.length + afgewezen.length ? Math.round((terug.length / (terug.length + afgewezen.length)) * 100) : null;
  const recent = [...terug].sort((a, b) => (afgehandeldOp(b) || b.bijgewerkt || "").localeCompare(afgehandeldOp(a) || a.bijgewerkt || "")).slice(0, 3);
  const vandaagTekst = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const voornaam = (naam || "").split(" ")[0];

  return (
    <div className="pagina vandaag">
      <header className="groet">
        <div>
          <Bovenschrift>{vandaagTekst}</Bovenschrift>
          <h1>
            {groet()}{voornaam ? ` ${voornaam}` : ""}.{" "}
            <span className="groet-regel">
              {taken.length ? <><em>{meervoud(taken.length, "claim", "claims")}</em> {taken.length === 1 ? "vraagt" : "vragen"} je aandacht.</> : <><em className="rustig">Alles loopt.</em> Niets dringends vandaag.</>}
            </span>
          </h1>
        </div>
        {magBewerken && <Link to="/nieuw" className="knop knop-rood alleen-desktop"><Icon naam="plus" maat={18} /> Nieuwe claim</Link>}
      </header>

      <section className="kpi-rij" aria-label="Kerncijfers">
        <div className="geldkaart">
          <Bovenschrift>Nog terug te halen</Bovenschrift>
          <b className="geld">{euroKort(nogTerug)}</b>
          <Voortgang deel={deel} />
          <div className="geld-r"><span>{euroKort(teruggehaald)} terug</span><span>{Math.round(deel * 100)}%</span></div>
          <div className="geld-mini alleen-mobiel">
            <button type="button" onClick={() => nav("/claims?tab=aandacht")}><b className={laat.length ? "rood" : ""}>{laat.length}</b><span>over termijn</span></button>
            <button type="button" onClick={() => nav("/claims?tab=open")}><b>{open.length}</b><span>open</span></button>
            <button type="button" onClick={() => nav("/claims?tab=gehonoreerd")}><b>{terug.length}</b><span>gehonoreerd</span></button>
          </div>
        </div>
        <Link to="/claims?tab=gehonoreerd" className="kpi-link alleen-desktop"><Kpi label="Teruggehaald" waarde={euroKort(teruggehaald)} toon="turk" sub={meervoud(terug.length, "claim", "claims")} /></Link>
        <Link to="/claims?tab=aandacht" className="kpi-link alleen-desktop"><Kpi label="Over termijn" waarde={laat.length} toon={laat.length ? "rood" : undefined} sub={`termijn ${inst.dagen} dagen`} /></Link>
        <Link to="/rapportage" className="kpi-link alleen-desktop"><Kpi label="Honorering" waarde={honorering == null ? "—" : `${honorering}%`} sub={`${terug.length} van ${terug.length + afgewezen.length} beoordeeld`} /></Link>
      </section>

      <div className="vandaag-raster">
        <section aria-labelledby="kop-taken">
          <h2 className="sectiekop" id="kop-taken">Vandaag</h2>
          {taken.length === 0 ? (
            <Leeg titel="Niets te doen" tekst="Alle open claims zijn ingediend en binnen de termijn." />
          ) : (
            <>
              <ul className="kaartlijst alleen-mobiel">
                {taken.slice(0, 5).map(({ c, a }) => (
                  <li key={c.id}>
                    <button type="button" className={`taak${a!.toon === "rood" ? " taak-laat" : ""}`} onClick={() => nav(`/claims/${c.id}`)}>
                      <span className={`taak-ic ic-${a!.toon}`}>{a!.toon === "rood" ? `${dagenOpen(c)?.dagen ?? 0}d` : <Icon naam={c.inkoopnummer ? "klok" : "document"} maat={18} />}</span>
                      <span className="taak-t"><b>{titelVan(c)}</b><span>{a!.tekst}</span></span>
                      <span className={`chip chip-${a!.toon}`}>{a!.actie}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="alleen-desktop"><ClaimTabel claims={taken.slice(0, 8).map((x) => x.c)} termijn={inst.dagen} /></div>
              {taken.length > 5 && <Link className="meer-link" to="/claims?tab=open">Alle {taken.length} bekijken <Icon naam="verder" maat={16} /></Link>}
            </>
          )}
        </section>

        <section aria-labelledby="kop-terug">
          <h2 className="sectiekop" id="kop-terug">Teruggehaald</h2>
          {recent.length === 0 ? <Leeg titel="Nog niets gehonoreerd" /> : (
            <ul className="kaartlijst">
              {recent.map((c) => (
                <li key={c.id}>
                  <button type="button" className="taak" onClick={() => nav(`/claims/${c.id}`)}>
                    <span className="taak-ic ic-turk"><Icon naam="vink" maat={18} /></span>
                    <span className="taak-t"><b>{titelVan(c)}</b><span>{c.leverancier} · {datum(afgehandeldOp(c) || c.bijgewerkt) || "onlangs"}</span></span>
                    <span className="bedrag-plus">+{euroKort(c.bedrag)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {magBewerken && <Link to="/nieuw" className="grootknop alleen-mobiel"><span aria-hidden="true">+</span> Nieuwe claim</Link>}
    </div>
  );
}
