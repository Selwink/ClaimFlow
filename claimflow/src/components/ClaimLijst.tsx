import { useNavigate } from "react-router-dom";
import type { Claim } from "../lib/types";
import { dagenOpen, geenBedrag, isOpen, labelVan, overTermijn, som, statusVan, titelVan } from "../lib/claims";
import { euro, euroKort, periodLabel } from "../lib/format";
import { Icon } from "./Icon";
import { StatusPil } from "./ui";
import { BonKnop, useBonLijst } from "./Bonnen";

export type SorteerVeld = "titel" | "leverancier" | "inkoopnummer" | "bedrag" | "status" | "dagen";
export interface Sortering { veld: SorteerVeld; omhoog: boolean }

export function sorteer(lijst: Claim[], s: Sortering): Claim[] {
  const waarde = (c: Claim): string | number => {
    switch (s.veld) {
      case "titel": return titelVan(c).toLowerCase();
      case "leverancier": return (c.leverancier || "").toLowerCase();
      case "inkoopnummer": return c.inkoopnummer || "";
      case "bedrag": return Number(c.bedrag) || 0;
      case "status": return ["nieuw", "ingediend", "gehonoreerd", "afgewezen"].indexOf(statusVan(c));
      case "dagen": return isOpen(c) ? dagenOpen(c)?.dagen ?? -1 : -2;
    }
  };
  return [...lijst].sort((a, b) => {
    const x = waarde(a), y = waarde(b);
    const r = x < y ? -1 : x > y ? 1 : 0;
    return s.omhoog ? r : -r;
  });
}

/** Short reason why a claim needs attention, used on cards and in the briefing. */
export function aandachtVan(c: Claim, termijn: number): { toon: "rood" | "oker" | "turk"; tekst: string; actie: string } | null {
  if (!isOpen(c) || c.uitbesteed) return null;
  const d = dagenOpen(c)?.dagen;
  if (overTermijn(c, termijn)) return { toon: "rood", tekst: `${c.leverancier || "Leverancier onbekend"} · ${d! - termijn} dagen over termijn`, actie: "VAM vragen" };
  if (!c.inkoopnummer) return { toon: "oker", tekst: `${c.leverancier || "Leverancier onbekend"} · inkoopnummer ontbreekt`, actie: "Aanvullen" };
  if (statusVan(c) === "nieuw") return { toon: "oker", tekst: `${c.leverancier || "Leverancier onbekend"} · nog niet ingediend`, actie: "Indienen" };
  if (d != null && d >= termijn * 0.75) return { toon: "oker", tekst: `${c.leverancier} · nog ${termijn - d} dagen`, actie: "Opvolgen" };
  return null;
}

function DagenCel({ c, termijn }: { c: Claim; termijn: number }) {
  if (!isOpen(c)) return <span className="t-turk"><Icon naam="vink" maat={16} /><span className="sr">Afgehandeld</span></span>;
  if (c.uitbesteed) return <span className="t-zacht">—</span>;
  const d = dagenOpen(c);
  if (!d) return <span className="t-zacht">—</span>;
  return <b className={overTermijn(c, termijn) ? "t-rood" : undefined}>{d.dagen}{d.schatting ? "±" : ""}</b>;
}

interface LijstProps {
  claims: Claim[];
  termijn: number;
  geselecteerd?: Set<string>;
  wissel?: (id: string) => void;
  alles?: (aan: boolean) => void;
  sortering?: Sortering;
  setSortering?: (s: Sortering) => void;
  /** Phone: tapping a card toggles it instead of opening it. */
  kiesModus?: boolean;
}

