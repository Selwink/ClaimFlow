import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { som, statusVan } from "../lib/claims";
import { euroKort, vandaag, dezeMaand } from "../lib/format";
import { reeks, teruggehaaldPerMaand, totaalTerug } from "../lib/team";
import { werkbak } from "../lib/werkbak";
import { Icon } from "./Icon";

function Ring({ waarde, label, deel }: { waarde: string; label: string; deel: number }) {
  const o = 2 * Math.PI * 18;
  return (
    <div className="sh-ring">
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" className="sh-ring-bg" /><circle cx="22" cy="22" r="18" className="sh-ring-v" strokeDasharray={o} strokeDashoffset={o * (1 - Math.max(0, Math.min(1, deel)))} transform="rotate(-90 22 22)" /></svg>
      <b>{waarde}</b><small>{label}</small>
    </div>
  );
}

/** Phone Werkbalk head (showcase design): greeting, ask-Flow bar, three progress rings and the slogan banner. */
export function ShowcaseKop() {
  const { actief, inst, naam } = useStore();
  const d = useMemo(() => {
    const taken = werkbak(actief, inst.dagen).filter((t) => t.bak === "nu");
    const vandaagD = vandaag();
    const klaarVandaag = actief.filter((c) => (c.notities || []).some((n) => n.d.slice(0, 10) === vandaagD)).length;
    const ingediendVandaag = som(actief.filter((c) => (c.datum || "").slice(0, 10) === vandaagD));
    const geclaimd = som(actief.filter((c) => c.periode === dezeMaand()));
    return { taken: taken.length, klaarVandaag, ingediendVandaag, geclaimd };
  }, [actief, inst.dagen]);
  const uur = new Date().getHours();
  const groet = uur < 6 ? "Goedenacht" : uur < 12 ? "Goedemorgen" : uur < 18 ? "Goedemiddag" : "Goedenavond";
  const doel = inst.maanddoel || 1;
  return (
    <section className="sh-kop" aria-label="Vandaag">
      <div className="sh-groet"><div><small>{groet},</small><h1>{naam ? naam.split(" ")[0] : "welkom"}! 👋</h1><small>Laten we wat terughalen vandaag.</small></div>
        <span className="sh-acties"><Link to="/notities" className="sh-bel" aria-label="Notities en meldingen"><Icon naam="bericht" maat={20} /></Link><Link to="/beheer" className="sh-av" aria-label="Profiel">{(naam || "?").slice(0, 1).toUpperCase()}</Link></span></div>
      <Link to="/assistent" className="sh-vraag"><Icon naam="zoek" maat={16} /> Vraag Flow, de ClaimFlow-assistent…</Link>
      <p className="sh-lab">Voortgang vandaag</p>
      <div className="sh-ringen">
        <Ring waarde={`${d.klaarVandaag}/${d.klaarVandaag + d.taken}`} label="Taken" deel={d.klaarVandaag / Math.max(1, d.klaarVandaag + d.taken)} />
        <Ring waarde={euroKort(d.ingediendVandaag)} label="Vandaag" deel={d.ingediendVandaag / Math.max(1, doel / 20)} />
        <Ring waarde={`${Math.round((d.geclaimd / doel) * 100)}%`} label="Doel" deel={d.geclaimd / doel} />
      </div>
      <Link to="/rapportage" className="sh-banner"><span>Wat kapot gaat,<br /><b>komt terug.</b></span><i aria-hidden="true">▶</i></Link>
    </section>
  );
}

/** Profile head (showcase design): avatar, name, role and three numbers, with quick links. */
export function ProfielKop() {
  const { actief, naam, rol, inst } = useStore();
  const t = useMemo(() => totaalTerug(actief), [actief]);
  const r = useMemo(() => reeks(actief, naam), [actief, naam]);
  return (
    <section className="sh-profiel">
      <span className="sh-av sh-av-groot">{(naam || "?").slice(0, 1).toUpperCase()}</span>
      <b>{naam || "Je account"}</b><small>{rol === "beheer" ? "Beheerder" : "Alleen kijken"} · {inst.vestiging}</small>
      <div className="sh-stats"><div><b>{actief.length}</b><small>Claims</small></div><div><b>{euroKort(t.bedrag)}</b><small>Terug</small></div><div><b>{r}</b><small>Reeks</small></div></div>
      <nav className="sh-menu">
        <Link to="/claims"><Icon naam="lijst" maat={18} />Mijn claims<Icon naam="verder" maat={16} /></Link>
        <Link to="/notities"><Icon naam="notitie" maat={18} />Notities<Icon naam="verder" maat={16} /></Link>
        <Link to="/rapportage"><Icon naam="grafiek" maat={18} />Rapportage<Icon naam="verder" maat={16} /></Link>
        <Link to="/assistent"><Icon naam="robot" maat={18} />Assistent<Icon naam="verder" maat={16} /></Link>
      </nav>
    </section>
  );
}

