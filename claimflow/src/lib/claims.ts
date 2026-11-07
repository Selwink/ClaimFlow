import type { Claim, Instellingen, Notitie, Status } from "./types";
import { STATUS_LABEL } from "./types";
import { dag, euro, isPeriode, vandaag } from "./format";

/** Domain rules for warranty claims. Pure functions only. */

export const statusVan = (c: Claim): Status => (c.status && STATUS_LABEL[c.status] ? c.status : "nieuw");
export const isOpen = (c: Claim) => ["nieuw", "ingediend"].includes(statusVan(c));
export const geenBedrag = (c: Claim) => c.bedrag == null || Number(c.bedrag) === 0;
export const titelVan = (c: Claim) => c.type || c.onderdeel || "Naamloos onderdeel";
export const aankoopVan = (c: Claim) => (c.aankoop || c.bouwjaar || "").trim();
export const som = (lijst: Claim[]) => lijst.reduce((t, c) => t + (Number(c.bedrag) || 0), 0);

export function startDatum(c: Claim): string | null {
  if (c.datum && dag(c.datum)) return String(c.datum).slice(0, 10);
  if (isPeriode(c.periode)) return `${c.periode}-01`;
  return null;
}

export function dagenOpen(c: Claim): { dagen: number; schatting: boolean } | null {
  const s = startDatum(c);
  if (!s) return null;
  const d = Math.max(0, Math.round(((dag(vandaag())?.getTime() ?? 0) - (dag(s)?.getTime() ?? 0)) / 86400000));
  return { dagen: d, schatting: !c.datum };
}

export const overTermijn = (c: Claim, termijn: number) => {
  if (!isOpen(c) || c.uitbesteed) return false;
  const a = dagenOpen(c);
  return !!a && a.dagen >= termijn;
};

export function afgehandeldOp(c: Claim): string | null {
  if (isOpen(c)) return null;
  const n = (c.notities || []).filter((x) => x.soort === "status" && (x.naar === "gehonoreerd" || x.naar === "afgewezen"));
  return n.length ? n.map((x) => x.d).sort().pop() || null : null;
}

export function doorlooptijd(c: Claim): number | null {
  const eind = afgehandeldOp(c);
  const begin = startDatum(c);
  if (!eind || !begin) return null;
  return Math.round(((dag(eind)?.getTime() ?? 0) - (dag(begin)?.getTime() ?? 0)) / 86400000);
}

export function regel(t: string, wie: string, extra?: Partial<Notitie>): Notitie {
  const r: Notitie = { d: vandaag(), t, ...extra };
  if (wie) r.w = wie;
  return r;
}

export function metRegel(c: Claim, t: string, wie: string, extra?: Partial<Notitie>): Claim {
  return { ...c, notities: [...(c.notities || []), regel(t, wie, extra)] };
}

export function metStatus(c: Claim, naar: Status, wie: string): Claim {
  const van = statusVan(c);
  if (van === naar) return c;
  return { ...metRegel(c, `Status: ${STATUS_LABEL[van]} → ${STATUS_LABEL[naar]}`, wie, { soort: "status", naar }), status: naar };
}

const VELDNAAM: Record<string, string> = {
  onderdeel: "onderdeel", type: "type", voorziening: "voorzieningnummer", frame: "framenummer",
  inkoopnummer: "inkoopnummer", leverancier: "leverancier", aankoop: "aankoopdatum", bedrag: "bedrag",
  periode: "maand", locatie: "monteur", uitbesteed: "uitbesteed", storing: "storing", bijzonderheden: "bijzonderheden",
};

/** Human summary of what changed between two versions of a claim, for the timeline. */
export function wijzigingTekst(oud: Claim, nieuw: Claim): string {
  const norm = (v: unknown) => (v == null ? "" : String(v).trim());
  const waarde = (c: Claim, k: string) => (k === "aankoop" ? aankoopVan(c) : (c as unknown as Record<string, unknown>)[k]);
  const delen = Object.keys(VELDNAAM)
    .filter((k) => norm(waarde(oud, k)) !== norm(waarde(nieuw, k)))
    .map((k) => {
      if (k === "inkoopnummer" && nieuw.inkoopnummer) return `inkoopnummer ${nieuw.inkoopnummer}`;
      if (k === "bedrag" && nieuw.bedrag != null) return `bedrag ${euro(nieuw.bedrag)}`;
      if (k === "leverancier" && nieuw.leverancier) return `leverancier ${nieuw.leverancier}`;
      return VELDNAAM[k];
    });
  return delen.length ? `Bewerkt: ${delen.join(", ")}` : "";
}

