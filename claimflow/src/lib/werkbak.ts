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
export type Reden = "termijn" | "inkoop" | "indienen" | "bijna" | "vam" | "antwoord" | "later";
export interface Taak { claim: Claim; bak: Bak; reden: Reden; dagen: number | null; tekst: string; sinds?: string }

export const VAM_GEVRAAGD = "VAM: Informatie opgevraagd";
export const WEER_OPGEPAKT = "Werkbak: Weer opgepakt";
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
    if (t === WEER_OPGEPAKT) return null;
    const later = t.match(/^Werkbak: Later tot (\d{4}-\d{2}-\d{2})/);
    if (later) return later[1] > vandaag_ ? { reden: "later", tekst: `Opgeschoven tot ${later[1].split("-").reverse().slice(0, 2).join("-")}`, sinds: n[i].d } : null;
    if (t.startsWith(VAM_GEVRAAGD)) return plusDagen(n[i].d, WACHT_VAM) > vandaag_ ? { reden: "vam", tekst: "VAM om informatie gevraagd", sinds: n[i].d } : null;
    if (/^VAM:\s*Onderdeel/i.test(t)) return plusDagen(n[i].d, WACHT_ANTWOORD) > vandaag_ ? { reden: "antwoord", tekst: t.replace(/^VAM:\s*/, "VAM: "), sinds: n[i].d } : null;
  }
  return null;
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
    else if (dagen != null && dagen >= termijn - BIJNA) uit.push({ claim: c, bak: "week", reden: "bijna", dagen, tekst: `Nog ${termijn - dagen} ${termijn - dagen === 1 ? "dag" : "dagen"} tot de termijn` });
  }
  const volgorde: Record<Reden, number> = { termijn: 0, inkoop: 1, indienen: 2, bijna: 3, vam: 4, antwoord: 5, later: 6 };
  return uit.sort((a, b) => volgorde[a.reden] - volgorde[b.reden] || (b.dagen ?? 0) - (a.dagen ?? 0));
}

export const GROEP: Record<Reden, string> = {
  termijn: "Over termijn", inkoop: "Aanvullen", indienen: "Indienen", bijna: "Termijn bijna om",
  vam: "VAM gevraagd", antwoord: "VAM heeft geantwoord", later: "Opgeschoven",
};

export const laterDatum = () => plusDagen(vandaag(), 7);
