import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, isOpen, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { datum, dezeMaand, euro, periodLabel } from "../lib/format";
import { teruggehaaldPerMaand, geclaimdDezeMaand } from "../lib/team";
import { Icon } from "./Icon";

const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const heel = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Math.round(n));

function Golf({ w }: { w: number[] }) {
  const max = Math.max(1, ...w), n = Math.max(2, w.length);
  const p = w.map((v, i) => [2 + (i / (n - 1)) * 66, 17 - (v / max) * 13] as const);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length; i++) { const mx = (p[i - 1][0] + p[i][0]) / 2; d += ` C${mx},${p[i - 1][1]} ${mx},${p[i][1]} ${p[i][0]},${p[i][1]}`; }
  return <svg viewBox="0 0 70 20" className="rd-golf" aria-hidden="true"><path d={d} fill="none" stroke="#F2C063" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

/** Home dashboard (design 19 "Rood & Goud"): navy figures band, latest claims table, goal card, notes and activity. */
export function RoodDash() {
  const { actief, inst, magBewerken } = useStore();
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4);
    const jaarVan = (c: Claim) => (afgehandeldOp(c) || c.periode || c.datum || "").slice(0, 4);
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd");
    const eigen = geh.filter((c) => !c.uitbesteed && jaarVan(c) === jaar);
    const uit = actief.filter((c) => c.uitbesteed && statusVan(c) !== "afgewezen" && jaarVan(c) === jaar);
    const pm = teruggehaaldPerMaand(actief);
    const nu = new Date();
    const maanden = Array.from({ length: 6 }, (_, i) => { const x = new Date(nu.getFullYear(), nu.getMonth() - 5 + i, 1); const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; return { k, l: MND[x.getMonth()], b: pm.get(k)?.bedrag || 0 }; });
    const telPer = (lijst: Claim[]) => maanden.map((m) => lijst.filter((c) => (afgehandeldOp(c) || c.periode || "").slice(0, 7) === m.k).length);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || "")).slice(0, 6);
    const regels = actief.flatMap((c) => (c.notities || []).map((n) => ({ c, n }))).sort((a, b) => b.n.d.localeCompare(a.n.d));
    const notitie = regels.find((r) => r.n.soort !== "status" && !/^(Claim (aangemaakt|vastgelegd)|Bewerkt:|Datums aangevuld|Werkbak:)/.test(r.n.t));
    return { jaar, eigen, uit, geh, maanden, telPer, laatste, notitie, recent: regels.slice(0, 4) };
  }, [actief]);
  const totaal = som(d.eigen) + som(d.uit);
  const maxM = Math.max(1, ...d.maanden.map((m) => m.b));
  const doel = inst.maanddoel || 1, geclaimd = geclaimdDezeMaand(actief).bedrag;
  const toon = (c: Claim) => (overTermijn(c, inst.dagen) ? ["rood", "Te laat"] : statusVan(c) === "gehonoreerd" ? ["groen", "Gehon."] : statusVan(c) === "afgewezen" ? ["rood", "Afgewezen"] : ["geel", STATUS_LABEL[statusVan(c)]]);

  return (
    <section className="rd" aria-label="Overzicht">
      <div className="rd-band">
        <div className="rd-k rd-hl"><small>Totaal geclaimd</small><b>{heel(totaal)}<sup>€</sup></b><em>GECLAIMD + UITBESTEED · {d.jaar}</em><Golf w={d.maanden.map((m) => m.b)} /></div>
        <div className="rd-k"><small>Uitbesteed</small><b>{heel(som(d.uit))}<sup>€</sup></b><em>{d.uit.length} {d.uit.length === 1 ? "CLAIM" : "CLAIMS"} · {d.jaar}</em><Golf w={d.telPer(d.uit)} /></div>
        <div className="rd-k"><small>Per maand</small><div className="rd-staven">{d.maanden.map((m) => <span key={m.k}><i style={{ height: `${6 + (m.b / maxM) * 50}px` }} title={euro(m.b)} /><em>{m.l}</em></span>)}</div></div>
        <div className="rd-k"><small>Teruggehaald</small><b>{heel(som(d.eigen))}<sup>€</sup></b><em>GECLAIMD · {d.jaar}</em><Golf w={d.telPer(d.eigen)} /></div>
        <div className="rd-k"><small>Gehonoreerd</small><b>{d.geh.length}</b><em>CLAIMS IN TOTAAL</em><Golf w={d.telPer(d.geh)} /></div>
      </div>

      <div className="rd-werk">
        <div className="rd-kaart rd-tabel">
          <h3>Laatste claims <Link to="/claims">Alles</Link></h3>
          <div className="rd-scroll"><table>
            <thead><tr><th>Inkoop</th><th>Status</th><th>Leverancier</th><th>Onderdeel</th><th>Bedrag</th><th>Ingediend</th><th>Acties</th></tr></thead>
            <tbody>{d.laatste.map((c) => { const [k, t] = toon(c); return (
              <tr key={c.id}>
                <td className="mono">{c.inkoopnummer || "—"}</td>
                <td><span className={`rd-st ${k}`}>{t}</span></td>
                <td>{c.leverancier || "—"}</td>
                <td><Link to={`/claims/${c.id}`}>{titelVan(c)}</Link></td>
                <td>{c.bedrag ? euro(c.bedrag) : "—"}</td>
                <td>{c.datum ? datum(c.datum) : "—"}</td>
                <td className="rd-ac"><Link to={`/claims/${c.id}?notitie=1`} aria-label="Notitie" className={isOpen(c) ? "rood" : ""}><Icon naam="bericht" maat={15} /></Link>{magBewerken && <Link to={`/claims/${c.id}/bewerken`} aria-label="Bewerken"><Icon naam="potlood" maat={15} /></Link>}</td>
              </tr>); })}</tbody>
          </table></div>
        </div>
        <div className="rd-doel">
          <h3>Maanddoel</h3><small>{periodLabel(dezeMaand()).split(" ")[0]}</small>
          <b>{Math.round((geclaimd / doel) * 100)}%</b>
          <p>{euro(geclaimd)} van {euro(doel)}{geclaimd >= doel ? " — het team heeft het doel gehaald!" : ` — nog ${euro(doel - geclaimd)} te gaan.`}</p>
        </div>
      </div>

      <div className="rd-onder">
        <div><h3>Laatste notitie</h3>
          {d.notitie ? <Link to={`/claims/${d.notitie.c.id}`} className="rd-nieuws"><span className="rd-img" aria-hidden="true"><Icon naam="notitie" maat={30} /></span>
            <span><small>{titelVan(d.notitie.c)} · {datum(d.notitie.n.d)}</small><b>{d.notitie.n.t}</b><em>{d.notitie.c.leverancier}{d.notitie.n.w ? ` · ${d.notitie.n.w}` : ""}</em></span></Link>
            : <p className="t-zacht">Nog geen notities.</p>}
        </div>
        <div><h3>Laatste activiteit</h3>
          <ul className="rd-tl">{d.recent.map(({ c, n }, i) => <li key={i}><small>{datum(n.d)}</small><i aria-hidden="true" /><Link to={`/claims/${c.id}`}>{n.t} · {titelVan(c)}</Link><em>{n.w || ""}</em></li>)}</ul>
        </div>
      </div>
    </section>
  );
}
