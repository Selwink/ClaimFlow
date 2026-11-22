import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { isOpen, som, statusVan, titelVan } from "../lib/claims";
import { euro, euroKort } from "../lib/format";
import { geclaimdDezeMaand, teruggehaaldPerMaand } from "../lib/team";
import { Icon } from "./Icon";
import { LogoMerk } from "./LogoMerk";
import { SnelZoek } from "./SnelZoek";

const PF_NAV: Array<[string, string]> = [["/", "Home"], ["/claims", "Claims"], ["/notities", "Notities"], ["/leveranciers", "Leveranciers"], ["/rapportage", "Rapportage"], ["/assistent", "Assistent"], ["/beheer", "Profiel"]];

/** Top band (design "Portfolio"): date, search, + new claim, avatar — on every page, phone and computer. */
export function PfBand() {
  const { naam, magBewerken, rol, actief, inst } = useStore();
  const dag = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  return (
    <header className="pf-band">
      <Link to="/" className="pf-logo" aria-label="Home"><LogoMerk maat={30} /><b className="pf-woord">ClaimFlow</b></Link>
      <span className="pf-dag"><i aria-hidden="true">✦</i>{dag[0].toUpperCase() + dag.slice(1)}</span>
      <SnelZoek />
      <span className="pf-acties">
        {magBewerken && <Link to="/nieuw" className="pf-plus" aria-label="Nieuwe claim"><Icon naam="plus" maat={20} /></Link>}
        <Link to="/notities" className="pf-ic" aria-label="Notities"><Icon naam="bericht" maat={18} /></Link>
        <Link to="/beheer" className="pf-ik"><span className="pf-av">{(naam || "?").slice(0, 1).toUpperCase()}</span><span className="pf-naam"><b>{naam || "Account"}</b><small>{rol === "beheer" ? "Beheerder" : "Alleen kijken"}</small></span></Link>
      </span>
      <i className="pf-streep" aria-hidden="true"><b /><b /><b /><b /><b /></i>
      <nav className="pf-nav" aria-label="Hoofdmenu bovenbalk">
        {PF_NAV.map(([naar, label]) => <NavLink key={naar} to={naar} end={naar === "/"}>{label}</NavLink>)}
        <span className="pf-doel">Maanddoel {euroKort(geclaimdDezeMaand(actief).bedrag)} van {euroKort(inst.maanddoel || 0)} · {inst.maanddoel ? Math.round((geclaimdDezeMaand(actief).bedrag / inst.maanddoel) * 100) : 0}%</span>
      </nav>
    </header>
  );
}