type Periode = "dag" | "week" | "maand" | "jaar";
/** Numbers card (showcase design): amount honoured per day/week/month/year, with honoured count and streak. */
export function CijfersKaart({ periode, zet }: { periode: Periode; zet: (p: Periode) => void }) {
  const { actief, naam } = useStore();
  const d = useMemo(() => {
    const geh = actief.filter((c) => statusVan(c) === "gehonoreerd");
    const pm = teruggehaaldPerMaand(actief);
    const datumVan = (c: (typeof geh)[number]) => (c.notities || []).filter((n) => n.naar === "gehonoreerd").pop()?.d?.slice(0, 10) || (c.periode ? `${c.periode}-01` : "");
    const nu = new Date(`${vandaag()}T12:00:00`);
    let vakken: Array<{ k: string; label: string; bedrag: number }> = [];
    if (periode === "maand" || periode === "jaar") {
      const n = periode === "maand" ? 7 : 5;
      for (let i = n - 1; i >= 0; i--) {
        if (periode === "maand") { const x = new Date(nu.getFullYear(), nu.getMonth() - i, 1); const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; vakken.push({ k, label: x.toLocaleDateString("nl-NL", { month: "short" }), bedrag: pm.get(k)?.bedrag || 0 }); }
        else { const j = String(nu.getFullYear() - i); let b = 0; for (const [k, v] of pm) if (k.startsWith(j)) b += v.bedrag; vakken.push({ k: j, label: j, bedrag: b }); }
      }
    } else {
      const stap = periode === "dag" ? 1 : 7, n = 7;
      for (let i = n - 1; i >= 0; i--) {
        const eind = new Date(nu); eind.setDate(eind.getDate() - i * stap);
        const begin = new Date(eind); begin.setDate(begin.getDate() - (stap - 1));
        const b = begin.toISOString().slice(0, 10), e = eind.toISOString().slice(0, 10);
        vakken.push({ k: e, label: periode === "dag" ? eind.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2) : `${eind.getDate()}/${eind.getMonth() + 1}`, bedrag: som(geh.filter((c) => { const x = datumVan(c); return x >= b && x <= e; })) });
      }
    }
    const huidig = vakken[vakken.length - 1]?.bedrag || 0, vorig = vakken[vakken.length - 2]?.bedrag || 0;
    return { vakken, huidig, groei: vorig ? Math.round(((huidig - vorig) / vorig) * 100) : null, gehN: geh.length };
  }, [actief, periode]);
  const r = useMemo(() => reeks(actief, naam), [actief, naam]);
  const max = Math.max(1, ...d.vakken.map((v) => v.bedrag));
  const naamP = { dag: "vandaag", week: "deze week", maand: "deze maand", jaar: "dit jaar" }[periode];
  return (
    <section className="sh-cijfers">
      <div className="sh-tabs" role="tablist">{(["dag", "week", "maand", "jaar"] as Periode[]).map((p) => <button key={p} type="button" role="tab" aria-selected={p === periode} onClick={() => zet(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}</div>
      <div className="sh-kaart"><small>Teruggehaald {naamP}</small><h3>{euroKort(d.huidig)}</h3>
        {d.groei != null && <small className={d.groei >= 0 ? "op" : "neer"}>{d.groei >= 0 ? "↗" : "↘"} {Math.abs(d.groei)}% t.o.v. de vorige</small>}
        <div className="sh-staven">{d.vakken.map((v, i) => <div key={v.k}><i className={i === d.vakken.length - 1 || v.bedrag === max ? "hl" : ""} style={{ height: `${8 + (v.bedrag / max) * 80}px` }} title={euroKort(v.bedrag)} /><span>{v.label}</span></div>)}</div>
      </div>
      <div className="sh-duo"><div className="sh-kaart"><small>Gehonoreerd</small><h4>{d.gehN}</h4><small className="zacht">claims in totaal</small></div>
        <div className="sh-kaart"><small>Reeks</small><h4>{r} {r === 1 ? "dag" : "dagen"}</h4><small className="zacht">{r ? "Ga zo door!" : "Schrijf vandaag iets bij een claim"}</small></div></div>
    </section>
  );
}
