import type { Claim } from "./types";
import { afgehandeldOp, statusVan } from "./claims";
import { dezeMaand } from "./format";

/**
 * Team progress instead of individual points: what the branch got back this month against its monthly goal,
 * and what everyone did together this week. Worked out from the claims and their timelines; nothing is stored.
 */

/** Month a claim was honoured: the date of its status change, otherwise (older claims) the claim's own month. */
function maandVanTerug(c: Claim): string | null {
  if (c.verwijderd || statusVan(c) !== "gehonoreerd") return null;
  const d = afgehandeldOp(c);
  if (d) return d.slice(0, 7);
  return c.periode && /^\d{4}-\d{2}$/.test(c.periode) ? c.periode : null;
}

export function teruggehaaldPerMaand(claims: Claim[]): Map<string, { bedrag: number; aantal: number }> {
  const m = new Map<string, { bedrag: number; aantal: number }>();
  for (const c of claims) {
    const k = maandVanTerug(c);
    if (!k) continue;
    const e = m.get(k) || { bedrag: 0, aantal: 0 };
    e.bedrag += Number(c.bedrag) || 0; e.aantal++;
    m.set(k, e);
  }
  return m;
}

export function dezeMaandTerug(claims: Claim[]) {
  return teruggehaaldPerMaand(claims).get(dezeMaand()) || { bedrag: 0, aantal: 0 };
}

export interface WeekTelling { toegevoegd: number; ingediend: number; gehonoreerd: number }

/** What happened in the last 7 days, for the whole team and for one person. Each claim counts once per kind. */
export function dezeWeek(claims: Claim[], naam: string): { team: WeekTelling; ik: WeekTelling } {
  const sinds = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const leeg = (): WeekTelling => ({ toegevoegd: 0, ingediend: 0, gehonoreerd: 0 });
  const team = leeg(), ik = leeg();
  const zelfde = (w?: string) => {
    if (!w || !naam) return false;
    const a = w.trim().toLowerCase(), b = naam.trim().toLowerCase();
    return a === b || (!a.includes(" ") && b.split(/\s+/)[0] === a);
  };
  for (const c of claims) {
    if (c.verwijderd) continue;
    const gezien = new Set<keyof WeekTelling>();
    for (const n of c.notities || []) {
      if (n.d < sinds) continue;
      const soort: keyof WeekTelling | null =
        /^Claim (aangemaakt|vastgelegd)/.test(n.t) ? "toegevoegd"
        : n.soort === "status" && n.naar === "ingediend" ? "ingediend"
        : n.soort === "status" && n.naar === "gehonoreerd" && !/datum aangevuld/.test(n.t) ? "gehonoreerd" : null;
      if (!soort || gezien.has(soort)) continue;
      gezien.add(soort);
      team[soort]++;
      if (zelfde(n.w)) ik[soort]++;
    }
  }
  return { team, ik };
}

/** Everything the claims have brought in so far: all honoured claims, whatever month. */
export function totaalTerug(claims: Claim[]): { bedrag: number; aantal: number; gehonoreerd: number; ingediend: number } {
  let bedrag = 0, aantal = 0, gehonoreerd = 0, ingediend = 0;
  for (const c of claims) {
    const s = statusVan(c);
    if (c.verwijderd || (s !== "gehonoreerd" && s !== "ingediend")) continue;
    bedrag += Number(c.bedrag) || 0; aantal++;
    if (s === "gehonoreerd") gehonoreerd++; else ingediend++;
  }
  return { bedrag, aantal, gehonoreerd, ingediend };
}

/** Everything ever handed to a supplier (uitbesteed), open or finished. */
export function uitbesteedTotaal(claims: Claim[]): { bedrag: number; aantal: number } {
  let bedrag = 0, aantal = 0;
  for (const c of claims) {
    if (c.verwijderd || !c.uitbesteed) continue;
    bedrag += Number(c.bedrag) || 0; aantal++;
  }
  return { bedrag, aantal };
}

/** The month a claim belongs to: its month field (periode), otherwise the month of its date. */
export const claimMaand = (c: Claim) => (c.periode && /^\d{4}-\d{2}$/.test(c.periode) ? c.periode : (c.datum || "").slice(0, 7));

/** Amount claimed this month: all claims of the current month, whatever their status, outsourced ones included. */
export function geclaimdDezeMaand(claims: Claim[]): { bedrag: number; aantal: number; uitbesteed: number; uitAantal: number } {
  let bedrag = 0, aantal = 0, uitbesteed = 0, uitAantal = 0;
  const m = dezeMaand();
  for (const c of claims) {
    if (c.verwijderd || claimMaand(c) !== m) continue;
    const b = Number(c.bedrag) || 0;
    bedrag += b; aantal++;
    if (c.uitbesteed) { uitbesteed += b; uitAantal++; }
  }
  return { bedrag, aantal, uitbesteed, uitAantal };
}

/** Days in a row, ending today or yesterday, on which this person wrote something in a claim's timeline. */
export function reeks(claims: Claim[], naam: string): number {
  if (!naam) return 0;
  const ik = naam.trim().toLowerCase(), voor = ik.split(/\s+/)[0];
  const dagen = new Set<string>();
  for (const c of claims) for (const n of c.notities || []) {
    const w = (n.w || "").trim().toLowerCase();
    if (w && (w === ik || w === voor)) dagen.add(n.d.slice(0, 10));
  }
  const d = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`);
  if (!dagen.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dagen.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
