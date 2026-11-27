import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { statusVan, titelVan } from "../lib/claims";
import { euro } from "../lib/format";
import { STATUS_LABEL } from "../lib/types";
import { Icon } from "./Icon";
import { logoVan } from "../lib/levlogo";
import { levKleur, levLetters } from "../lib/claims";

/** Search in the top bar: frame, purchase or claim number, type, supplier — results right underneath. */
export function SnelZoek() {
  const { actief } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const loc = useLocation();
  const vak = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpen(false); setQ(""); }, [loc.pathname]);
  useEffect(() => {
    const weg = (e: MouseEvent) => { if (vak.current && !vak.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", weg);
    return () => document.removeEventListener("mousedown", weg);
  }, []);
  const t = q.trim().toLowerCase();
  const res = useMemo(() => {
    if (t.length < 2) return [];
    return actief.map((c) => {
      const velden: Array<[string, string | undefined]> = [["Frame", c.frame], ["Inkoop", c.inkoopnummer], ["Claim", c.nummer], ["Voorziening", c.voorziening], ["Type", titelVan(c)], ["Leverancier", c.leverancier], ["Onderdeel", c.onderdeel]];
      const hit = velden.find(([, v]) => (v || "").toLowerCase().includes(t));
      return hit ? { c, waar: hit[0], wat: hit[1] || "" } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 7);
  }, [actief, t]);
  useEffect(() => { setSel(0); }, [t]);
  const markeer = (tekst: string) => { const i = tekst.toLowerCase().indexOf(t); return i < 0 || !t ? tekst : <>{tekst.slice(0, i)}<mark>{tekst.slice(i, i + t.length)}</mark>{tekst.slice(i + t.length)}</>; };

  return (
    <div className="sz" ref={vak} role="search">
      <Icon naam="zoek" maat={16} />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(res.length - 1, x + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(0, x - 1)); }
          if (e.key === "Enter" && res[sel]) nav(`/claims/${res[sel].c.id}`);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={typeof matchMedia !== "undefined" && matchMedia("(min-width: 1280px)").matches ? "Zoeken…" : "Frame-, inkoop- of claimnr."} aria-label="Zoeken in claims" />
      {open && t.length >= 2 && (
        <div className="sz-lijst">
          {res.length > 0 && <small className="sz-kop">{res.length} {res.length === 1 ? "claim" : "claims"} gevonden · ↑↓ en Enter</small>}
          {res.map(({ c, waar, wat }, i) => (
            <Link key={c.id} to={`/claims/${c.id}`} className={`sz-rij${i === sel ? " sz-sel" : ""}`} onMouseEnter={() => setSel(i)}>
              {logoVan(c.leverancier) ? <span className="sz-logo"><img src={logoVan(c.leverancier)!} alt="" /></span>
                : <span className="sz-logo sz-letters" style={{ background: levKleur(c.leverancier || "?") }}>{levLetters(c.leverancier || "?")}</span>}
              <span className="sz-t"><b>{waar === "Type" ? markeer(titelVan(c)) : titelVan(c)}</b><small>{waar !== "Type" ? <>{waar}: {markeer(wat)}</> : waar}{c.leverancier && waar !== "Leverancier" ? ` · ${c.leverancier}` : ""}</small></span>
              <span className="sz-r"><em>{c.bedrag ? euro(c.bedrag) : "—"}</em><i className={`sz-st sz-${statusVan(c)}`}>{STATUS_LABEL[statusVan(c)]}</i></span>
            </Link>
          ))}
          {!res.length && <p className="sz-leeg">Niets gevonden voor “{q.trim()}”.</p>}
          <Link to="/claims" className="sz-alles">Alle claims bekijken <Icon naam="pijl" maat={14} /></Link>
        </div>
      )}
    </div>
  );
}
