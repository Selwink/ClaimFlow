import type { Claim, Instellingen } from "./types";
import { isOpen, som, statusVan } from "./claims";
import { ls } from "./format";

/**
 * The headline figures shown on the login screen. Kept on this device only (never fetched before login),
 * refreshed every time the register loads, and deliberately kept after logging out.
 */
export interface Teller { terug: number; deel: number; honorering: number | null; plaats: string; tijd: number }
const SLEUTEL = "claimflow-teller";

export function bewaarTeller(claims: Claim[], inst: Instellingen) {
  const actief = claims.filter((c) => !c.verwijderd);
  const geh = actief.filter((c) => statusVan(c) === "gehonoreerd");
  const afg = actief.filter((c) => statusVan(c) === "afgewezen");
  const terug = som(geh);
  const nog = som(actief.filter((c) => isOpen(c) && !c.uitbesteed));
  const t: Teller = {
    terug,
    deel: terug + nog ? terug / (terug + nog) : 0,
    honorering: geh.length + afg.length ? geh.length / (geh.length + afg.length) : null,
    plaats: inst.vestiging.replace(/^Vestiging\s+/i, "") || "de vestiging",
    tijd: Date.now(),
  };
  if (actief.length) ls.set(SLEUTEL, JSON.stringify(t));
}

export const leesTeller = (): Teller | null => {
  const t = ls.json<Teller>(SLEUTEL);
  return t && typeof t.terug === "number" && t.terug > 0 ? t : null;
};
