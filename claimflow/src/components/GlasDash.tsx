import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, isOpen, som, statusVan, titelVan } from "../lib/claims";
import { datum, dezeMaand, euro } from "../lib/format";
import { geclaimdDezeMaand, teruggehaaldPerMaand } from "../lib/team";
import { werkbak } from "../lib/werkbak";
import { Icon } from "./Icon";

const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const heel = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Math.round(n));

/** Smooth path through points, clamped to the chart area. */
function glad(p: Array<[number, number]>, onder: number) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    const k = (y: number) => Math.min(onder, Math.max(6, y));
    d += ` C${b[0] + (c[0] - a[0]) / 6},${k(b[1] + (c[1] - a[1]) / 6)} ${c[0] - (e[0] - b[0]) / 6},${k(c[1] - (e[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
  }
  return d;
}

/** Home dashboard (design 22 "Glas"): dark green glass panels, a lime focus card, route-style chart, status tracking. */
export function GlasDash() {
  const { actief, inst, magBewerken } = useStore();
  const [maandIdx, setMaandIdx] = useState(5);
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4);
    const jaarVan = (c: Claim) => (afgehandeldOp(c) || c.periode || c.datum || "").slice(0, 4);
    const eigen = actief.filter((c) => statusVan(c) === "gehonoreerd" && !c.uitbesteed && jaarVan(c) === jaar);
    const uit = actief.filter((c) => c.uitbesteed && statusVan(c) !== "afgewezen" && jaarVan(c) === jaar);
    const binnen = eigen.filter((c) => c.locatie !== "buiten"), buiten = eigen.filter((c) => c.locatie === "buiten");
    const pm = teruggehaaldPerMaand(actief);
    const nu = new Date();
    const maanden = Array.from({ length: 6 }, (_, i) => {
      const x = new Date(nu.getFullYear(), nu.getMonth() - 5 + i, 1);
      const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
      return { k, l: MND[x.getMonth()], b: pm.get(k)?.bedrag || 0, n: pm.get(k)?.aantal || 0 };
    });
    const st = { nieuw: 0, ingediend: 0, gehonoreerd: 0, afgewezen: 0 };
    actief.forEach((c) => { st[statusVan(c)]++; });
    const taken = werkbak(actief, inst.dagen);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || ""))[0];
    const wachten = actief.filter((c) => isOpen(c) && statusVan(c) === "ingediend").length;
    return { jaar, eigen, uit, binnen, buiten, maanden, st, taken, laatste, wachten };
  }, [actief, inst.dagen]);

  const totaal = som(d.eigen) + som(d.uit);
  const eerste = d.taken.find((t) => t.bak === "nu") || d.taken[0];
  const vandaag = new Date();
  const m = d.maanden[maandIdx];
  const maxM = Math.max(1, ...d.maanden.map((x) => x.b));
  const doel = inst.maanddoel || 1, geclaimd = geclaimdDezeMaand(actief).bedrag;

  // chart: points over a dark grid, like a route on a map
  const W = 560, H = 210;
  const pts = d.maanden.map((x, i) => [30 + (i / 5) * (W - 60), H - 30 - (x.b / maxM) * (H - 70)] as [number, number]);
  const sel = pts[maandIdx];

  return (
    <section className="gl" aria-label="Overzicht">
      <div className="gl-raster">
        <Link to={eerste ? `/claims/${eerste.claim.id}` : "/claims"} className="gl-focus">
          <span className="gl-wie"><span className="gl-av" aria-hidden="true"><Icon naam="klok" maat={20} /></span>
            <span><b>{eerste ? titelVan(eerste.claim) : "Alles bijgewerkt"}</b><small>{eerste ? `${eerste.claim.leverancier || "—"} · ${eerste.tekst}` : "Geen taken voor nu"}</small></span></span>
          <span className="gl-regel"><i><Icon naam="lijst" maat={14} /></i>{d.taken.filter((t) => t.bak === "nu").length} taken voor nu</span>
          <span className="gl-regel"><i><Icon naam="bericht" maat={14} /></i>{d.wachten} wachten op leverancier</span>
          <span className="gl-groot"><b>€ {heel(totaal)}</b><small>Totaal geclaimd · geclaimd + uitbesteed {d.jaar}</small></span>
        </Link>

        <div className="gl-kaart gl-route">
          <div className="gl-kop"><h3>Teruggehaald per maand</h3><small>{m.l} · {euro(m.b)} · {m.n} {m.n === 1 ? "claim" : "claims"}</small></div>
          <svg viewBox={`0 0 ${W} ${H}`} className="gl-svg" role="img" aria-label="Teruggehaald per maand">
            {Array.from({ length: 12 }, (_, i) => <line key={`v${i}`} x1={i * 50} x2={i * 50} y1="0" y2={H} className="gl-lijn" />)}
            {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} x1="0" x2={W} y1={i * 50 + 10} y2={i * 50 + 10} className="gl-lijn" />)}
            {d.maanden.map((x, i) => <rect key={x.k} x={pts[i][0] - 14} y={pts[i][1] + 8} width="28" height={Math.max(0, H - 30 - pts[i][1] - 8)} rx="5" className="gl-blok" />)}
            <path d={glad(pts, H - 30)} className="gl-pad" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === maandIdx ? 0 : 3.5} className="gl-punt" />)}
            <circle cx={sel[0]} cy={sel[1]} r="12" className="gl-pin-ring" /><circle cx={sel[0]} cy={sel[1]} r="5" className="gl-pin" />
            {d.maanden.map((x, i) => <text key={x.k} x={pts[i][0]} y={H - 8} textAnchor="middle" className={`gl-as${i === maandIdx ? " aan" : ""}`} onClick={() => setMaandIdx(i)}>{x.l}</text>)}
          </svg>
        </div>

        <div className="gl-kaart gl-track">
          <div className="gl-kop"><h3>Status</h3><Link to="/rapportage" aria-label="Rapportage"><Icon naam="meer" maat={16} /></Link></div>
          <ul>
            <li><i><Icon naam="plus" maat={15} /></i><span><b>Nieuw</b><small>{d.st.nieuw} claims · nog indienen</small></span></li>
            <li><i><Icon naam="upload" maat={15} /></i><span><b>Ingediend</b><small>{d.st.ingediend} claims · bij leverancier</small></span></li>
            <li className="aan"><i><Icon naam="vink" maat={15} /></i><span><b>Gehonoreerd</b><small>{d.st.gehonoreerd} claims · geld terug</small></span></li>
            <li><i><Icon naam="kruis" maat={15} /></i><span><b>Afgewezen</b><small>{d.st.afgewezen} claims</small></span></li>
          </ul>
        </div>

        <div className="gl-kaart gl-betaal">
          <div className="gl-kop"><h3>Verdeling</h3></div>
          <p><i className="b" />Binnenmonteur<b>€ {heel(som(d.binnen))}</b></p>
          <p><i className="u" />Buitenmonteur<b>€ {heel(som(d.buiten))}</b></p>
          <p><i className="x" />Uitbesteed<b>€ {heel(som(d.uit))}</b></p>
        </div>

        {d.laatste ? (
          <div className="gl-order">
            <span className="gl-oic" aria-hidden="true"><Icon naam="fabriek" maat={22} /></span>
            <div className="gl-otekst"><b>{titelVan(d.laatste)}</b>
              <small>{d.laatste.leverancier || "—"}{d.laatste.inkoopnummer ? ` · inkoop ${d.laatste.inkoopnummer}` : ""}</small>
              <small>{d.laatste.datum ? `Datum ${datum(d.laatste.datum)}` : "Laatst bijgewerkt"} · {statusVan(d.laatste)}</small></div>
            <span className="gl-prijs">{d.laatste.bedrag ? euro(d.laatste.bedrag) : "—"}</span>
            <Link to={`/claims/${d.laatste.id}`} className="gl-oknop">Bekijken</Link>
          </div>
        ) : <div className="gl-order"><b>Nog geen claims</b></div>}

        <div className="gl-kaart gl-dag">
          <span className="gl-datum"><b>{vandaag.getDate()}</b><small>{DAG[vandaag.getDay()]}</small></span>
          <div className="gl-agenda"><span className="gl-vandaag">Vandaag</span>
            {d.taken.slice(0, 2).map((t) => <Link key={t.claim.id + t.reden} to={`/claims/${t.claim.id}`}><span><b>{titelVan(t.claim)}</b><small>{t.tekst}</small></span><i><Icon naam="pijl" maat={13} /></i></Link>)}
            {!d.taken.length && <p className="t-zacht">Niets te doen vandaag.</p>}
          </div>
        </div>

        <div className="gl-kaart gl-speler">
          <span className="gl-hoes" aria-hidden="true"><Icon naam="grafiek" maat={26} /></span>
          <div className="gl-sp"><b>Maanddoel</b><small>{euro(geclaimd)} van {euro(doel)}</small>
            <div className="gl-voortgang"><em>0</em><span><u style={{ width: `${Math.min(100, (geclaimd / doel) * 100)}%` }} /></span><em>{Math.round((geclaimd / doel) * 100)}%</em></div>
            <div className="gl-knoppen">
              <button type="button" aria-label="Vorige maand" onClick={() => setMaandIdx((i) => Math.max(0, i - 1))}>‹‹</button>
              {magBewerken ? <Link to="/nieuw" className="gl-play" aria-label="Nieuwe claim"><Icon naam="plus" maat={18} /></Link> : <span className="gl-play"><Icon naam="vink" maat={18} /></span>}
              <button type="button" aria-label="Volgende maand" onClick={() => setMaandIdx((i) => Math.min(5, i + 1))}>››</button>
            </div></div>
        </div>
      </div>
    </section>
  );
}
