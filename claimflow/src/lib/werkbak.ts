import type { Claim } from "./types";
import { dagenOpen, isOpen, overTermijn, statusVan } from "./claims";
import { vandaag } from "./format";

/**
 * The Werkbak: every open claim that needs something, sorted into three trays.
 * State lives in the timeline (shared by the whole team):
 *  - "VAM: Informatie opgevraagd" or a VAM answer ("VAM: Onderdeel …") → waiting;
 *  - "Werkbak: Later tot YYYY-MM-DD" → waiting until that date;
 *  - "Werkbak: Weer opgepakt" → back in the tray.
 */

export type Bak = "nu" | "week" | "wacht";
export type Reden = "termijn" | "inkoop" | "indienen" | "bijna" | "stil" | "vam" | "antwoord" | "later";
export interface Taak { claim: Claim; bak: Bak; reden: Reden; dagen: number | null; tekst: string; sinds?: string }

export const VAM_GEVRAAGD = "VAM: Informatie opgevraagd";
export const WEER_OPGEPAKT = "Werkbak: Weer opgepakt";
export const NAGEBELD = "Werkbak: Leverancier nagebeld";
/** Days without any news on a submitted claim before the supplier needs a nudge. */
export const STIL_DAGEN = 14;
export const laterTekst = (tot: string) => `Werkbak: Later tot ${tot}`;

const WACHT_VAM = 14;      // days a "VAM gevraagd" keeps a claim in the waiting tray
const WACHT_ANTWOORD = 30; // days after a VAM answer (e.g. retour sturen) before it needs attention again
const BIJNA = 7;           // "this week": term ends within this many days

const plusDagen = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function wachtstand(c: Claim): { reden: Reden; tekst: string; sinds: string } | null {
  const vandaag_ = vandaag();
  const n = c.notities || [];
  for (let i = n.length - 1; i >= 0; i--) {
    const t = n[i].t;
    if (t === WEER_OPGEPAKT || t === NAGEBELD) return null;
    const later = t.match(/^Werkbak: Later tot (\d{4}-\d{2}-\d{2})/);
    if (later) return later[1] > vandaag_ ? { reden: "later", tekst: `Opgeschoven tot ${later[1].split("-").reverse().slice(0, 2).join("-")}`, sinds: n[i].d } : null;
    if (t.startsWith(VAM_GEVRAAGD)) return plusDagen(n[i].d, WACHT_VAM) > vandaag_ ? { reden: "vam", tekst: "VAM om informatie gevraagd", sinds: n[i].d } : null;
    if (/^VAM:\s*Onderdeel/i.test(t)) return plusDagen(n[i].d, WACHT_ANTWOORD) > vandaag_ ? { reden: "antwoord", tekst: t.replace(/^VAM:\s*/, "VAM: "), sinds: n[i].d } : null;
  }
  return null;
}

/** Days since the last news on a claim (its latest timeline entry, otherwise its own date). */
export function stilteVan(c: Claim): number | null {
  const laatste = (c.notities || []).reduce((m, n) => (n.d > m ? n.d : m), "") || c.datum || "";
  if (!laatste) return null;
  return Math.floor((Date.parse(`${vandaag()}T12:00:00`) - Date.parse(`${laatste.slice(0, 10)}T12:00:00`)) / 864e5);
}

/** Submitted claims the supplier has been silent about for STIL_DAGEN days or more (outsourced ones included). */
export function stilBijLeverancier(claims: Claim[]): Array<{ claim: Claim; dagen: number }> {
  return claims.filter((c) => !c.verwijderd && isOpen(c) && statusVan(c) === "ingediend")
    .map((c) => ({ claim: c, dagen: stilteVan(c) ?? 0 })).filter((x) => x.dagen >= STIL_DAGEN).sort((a, b) => b.dagen - a.dagen);
}

export function werkbak(claims: Claim[], termijn: number): Taak[] {
  const uit: Taak[] = [];
  for (const c of claims) {
    if (c.verwijderd || !isOpen(c) || c.uitbesteed) continue;
    const dagen = dagenOpen(c)?.dagen ?? null;
    const wacht = wachtstand(c);
    if (wacht) { uit.push({ claim: c, bak: "wacht", reden: wacht.reden, dagen, tekst: wacht.tekst, sinds: wacht.sinds }); continue; }
    if (overTermijn(c, termijn)) uit.push({ claim: c, bak: "nu", reden: "termijn", dagen, tekst: `${dagen} dagen · ${dagen! - termijn} over termijn` });
    else if (!c.inkoopnummer) uit.push({ claim: c, bak: "nu", reden: "inkoop", dagen, tekst: "Inkoopnummer ontbreekt" });
    else if (statusVan(c) === "nieuw") uit.push({ claim: c, bak: "nu", reden: "indienen", dagen, tekst: "Nog niet ingediend" });
    else if (statusVan(c) === "ingediend" && (stilteVan(c) ?? 0) >= STIL_DAGEN) uit.push({ claim: c, bak: "week", reden: "stil", dagen, tekst: `Leverancier al ${stilteVan(c)} dagen stil · even nabellen` });
    else if (dagen != null && dagen >= termijn - BIJNA) uit.push({ claim: c, bak: "week", reden: "bijna", dagen, tekst: `Nog ${termijn - dagen} ${termijn - dagen === 1 ? "dag" : "dagen"} tot de termijn` });
  }
  const volgorde: Record<Reden, number> = { termijn: 0, inkoop: 1, indienen: 2, bijna: 3, stil: 4, vam: 5, antwoord: 6, later: 7 };
  return uit.sort((a, b) => volgorde[a.reden] - volgorde[b.reden] || (b.dagen ?? 0) - (a.dagen ?? 0));
}

export const GROEP: Record<Reden, string> = {
  termijn: "Over termijn", inkoop: "Aanvullen", indienen: "Indienen", bijna: "Termijn bijna om", stil: "Leverancier stil",
  vam: "VAM gevraagd", antwoord: "VAM heeft geantwoord", later: "Opgeschoven",
};

export const laterDatum = () => plusDagen(vandaag(), 7);
