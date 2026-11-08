import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { datumOntbreekt, doorlooptijd, isOpen, overTermijn, perLeverancier, som, statusVan } from "../lib/claims";
import { dezeMaand, euroKort, isPeriode, meervoud, periodKort } from "../lib/format";
import { download, naarCsv } from "../lib/export";
import { Icon } from "../components/Icon";
import { Kpi, Leeg, PaginaKop, Voortgang } from "../components/ui";
import { LevAvatar } from "./Leveranciers";
import { Ranglijst } from "../components/Level";
import { Optel } from "../components/Optel";

export function Rapportage() {
  const { actief, inst } = useStore();
  const jaren = useMemo(() => [...new Set(actief.map((c) => c.periode?.slice(0, 4)).filter((j): j is string => !!j && /^\d{4}$/.test(j)))].sort().reverse(), [actief]);
  const [jaar, setJaar] = useState("");
  const lijst = useMemo(() => actief.filter((c) => !jaar || c.periode?.startsWith(jaar)), [actief, jaar]);

  const open = lijst.filter(isOpen);
  const geh = lijst.filter((c) => statusVan(c) === "gehonoreerd");
  const afg = lijst.filter((c) => statusVan(c) === "afgewezen");
  const terug = som(geh), nog = som(open), totaal = som(lijst);
  const beoordeeld = geh.length + afg.length;
  const doorlopen = lijst.filter((c) => !c.uitbesteed).map(doorlooptijd).filter((d): d is number => d != null);
  const gemDoorloop = doorlopen.length ? Math.round(doorlopen.reduce((a, b) => a + b, 0) / doorlopen.length) : null;

  const maanden = useMemo(() => {
    const m = new Map<string, { terug: number; open: number; af: number }>();
    for (const c of lijst) {
      if (!isPeriode(c.periode)) continue;
      const e = m.get(c.periode!) || { terug: 0, open: 0, af: 0 };
      const b = Number(c.bedrag) || 0;
      if (isOpen(c)) e.open += b; else if (statusVan(c) === "gehonoreerd") e.terug += b; else e.af += b;
      m.set(c.periode!, e);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [lijst]);
  const max = Math.max(1, ...maanden.map(([, v]) => v.terug + v.open + v.af));

  const terugkerend = useMemo(() => {
    const m = new Map<string, { naam: string; n: number; bedrag: number }>();
    for (const c of lijst) {
      const naam = (c.type || c.onderdeel || "").trim();
      if (!naam) continue;
      const k = naam.toLowerCase().replace(/\s+/g, " ");
      const e = m.get(k) || { naam, n: 0, bedrag: 0 };
      e.n++; e.bedrag += Number(c.bedrag) || 0;
      m.set(k, e);
    }
    return [...m.values()].filter((e) => e.n > 1).sort((a, b) => b.n - a.n || b.bedrag - a.bedrag).slice(0, 8);
  }, [lijst]);
  const levs = perLeverancier(lijst);

  return (
    <div className="pagina">
      <PaginaKop boven={jaar ? `Jaar ${jaar}` : "Alle jaren"} titel="Rapportage">
        <select className="pil pil-select" value={jaar} onChange={(e) => setJaar(e.target.value)} aria-label="Jaar">
          <option value="">Alle jaren</option>
          {jaren.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <button type="button" className="knop knop-zacht" aria-label="Exporteren als CSV" onClick={() => download(`garantieclaims-${jaar || "alles"}-${dezeMaand()}.csv`, naarCsv(lijst), "text/csv;charset=utf-8")}>
          <Icon naam="download" maat={18} /> <span className="alleen-desktop">CSV</span>
        </button>
      </PaginaKop>

      {lijst.some(datumOntbreekt) && (
        <Link to="/datums" className="melding melding-oker melding-link">
          <Icon naam="agenda" />
          <div><b>{meervoud(lijst.filter(datumOntbreekt).length, "claim mist", "claims missen")} een datum</b><span>Daardoor kloppen de doorlooptijd en de termijnen niet helemaal. Vul ze aan →</span></div>
        </Link>
      )}

      {lijst.length === 0 ? <Leeg titel="Nog geen cijfers" tekst="Zodra er claims zijn, verschijnt hier het overzicht." /> : (
        <>
          <section className="voortgangkaart">
            <div className="voortgang-kop">
              <div><small className="bovenschrift">Teruggehaald</small><b><Optel waarde={terug} opmaak={euroKort} ms={1100} /></b></div>
              <div className="rechts"><small className="bovenschrift">Nog open</small><b className="t-rood"><Optel waarde={nog} opmaak={euroKort} ms={1100} /></b></div>
            </div>
            <Voortgang deel={terug + nog ? terug / (terug + nog) : 0} licht label="Teruggehaald van het totaal" />
            <p className="t-zacht mono">{terug + nog ? Math.round((terug / (terug + nog)) * 100) : 0}% van {euroKort(terug + nog)} is binnen · {euroKort(som(afg))} afgewezen</p>
          </section>

          <section className="kpi-rij kpi-rij-4">
            <Kpi label="Claims" waarde={<Optel waarde={lijst.length} />} sub={euroKort(totaal)} />
            <Kpi label="Honorering" waarde={beoordeeld ? `${Math.round((geh.length / beoordeeld) * 100)}%` : "—"} toon="turk" sub={`${geh.length} van ${beoordeeld}`} />
            <Kpi label="Over termijn" waarde={open.filter((c) => overTermijn(c, inst.dagen)).length} toon="rood" sub={`van ${meervoud(open.length, "open claim", "open claims")}`} />
            <Kpi label="Doorlooptijd" waarde={gemDoorloop != null ? `${gemDoorloop} d` : "—"} sub="gemiddeld tot besluit" />
          </section>

          <section className="kaart">
            <h2 className="sectiekop">Per maand</h2>
            <div className="maandgrafiek" role="img" aria-label="Bedrag per maand: teruggehaald, open en afgewezen">
              {maanden.map(([p, v]) => (
                <div key={p} className="maand" title={`${periodKort(p)}: ${euroKort(v.terug)} terug, ${euroKort(v.open)} open`}>
                  <div className="maand-staaf">
                    <i className="s-af" style={{ height: `${(v.af / max) * 100}%` }} />
                    <i className="s-open" style={{ height: `${(v.open / max) * 100}%` }} />
                    <i className="s-terug" style={{ height: `${(v.terug / max) * 100}%` }} />
                  </div>
                  <span>{periodKort(p).split(" ")[0]}</span>
                </div>
              ))}
            </div>
            <div className="legenda"><span><i className="s-terug" />Teruggehaald</span><span><i className="s-open" />Open</span><span><i className="s-af" />Afgewezen</span></div>
          </section>

          <section className="kaart ranglijst-kaart">
            <h2 className="sectiekop">Ranglijst</h2>
            <Ranglijst />
          </section>

          <div className="rapport-raster">
            <section className="kaart">
              <h2 className="sectiekop">Leveranciers</h2>
              <table className="mini-tabel">
                <thead><tr><th>Leverancier</th><th className="rechts">Open</th><th className="rechts kol-tablet">Claims</th><th className="rechts">Doorloop</th></tr></thead>
                <tbody>
                  {levs.map((s) => (
                    <tr key={s.naam}>
                      <td><Link to={`/leveranciers/${encodeURIComponent(s.naam)}`} className="lev-cel"><LevAvatar naam={s.naam} />{s.naam}</Link></td>
                      <td className={`rechts mono${s.open ? " t-rood" : ""}`}>{euroKort(s.open)}</td>
                      <td className="rechts mono kol-tablet">{s.n}</td>
                      <td className="rechts mono">{s.doorloop != null ? `${s.doorloop} d` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="kaart">
              <h2 className="sectiekop">Terugkerende onderdelen</h2>
              {terugkerend.length === 0 ? <p className="t-zacht">Geen onderdeel komt vaker dan één keer voor.</p> : (
                <ol className="ranglijst">
                  {terugkerend.map((t) => (
                    <li key={t.naam}><b>{t.naam}</b><span className="mono">{t.n}× · {euroKort(t.bedrag)}</span>
                      <i style={{ width: `${(t.n / terugkerend[0].n) * 100}%` }} /></li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
