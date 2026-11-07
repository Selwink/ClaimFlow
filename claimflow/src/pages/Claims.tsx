import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Claim, Status } from "../lib/types";
import { useStore } from "../state/Store";
import { isOpen, overTermijn, som, statusVan } from "../lib/claims";
import { dezeMaand, euroKort, isPeriode, meervoud, periodKort, periodLabel } from "../lib/format";
import { download, naarCsv } from "../lib/export";
import { ClaimKaarten, ClaimTabel, sorteer, type Sortering, type SorteerVeld } from "../components/ClaimLijst";
import { Icon } from "../components/Icon";
import { Leeg, PaginaKop } from "../components/ui";

const TABS = [
  { id: "alle", label: "Alle" },
  { id: "aandacht", label: "Aandacht" },
  { id: "open", label: "Open" },
  { id: "gehonoreerd", label: "Gehonoreerd" },
  { id: "afgewezen", label: "Afgewezen" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Groep = "geen" | "maand" | "leverancier";

const SORT_CHIPS: Array<{ veld: SorteerVeld; label: string }> = [
  { veld: "dagen", label: "Dagen open" }, { veld: "bedrag", label: "Bedrag" }, { veld: "titel", label: "Naam" }, { veld: "leverancier", label: "Leverancier" },
];

export function Claims() {
  const { actief, prullenbak, inst, magBewerken, zetStatus, naarPrullenbak } = useStore();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "alle") as Tab;
  const periode = params.get("periode") || "";
  const lev = params.get("lev") || "";
  const [zoek, setZoek] = useState("");
  const [sortering, setSortering] = useState<Sortering>({ veld: "dagen", omhoog: false });
  const [groep, setGroep] = useState<Groep>("geen");
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());

  const zetParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
    setGekozen(new Set());
  };

  const periodes = useMemo(() => [...new Set(actief.map((c) => c.periode).filter(isPeriode))].sort().reverse() as string[], [actief]);
  const leveranciers = useMemo(() => [...new Set(actief.map((c) => c.leverancier || "").filter(Boolean))].sort(), [actief]);

  const basis = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return actief.filter((c) => {
      if (periode && c.periode !== periode) return false;
      if (lev && (c.leverancier || "") !== lev) return false;
      if (!q) return true;
      return [c.type, c.onderdeel, c.leverancier, c.inkoopnummer, c.voorziening, c.frame, c.nummer, c.storing, c.bijzonderheden]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [actief, zoek, periode, lev]);

  const inTab = (c: Claim, t: Tab) => t === "alle" ? true : t === "aandacht" ? overTermijn(c, inst.dagen) || (isOpen(c) && !c.inkoopnummer && !c.uitbesteed)
    : t === "open" ? isOpen(c) : statusVan(c) === t;
  const tellers = TABS.map((t) => { const l = basis.filter((c) => inTab(c, t.id)); return { ...t, n: l.length, bedrag: som(l) }; });
  const lijst = sorteer(basis.filter((c) => inTab(c, tab)), sortering);

  const groepen: Array<{ kop: string; claims: Claim[] }> = groep === "geen" ? [{ kop: "", claims: lijst }] : (() => {
    const m = new Map<string, Claim[]>();
    for (const c of lijst) {
      const k = groep === "maand" ? c.periode || "" : c.leverancier || "Zonder leverancier";
      m.set(k, [...(m.get(k) || []), c]);
    }
    return [...m.entries()].sort(([a], [b]) => (groep === "maand" ? b.localeCompare(a) : a.localeCompare(b)))
      .map(([k, claims]) => ({ kop: groep === "maand" ? periodLabel(k) : k, claims }));
  })();

  const wissel = (id: string) => setGekozen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const alles = (aan: boolean) => setGekozen(aan ? new Set(lijst.map((c) => c.id)) : new Set());
  const ids = [...gekozen];
  const bulk = async (naar: Status) => { await zetStatus(ids, naar); setGekozen(new Set()); };

  return (
    <div className="pagina">
      <PaginaKop boven={`${meervoud(actief.length, "claim", "claims")} · ${euroKort(som(actief))}`} titel="Claims">
        <button type="button" className="knop knop-zacht" onClick={() => download(`garantieclaims-${dezeMaand()}.csv`, naarCsv(lijst), "text/csv;charset=utf-8")}>
          <Icon naam="download" maat={18} /> <span className="alleen-desktop">Exporteren</span>
        </button>
        {magBewerken && <Link to="/nieuw" className="knop knop-rood alleen-desktop"><Icon naam="plus" maat={18} /> Nieuwe claim</Link>}
      </PaginaKop>

      <div className="zoekbalk">
        <Icon naam="zoek" maat={18} />
        <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op type, leverancier, inkoop- of framenummer" aria-label="Zoeken" />
      </div>

      <div className="chiprij" role="group" aria-label="Maand">
        <button type="button" className="pil" aria-pressed={!periode} onClick={() => zetParam("periode", "")}>Alle maanden</button>
        {periodes.slice(0, 8).map((p) => (
          <button key={p} type="button" className="pil" aria-pressed={periode === p} onClick={() => zetParam("periode", periode === p ? "" : p)}>{periodKort(p)}</button>
        ))}
      </div>

      <div className="teller" role="tablist" aria-label="Status">
        {tellers.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`teller-vak vak-${t.id}${t.n ? " heeft" : ""}`} onClick={() => zetParam("tab", t.id === "alle" ? "" : t.id)}>
            <span className="teller-label">{t.label}</span>
            <b>{t.n}</b>
            <span className="teller-sub">{euroKort(t.bedrag)}</span>
          </button>
        ))}
      </div>

      <div className="werkbalk">
        <select value={lev} onChange={(e) => zetParam("lev", e.target.value)} aria-label="Leverancier" className="pil pil-select">
          <option value="">Alle leveranciers</option>
          {leveranciers.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="chiprij alleen-mobiel" role="group" aria-label="Sorteren">
          {SORT_CHIPS.map((s) => (
            <button key={s.veld} type="button" className="pil" aria-pressed={sortering.veld === s.veld}
              onClick={() => setSortering({ veld: s.veld, omhoog: sortering.veld === s.veld ? !sortering.omhoog : s.veld === "titel" || s.veld === "leverancier" })}>
              {s.label}{sortering.veld === s.veld && (sortering.omhoog ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
        <div className="segment segment-klein" role="radiogroup" aria-label="Groeperen">
          {([["geen", "Lijst"], ["maand", "Per maand"], ["leverancier", "Per leverancier"]] as const).map(([g, l]) => (
            <button key={g} type="button" role="radio" aria-checked={groep === g} onClick={() => setGroep(g)}>{l}</button>
          ))}
        </div>
      </div>

      {lijst.length === 0 ? (
        <Leeg titel="Geen claims gevonden" tekst={zoek ? `Niets gevonden voor “${zoek}”.` : "Pas de filters aan of voeg een claim toe."}>
          {magBewerken && <Link to="/nieuw" className="knop knop-rood"><Icon naam="plus" maat={18} /> Nieuwe claim</Link>}
        </Leeg>
      ) : groepen.map((g) => (
        <section key={g.kop || "alles"} className="claimgroep">
          {g.kop && <h2 className="groepkop"><span>{g.kop}</span><span className="mono">{g.claims.length} · {euroKort(som(g.claims))}</span></h2>}
          <div className="alleen-desktop">
            <ClaimTabel claims={g.claims} termijn={inst.dagen} sortering={sortering} setSortering={setSortering}
              geselecteerd={magBewerken ? gekozen : undefined} wissel={magBewerken ? wissel : undefined} alles={alles} />
          </div>
          <div className="alleen-mobiel">
            <ClaimKaarten claims={g.claims} termijn={inst.dagen} geselecteerd={gekozen} wissel={magBewerken ? wissel : undefined} />
          </div>
        </section>
      ))}
      {magBewerken && lijst.length > 0 && <p className="hint alleen-mobiel">Tip: houd een claim ingedrukt om er meerdere te selecteren.</p>}
      {prullenbak.length > 0 && <Link to="/prullenbak" className="meer-link"><Icon naam="prullenbak" maat={16} /> Prullenbak ({prullenbak.length})</Link>}

      {gekozen.size > 0 && (
        <div className="bulkbalk" role="region" aria-label="Selectie">
          <b>{gekozen.size} gekozen</b>
          <button type="button" onClick={() => bulk("ingediend")}>Ingediend</button>
          <button type="button" onClick={() => bulk("gehonoreerd")}>Gehonoreerd</button>
          <button type="button" onClick={() => bulk("afgewezen")}>Afgewezen</button>
          <button type="button" className="bulk-rood" onClick={async () => { await naarPrullenbak(ids); setGekozen(new Set()); }} aria-label="Naar prullenbak"><Icon naam="prullenbak" maat={18} /></button>
          <button type="button" onClick={() => setGekozen(new Set())} aria-label="Selectie wissen"><Icon naam="kruis" maat={18} /></button>
        </div>
      )}
    </div>
  );
}
