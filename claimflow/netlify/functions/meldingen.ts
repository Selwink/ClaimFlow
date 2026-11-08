// Scheduled every morning: phone notifications about the term.
//  - "bijna": a claim reaches the term in 3 days (still time to act);
//  - "over":  a claim crosses the term today.
// Claims that wait on the VAM or a supplier (Werkbalk "wacht") are skipped. Storage-free: each claim is
// announced on the one day its day count matches, so nobody gets the same claim twice.
import { connectLambda } from "@netlify/blobs";
import { claimsEnInstellingen } from "../lib/db";
import { INST_STANDAARD } from "../../src/lib/instellingen";
import { titelVan } from "../../src/lib/claims";
import { werkbak } from "../../src/lib/werkbak";
import { ontvangers, stuur } from "../lib/push";
import type { Claim } from "../../src/lib/types";

const VOORAF = 3;

const namen = (l: Claim[]) => l.slice(0, 3).map(titelVan).join(", ") + (l.length > 3 ? ` en nog ${l.length - 3}` : "");

export const handler = async (e: unknown) => {
  try { connectLambda(e as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context */ }
  const { claims, inst } = await claimsEnInstellingen();
  const termijn = (inst || INST_STANDAARD).dagen;
  const taken = werkbak(claims, termijn).filter((t) => t.bak !== "wacht");
  const over = taken.filter((t) => t.dagen === termijn).map((t) => t.claim);
  const bijna = taken.filter((t) => t.dagen === termijn - VOORAF).map((t) => t.claim);
  if (!over.length && !bijna.length) return { statusCode: 200, body: "niets te melden vandaag" };

  const lijst = await ontvangers("termijn");
  const uit = { verstuurd: 0, mislukt: 0 };
  const tel = (r: { verstuurd: number; mislukt: number }) => { uit.verstuurd += r.verstuurd; uit.mislukt += r.mislukt; };
  if (over.length) tel(await stuur(lijst, {
    titel: over.length === 1 ? "Claim vandaag over de termijn" : `${over.length} claims vandaag over de termijn`,
    tekst: `${namen(over)}. Vraag informatie op bij de VAM.`,
    url: over.length === 1 ? `/claims/${over[0].id}` : "/",
    tag: "termijn",
  }));
  if (bijna.length) tel(await stuur(lijst, {
    titel: bijna.length === 1 ? `Nog ${VOORAF} dagen tot de termijn` : `${bijna.length} claims: nog ${VOORAF} dagen tot de termijn`,
    tekst: `${namen(bijna)}. Nu nog op tijd om te handelen.`,
    url: bijna.length === 1 ? `/claims/${bijna[0].id}` : "/",
    tag: "termijn-bijna",
  }));
  console.log(`meldingen: ${over.length} over, ${bijna.length} bijna, ${uit.verstuurd} verstuurd, ${uit.mislukt} mislukt`);
  return { statusCode: 200, body: JSON.stringify(uit) };
};
