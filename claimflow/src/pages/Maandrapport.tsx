import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { geenBedrag, isOpen, overTermijn, perLeverancier, som, statusVan, titelVan } from "../lib/claims";
import { datum, dezeMaand, euro, periodLabel } from "../lib/format";
import { teruggehaaldPerMaand } from "../lib/team";
import { stuur } from "../lib/mail";
import { Icon } from "../components/Icon";
import { LogoMerk } from "../components/LogoMerk";

const maandVan = (c: Claim) => (c.periode && /^\d{4}-\d{2}$/.test(c.periode) ? c.periode : (c.datum || "").slice(0, 7));

/** Monthly report for printing or saving as PDF (via the browser's print dialog), plus a short summary by e-mail. */
export function Maandrapport() {
  const { actief, inst, naam } = useStore();
  const toast = useToast();
  const maanden = useMemo(() => [...new Set([dezeMaand(), ...actief.map(maandVan).filter((m) => /^\d{4}-\d{2}$/.test(m))])].sort().reverse(), [actief]);
  const [maand, setMaand] = useState(dezeMaand());
  const [mailBezig, setMailBezig] = useState(false);

  const r = useMemo(() => {
    const lijst = actief.filter((c) => maandVan(c) === maand);
    const eigen = lijst.filter((c) => !c.uitbesteed), uit = lijst.filter((c) => c.uitbesteed);
    const binnen = eigen.filter((c) => c.locatie !== "buiten"), buiten = eigen.filter((c) => c.locatie === "buiten");
    const terug = teruggehaaldPerMaand(actief).get(maand) || { bedrag: 0, aantal: 0 };
    const geh = lijst.filter((c) => statusVan(c) === "gehonoreerd"), afg = lijst.filter((c) => statusVan(c) === "afgewezen");
    const open = lijst.filter(isOpen), laat = lijst.filter((c) => overTermijn(c, inst.dagen));
    const levs = perLeverancier(lijst);
    const rijen = [...lijst].sort((a, b) => (a.datum || a.periode || "").localeCompare(b.datum || b.periode || ""));
    return { lijst, eigen, uit, binnen, buiten, terug, geh, afg, open, laat, levs, rijen };
  }, [actief, maand, inst.dagen]);
  const totaal = som(r.eigen) + som(r.uit);
  const doel = inst.maanddoel || 0, pct = doel ? Math.round((totaal / doel) * 100) : 0;
  const titel = `Maandrapport ${periodLabel(maand).toLowerCase()}`;

  const mail = async () => {
    setMailBezig(true);
    const res = await stuur({
      _subject: `ClaimFlow ${titel}`,
      "Totaal geclaimd": `${euro(totaal)} (${r.lijst.length} claims)`,
      Geclaimd: `${euro(som(r.eigen))} (${r.eigen.length})`,
      Uitbesteed: `${euro(som(r.uit))} (${r.uit.length})`,
      Binnenmonteur: euro(som(r.binnen)), Buitenmonteur: euro(som(r.buiten)),
      Teruggehaald: `${euro(r.terug.bedrag)} (${r.terug.aantal} gehonoreerd)`,
      "Open / over termijn": `${r.open.length} open · ${r.laat.length} over termijn · ${r.afg.length} afgewezen`,
      ...(doel ? { Maanddoel: `${pct}% van ${euro(doel)}` } : {}),
      "Per leverancier": r.levs.map((l) => `${l.naam}: ${l.n} claims, ${euro(l.totaal)}`).join("\n"),
      "Gemaakt door": naam || "onbekend",
    });
    setMailBezig(false);
    toast(res.ok ? (res.activatie ? "Bevestig eerst het e-mailadres via de mail van FormSubmit" : "Samenvatting gemaild") : `Mailen lukte niet: ${res.bericht}`);
  };

  return (
    <div className="pagina mr">
      <div className="mr-balk geen-print">
        <Link to="/rapportage" className="terugknop"><Icon naam="terug" maat={18} /> Rapportage</Link>
        <select className="pil pil-select" value={maand} onChange={(e) => setMaand(e.target.value)} aria-label="Maand">
          {maanden.map((m) => <option key={m} value={m}>{periodLabel(m)}</option>)}
        </select>
        <button type="button" className="knop knop-rood" onClick={() => window.print()}><Icon naam="download" maat={18} /> Opslaan als PDF / printen</button>
        <button type="button" className="knop knop-zacht" disabled={mailBezig} onClick={() => void mail()}><Icon naam="mail" maat={18} /> {mailBezig ? "Bezig…" : "Samenvatting mailen"}</button>
      </div>
      <p className="mr-tip geen-print">Tip: kies bij het printen "Opslaan als PDF" als printer om er een PDF van te maken.</p>

      <article className="mr-vel">
        <header className="mr-kop">
          <span className="mr-merk"><LogoMerk maat={40} /><span><b>ClaimFlow</b><small>Garantieclaims Medipoint {inst.vestiging || "Meppel"}</small></span></span>
          <span className="mr-titel"><h1>{titel}</h1><small>Gemaakt op {datum(new Date().toISOString())}{naam ? ` door ${naam}` : ""}</small></span>
        </header>
        <i className="mr-streep" aria-hidden="true"><b /><b /><b /><b /><b /></i>

        <section className="mr-kpis">
          <div className="mr-kpi mr-hl"><small>Totaal geclaimd</small><b>{euro(totaal)}</b><em>{r.lijst.length} claims</em></div>
          <div className="mr-kpi"><small>Geclaimd (eigen)</small><b>{euro(som(r.eigen))}</b><em>{r.eigen.length} claims</em></div>
          <div className="mr-kpi"><small>Uitbesteed</small><b>{euro(som(r.uit))}</b><em>{r.uit.length} claims</em></div>
          <div className="mr-kpi"><small>Teruggehaald</small><b>{euro(r.terug.bedrag)}</b><em>{r.terug.aantal} gehonoreerd</em></div>
        </section>

        <section className="mr-twee">
          <div>
            <h2>Verdeling</h2>
            <table className="mr-tabel"><tbody>
              <tr><td>Binnenmonteur</td><td className="r">{r.binnen.length}</td><td className="r">{euro(som(r.binnen))}</td></tr>
              <tr><td>Buitenmonteur</td><td className="r">{r.buiten.length}</td><td className="r">{euro(som(r.buiten))}</td></tr>
              <tr><td>Uitbesteed</td><td className="r">{r.uit.length}</td><td className="r">{euro(som(r.uit))}</td></tr>
              <tr className="som"><td>Totaal</td><td className="r">{r.lijst.length}</td><td className="r">{euro(totaal)}</td></tr>
            </tbody></table>
          </div>
          <div>
            <h2>Stand</h2>
            <table className="mr-tabel"><tbody>
              <tr><td>Gehonoreerd</td><td className="r">{r.geh.length}</td><td className="r">{euro(som(r.geh))}</td></tr>
              <tr><td>Afgewezen</td><td className="r">{r.afg.length}</td><td className="r">{euro(som(r.afg))}</td></tr>
              <tr><td>Nog open</td><td className="r">{r.open.length}</td><td className="r">{euro(som(r.open))}</td></tr>
              <tr><td>Over termijn</td><td className="r">{r.laat.length}</td><td className="r">{euro(som(r.laat))}</td></tr>
            </tbody></table>
            {doel > 0 && <p className="mr-doel">Maanddoel: <b>{pct}%</b> van {euro(doel)} <span><u style={{ width: `${Math.min(100, pct)}%` }} /></span></p>}
          </div>
        </section>

        <section>
          <h2>Per leverancier</h2>
          {r.levs.length ? (
            <table className="mr-tabel mr-breed">
              <thead><tr><th>Leverancier</th><th className="r">Claims</th><th className="r">Gehonoreerd</th><th className="r">Afgewezen</th><th className="r">Open</th><th className="r">Bedrag</th></tr></thead>
              <tbody>{r.levs.map((l) => <tr key={l.naam}><td>{l.naam}</td><td className="r">{l.n}</td><td className="r">{l.gehN}</td><td className="r">{l.afgN}</td><td className="r">{l.openN}</td><td className="r">{euro(l.totaal)}</td></tr>)}</tbody>
            </table>
          ) : <p className="t-zacht">Geen claims in deze maand.</p>}
        </section>

        {r.rijen.length > 0 && (
          <section>
            <h2>Alle claims ({r.rijen.length})</h2>
            <table className="mr-tabel mr-breed mr-klein">
              <thead><tr><th>Datum</th><th>Type / onderdeel</th><th>Leverancier</th><th>Inkoop</th><th>Monteur</th><th>Status</th><th className="r">Bedrag</th></tr></thead>
              <tbody>{r.rijen.map((c) => (
                <tr key={c.id}>
                  <td>{c.datum ? datum(c.datum) : "—"}</td>
                  <td>{titelVan(c)}{c.onderdeel && c.onderdeel !== c.type ? ` · ${c.onderdeel}` : ""}</td>
                  <td>{c.leverancier || "—"}</td>
                  <td className="mono">{c.inkoopnummer || "—"}</td>
                  <td>{c.uitbesteed ? "Uitbesteed" : c.locatie === "buiten" ? "Buiten" : "Binnen"}</td>
                  <td>{STATUS_LABEL[statusVan(c)]}</td>
                  <td className="r">{geenBedrag(c) ? "—" : euro(c.bedrag)}</td>
                </tr>))}</tbody>
            </table>
          </section>
        )}
        <footer className="mr-voet">ClaimFlow · Wat kapot gaat, komt terug.</footer>
      </article>
    </div>
  );
}
