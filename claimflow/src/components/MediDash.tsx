import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { dezeMaand, euro } from "../lib/format";
import { geclaimdDezeMaand, teruggehaaldPerMaand } from "../lib/team";
import { werkbak } from "../lib/werkbak";
import { Icon } from "./Icon";

const heel = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Math.round(n));

/** White line drawings in the Medipoint style. */
const Bed = () => <svg viewBox="0 0 150 110" className="md-lijn" aria-hidden="true"><path d="M8 20 V95 M8 75 H142 V88 H8" /><path d="M20 62 L40 50 L70 62 H135" /><circle cx="20" cy="98" r="6" /><circle cx="130" cy="98" r="6" /></svg>;
const Krukken = () => <svg viewBox="0 0 150 150" className="md-lijn" aria-hidden="true"><path d="M50 10 L70 140 M100 10 L80 140 M40 10 H62 M90 10 H112 M56 48 H68 M86 48 H98" /><path d="M64 98 H86" /></svg>;

/** Home dashboard (design 23 "Medipoint"): turquoise and red banners with a curved image side, pastel blocks, latest claims, figures with colour stripes. */
export function MediDash() {
  const { actief, inst, magBewerken } = useStore();
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4);
    const jaarVan = (c: Claim) => (afgehandeldOp(c) || c.periode || c.datum || "").slice(0, 4);
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd");
    // the claim's own year: its month (periode), otherwise its date
    const claimJaar = (c: Claim) => (c.periode || c.datum || afgehandeldOp(c) || "").slice(0, 4);
    // "Totaal geclaimd": every claim of this year counts, whatever its status
    const eigen = actief.filter((c) => !c.uitbesteed && claimJaar(c) === jaar);
    const uit = actief.filter((c) => c.uitbesteed && claimJaar(c) === jaar);
    // "Teruggehaald": only what was honoured
    const terug = geh.filter((c) => !c.uitbesteed && jaarVan(c) === jaar);
    const afg = actief.filter((c) => ["gehonoreerd", "afgewezen"].includes(statusVan(c)));
    const taken = werkbak(actief, inst.dagen);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || "")).slice(0, 5);
    const pm = teruggehaaldPerMaand(actief).get(dezeMaand());
    return { jaar, geh, eigen, uit, terug, afg, taken, laatste, pm, ingediend: actief.filter((c) => statusVan(c) === "ingediend").length, laat: actief.filter((c) => overTermijn(c, inst.dagen)).length };
  }, [actief, inst.dagen]);
  const totaal = som(d.eigen) + som(d.uit);
  const binnen = som(d.eigen.filter((c) => c.locatie !== "buiten")), buiten = som(d.eigen.filter((c) => c.locatie === "buiten"));
  const gm = geclaimdDezeMaand(actief);
  const doel = inst.maanddoel || 0, geclaimd = gm.bedrag, pct = doel ? Math.round((geclaimd / doel) * 100) : 0;
  const graad = d.afg.length ? Math.round((d.geh.length / d.afg.length) * 100) : 0;
  const toon = (c: Claim) => (overTermijn(c, inst.dagen) ? ["s-rood", "VAM vragen"] : statusVan(c) === "gehonoreerd" ? ["s-teal", "Gehonoreerd"] : statusVan(c) === "afgewezen" ? ["s-grijs", "Afgewezen"] : statusVan(c) === "nieuw" ? ["s-roze", "Nieuw"] : ["s-geel", STATUS_LABEL[statusVan(c)]]);

  return (
    <section className="md" aria-label="Overzicht">
      {doel > 0 && <p className="md-doel-tel"><span>Maanddoel <b>{euro(geclaimd)}</b> van {euro(doel)}{gm.uitbesteed ? <em className="md-doel-uit"> · incl. {euro(gm.uitbesteed)} uitbesteed</em> : null}</span><i><u style={{ width: `${Math.min(100, pct)}%` }} /></i><b>{pct}%</b></p>}
      {magBewerken && <Link to="/nieuw?bron=camera" className="md-lgar"><span className="md-lgar-ic"><Icon naam="document" maat={26} /></span><span><b>LGAR-bon inlezen</b><small>Scan of kies de bon, de velden vullen zichzelf in</small></span><Icon naam="pijl" maat={22} /></Link>}
      {d.pm ? <p className="md-usp"><Icon naam="vink" maat={16} /> {d.pm.aantal} {d.pm.aantal === 1 ? "claim" : "claims"} gehonoreerd deze maand · {euro(d.pm.bedrag)} teruggehaald</p>
        : <p className="md-usp"><Icon naam="vink" maat={16} /> Makkelijk claimen: scan de LGAR-bon en de velden vullen zichzelf in</p>}

      <nav className="md-snel" aria-label="Direct naar">
        <Link to="/leveranciers"><Icon naam="fabriek" maat={22} /><span>Leveranciers</span></Link>
        <Link to="/uitbesteed"><Icon naam="extern" maat={22} /><span>Uitbesteed</span></Link>
        <Link to="/notities"><Icon naam="notitie" maat={22} /><span>Notities</span></Link>
        <Link to="/rapportage"><Icon naam="grafiek" maat={22} /><span>Rapportage</span></Link>
        <Link to="/assistent"><Icon naam="robot" maat={22} /><span>Assistent</span></Link>
      </nav>

      <div className="md-banners">
        <div className="md-banner md-teal">
          <div className="md-tekst">
            <h2><i>Totaal</i> <b>geclaimd.</b></h2>
            <strong>€ {heel(totaal)}</strong>
            <div className="md-vakken">
              <span><small>Geclaimd</small><b>€ {heel(som(d.eigen))}</b></span>
              <span><small>Uitbesteed</small><b>€ {heel(som(d.uit))}</b></span>
              <span><small>Binnenmonteur</small><b>€ {heel(binnen)}</b></span>
              <span><small>Buitenmonteur</small><b>€ {heel(buiten)}</b></span>
            </div>
            <Link to="/claims" className="md-pil md-pil-rood">Bekijk alle claims</Link>
          </div>
          <div className="md-beeld md-beeld-teal"><Bed /></div>
        </div>
        <div className="md-banner md-rood">
          <div className="md-tekst">
            <h2><i>Uitbesteed</i></h2>
            <strong>€ {heel(som(d.uit))}</strong>
            <p>Leverancier pakt dit verder zelf op.<br />{d.uit.length} {d.uit.length === 1 ? "claim" : "claims"} uitbesteed in {d.jaar}.</p>
            <Link to="/uitbesteed" className="md-link">Bekijk uitbesteed <Icon naam="pijl" maat={16} /></Link>
          </div>
          <div className="md-beeld md-beeld-rood"><Krukken /></div>
        </div>
      </div>

      <div className="md-kaart md-tabel">
        <div className="md-kop"><h3>Laatste claims</h3><Link to="/claims">Lees meer <Icon naam="pijl" maat={16} /></Link></div>
        <div className="md-scroll"><table>
          <thead><tr><th>Claim</th><th>Leverancier</th><th>Inkoop</th><th>Bedrag</th><th>Status</th></tr></thead>
          <tbody>{d.laatste.map((c) => { const [k, t] = toon(c); return (
            <tr key={c.id}><td><Link to={`/claims/${c.id}`}><b>{titelVan(c)}</b></Link></td><td>{c.leverancier || "—"}</td><td className="mono">{c.inkoopnummer || "—"}</td><td>{c.bedrag ? euro(c.bedrag) : "—"}</td><td><span className={`md-st ${k}`}>{t}</span></td></tr>); })}</tbody>
        </table></div>
      </div>

      <div className="md-cijfers">
        <div className="md-cijfer c-roze"><small>Teruggehaald {d.jaar}</small><b>€ {heel(som(d.terug))}</b></div>
        <div className="md-cijfer c-teal"><small>Ingediend</small><b>{d.ingediend} {d.ingediend === 1 ? "claim" : "claims"}</b></div>
        <div className="md-cijfer c-navy"><small>Honoreringsgraad</small><b>{graad}%</b></div>
        <div className="md-cijfer c-geel"><small>Over termijn</small><b>{d.laat} {d.laat === 1 ? "claim" : "claims"}</b></div>
      </div>
    </section>
  );
}
