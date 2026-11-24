import { useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Claim } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, dagenOpen, doorlooptijd, isOpen, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { datum, dezeMaand, euro, geleden } from "../lib/format";
import { claimMaand, geclaimdDezeMaand } from "../lib/team";
import { werkbak } from "../lib/werkbak";
import { geefBestand } from "../lib/overdracht";
import { Icon } from "./Icon";

const heel = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Math.round(n));
const LEVKLEUR = ["#E05BC0", "#2E9CB2", "#F4B43A", "#3F4A63", "#7C6CF2", "#1F9D6B"];
const kleurVan = (naam: string) => LEVKLEUR[[...naam].reduce((s, c) => s + c.charCodeAt(0), 0) % LEVKLEUR.length];
const DAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

/** Smooth path through points. */
function glad(p: Array<[number, number]>) {
  if (p.length < 2) return "";
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0]},${c[1]}`;
  }
  return d;
}
function Spark({ w }: { w: number[] }) {
  const max = Math.max(1, ...w), n = Math.max(2, w.length);
  const p = w.map((v, i) => [(i / (n - 1)) * 120, 26 - (v / max) * 22] as [number, number]);
  return <svg viewBox="0 0 120 28" className="pr-sp" aria-hidden="true"><path d={glad(p)} /></svg>;
}

/** Home dashboard (design 36 "Prime"): greeting, Flow suggestion, hero total with split and year line, outsourced ring, LGAR drop zone, claims with term bars, trend cards. */
export function PrimeDash() {
  const { actief, inst, naam, magBewerken, zetStatus } = useStore();
  const nav = useNavigate();
  const [sleep, setSleep] = useState(false);
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4), vorig = String(Number(jaar) - 1);
    const jaarVan = (c: Claim) => (claimMaand(c) || afgehandeldOp(c) || "").slice(0, 4);
    const ditJaar = actief.filter((c) => jaarVan(c) === jaar);
    const eigen = ditJaar.filter((c) => !c.uitbesteed), uit = ditJaar.filter((c) => c.uitbesteed);
    const binnen = eigen.filter((c) => c.locatie !== "buiten"), buiten = eigen.filter((c) => c.locatie === "buiten");
    // the same part of last year, for the growth figure
    const tot = dezeMaand().slice(5, 7);
    const vorigDeel = actief.filter((c) => jaarVan(c) === vorig && claimMaand(c).slice(5, 7) <= tot);
    const nu = new Date();
    const mnd = (n: number) => Array.from({ length: n }, (_, i) => { const x = new Date(nu.getFullYear(), nu.getMonth() - (n - 1) + i, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; });
    const reeks = (lijst: Claim[], n = 9) => mnd(n).map((k) => som(lijst.filter((c) => claimMaand(c) === k)));
    const terugJaar = actief.filter((c) => statusVan(c) === "gehonoreerd" && !c.uitbesteed && (afgehandeldOp(c) || claimMaand(c)).slice(0, 4) === jaar);
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd"), afg = actief.filter((c) => statusVan(c) === "afgewezen");
    const doorl = actief.filter((c) => !c.uitbesteed).map(doorlooptijd).filter((x): x is number => x != null);
    const laat = actief.filter((c) => overTermijn(c, inst.dagen));
    const taken = werkbak(actief, inst.dagen);
    const indienen = taken.filter((t) => t.reden === "indienen").map((t) => t.claim);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || "")).slice(0, 5);
    const scans = actief.flatMap((c) => (c.notities || []).filter((n) => n.t.startsWith("Claim vastgelegd uit")).map((n) => ({ c, d: n.d })))
      .sort((a, b) => b.d.localeCompare(a.d)).slice(0, 2);
    const partners = [...new Set(uit.map((c) => c.leverancier).filter(Boolean))].slice(0, 2) as string[];
    return {
      jaar, eigen, uit, binnen, buiten, vorigTot: som(vorigDeel), n: ditJaar.length, jaarlijn: reeks(actief, 12),
      sp: { eigen: reeks(eigen), uit: reeks(uit), binnen: reeks(binnen), buiten: reeks(buiten), terug: reeks(terugJaar), laat: mnd(9).map((k) => laat.filter((c) => claimMaand(c) === k).length) },
      terug: som(terugJaar), graad: geh.length + afg.length ? Math.round((geh.length / (geh.length + afg.length)) * 100) : 0,
      doorloop: doorl.length ? Math.round(doorl.reduce((a, b) => a + b, 0) / doorl.length) : null, laat, indienen, laatste, scans, partners,
    };
  }, [actief, inst.dagen]);
  const totaal = som(d.eigen) + som(d.uit);
  const groei = d.vorigTot ? Math.round(((totaal - d.vorigTot) / d.vorigTot) * 100) : null;
  const gm = geclaimdDezeMaand(actief);
  const doel = inst.maanddoel || 0, pct = doel ? Math.round((gm.bedrag / doel) * 100) : 0;
  const deel = totaal ? Math.round((som(d.uit) / totaal) * 100) : 0;
  const uur = new Date().getHours(), groet = uur < 6 ? "Goedenacht" : uur < 12 ? "Goedemorgen" : uur < 18 ? "Goedemiddag" : "Goedenavond";
  const vandaag = new Date();
  const voornaam = (naam || "").split(" ")[0];

  // year line
  const W = 770, H = 150, max = Math.max(1, ...d.jaarlijn);
  const lijn = d.jaarlijn.map((v, i) => [(i / (d.jaarlijn.length - 1)) * W, H - 14 - (v / max) * (H - 40)] as [number, number]);
  const eind = lijn[lijn.length - 1];

  const laat = d.laat[0];
  const flowTekst = laat
    ? <><b>{titelVan(laat)}</b> staat {(dagenOpen(laat)?.dagen ?? inst.dagen) - inst.dagen} {(dagenOpen(laat)?.dagen ?? 0) - inst.dagen === 1 ? "dag" : "dagen"} over de termijn — vraag informatie op bij de VAM{d.indienen.length ? <>, en <b>{d.indienen.length} {d.indienen.length === 1 ? "claim is" : "claims zijn"}</b> klaar om in te dienen</> : null}.</>
    : d.indienen.length ? <><b>{d.indienen.length} {d.indienen.length === 1 ? "claim is" : "claims zijn"}</b> klaar om in te dienen: {d.indienen.slice(0, 2).map(titelVan).join(", ")}{d.indienen.length > 2 ? " …" : ""}.</>
      : <>Alles is bijgewerkt. <b>{euro(gm.bedrag)}</b> geclaimd deze maand — mooi werk.</>;

  const drop = (e: DragEvent) => {
    e.preventDefault(); setSleep(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { geefBestand(f); nav("/nieuw"); }
  };

  return (
    <section className="pr" aria-label="Overzicht">
      <div className="pr-groet">
        <div><small>{DAGEN[vandaag.getDay()]} {vandaag.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} · {inst.vestiging || "Vestiging Meppel"}</small>
          <h1>{groet}{voornaam ? <>, <b>{voornaam}.</b></> : "."}</h1></div>
        {doel > 0 && (
          <Link to="/rapportage" className="pr-doel">
            <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14" className="pr-ring-bg" /><circle cx="18" cy="18" r="14" className="pr-ring" strokeDasharray="88" strokeDashoffset={88 - Math.min(1, pct / 100) * 88} transform="rotate(-90 18 18)" /></svg>
            <span>Maanddoel <b>{euro(gm.bedrag)}</b> van {euro(doel)} · <b className="pr-groen">{pct}%</b><small>{gm.uitbesteed ? `incl. ${euro(gm.uitbesteed)} uitbesteed` : "nog niets uitbesteed deze maand"}</small></span>
          </Link>
        )}
      </div>

      <div className="pr-flow">
        <i className="pr-orb" aria-hidden="true" />
        <p>{flowTekst}</p>
        {laat && <Link to={`/claims/${laat.id}`} className="pr-k">Bekijk claim</Link>}
        {magBewerken && d.indienen.length > 0 && <button type="button" className={laat ? "pr-k2" : "pr-k"} onClick={() => void zetStatus(d.indienen.map((c) => c.id), "ingediend")}>Dien {d.indienen.length} in</button>}
        {!laat && !d.indienen.length && <Link to="/rapport" className="pr-k2">Maandrapport</Link>}
      </div>

      <nav className="pr-snel" aria-label="Direct naar">
        <Link to="/leveranciers"><Icon naam="fabriek" maat={20} /><span>Leveranciers</span></Link>
        <Link to="/uitbesteed"><Icon naam="extern" maat={20} /><span>Uitbesteed</span></Link>
        <Link to="/notities"><Icon naam="notitie" maat={20} /><span>Notities</span></Link>
        <Link to="/rapportage"><Icon naam="grafiek" maat={20} /><span>Rapportage</span></Link>
        <Link to="/assistent"><Icon naam="robot" maat={20} /><span>Flow</span></Link>
      </nav>

      <div className="pr-raster">
        <section className="pr-held">
          <i className="pr-bl" aria-hidden="true" />
          <svg viewBox="0 0 150 110" className="pr-ln" aria-hidden="true"><path d="M8 20V95M8 75H142V88H8" /><path d="M20 62L40 50L70 62H135" /><circle cx="20" cy="98" r="6" /><circle cx="130" cy="98" r="6" /></svg>
          <h2><i>Totaal</i> <b>geclaimd.</b></h2>
          <div className="pr-num">€ {heel(totaal)}<small>{d.jaar}</small></div>
          <div className="pr-sub">{groei != null ? <>{groei >= 0 ? "↗" : "↘"} <b>{groei >= 0 ? "+" : ""}{groei}%</b> t.o.v. vorig jaar · </> : null}<b>{d.n}</b> {d.n === 1 ? "claim" : "claims"}</div>
          <div className="pr-split" aria-hidden="true"><b style={{ flex: som(d.binnen) || 0.001 }} /><b style={{ flex: som(d.buiten) || 0.001 }} /><b style={{ flex: som(d.uit) || 0.001 }} /></div>
          <div className="pr-vk">
            <Link to="/claims"><small>Geclaimd</small><b>€ {heel(som(d.eigen))}</b><Spark w={d.sp.eigen} /></Link>
            <Link to="/uitbesteed"><small>Uitbesteed</small><b>€ {heel(som(d.uit))}</b><Spark w={d.sp.uit} /></Link>
            <Link to="/claims"><small>Binnenmonteur</small><b>€ {heel(som(d.binnen))}</b><Spark w={d.sp.binnen} /></Link>
            <Link to="/claims"><small>Buitenmonteur</small><b>€ {heel(som(d.buiten))}</b><Spark w={d.sp.buiten} /></Link>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="pr-area" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="pr-ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
            <path d={`${glad(lijn)} L${W},${H} L0,${H}Z`} fill="url(#pr-ga)" /><path d={glad(lijn)} className="pr-lijn" />
            <circle cx={eind[0] - 4} cy={eind[1]} r="5" className="pr-eind" />
          </svg>
        </section>

        <div className="pr-rechts">
          <Link to="/uitbesteed" className="pr-uit">
            <svg viewBox="0 0 150 150" className="pr-ln" aria-hidden="true"><path d="M50 10L70 140M100 10L80 140M40 10H62M90 10H112M56 48H68M86 48H98M64 98H86" /></svg>
            <h2>Uitbesteed</h2>
            <div className="pr-num">€ {heel(som(d.uit))}</div>
            <p className="pr-uit-zelf">Leverancier pakt dit verder zelf op</p>
            <p>{d.uit.length} {d.uit.length === 1 ? "claim" : "claims"}{d.partners.length ? ` · ${d.partners.join(" & ")}` : ""}</p>
            <div className="pr-rg">
              <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="18" className="pr-uring-bg" /><circle cx="23" cy="23" r="18" className="pr-uring" strokeDasharray="113" strokeDashoffset={113 - (deel / 100) * 113} transform="rotate(-90 23 23)" /></svg>
              <span><b>{deel}%</b> van het totaal<br />{euro(gm.uitbesteed)} deze maand</span>
            </div>
          </Link>
          {magBewerken && (
            <div className={`pr-lgar${sleep ? " sleep" : ""}`} onDragOver={(e) => { e.preventDefault(); setSleep(true); }} onDragLeave={() => setSleep(false)} onDrop={drop}>
              <Link to="/nieuw?bron=camera" className="pr-lgk"><i aria-hidden="true"><Icon naam="document" maat={22} /></i><span><b>LGAR-bon inlezen</b><small>{sleep ? "Laat los om in te lezen" : "Sleep de pdf hierheen of maak een foto"}</small></span><Icon naam="pijl" maat={18} /></Link>
              {d.scans.length > 0 && <ul className="pr-recent">{d.scans.map(({ c, d: t }) => <li key={c.id}><Link to={`/claims/${c.id}`}><span>{titelVan(c)}{c.leverancier ? ` · ${c.leverancier}` : ""}</span><small>{geleden(Date.parse(t))}</small></Link></li>)}</ul>}
            </div>
          )}
        </div>
      </div>

      <div className="pr-onder">
        <section className="pr-kaart">
          <h3>Laatste claims <Link to="/claims">Alle {actief.length} →</Link></h3>
          {d.laatste.map((c) => {
            const dg = dagenOpen(c)?.dagen ?? null, open = isOpen(c), te = overTermijn(c, inst.dagen);
            const st = te ? ["pr-s-r", "VAM vragen"] : statusVan(c) === "gehonoreerd" ? ["pr-s-o", "Gehonoreerd"] : statusVan(c) === "afgewezen" ? ["pr-s-g", "Afgewezen"] : statusVan(c) === "nieuw" ? ["pr-s-n", "Nieuw"] : ["pr-s-i", STATUS_LABEL[statusVan(c)]];
            const lev = c.leverancier || "—";
            return (
              <Link key={c.id} to={`/claims/${c.id}`} className="pr-rij">
                <span className="pr-la" style={{ background: kleurVan(lev) }}>{lev.slice(0, 2).toUpperCase()}</span>
                <span className="pr-rt"><b>{titelVan(c)}</b><small>{[c.onderdeel !== c.type ? c.onderdeel : "", lev].filter(Boolean).join(" · ")}</small></span>
                <span className="pr-term">{open && dg != null ? <><i><u className={te ? "over" : ""} style={{ width: `${Math.min(100, (dg / inst.dagen) * 100)}%` }} /></i><small>{dg} / {inst.dagen} d</small></> : <small>{c.datum ? datum(c.datum) : "—"}</small>}</span>
                <span className={`pr-st ${st[0]}`}>{st[1]}</span>
                <span className="pr-bd">{c.bedrag ? euro(c.bedrag).replace(",00", "") : "—"}</span>
              </Link>
            );
          })}
        </section>
        <div className="pr-cij">
          <div className="pr-c" style={{ ["--k" as string]: "#F7A9B8" }}><small>Teruggehaald {d.jaar}</small><b>€ {heel(d.terug)}</b><em>gehonoreerd geld</em><Spark w={d.sp.terug} /></div>
          <div className="pr-c" style={{ ["--k" as string]: "var(--mteal-2)" }}><small>Honoreringsgraad</small><b>{d.graad}%</b><em>van de beoordeelde claims</em><Spark w={d.sp.eigen} /></div>
          <div className="pr-c" style={{ ["--k" as string]: "var(--mnavy)" }}><small>Doorlooptijd</small><b>{d.doorloop != null ? `${d.doorloop} d` : "—"}</b><em>gemiddeld tot afgehandeld</em><Spark w={d.sp.binnen} /></div>
          <Link to="/claims" className="pr-c" style={{ ["--k" as string]: "var(--mgeel)" }}><small>Over termijn</small><b className={d.laat.length ? "pr-rood" : ""}>{d.laat.length}</b><em>{d.laat.length ? titelVan(d.laat[0]) : "alles op tijd"}</em><Spark w={d.sp.laat} /></Link>
        </div>
      </div>
    </section>
  );
}
