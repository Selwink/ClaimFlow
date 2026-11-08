import type { Claim, Notitie } from "./types";
import type { IconNaam } from "../components/Icon";

/**
 * Levels and points (XP), worked out from the timelines: every entry already records who did what.
 * Nothing extra is stored, so the numbers can never drift from what really happened.
 * Claims in the recycle bin do not count, so adding and deleting earns nothing.
 */

export type Soort = "claim" | "ingediend" | "gehonoreerd" | "foto" | "notitie" | "datums";

export const PUNTEN: Record<Soort, { xp: number; label: string; icoon: IconNaam }> = {
  claim: { xp: 10, label: "Claim toegevoegd", icoon: "plus" },
  ingediend: { xp: 5, label: "Claim ingediend", icoon: "upload" },
  gehonoreerd: { xp: 15, label: "Claim gehonoreerd", icoon: "vink" },
  foto: { xp: 3, label: "Foto’s toegevoegd", icoon: "camera" },
  notitie: { xp: 2, label: "Notitie geschreven", icoon: "bericht" },
  datums: { xp: 1, label: "Datums aangevuld", icoon: "agenda" },
};

export interface Level { nr: number; naam: string; vanaf: number; icoon: IconNaam }
export const LEVELS: Level[] = [
  { nr: 1, naam: "Starter", vanaf: 0, icoon: "persoon" },
  { nr: 2, naam: "Melder", vanaf: 40, icoon: "document" },
  { nr: 3, naam: "Speurder", vanaf: 100, icoon: "zoek" },
  { nr: 4, naam: "Terughaler", vanaf: 200, icoon: "ongedaan" },
  { nr: 5, naam: "Termijnbewaker", vanaf: 350, icoon: "klok" },
  { nr: 6, naam: "Claimkampioen", vanaf: 550, icoon: "vink" },
  { nr: 7, naam: "Garantiegoeroe", vanaf: 800, icoon: "grafiek" },
  { nr: 8, naam: "Legende van Meppel", vanaf: 1200, icoon: "euro" },
];

/** What a timeline entry earns, or null when it earns nothing. */
export function soortVan(n: Notitie): Soort | null {
  if (n.soort === "status") {
    if (n.naar === "gehonoreerd" && !/datum aangevuld/.test(n.t)) return "gehonoreerd";
    if (n.naar === "ingediend") return "ingediend";
    return null;
  }
  if (/^Claim (aangemaakt|vastgelegd)/.test(n.t)) return "claim";
  if (/foto.{0,3} toegevoegd/i.test(n.t)) return "foto";
  if (n.t === "Datums aangevuld") return "datums";
  if (/^(Bewerkt:|Naar de prullenbak|Teruggezet|Foto verwijderd)/.test(n.t)) return null;
  return "notitie";
}

/** Timeline names can be an account name ("Selwin Kok") or, from before accounts, a first name ("Selwin"). */
export const zelfde = (w: string | undefined, naam: string) => {
  if (!w || !naam) return false;
  const a = w.trim().toLowerCase(), b = naam.trim().toLowerCase();
  return a === b || (!a.includes(" ") && b.split(/\s+/)[0] === a);
};

/** Per claim, each kind counts at most this often, so flipping a status back and forth earns nothing. */
const MAX_PER_CLAIM: Record<Soort, number> = { claim: 1, ingediend: 1, gehonoreerd: 1, foto: 3, notitie: 3, datums: 1 };

export interface Score { xp: number; perSoort: Record<Soort, number>; dezeWeek: number }

export function scoreVan(claims: Claim[], naam: string): Score {
  const perSoort = { claim: 0, ingediend: 0, gehonoreerd: 0, foto: 0, notitie: 0, datums: 0 } as Record<Soort, number>;
  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  let xp = 0, dezeWeek = 0;
  for (const c of claims) {
    if (c.verwijderd) continue;
    const ditClaim: Partial<Record<Soort, number>> = {};
    for (const n of c.notities || []) {
      if (!zelfde(n.w, naam)) continue;
      const s = soortVan(n);
      if (!s || (ditClaim[s] || 0) >= MAX_PER_CLAIM[s]) continue;
      ditClaim[s] = (ditClaim[s] || 0) + 1;
      perSoort[s]++;
      xp += PUNTEN[s].xp;
      if (n.d >= week) dezeWeek += PUNTEN[s].xp;
    }
  }
  return { xp, perSoort, dezeWeek };
}

export function levelVoor(xp: number): { level: Level; volgende: Level | null; deel: number; nogNodig: number } {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].vanaf) i++;
  const level = LEVELS[i], volgende = LEVELS[i + 1] || null;
  if (!volgende) return { level, volgende, deel: 1, nogNodig: 0 };
  return { level, volgende, deel: (xp - level.vanaf) / (volgende.vanaf - level.vanaf), nogNodig: volgende.vanaf - xp };
}

/** Everyone who appears in a timeline, highest XP first. Old first-name entries merge into the matching account name. */
export function ranglijst(claims: Claim[], accountNamen: string[] = []): Array<{ naam: string; xp: number; dezeWeek: number }> {
  const namen = new Set<string>();
  for (const c of claims) if (!c.verwijderd) for (const n of c.notities || []) if (n.w?.trim()) namen.add(n.w.trim());
  for (const a of accountNamen) namen.add(a);
  // a lone first name that belongs to a full name is the same person
  const volledig = [...namen].filter((n) => n.includes(" "));
  const uniek = [...namen].filter((n) => n.includes(" ") || !volledig.some((v) => zelfde(n, v)));
  return uniek.map((naam) => { const s = scoreVan(claims, naam); return { naam, xp: s.xp, dezeWeek: s.dezeWeek }; })
    .filter((x) => x.xp > 0).sort((a, b) => b.xp - a.xp || a.naam.localeCompare(b.naam));
}