/** Desktop table, matching the "werkplek coördinator" screen in the concept. */
export function ClaimTabel({ claims, termijn, geselecteerd, wissel, alles, sortering, setSortering }: LijstProps) {
  const nav = useNavigate();
  const metBon = useBonLijst();
  const kolom = (veld: SorteerVeld, label: string, cls?: string) => {
    const actief = sortering?.veld === veld;
    return (
      <th className={cls} aria-sort={actief ? (sortering!.omhoog ? "ascending" : "descending") : "none"}>
        {setSortering ? (
          <button type="button" onClick={() => setSortering({ veld, omhoog: actief ? !sortering!.omhoog : veld === "titel" || veld === "leverancier" })}>
            {label}{actief && <span aria-hidden="true">{sortering!.omhoog ? " ↑" : " ↓"}</span>}
          </button>
        ) : label}
      </th>
    );
  };
  const allesAan = !!geselecteerd && claims.length > 0 && claims.every((c) => geselecteerd.has(c.id));
  return (
    <div className="tabelkader">
      <table className="claimtabel">
        <thead>
          <tr>
            {wissel && <th className="kol-kies"><input type="checkbox" aria-label="Alles selecteren" checked={allesAan} onChange={(e) => alles?.(e.target.checked)} /></th>}
            {kolom("titel", "Type / onderdeel")}
            {kolom("leverancier", "Leverancier")}
            {kolom("inkoopnummer", "Inkoopnummer", "kol-tablet")}
            {kolom("bedrag", "Bedrag", "rechts")}
            {kolom("status", "Status")}
            {kolom("dagen", "Dagen", "rechts")}
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className={overTermijn(c, termijn) ? "rij-laat" : undefined} onClick={() => nav(`/claims/${c.id}`)}>
              {wissel && (
                <td className="kol-kies" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Selecteer ${titelVan(c)}`} checked={!!geselecteerd?.has(c.id)} onChange={() => wissel(c.id)} />
                </td>
              )}
              <td><a href={`/claims/${c.id}`} onClick={(e) => { e.preventDefault(); nav(`/claims/${c.id}`); }} className="rij-titel">{titelVan(c)}</a>{metBon.has(c.id) && <BonKnop claim={c} klein />}
                <span className="rij-sub">{periodLabel(c.periode)}{c.uitbesteed ? " · uitbesteed" : ""}</span></td>
              <td>{c.leverancier || <span className="t-zacht">—</span>}</td>
              <td className="mono kol-tablet">{c.inkoopnummer || <span className="t-oker">ontbreekt</span>}
                <span className="rij-sub">{c.frame ? `frame ${c.frame}` : "geen frame"}</span></td>
              <td className="mono rechts">{geenBedrag(c) ? <span className="t-zacht">volgt</span> : euroKort(c.bedrag)}</td>
              <td><StatusPil status={statusVan(c)} /></td>
              <td className="mono rechts"><DagenCel c={c} termijn={termijn} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {wissel && <td />}
            <td colSpan={2}>{claims.length} claims</td>
            <td className="kol-tablet" />
            <td className="mono rechts">{euro(som(claims))}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Phone card list, matching the "Vandaag" task items in the concept. */
export function ClaimKaarten({ claims, termijn, geselecteerd, wissel, kiesModus }: LijstProps) {
  const nav = useNavigate();
  const metBon = useBonLijst();
  return (
    <ul className="kaartlijst">
      {claims.map((c) => {
        const l = labelVan(c, termijn);
        const d = dagenOpen(c);
        const kies = !!wissel && (kiesModus || !!geselecteerd?.size);
        return (
          <li key={c.id} className={metBon.has(c.id) ? "met-bon" : undefined}>
            <button type="button" className={`taak${overTermijn(c, termijn) ? " taak-laat" : ""}${geselecteerd?.has(c.id) ? " taak-gekozen" : ""}`}
              aria-pressed={kies ? !!geselecteerd?.has(c.id) : undefined}
              onClick={() => (kies && wissel ? wissel(c.id) : nav(`/claims/${c.id}`))}
              onContextMenu={(e) => { if (wissel) { e.preventDefault(); wissel(c.id); } }}>
              <span className={`taak-ic ic-${l.toon}`}>{geselecteerd?.has(c.id) ? <Icon naam="vink" /> : isOpen(c) && d && !c.uitbesteed ? `${d.dagen}d` : <Icon naam={isOpen(c) ? "klok" : "vink"} maat={18} />}</span>
              <span className="taak-t">
                <b>{titelVan(c)}</b>
                <span>{[c.leverancier, geenBedrag(c) ? "bedrag volgt" : euroKort(c.bedrag), c.inkoopnummer ? `ink ${c.inkoopnummer}` : "geen inkoopnr", c.frame ? `frame ${c.frame}` : "geen frame"].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={`chip chip-${l.toon}`}>{l.tekst.replace(/ \d+ d$/, "")}</span>
            </button>
            {metBon.has(c.id) && <BonKnop claim={c} />}
          </li>
        );
      })}
    </ul>
  );
}
