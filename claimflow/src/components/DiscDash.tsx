import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, dagenOpen, isOpen, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { dezeMaand, euro } from "../lib/format";
import { geclaimdDezeMaand } from "../lib/team";
import { Icon } from "./Icon";

const heel = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(Math.round(n));
const HOES = [["#B04BD8", "#E05BC0"], ["#1FA0C8", "#F2C94C"], ["#D8372B", "#F06A4A"], ["#2E9E8F", "#C9E86B"], ["#5B4BE0", "#3FB6E0"], ["#E0892B", "#F2C94C"]];
const LEVKLEUR = ["#E05BC0", "#3FB6E0", "#F2C94C", "#2EC4A0", "#9D90FF"];
const MAAND = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Home dashboard (design 25 "Discover"): recently viewed claims as covers, longest open, top suppliers, the month goal as a player bar. */
export function DiscDash() {
  const { actief, inst, magBewerken } = useStore();
  const d = useMemo(() => {
    const jaar = dezeMaand().slice(0, 4);
    const jaarVan = (c: Claim) => (afgehandeldOp(c) || c.periode || c.datum || "").slice(0, 4);
    const eigen = actief.filter((c) => statusVan(c) === "gehonoreerd" && !c.uitbesteed && jaarVan(c) === jaar);
    const uit = actief.filter((c) => c.uitbesteed && (c.periode || c.datum || afgehandeldOp(c) || "").slice(0, 4) === jaar);
    const laatste = [...actief].sort((a, b) => (b.bijgewerkt || b.datum || "").localeCompare(a.bijgewerkt || a.datum || "")).slice(0, 5);
    const open = actief.filter((c) => isOpen(c)).map((c) => ({ c, dagen: dagenOpen(c)?.dagen ?? 0 })).sort((a, b) => b.dagen - a.dagen).slice(0, 5);
    const lev = new Map<string, number>();
    for (const c of actief) if (statusVan(c) === "gehonoreerd" && c.leverancier) lev.set(c.leverancier, (lev.get(c.leverancier) || 0) + (Number(c.bedrag) || 0));
    const top = [...lev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { jaar, eigen, uit, laatste, open, top, n: actief.length, totaalAlles: som(actief) };
  }, [actief]);
  const binnen = som(d.eigen.filter((c) => c.locatie !== "buiten")), buiten = som(d.eigen.filter((c) => c.locatie === "buiten"));
  const doel = inst.maanddoel || 0, geclaimd = geclaimdDezeMaand(actief).bedrag, pct = doel ? Math.round((geclaimd / doel) * 100) : 0;
  const woord = (c: Claim) => ((c.storing || c.onderdeel || titelVan(c)).split(/\s+/).slice(0, 2).join(" ") || "Claim").toUpperCase();
  const initialen = (t: string) => t.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const status = (c: Claim) => (overTermijn(c, inst.dagen) ? "VAM vragen" : STATUS_LABEL[statusVan(c)]);

  return (
    <section className="dc" aria-label="Overzicht">
      <div className="dc-kop">
        <h1>Overzicht</h1>
        {magBewerken && <Link to="/nieuw?bron=camera" className="dc-lgar"><Icon naam="document" maat={18} /> LGAR-bon inlezen</Link>}
      </div>

      <div className="dc-cijfers">
        <div className="dc-c dc-hl"><small>Totaal geclaimd {d.jaar}</small><b>€ {heel(som(d.eigen) + som(d.uit))}</b></div>
        <div className="dc-c"><small>Geclaimd</small><b>€ {heel(som(d.eigen))}</b></div>
        <div className="dc-c"><small>Uitbesteed</small><b>€ {heel(som(d.uit))}</b></div>
        <div className="dc-c"><small>Binnenmonteur</small><b>€ {heel(binnen)}</b></div>
        <div className="dc-c"><small>Buitenmonteur</small><b>€ {heel(buiten)}</b></div>
      </div>

      <h2 className="dc-lab">Laatst bekeken</h2>
      <div className="dc-hoezen">
        {d.laatste.map((c, i) => (
          <Link key={c.id} to={`/claims/${c.id}`} className="dc-hoes">
            <span className="dc-img" style={{ background: `linear-gradient(150deg, ${HOES[i % HOES.length][0]}, ${HOES[i % HOES.length][1]})` }}><span>{woord(c)}</span><i aria-hidden="true">{initialen(titelVan(c))}</i></span>
            <b>{titelVan(c)}</b><small>{c.leverancier || "—"}{c.bedrag ? ` · ${euro(c.bedrag)}` : ""}</small>
          </Link>
        ))}
        <Link to="/claims" className="dc-hoes dc-alle"><span className="dc-img"><Icon naam="lijst" maat={40} /></span><b>Alle claims bekijken →</b><small>{d.n} claims · € {heel(d.totaalAlles)}</small></Link>
      </div>

      <div className="dc-twee">
        <div>
          <h2 className="dc-lab">Langst open</h2>
          {d.open.length ? d.open.map(({ c, dagen }, i) => (
            <Link key={c.id} to={`/claims/${c.id}`} className="dc-rij">
              <span className="dc-nr">{String(i + 1).padStart(2, "0")}</span>
              <span className="dc-t"><b>{titelVan(c)}</b><small>{c.leverancier || "—"}</small></span>
              <em className={overTermijn(c, inst.dagen) ? "rood" : ""}>{status(c)}</em>
              <span className="dc-d">{dagen} d</span>
            </Link>
          )) : <p className="t-zacht">Geen open claims.</p>}
        </div>
        <div>
          <h2 className="dc-lab">Top leveranciers</h2>
          {d.top.map(([naam, bedrag], i) => (
            <Link key={naam} to={`/leveranciers/${encodeURIComponent(naam)}`} className="dc-lev">
              <span style={{ background: LEVKLEUR[i % LEVKLEUR.length] }}>{naam.slice(0, 2).toUpperCase()}</span>
              <span><b>{naam}</b><small>€ {heel(bedrag)} terug</small></span>
            </Link>
          ))}
        </div>
      </div>

      {doel > 0 && (
        <div className="dc-speler">
          <span className="dc-hoesje" aria-hidden="true" />
          <span className="dc-sp-t"><b>Maanddoel {MAAND[new Date().getMonth()]}</b><small>{euro(geclaimd)} van {euro(doel)}</small></span>
          <span className="dc-knoppen">
            <Link to="/rapportage" aria-label="Rapportage"><Icon naam="grafiek" maat={18} /></Link>
            {magBewerken ? <Link to="/nieuw" className="dc-play" aria-label="Nieuwe claim"><Icon naam="plus" maat={20} /></Link> : <span className="dc-play"><Icon naam="vink" maat={20} /></span>}
            <Link to="/claims" aria-label="Claims"><Icon naam="lijst" maat={18} /></Link>
          </span>
          <span className="dc-balk"><em>€ 0</em><i><u style={{ width: `${Math.min(100, pct)}%` }} /></i><em>{pct}%</em></span>
        </div>
      )}
    </section>
  );
}
