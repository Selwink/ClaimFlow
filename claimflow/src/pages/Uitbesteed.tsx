import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { afgehandeldOp, isOpen, som, statusVan } from "../lib/claims";
import { dezeMaand, euro, meervoud, periodLabel } from "../lib/format";
import { useBreed } from "../lib/useBreed";
import { ClaimKaarten, ClaimTabel, sorteer, type Sortering } from "../components/ClaimLijst";
import { Icon } from "../components/Icon";
import { Kpi, Leeg, PaginaKop } from "../components/ui";

const jaarVan = (c: Claim) => (c.periode || c.datum || afgehandeldOp(c) || "").slice(0, 4);

/** Everything that is outsourced (uitbesteed): totals, per partner, per month and the full list. */
export function Uitbesteed() {
  const { actief, inst, magBewerken } = useStore();
  const breed = useBreed();
  const alleUit = useMemo(() => actief.filter((c) => c.uitbesteed), [actief]);
  const jaren = useMemo(() => [...new Set(alleUit.map(jaarVan).filter((j) => /^\d{4}$/.test(j)))].sort().reverse(), [alleUit]);
  const [jaar, setJaar] = useState(dezeMaand().slice(0, 4));
  const [zoek, setZoek] = useState("");
  const [partner, setPartner] = useState("");
  const [sortering, setSortering] = useState<Sortering>({ veld: "dagen", omhoog: false });

  const inJaar = useMemo(() => alleUit.filter((c) => !jaar || jaarVan(c) === jaar), [alleUit, jaar]);
  const partners = useMemo(() => {
    const m = new Map<string, { naam: string; n: number; bedrag: number; open: number }>();
    for (const c of inJaar) {
      const k = (c.leverancier || "").trim() || "Onbekend";
      const e = m.get(k) || { naam: k, n: 0, bedrag: 0, open: 0 };
      e.n++; e.bedrag += Number(c.bedrag) || 0; if (isOpen(c)) e.open++;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.bedrag - a.bedrag);
  }, [inJaar]);
  const maanden = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inJaar) { const k = (c.periode || c.datum || "").slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) m.set(k, (m.get(k) || 0) + (Number(c.bedrag) || 0)); }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [inJaar]);
  const maxM = Math.max(1, ...maanden.map(([, v]) => v));

  const t = zoek.trim().toLowerCase();
  const lijst = sorteer(inJaar.filter((c) => (!partner || (c.leverancier || "Onbekend") === partner)
    && (!t || [c.type, c.onderdeel, c.leverancier, c.inkoopnummer, c.frame, c.nummer, c.voorziening].some((v) => (v || "").toLowerCase().includes(t)))), sortering);
  const dezeMnd = alleUit.filter((c) => c.periode === dezeMaand());
  const open = inJaar.filter(isOpen), afg = inJaar.filter((c) => statusVan(c) === "afgewezen");

  return (
    <div className="pagina uitb">
      <PaginaKop boven={`${meervoud(inJaar.length, "uitbestede claim", "uitbestede claims")}${jaar ? ` in ${jaar}` : ""}`} titel="Uitbesteed">
        <select className="pil pil-select" value={jaar} onChange={(e) => setJaar(e.target.value)} aria-label="Jaar">
          <option value="">Alle jaren</option>
          {[...new Set([dezeMaand().slice(0, 4), ...jaren])].map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        {magBewerken && <Link to="/nieuw" className="knop knop-rood"><Icon naam="plus" maat={18} /> Nieuwe claim</Link>}
      </PaginaKop>

      <p className="uitb-uitleg"><b>Leverancier pakt dit verder zelf op.</b> Uitbestede claims hoef je niet zelf op te volgen; ze tellen wel mee in Totaal geclaimd en het maanddoel.</p>

      <section className="kpi-rij kpi-rij-4">
        <Kpi donker label="Totaal uitbesteed" waarde={euro(som(inJaar))} sub={meervoud(inJaar.length, "claim", "claims")} />
        <Kpi label="Deze maand" waarde={euro(som(dezeMnd))} sub={`${meervoud(dezeMnd.length, "claim", "claims")} · ${periodLabel(dezeMaand()).toLowerCase()}`} />
        <Kpi label="Nog open" waarde={euro(som(open))} sub={meervoud(open.length, "claim", "claims")} toon={open.length ? "oker" : undefined} />
        <Kpi label="Afgewezen" waarde={euro(som(afg))} sub={meervoud(afg.length, "claim", "claims")} />
      </section>

      {inJaar.length > 0 && (
        <section className="uitb-twee">
          <div className="kaart">
            <h2 className="uitb-kop">Per partij</h2>
            <div className="uitb-partners">
              <button type="button" className="uitb-p" aria-pressed={!partner} onClick={() => setPartner("")}><b>Alle partijen</b><span>{inJaar.length} · {euro(som(inJaar))}</span></button>
              {partners.map((p) => (
                <button key={p.naam} type="button" className="uitb-p" aria-pressed={partner === p.naam} onClick={() => setPartner(partner === p.naam ? "" : p.naam)}>
                  <b>{p.naam}</b><span>{meervoud(p.n, "claim", "claims")}{p.open ? ` · ${p.open} open` : ""} · {euro(p.bedrag)}</span>
                  <i aria-hidden="true"><u style={{ width: `${(p.bedrag / Math.max(1, partners[0].bedrag)) * 100}%` }} /></i>
                </button>
              ))}
            </div>
          </div>
          <div className="kaart">
            <h2 className="uitb-kop">Per maand</h2>
            <div className="uitb-staven" role="img" aria-label="Uitbesteed bedrag per maand">
              {maanden.map(([m, v]) => (
                <span key={m} title={`${periodLabel(m)}: ${euro(v)}`}><em>{euro(v).replace(",00", "")}</em><i style={{ height: `${8 + (v / maxM) * 120}px` }} /><small>{periodLabel(m).slice(0, 3)}</small></span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="uitb-zoek zoekbalk">
        <Icon naam="zoek" maat={18} />
        <input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op type, partij, inkoop- of framenummer" aria-label="Zoeken in uitbesteed" />
      </div>
      {partner && <p className="uitb-filter">Gefilterd op <b>{partner}</b> · <button type="button" className="knop-link" onClick={() => setPartner("")}>alles tonen</button></p>}

      {lijst.length === 0 ? (
        <Leeg titel={inJaar.length ? "Niets gevonden" : "Nog niets uitbesteed"} tekst={inJaar.length ? "Pas de zoekopdracht of het filter aan." : `Een claim telt als uitbesteed als je het vinkje Uitbesteed aanzet${inst.uitbesteedLev.length ? `, of als de leverancier ${inst.uitbesteedLev.join(" / ")} is` : ""}.`} />
      ) : breed ? (
        <ClaimTabel claims={lijst} termijn={inst.dagen} sortering={sortering} setSortering={setSortering} />
      ) : (
        <ClaimKaarten claims={lijst} termijn={inst.dagen} />
      )}
    </div>
  );
}
