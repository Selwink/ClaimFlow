import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { dagenOpen, geenBedrag, isOpen, overTermijn, statusVan, titelVan } from "../lib/claims";
import { datum, euro, periodLabel } from "../lib/format";
import { logoVan } from "../lib/levlogo";
import { Icon } from "./Icon";
import { TermRing } from "./TermRing";
import { StatusPil } from "./ui";

const VOLGENDE: Partial<Record<Status, Status>> = { nieuw: "ingediend", ingediend: "gehonoreerd" };
const STAPPEN: Array<{ s: Status; l: string }> = [{ s: "nieuw", l: "Aangemaakt" }, { s: "ingediend", l: "Ingediend" }, { s: "gehonoreerd", l: "Gehonoreerd" }];

/** Computer: a claim slides open on the right while the list stays visible. */
export function ClaimPaneel({ id, sluit }: { id: string | null; sluit: () => void }) {
  const { actief, inst, magBewerken, zetStatus } = useStore();
  const c = id ? actief.find((x) => x.id === id) : undefined;
  useEffect(() => {
    if (!id) return;
    const t = (e: KeyboardEvent) => { if (e.key === "Escape") sluit(); };
    window.addEventListener("keydown", t);
    return () => window.removeEventListener("keydown", t);
  }, [id, sluit]);
  if (!c) return null;
  const st = statusVan(c), d = dagenOpen(c), laat = overTermijn(c, inst.dagen), volgende = VOLGENDE[st];
  const nu = st === "afgewezen" ? 2 : Math.max(0, STAPPEN.findIndex((y) => y.s === st));
  const feiten: Array<[string, string | undefined]> = [["Leverancier", c.leverancier], ["Inkoopnummer", c.inkoopnummer], ["Framenummer", c.frame], ["Voorziening", c.voorziening], ["Storing", c.storing], ["Maand", periodLabel(c.periode)]];
  return createPortal(
    <>
      <div className="cp-achter" onClick={sluit} aria-hidden="true" />
      <aside className="cp" role="dialog" aria-label={`Claim ${titelVan(c)}`} key={c.id}>
        <div className="cp-kop">
          <button type="button" className="cp-sluit" onClick={sluit} aria-label="Sluiten"><Icon naam="kruis" maat={18} /></button>
          {logoVan(c.leverancier) ? <span className="cp-logo"><img src={logoVan(c.leverancier)!} alt="" /></span> : null}
          <small className="cp-ey">{[c.inkoopnummer ? `INK ${c.inkoopnummer}` : "", c.leverancier].filter(Boolean).join(" · ")}</small>
          <h2>{titelVan(c)}</h2>
        </div>
        <div className="cp-geld">
          <TermRing dagen={c.uitbesteed ? null : d?.dagen ?? null} termijn={inst.dagen} klaar={!isOpen(c)} maat={64} />
          <div><b className="num">{geenBedrag(c) ? "Bedrag volgt" : euro(c.bedrag)}</b><StatusPil status={st} />{laat && <small className="cp-laat">Over de termijn: vraag informatie op bij de VAM</small>}</div>
        </div>
        <ol className={`cd-stappen${st === "afgewezen" ? " cd-af" : ""}`} style={{ ["--v" as string]: `${(nu / 2) * 66.8}%` }} aria-label="Voortgang">
          {STAPPEN.map((x, i) => { const af = st === "afgewezen" && i === 2; return <li key={x.s} className={`${i <= nu ? "gedaan" : ""}${i === nu ? " nu" : ""}${af ? " afgewezen" : ""}`}><i aria-hidden="true">{af ? "✕" : i <= nu ? "✓" : i + 1}</i><span>{af ? "Afgewezen" : x.l}</span></li>; })}
        </ol>
        <dl className="cp-feiten">{feiten.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <div className="cp-tl">
          <b>Tijdlijn</b>
          {[...(c.notities || [])].reverse().slice(0, 5).map((n, i) => <div key={i}><i aria-hidden="true" /><span>{n.t}<small>{datum(n.d)}{n.w ? ` · ${n.w}` : ""}</small></span></div>)}
          {!(c.notities || []).length && <small className="t-zacht">Nog geen notities.</small>}
        </div>
        <div className="cp-voet">
          <Link to={`/claims/${c.id}`} className="knop knop-zacht"><Icon naam="extern" maat={16} /> Volledig openen</Link>
          {magBewerken && volgende && <button type="button" className={`knop ${volgende === "gehonoreerd" ? "knop-turk" : "knop-rood"}`} onClick={() => void zetStatus([c.id], volgende)}><Icon naam="vink" maat={16} /> {STATUS_LABEL[volgende]}</button>}
        </div>
      </aside>
    </>,
    document.body,
  );
}
