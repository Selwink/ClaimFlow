import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { overTermijn, statusVan, titelVan } from "../lib/claims";
import { STATUS_LABEL } from "../lib/types";
import { euroKort } from "../lib/format";
import { zetWeergave } from "../lib/kleur";
import { LevAvatar } from "../pages/Leveranciers";
import { Icon, type IconNaam } from "./Icon";

/** Open the command palette from anywhere (for example a search button). */
export const openPalet = () => window.dispatchEvent(new Event("claimflow-palet"));

interface Item { sleutel: string; titel: string; sub: string; doe: () => void; claim?: { lev: string; chip: string; laat: boolean }; icoon?: IconNaam }

/** ⌘K / Ctrl+K or "/": one bar to find any claim, supplier or action and jump straight there. */
export function Palet() {
  const { actief, magBewerken, inst } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inRef = useRef<HTMLInputElement>(null);
  const lijstRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      const typt = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName || "") || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "/" && !typt) { e.preventDefault(); setOpen(true); }
    };
    const evt = () => setOpen(true);
    window.addEventListener("keydown", toets); window.addEventListener("claimflow-palet", evt);
    return () => { window.removeEventListener("keydown", toets); window.removeEventListener("claimflow-palet", evt); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); window.setTimeout(() => inRef.current?.focus(), 20); } }, [open]);

  const ga = (pad: string) => () => nav(pad);
  const acties: Item[] = useMemo(() => [
    ...(magBewerken ? [{ sleutel: "a-nieuw", titel: "LGAR-bon inlezen", sub: "Nieuwe claim met de scanner", doe: ga("/nieuw"), icoon: "plus" as IconNaam }] : []),
    { sleutel: "a-bord", titel: "Flow-bord", sub: "Claims per status, verslepen", doe: ga("/bord"), icoon: "bord" },
    { sleutel: "a-claims", titel: "Alle claims", sub: "Lijst met filters", doe: ga("/claims"), icoon: "lijst" },
    { sleutel: "a-lev", titel: "Leveranciers", sub: "Scores en totalen", doe: ga("/leveranciers"), icoon: "fabriek" },
    { sleutel: "a-uit", titel: "Uitbesteed", sub: "Wat de leverancier zelf oppakt", doe: ga("/uitbesteed"), icoon: "extern" },
    { sleutel: "a-rap", titel: "Rapportage", sub: "Cijfers en grafieken", doe: ga("/rapportage"), icoon: "grafiek" },
    { sleutel: "a-mr", titel: "Maandrapport", sub: "Overzicht van deze maand", doe: ga("/rapport"), icoon: "document" },
    { sleutel: "a-flow", titel: "Vraag het Flow", sub: "De assistent", doe: ga("/assistent"), icoon: "robot" },
    { sleutel: "a-not", titel: "Notities", sub: "Alle notities", doe: ga("/notities"), icoon: "notitie" },
    { sleutel: "a-prof", titel: "Profiel en instellingen", sub: "Weergave, mail, agenda", doe: ga("/beheer"), icoon: "persoon" },
    { sleutel: "w-glas", titel: "Weergave Glas", sub: "Liquid glass in blauw-lila licht", doe: () => zetWeergave("glas"), icoon: "oog" },
    { sleutel: "w-aurora", titel: "Weergave Aurora", sub: "Donker met kleur", doe: () => zetWeergave("aurora"), icoon: "maan" },
    { sleutel: "w-groen", titel: "Weergave Aurora groen", sub: "Donker met groen", doe: () => zetWeergave("groen"), icoon: "maan" },
    { sleutel: "w-parel", titel: "Weergave Parel", sub: "Licht en chique", doe: () => zetWeergave("parel"), icoon: "oog" },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [magBewerken]);

  const items = useMemo(() => {
    const z = q.trim().toLowerCase();
    const woorden = z.split(/\s+/).filter(Boolean);
    const past = (t: string) => woorden.every((w) => t.includes(w));
    const claims: Item[] = (z ? actief.filter((c) => past([c.type, c.onderdeel, c.leverancier, c.inkoopnummer, c.voorziening, c.frame, c.storing].join(" ").toLowerCase())) : actief.filter((c) => ["nieuw", "ingediend"].includes(statusVan(c))))
      .slice(0, z ? 8 : 5)
      .map((c) => ({ sleutel: c.id, titel: titelVan(c), sub: [c.leverancier, c.inkoopnummer ? `ink ${c.inkoopnummer}` : "", c.bedrag ? euroKort(Number(c.bedrag)) : ""].filter(Boolean).join(" · "), doe: ga(`/claims/${c.id}`),
        claim: { lev: c.leverancier || "—", chip: STATUS_LABEL[statusVan(c)], laat: overTermijn(c, inst.dagen) } }));
    const levs = z ? [...new Set(actief.map((c) => (c.leverancier || "").trim()).filter((l) => l && past(l.toLowerCase())))].slice(0, 3)
      .map((l): Item => ({ sleutel: `l-${l}`, titel: l, sub: "Leverancier", doe: ga(`/leveranciers/${encodeURIComponent(l)}`), claim: { lev: l, chip: "", laat: false } })) : [];
    const ac = acties.filter((a) => !z || past(`${a.titel} ${a.sub}`.toLowerCase()));
    return { claims, levs, ac, alle: [...claims, ...levs, ...ac] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, actief, acties]);

  useEffect(() => { setSel((s) => Math.min(s, Math.max(0, items.alle.length - 1))); }, [items]);
  useEffect(() => { lijstRef.current?.querySelector(".pl-sel")?.scrollIntoView({ block: "nearest" }); }, [sel]);
  if (!open) return null;

  const kies = (it?: Item) => { if (!it) return; setOpen(false); it.doe(); };
  const toets = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.alle.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); kies(items.alle[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  };
  let i = -1;
  const rij = (it: Item) => {
    i++; const n = i;
    return (
      <li key={it.sleutel} role="option" aria-selected={n === sel} className={n === sel ? "pl-sel" : undefined} onMouseMove={() => setSel(n)} onClick={() => kies(it)}>
        {it.claim ? <LevAvatar naam={it.claim.lev} /> : <span className="pl-ic"><Icon naam={it.icoon || "verder"} maat={17} /></span>}
        <span className="pl-tt"><b>{it.titel}</b><small>{it.sub}</small></span>
        {it.claim?.chip ? <span className={`pl-chip${it.claim.laat ? " laat" : ""}`}>{it.claim.laat ? "Over termijn" : it.claim.chip}</span> : <kbd>↵</kbd>}
      </li>
    );
  };
  return (
    <div className="palet-laag" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="palet" role="dialog" aria-modal="true" aria-label="Zoeken of doen">
        <div className="palet-in"><Icon naam="zoek" maat={20} />
          <input ref={inRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={toets} placeholder="Zoek een claim, leverancier of actie…" aria-label="Zoeken" role="combobox" aria-expanded="true" aria-controls="palet-lijst" autoComplete="off" />
          <kbd>esc</kbd></div>
        <ul id="palet-lijst" role="listbox" ref={lijstRef}>
          {items.claims.length > 0 && <li className="pl-grp" role="presentation">{q ? "Claims" : "Open claims"}</li>}
          {items.claims.map(rij)}
          {items.levs.length > 0 && <li className="pl-grp" role="presentation">Leveranciers</li>}
          {items.levs.map(rij)}
          {items.ac.length > 0 && <li className="pl-grp" role="presentation">Acties</li>}
          {items.ac.map(rij)}
          {!items.alle.length && <li className="pl-niets" role="presentation">Niets gevonden voor “{q}”.</li>}
        </ul>
        <div className="palet-voet"><span><kbd>↑</kbd><kbd>↓</kbd> kiezen</span><span><kbd>↵</kbd> openen</span><span><kbd>Ctrl</kbd><kbd>K</kbd> overal</span></div>
      </div>
    </div>
  );
}