export function prijsVoor(tekst: string, inst: Instellingen) {
  const t = tekst.toLowerCase();
  if (!t.trim()) return null;
  return [...inst.prijzen].sort((a, b) => b.woord.length - a.woord.length).find((r) => t.includes(r.woord.toLowerCase())) || null;
}

export function zoekDubbel(c: Claim, alle: Claim[]): Array<{ claim: Claim; waarom: string }> {
  const norm = (s?: string) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const titel = norm(c.type || c.onderdeel);
  const uit: Array<{ claim: Claim; waarom: string }> = [];
  for (const d of alle) {
    if (d.id === c.id || d.verwijderd) continue;
    if (c.inkoopnummer && norm(d.inkoopnummer) === norm(c.inkoopnummer)) uit.push({ claim: d, waarom: `inkoopnummer ${c.inkoopnummer}` });
    else if (c.frame && norm(d.frame) === norm(c.frame) && norm(d.type || d.onderdeel) === titel) uit.push({ claim: d, waarom: `framenummer ${c.frame}` });
  }
  return uit;
}

export type Toon = "rood" | "oker" | "turk" | "grijs";

/** The label shown on a claim row, e.g. "Over termijn 67 d". */
export function labelVan(c: Claim, termijn: number): { toon: Toon; tekst: string } {
  const st = statusVan(c);
  const a = dagenOpen(c);
  if (c.uitbesteed) return { toon: "oker", tekst: "Uitbesteed" };
  if (st === "gehonoreerd") return { toon: "turk", tekst: "Gehonoreerd" };
  if (st === "afgewezen") return { toon: "rood", tekst: "Afgewezen" };
  if (overTermijn(c, termijn)) return { toon: "rood", tekst: `Over termijn ${a?.dagen} d` };
  return st === "nieuw" ? { toon: "grijs", tekst: `Nieuw${a ? ` ${a.dagen} d` : ""}` } : { toon: "oker", tekst: `Ingediend${a ? ` ${a.dagen} d` : ""}` };
}

const LEV_KLEUREN = ["#2E4057", "#1d8a85", "#B8231A", "#7a4a8a", "#2f6f3e", "#9a5b16", "#4a6b8a", "#7a4a2b"];
export function levKleur(naam?: string) {
  const n = (naam || "").trim();
  if (!n) return "#8a8f96";
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LEV_KLEUREN[h % LEV_KLEUREN.length];
}
export function levLetters(naam?: string) {
  const n = (naam || "").trim();
  if (!n) return "?";
  const d = n.split(/[\s-]+/).filter(Boolean);
  return (d.length > 1 ? d[0][0] + d[1][0] : n.slice(0, 2)).toUpperCase();
}

export interface LevStat {
  naam: string; n: number; open: number; openN: number; totaal: number; gehN: number; afgN: number; doorloop: number | null; oudste: number;
}
export function perLeverancier(lijst: Claim[]): LevStat[] {
  const m = new Map<string, LevStat & { _d: number[] }>();
  for (const c of lijst) {
    const k = (c.leverancier || "").trim() || "Zonder leverancier";
    const e = m.get(k) || { naam: k, n: 0, open: 0, openN: 0, totaal: 0, gehN: 0, afgN: 0, doorloop: null, oudste: 0, _d: [] };
    const b = Number(c.bedrag) || 0;
    e.n++; e.totaal += b;
    if (isOpen(c)) { e.open += b; e.openN++; e.oudste = Math.max(e.oudste, dagenOpen(c)?.dagen || 0); }
    if (statusVan(c) === "gehonoreerd") e.gehN++;
    if (statusVan(c) === "afgewezen") e.afgN++;
    const d = doorlooptijd(c);
    if (d != null && !c.uitbesteed) e._d.push(d);
    m.set(k, e);
  }
  return [...m.values()]
    .map(({ _d, ...e }) => ({ ...e, doorloop: _d.length ? Math.round(_d.reduce((a, b) => a + b, 0) / _d.length) : null }))
    .sort((a, b) => b.open - a.open || b.totaal - a.totaal);
}
