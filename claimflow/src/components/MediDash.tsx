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
const Stoel = () => <svg viewBox="0 0 150 110" className="md-lijn" aria-hidden="true"><path d="M100 8 H118 M100 8 V55 M40 30 H95 M45 55 H100 V70 H45 Z M45 55 V95" /><circle cx="100" cy="80" r="26" /><path d="M45 70 L20 92 H6" /></svg>;
const Krukken = () => <svg viewBox="0 0 150 150" className="md-lijn" aria-hidden="true"><path d="M50 10 L70 140 M100 10 L80 140 M40 10 H62 M90 10 H112 M56 48 H68 M86 48 H98" /><path d="M64 98 H86" /></svg>;

/** Home dashboard (design 23 "Medipoint"): turquoise and red banners with a curved image side, pastel blocks, latest claims, figures with colour stripes. */
export function MediDash() {
  const { actief, inst, magBewerken } = useStore();
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4);
    const jaarVan = (c: Claim) => (afgehandeldOp(c) || c.periode || c.datum || "").slice(0, 4);
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd");
    const eigen = geh.filter((c) => !c.uitbesteed && jaarVan(c) === jaar);
    const uit = actief.filter((c) => c.uitbesteed && statusVan(c) !== "afgewezen" && jaarVan(c) === jaar);
    const afg = actief.filter((c) => ["gehonoreerd", "afgewezen"].includes(statusVan(c)));
    const taken = werkbak(actief, inst.dagen);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || "")).slice(0, 5);
    const pm = teruggehaaldPerMaand(actief).get(dezeMaand());
    return { jaar, geh, eigen, uit, afg, taken, laatste, pm, ingediend: actief.filter((c) => statusVan(c) === "ingediend").length, laat: actief.filter((c) => overTermijn(c, inst.dagen)).length };
  }, [actief, inst.dagen]);
  const totaal = som(d.eigen) + som(d.uit);
  const binnen = som(d.eigen.filter((c) => c.locatie !== "buiten")), buiten = som(d.eigen.filter((c) => c.locatie === "buiten"));
  const doel = inst.maanddoel || 1, geclaimd = geclaimdDezeMaand(actief).bedrag, pct = Math.round((geclaimd / doel) * 100);
  const graad = d.afg.length ? Math.round((d.geh.length / d.afg.length) * 100) : 0;
  const nu = d.taken.filter((t) => t.bak === "nu").length;
  const toon = (c: Claim) => (overTermijn(c, inst.dagen) ? ["s-rood", "VAM vragen"] : statusVan(c) === "gehonoreerd" ? ["s-teal", "Gehonoreerd"] : statusVan(c) === "afgewezen" ? ["s-grijs", "Afgewezen"] : statusVan(c) === "nieuw" ? ["s-roze", "Nieuw"] : ["s-geel", STATUS_LABEL[statusVan(c)]]);

  return (
    <section className="md" aria-label="Overzicht">
      {d.pm ? <p className="md-usp"><Icon naam="vink" maat={16} /> {d.pm.aantal} {d.pm.aantal === 1 ? "claim" : "claims"} gehonoreerd deze maand · {euro(d.pm.bedrag)} teruggehaald</p>
        : <p className="md-usp"><Icon naam="vink" maat={16} /> Makkelijk claimen: scan de LGAR-bon en de velden vullen zichzelf in</p>}

      <div className="md-banners">
        <div className="md-banner md-teal">
          <div className="md-tekst">
            <h2><i>Totaal</i> <b>geclaimd.</b></h2>
            <strong>€ {heel(totaal)}</strong>
            <p>Geclaimd € {heel(som(d.eigen))} + uitbesteed € {heel(som(d.uit))} in {d.jaar}.<br />Binnenmonteur € {heel(binnen)} · buitenmonteur € {heel(buiten)}</p>
            <Link to="/claims" className="md-pil md-pil-rood">Bekijk alle claims</Link>
          </div>
          <div className="md-beeld md-beeld-teal"><Bed />{pct >= 100 && <span className="md-sticker"><span>{pct}%<br />van het doel<br />gehaald</span></span>}</div>
        </div>
        <div className="md-banner md-rood">
          <div className="md-tekst">
            <h2><i>Uitbesteed</i></h2>
            <strong>€ {heel(som(d.uit))}</strong>
            <p>{d.uit.length} {d.uit.length === 1 ? "claim" : "claims"} uitbesteed in {d.jaar}.</p>
            <Link to="/claims" className="md-link">Bekijk uitbesteed <Icon naam="pijl" maat={16} /></Link>
          </div>
          <div className="md-beeld md-beeld-rood"><Krukken /></div>
        </div>
      </div>

      <div className="md-blokken">
        <Link to="/claims" className="md-blok md-blok-teal"><div><h3>Nu doen</h3><p>{nu} {nu === 1 ? "taak wacht" : "taken wachten"} op je.<br />{d.laat} over termijn.</p><span className="md-pil md-pil-wit">Open taken</span></div><Bed /></Link>
        <Link to="/rapportage" className="md-blok md-blok-roze"><div><h3>Maanddoel</h3><p>{euro(geclaimd)} van {euro(doel)}<br />{pct}% gehaald.</p><span className="md-pil md-pil-wit">Bekijk cijfers</span></div><Stoel /></Link>
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
        <div className="md-cijfer c-roze"><small>Teruggehaald {d.jaar}</small><b>€ {heel(som(d.eigen))}</b></div>
        <div className="md-cijfer c-teal"><small>Ingediend</small><b>{d.ingediend} {d.ingediend === 1 ? "claim" : "claims"}</b></div>
        <div className="md-cijfer c-navy"><small>Honoreringsgraad</small><b>{graad}%</b></div>
        <div className="md-cijfer c-geel"><small>Maanddoel</small><b>{pct}%</b></div>
      </div>

      <h2 className="md-direct">Direct naar</h2>
      <div className="md-tegels">
        {magBewerken && <Link to="/nieuw?bron=camera" className="md-tegel"><Icon naam="document" maat={30} /><span>LGAR-bon inlezen</span><Icon naam="pijl" maat={20} /></Link>}
        <Link to="/leveranciers" className="md-tegel"><Icon naam="fabriek" maat={30} /><span>Leveranciers</span><Icon naam="pijl" maat={20} /></Link>
        <Link to="/notities" className="md-tegel"><Icon naam="notitie" maat={30} /><span>Notities</span><Icon naam="pijl" maat={20} /></Link>
        <Link to="/rapportage" className="md-tegel"><Icon naam="grafiek" maat={30} /><span>Rapportage</span><Icon naam="pijl" maat={20} /></Link>
      </div>
    </section>
  );
}