type Bereik = "1W" | "1M" | "3M" | "1J" | "MAX";
const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function glad(p: Array<[number, number]>, onder = Infinity, boven = -Infinity) {
  if (p.length < 2) return "";
  const k = (y: number) => Math.min(onder, Math.max(boven, y));
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${b[0] + (c[0] - a[0]) / 6},${k(b[1] + (c[1] - a[1]) / 6)} ${c[0] - (e[0] - b[0]) / 6},${k(c[1] - (e[1] - b[1]) / 6)} ${c[0]},${c[1]}`;
  }
  return d;
}

function reeks(claims: Claim[], bereik: Bereik): Array<{ label: string; bedrag: number }> {
  const geh = claims.filter((c) => statusVan(c) === "gehonoreerd");
  const datumVan = (c: Claim) => (c.notities || []).filter((n) => n.naar === "gehonoreerd").pop()?.d?.slice(0, 10) || (c.periode ? `${c.periode}-15` : c.datum || "");
  const nu = new Date();
  if (bereik === "1W" || bereik === "1M") {
    const n = bereik === "1W" ? 7 : 10, stap = bereik === "1W" ? 1 : 3;
    return Array.from({ length: n }, (_, i) => {
      const e = new Date(nu); e.setDate(e.getDate() - (n - 1 - i) * stap);
      const b = new Date(e); b.setDate(b.getDate() - (stap - 1));
      const eS = e.toISOString().slice(0, 10), bS = b.toISOString().slice(0, 10);
      return { label: `${String(e.getDate()).padStart(2, "0")}/${String(e.getMonth() + 1).padStart(2, "0")}`, bedrag: som(geh.filter((c) => { const x = datumVan(c); return x >= bS && x <= eS; })) };
    });
  }
  const pm = teruggehaaldPerMaand(claims);
  const n = bereik === "3M" ? 3 : bereik === "1J" ? 12 : Math.max(12, pm.size);
  return Array.from({ length: Math.max(n, 4) }, (_, i) => {
    const x = new Date(nu.getFullYear(), nu.getMonth() - (Math.max(n, 4) - 1 - i), 1);
    const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    return { label: MAANDEN[x.getMonth()], bedrag: pm.get(k)?.bedrag || 0 };
  });
}

/** Home dashboard (design "Portfolio"): overview card, wave chart, supplier panel with ring. */
export function PortfolioDash() {
  const { actief, magBewerken } = useStore();
  const [bereik, setBereik] = useState<Bereik>("1J");
  const d = useMemo(() => {
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd"), afg = actief.filter((c) => statusVan(c) === "afgewezen");
    const open = actief.filter((c) => isOpen(c) && !c.uitbesteed), uit = actief.filter((c) => c.uitbesteed && statusVan(c) !== "afgewezen");
    const levs = new Map<string, Claim[]>();
    for (const c of actief) { const k = (c.leverancier || "").trim(); if (k) levs.set(k, [...(levs.get(k) || []), c]); }
    const top = [...levs.entries()].map(([naam, l]) => ({ naam, l, terug: som(l.filter((c) => statusVan(c) === "gehonoreerd")) })).sort((a, b) => b.terug - a.terug)[0];
    return { geh, afg, open, uit, top };
  }, [actief]);
  const punten = useMemo(() => reeks(actief, bereik), [actief, bereik]);
  const max = Math.max(1, ...punten.map((p) => p.bedrag));
  const W = 640, H = 220, X0 = 10, Y0 = 16;
  const pts: Array<[number, number]> = punten.map((p, i) => [X0 + (i / Math.max(1, punten.length - 1)) * (W - 2 * X0), Y0 + (1 - p.bedrag / max) * (H - Y0 - 24)]);
  const piek = punten.reduce((b, p, i) => (p.bedrag > punten[b].bedrag ? i : b), 0);
  const lijn = glad(pts, H - 24, Y0);
  const top = d.top, topGeh = top ? top.l.filter((c) => statusVan(c) === "gehonoreerd").length : 0, topAfg = top ? top.l.filter((c) => statusVan(c) === "afgewezen").length : 0;
  const graad = top && topGeh + topAfg ? Math.round((topGeh / (topGeh + topAfg)) * 100) : 0;
  const o = 2 * Math.PI * 46;

  const cijfer = (label: string, bedrag: number, n: number, kl: string) => (
    <div className="pf-cijfer"><small>{label} <em className={kl}>{n} {n === 1 ? "claim" : "claims"}</em></small><b><sup>€</sup>{euro(bedrag).replace("€", "").trim()}</b></div>
  );

  return (
    <section className="pf-dash" aria-label="Overzicht">
      <div className="pf-links">
        <div className="pf-kaart pf-overall">
          <div className="pf-kop"><h2>Totaal overzicht</h2>
            <span className="pf-knoppen"><Link to="/rapportage" className="pf-uit">Rapportage</Link>{magBewerken && <Link to="/nieuw" className="pf-oranje">Nieuwe claim +</Link>}</span></div>
          <div className="pf-cijfers">
            {cijfer("Teruggehaald", som(d.geh), d.geh.length, "op")}
            {cijfer("Uitbesteed", som(d.uit), d.uit.length, "op")}
            {cijfer("Nog open", som(d.open), d.open.length, "op")}
            {cijfer("Afgewezen", som(d.afg), d.afg.length, "neer")}
          </div>
        </div>
        <div className="pf-kaart pf-stat">
          <div className="pf-kop"><h2>Overzicht teruggehaald</h2></div>
          <div className="pf-stat-kop">
            <span className="pf-badge"><LogoMerk maat={30} /></span>
            <div><small>Totaal in deze periode</small><b><sup>€</sup>{euro(punten.reduce((s, p) => s + p.bedrag, 0)).replace("€", "").trim()}</b></div>
            <span className="pf-tabs" role="tablist">{(["1W", "1M", "3M", "1J", "MAX"] as Bereik[]).map((b) => <button key={b} type="button" role="tab" aria-selected={b === bereik} onClick={() => setBereik(b)}>{b}</button>)}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="pf-golf" role="img" aria-label="Teruggehaald over tijd">
            <defs>
              <linearGradient id="pf-lijn" x1="0" x2="1"><stop offset="0" stopColor="#FF4FA3" /><stop offset=".55" stopColor="#E0459B" /><stop offset="1" stopColor="#FF8A3D" /></linearGradient>
              <linearGradient id="pf-vlak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF4FA3" stopOpacity=".22" /><stop offset="1" stopColor="#FF4FA3" stopOpacity="0" /></linearGradient>
            </defs>
            {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={W} y1={Y0 + i * ((H - Y0 - 24) / 3)} y2={Y0 + i * ((H - Y0 - 24) / 3)} className="pf-raster" />)}
            <path d={`${lijn} L${pts[pts.length - 1][0]},${H - 24} L${pts[0][0]},${H - 24} Z`} fill="url(#pf-vlak)" />
            <path d={lijn} fill="none" stroke="url(#pf-lijn)" strokeWidth="3.5" strokeLinecap="round" />
            {punten[piek].bedrag > 0 && <g>
              <line x1={pts[piek][0]} x2={pts[piek][0]} y1={pts[piek][1]} y2={H - 24} className="pf-piek-lijn" />
              <circle cx={pts[piek][0]} cy={pts[piek][1]} r="7" fill="#fff" stroke="#1A1A1A" strokeWidth="3" />
              <rect x={Math.min(W - 120, Math.max(0, pts[piek][0] - 60))} y={Math.max(0, pts[piek][1] - 44)} width="120" height="30" rx="8" className="pf-tip" />
              <text x={Math.min(W - 60, Math.max(60, pts[piek][0]))} y={Math.max(20, pts[piek][1] - 24)} textAnchor="middle" className="pf-tip-t">{euroKort(punten[piek].bedrag)} · {punten[piek].label}</text>
            </g>}
            {punten.map((p, i) => <text key={i} x={pts[i][0]} y={H - 4} textAnchor="middle" className={`pf-as${i === piek ? " a" : ""}`}>{p.label}</text>)}
          </svg>
        </div>
      </div>
      <aside className="pf-kaart pf-rechts">
        {top ? <>
          <div className="pf-lev"><span className="pf-badge">{top.naam.slice(0, 1)}</span><div><b>{top.naam}</b><small>BESTE LEVERANCIER</small></div></div>
          <div className="pf-sub"><small>Teruggehaald</small><b><sup>€</sup>{euro(top.terug).replace("€", "").trim()}</b><Link to={`/leveranciers/${encodeURIComponent(top.naam)}`}>Leverancier bekijken ↗</Link></div>
          <svg viewBox="0 0 120 120" className="pf-ring" role="img" aria-label={`${graad}% gehonoreerd`}>
            <defs><linearGradient id="pf-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A855F7" /><stop offset=".5" stopColor="#3B82F6" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
            <circle cx="60" cy="60" r="46" fill="none" stroke="#262626" strokeWidth="9" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="url(#pf-ring)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(graad / 100) * o} ${o}`} transform="rotate(-90 60 60)" />
            <text x="60" y="52" textAnchor="middle" className="pf-ring-l">Gehonoreerd</text>
            <text x="60" y="74" textAnchor="middle" className="pf-ring-v">{graad}%</text>
          </svg>
          <dl className="pf-lijst">
            <div><dt>Claims</dt><dd>{top.l.length}</dd></div>
            <div><dt>Gehonoreerd</dt><dd className="op">{topGeh}</dd></div>
            <div><dt>Afgewezen</dt><dd>{topAfg}</dd></div>
            <div><dt>Open</dt><dd>{top.l.filter(isOpen).length}</dd></div>
            <div><dt>Laatste</dt><dd>{titelVan(top.l[top.l.length - 1])}</dd></div>
          </dl>
          <Link to="/claims" className="pf-uit pf-vol">Claims bekijken</Link>
          {magBewerken && <Link to="/nieuw" className="pf-oranje pf-vol">Nieuwe claim</Link>}
        </> : <p className="t-zacht">Nog geen leveranciers.</p>}
      </aside>
    </section>
  );
}
