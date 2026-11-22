import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { statusVan, titelVan } from "../lib/claims";
import { euro } from "../lib/format";
import { STATUS_LABEL } from "../lib/types";
import { Icon } from "./Icon";

/** Search in the top bar: frame, purchase or claim number, type, supplier — results right underneath. */
export function SnelZoek() {
  const { actief } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
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

  return (
    <div className="sz" ref={vak} role="search">
      <Icon naam="zoek" maat={16} />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && res[0]) nav(`/claims/${res[0].c.id}`); if (e.key === "Escape") setOpen(false); }}
        placeholder="Frame-, inkoop- of claimnr." aria-label="Zoeken in claims" />
      {open && t.length >= 2 && (
        <div className="sz-lijst">
          {res.map(({ c, waar, wat }) => (
            <Link key={c.id} to={`/claims/${c.id}`} className="sz-rij">
              <span><b>{titelVan(c)}</b><small>{waar}: <mark>{wat}</mark>{c.leverancier && waar !== "Leverancier" ? ` · ${c.leverancier}` : ""}</small></span>
              <em>{c.bedrag ? euro(c.bedrag) : STATUS_LABEL[statusVan(c)]}</em>
            </Link>
          ))}
          {!res.length && <p className="sz-leeg">Niets gevonden voor “{q.trim()}”.</p>}
          <Link to="/claims" className="sz-alles">Alle claims bekijken <Icon naam="pijl" maat={14} /></Link>
        </div>
      )}
    </div>
  );
}
