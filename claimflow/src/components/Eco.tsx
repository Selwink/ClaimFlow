import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { isOpen, levKleur, levLetters, som, startDatum, statusVan } from "../lib/claims";
import { dezeMaand, euroKort, meervoud, periodLabel, vandaag } from "../lib/format";
import { geclaimdDezeMaand, teruggehaaldPerMaand } from "../lib/team";

const vorigeMaand = (p: string) => { const [j, m] = p.split("-").map(Number); const d = new Date(j, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const pct = (nu: number, toen: number) => (toen ? Math.round(((nu - toen) / toen) * 1000) / 10 : null);

/** Small bar trio used on the stat cards. */
function MiniStaven({ waarden, kleur }: { waarden: number[]; kleur: (i: number) => string }) {
  const max = Math.max(1, ...waarden);
  return <span className="eco-mini" aria-hidden="true">{waarden.map((w, i) => <i key={i} style={{ height: `${8 + (w / max) * 24}px`, background: kleur(i) }} />)}</span>;
}

function Lijntje({ waarden, kleur }: { waarden: number[]; kleur: string }) {
  const max = Math.max(1, ...waarden), n = Math.max(2, waarden.length);
  const p = waarden.map((w, i) => `${(i / (n - 1)) * 92},${26 - (w / max) * 22}`).join(" ");
  return <svg viewBox="0 0 92 28" className="eco-lijn" aria-hidden="true"><polyline points={p} fill="none" stroke={kleur} strokeWidth="1.8" strokeLinejoin="round" /></svg>;
}

/** Amount of claims filed per day over the last 8 weeks. */
function perDag(claims: Claim[]) {
  const dagen: Array<{ d: string; bedrag: number }> = [];
  const nu = new Date(`${vandaag()}T12:00:00`);
  for (let i = 55; i >= 0; i--) { const d = new Date(nu); d.setDate(d.getDate() - i); dagen.push({ d: d.toISOString().slice(0, 10), bedrag: 0 }); }
  const idx = new Map(dagen.map((x, i) => [x.d, i]));
  for (const c of claims) { const s = startDatum(c); const i = s ? idx.get(s.slice(0, 10)) : undefined; if (i != null) dagen[i].bedrag += Number(c.bedrag) || 0; }
  return dagen;
}

/** Desktop dashboard on the Werkbalk (layout "Eco"): stat cards, claims per day, year card, suppliers, month goal. */
export function EcoDashboard() {
  const { actief, inst } = useStore();
  const d = useMemo(() => {
    const maand = dezeMaand(), vorige = vorigeMaand(maand), jaar = maand.slice(0, 4);
    const pm = teruggehaaldPerMaand(actief);
    const dezeM = pm.get(maand)?.bedrag || 0, vorigeM = pm.get(vorige)?.bedrag || 0;
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd"), afg = actief.filter((c) => statusVan(c) === "afgewezen");
    const graad = geh.length + afg.length ? Math.round((geh.length / (geh.length + afg.length)) * 100) : null;
    const open = actief.filter((c) => isOpen(c) && !c.uitbesteed);
    let jaarTerug = 0, vorigJaar = 0;
    for (const [k, v] of pm) { if (k.startsWith(jaar)) jaarTerug += v.bedrag; if (k.startsWith(String(Number(jaar) - 1))) vorigJaar += v.bedrag; }
    const gehJaar = geh.filter((c) => (c.periode || "").startsWith(jaar) || (c.datum || "").startsWith(jaar));
    const binnen = gehJaar.filter((c) => c.locatie !== "buiten"), buiten = gehJaar.filter((c) => c.locatie === "buiten");
    const maanden = Array.from({ length: 6 }, (_, i) => { let p = maand; for (let k = 0; k < 5 - i; k++) p = vorigeMaand(p); return p; });
    const levs = new Map<string, Claim[]>();
    for (const c of actief) { const k = (c.leverancier || "").trim() || "Zonder leverancier"; levs.set(k, [...(levs.get(k) || []), c]); }
    const lev = [...levs.entries()].map(([naam, lijst]) => {
      const g = lijst.filter((c) => statusVan(c) === "gehonoreerd"), a = lijst.filter((c) => statusVan(c) === "afgewezen");
      const pmL = teruggehaaldPerMaand(lijst);
      const verloop = maanden.map((m) => pmL.get(m)?.bedrag || 0);
      const tel = new Map<string, number>();
      for (const c of lijst) { const o = (c.onderdeel || c.type || "").split(/[\s,]+/)[0]; if (o) tel.set(o, (tel.get(o) || 0) + 1); }
      const meest = [...tel.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
      return { naam, n: lijst.length, graad: g.length + a.length ? Math.round((g.length / (g.length + a.length)) * 100) : null, verloop, meest, totaal: som(g), stijgt: verloop[5] >= verloop[4] };
    }).sort((x, y) => y.totaal - x.totaal).slice(0, 5);
    const dagen = perDag(actief);
    const geclaimd = geclaimdDezeMaand(actief).bedrag;
    return { maand, dezeM, vorigeM, graad, gehN: geh.length, afgN: afg.length, open, jaar, jaarTerug, vorigJaar, binnen, buiten, lev, dagen, geclaimd };
  }, [actief]);

  const maxDag = Math.max(1, ...d.dagen.map((x) => x.bedrag));
  const piek = d.dagen.reduce((b, x, i) => (x.bedrag > d.dagen[b].bedrag ? i : b), 0);
  const doel = inst.maanddoel || 0, deel = doel ? d.geclaimd / doel : 0;
  const omtrek = 2 * Math.PI * 48;
  const groei = pct(d.dezeM, d.vorigeM), jaarGroei = pct(d.jaarTerug, d.vorigJaar);

  return (
    <section className="eco-dash" aria-label="Overzicht">
      <div className="eco-stats">
        <div className="eco-kaart eco-donker">
          <small>Teruggehaald deze maand</small><b>{euroKort(d.dezeM)}</b>
          <span className={groei != null && groei < 0 ? "neer" : "op"}>{groei == null ? "eerste maand met resultaat" : `${groei >= 0 ? "↗" : "↘"} ${Math.abs(groei).toLocaleString("nl-NL")}% t.o.v. vorige maand`}</span>
          <MiniStaven waarden={[d.vorigeM * .6, d.vorigeM, d.dezeM * .5, d.dezeM]} kleur={() => "#3FAE49"} />
        </div>
        <div className="eco-kaart">
          <small>Honoreringsgraad</small><b>{d.graad ?? "–"}<em>/100%</em></b>
          <span className="zacht">{d.gehN} gehonoreerd · {d.afgN} afgewezen</span>
          <MiniStaven waarden={[d.gehN, d.afgN, d.gehN * .7, d.afgN * 1.2]} kleur={(i) => (i % 2 ? "#E5484D" : "#C9D3C6")} />
        </div>
        <div className="eco-kaart">
          <small>Nog terug te halen</small><b>{euroKort(som(d.open))}</b>
          <span className="op">↗ {meervoud(d.open.length, "open claim", "open claims")}</span>
          <MiniStaven waarden={d.open.slice(0, 4).map((c) => Number(c.bedrag) || 0)} kleur={(i) => (i === 1 ? "#C9D3C6" : "#3FAE49")} />
        </div>
      </div>

      <div className="eco-midden">
        <div className="eco-kaart">
          <h3>Ingediend per dag <span>8 weken</span></h3>
          <svg viewBox="0 0 700 200" className="eco-staven" role="img" aria-label="Bedrag ingediend per dag, laatste 8 weken">
            <line x1="0" x2="700" y1="60" y2="60" stroke="#9AA59A" strokeDasharray="3 4" />
            {d.dagen.map((x, i) => {
              const h = x.bedrag ? 6 + (x.bedrag / maxDag) * 140 : 3, w = 700 / d.dagen.length;
              return <rect key={x.d} x={i * w + 2} y={170 - h} width={w * .55} height={h} rx="1.5" fill={i === piek && x.bedrag ? "#111" : x.bedrag ? "#3FAE49" : "#D5DDD2"} />;
            })}
            {d.dagen[piek].bedrag > 0 && (() => { const x = (piek + .3) * (700 / d.dagen.length); return <g><rect x={x - 34} y="6" width="68" height="22" rx="6" fill="#111" /><text x={x} y="21" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="700">{euroKort(d.dagen[piek].bedrag)}</text></g>; })()}
            {Array.from({ length: 8 }, (_, w) => <text key={w} x={40 + w * 88} y="192" fill="#9AA59A" fontSize="10">{d.dagen[w * 7].d.slice(8, 10)}-{d.dagen[w * 7].d.slice(5, 7)}</text>)}
          </svg>
        </div>
        <div className="eco-kaart eco-groen">
          <div className="eco-groot">{euroKort(d.jaarTerug)} <small>{d.jaar}</small></div>
          <span className="op">{jaarGroei == null ? `teruggehaald in ${d.jaar}` : `${jaarGroei >= 0 ? "↗" : "↘"} ${Math.abs(Math.round(jaarGroei))}% ${jaarGroei >= 0 ? "meer" : "minder"} dan vorig jaar`}</span>
          <div className="eco-it"><span>🔧</span><div><b>Binnenmonteur</b><small>{euroKort(som(d.binnen))} · {meervoud(d.binnen.length, "claim", "claims")}</small></div></div>
          <div className="eco-it"><span>🚐</span><div><b>Buitenmonteur</b><small>{euroKort(som(d.buiten))} · {meervoud(d.buiten.length, "claim", "claims")}</small></div></div>
        </div>
      </div>

      <div className="eco-onder">
        <div className="eco-kaart">
          <h3>Leveranciers <Link to="/leveranciers">Alle</Link></h3>
          <table className="eco-tabel">
            <thead><tr><th>Leverancier</th><th>Claims</th><th>Gehon.</th><th>Verloop</th><th>Meest</th><th>Teruggehaald</th></tr></thead>
            <tbody>
              {d.lev.map((l) => (
                <tr key={l.naam}>
                  <td><Link to={`/leveranciers/${encodeURIComponent(l.naam)}`}><span className="eco-av" style={{ background: levKleur(l.naam) }}>{levLetters(l.naam).slice(0, 1)}</span>{l.naam}</Link></td>
                  <td>{l.n}</td><td>{l.graad == null ? "–" : `${l.graad}%`}</td>
                  <td><Lijntje waarden={l.verloop} kleur={l.stijgt ? "#3FAE49" : "#E5484D"} /></td>
                  <td>{l.meest && <span className="eco-tag">{l.meest}</span>}</td>
                  <td><b>{euroKort(l.totaal)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="eco-kaart eco-donker eco-doel">
          <h3>Maanddoel <span>{periodLabel(d.maand).split(" ")[0]}</span></h3>
          <svg viewBox="0 0 120 120" className="eco-ring" role="img" aria-label={`${Math.round(deel * 100)}% van het maanddoel`}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#1E2A20" strokeWidth="12" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="#3FAE49" strokeWidth="12" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - Math.min(1, deel))} transform="rotate(-90 60 60)" />
            <text x="60" y="58" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="800">{Math.round(deel * 100)}%</text>
            <text x="60" y="76" textAnchor="middle" fill="#8A978B" fontSize="9">{euroKort(d.geclaimd)} / {euroKort(doel)}</text>
          </svg>
          <p className="eco-pil">{deel >= 1 ? <>Maanddoel <b>gehaald</b> · mooi werk!</> : <>Nog <b>{euroKort(Math.max(0, doel - d.geclaimd))}</b> tot het doel</>}</p>
        </div>
      </div>
      <h2 className="eco-taken-kop">Taken</h2>
    </section>
  );
}
