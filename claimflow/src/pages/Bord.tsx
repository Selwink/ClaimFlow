import { useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Claim, Status } from "../lib/types";
import { useStore } from "../state/Store";
import { dagenOpen, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { euroKort } from "../lib/format";
import { LevAvatar } from "./Leveranciers";
import { Icon } from "../components/Icon";
import { Confetti } from "../components/Confetti";

const KOLOMMEN: Array<{ id: Status; naam: string; kleur: string; volgende?: Status }> = [
  { id: "nieuw", naam: "Nieuw", kleur: "#FF8277", volgende: "ingediend" },
  { id: "ingediend", naam: "Ingediend", kleur: "#F4C552", volgende: "gehonoreerd" },
  { id: "gehonoreerd", naam: "Gehonoreerd", kleur: "#5FD690" },
  { id: "afgewezen", naam: "Afgewezen", kleur: "#9AA0B8" },
];
/** Finished columns only show the most recent claims, so the board stays readable. */
const MAX_KLAAR = 12;

/** Flow-bord: every claim on a card in its status column; drag a card to another column to change its status. */
export function Bord() {
  const { actief, inst, magBewerken, zetStatus } = useStore();
  const nav = useNavigate();
  const [sleepId, setSleepId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [feest, setFeest] = useState(0);

  const per = useMemo(() => {
    const m = new Map<Status, Claim[]>(KOLOMMEN.map((k) => [k.id, []]));
    for (const c of actief) if (!c.uitbesteed) m.get(statusVan(c))?.push(c);
    const datum = (c: Claim) => c.datum || c.periode || "";
    for (const l of m.values()) l.sort((a, b) => datum(b).localeCompare(datum(a)));
    return m;
  }, [actief]);

  const zet = async (id: string, naar: Status) => {
    const c = actief.find((x) => x.id === id);
    if (!c || statusVan(c) === naar) return;
    await zetStatus([id], naar);
    if (naar === "gehonoreerd") { setFeest(Date.now()); window.setTimeout(() => setFeest(0), 4200); }
  };
  const drop = (e: DragEvent, naar: Status) => {
    e.preventDefault(); setOver(null);
    const id = e.dataTransfer.getData("text/plain") || sleepId;
    setSleepId(null);
    if (id) void zet(id, naar);
  };

  const open = actief.filter((c) => !c.uitbesteed && ["nieuw", "ingediend"].includes(statusVan(c)));
  return (
    <div className="pagina bord-pagina">
      {feest > 0 && <Confetti key={feest} />}
      <header className="bord-kop">
        <div>
          <small className="bord-ey">{open.length} open · {euroKort(som(open))}</small>
          <h1>Flow-<em>bord.</em></h1>
          <p>{magBewerken ? "Sleep een claim naar een andere kolom om de status te veranderen, of gebruik de pijl op de kaart. Tik op een kaart voor alle details." : "Je ziet hier alle claims per status. Alleen beheerders kunnen kaarten verslepen."}</p>
        </div>
        {magBewerken && <Link to="/nieuw" className="knop knop-rood"><Icon naam="plus" maat={18} /> LGAR inlezen</Link>}
      </header>
      <div className="bord">
        {KOLOMMEN.map((k) => {
          const alle = per.get(k.id) || [];
          const lijst = k.id === "gehonoreerd" || k.id === "afgewezen" ? alle.slice(0, MAX_KLAAR) : alle;
          return (
            <section key={k.id} className={`bord-kol${over === k.id ? " over" : ""}${k.id === "afgewezen" ? " bord-kol-stil" : ""}`} style={{ ["--kk" as string]: k.kleur }}
              aria-label={`${k.naam}: ${alle.length} claims`}
              onDragOver={magBewerken ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(k.id); } : undefined}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={magBewerken ? (e) => drop(e, k.id) : undefined}>
              <header><i aria-hidden="true" /><b>{k.naam}</b><span>{alle.length}</span></header>
              <div className="bord-som">{euroKort(som(alle))}</div>
              {lijst.length === 0 && <p className="bord-leeg">{magBewerken ? "Sleep een claim hierheen" : "Geen claims"}</p>}
              {lijst.map((c) => {
                const dg = dagenOpen(c)?.dagen ?? null, te = overTermijn(c, inst.dagen), klaar = k.id === "gehonoreerd" || k.id === "afgewezen";
                const kleur = klaar ? k.kleur : te ? "#FF8277" : dg != null && dg >= inst.dagen * .7 ? "#F4C552" : "#96E8F4";
                const naar = KOLOMMEN.find((x) => x.id === k.volgende);
                return (
                  <article key={c.id} className={`bord-kaart${sleepId === c.id ? " sleep" : ""}`} style={{ ["--k" as string]: kleur }}
                    draggable={magBewerken} onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; setSleepId(c.id); }}
                    onDragEnd={() => { setSleepId(null); setOver(null); }}>
                    <Link to={`/claims/${c.id}`} className="bord-k-link" draggable={false}>
                      <span className="bord-k1"><LevAvatar naam={c.leverancier || "—"} /><span><b>{titelVan(c)}</b><small>{[c.leverancier, c.inkoopnummer ? `ink ${c.inkoopnummer}` : ""].filter(Boolean).join(" · ") || "Geen leverancier"}</small></span></span>
                      <span className="bord-k2">{te ? <span className="bord-chip laat">Over termijn</span> : <span className="bord-chip">{c.onderdeel && c.onderdeel !== c.type ? c.onderdeel : k.naam}</span>}<b>{c.bedrag ? euroKort(Number(c.bedrag)) : "—"}</b></span>
                      <span className="bord-term"><i><u style={{ width: `${klaar ? 100 : dg != null ? Math.min(100, (dg / inst.dagen) * 100) : 0}%` }} /></i>{klaar ? "afgerond" : dg != null ? `${dg} / ${inst.dagen} dagen` : "geen datum"}</span>
                    </Link>
                    {magBewerken && naar && (
                      <button type="button" className="bord-verder" title={`Naar ${naar.naam}`} aria-label={`${titelVan(c)} naar ${naar.naam}`} onClick={() => void zet(c.id, naar.id)}>
                        <Icon naam="verder" maat={16} />
                      </button>
                    )}
                  </article>
                );
              })}
              {alle.length > lijst.length && <button type="button" className="bord-meer" onClick={() => nav("/claims")}>Nog {alle.length - lijst.length} in Claims →</button>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
