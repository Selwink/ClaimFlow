// Scheduled every morning: notifies everyone with phone notifications about claims that cross the term today.
// Storage-free: a claim is announced on the one day its day count equals the term.
import { connectLambda } from "@netlify/blobs";
import { claimsEnInstellingen } from "../lib/db";
import { INST_STANDAARD } from "../../src/lib/instellingen";
import { dagenOpen, isOpen, titelVan } from "../../src/lib/claims";
import { ontvangers, stuur } from "../lib/push";

export const handler = async (e: unknown) => {
  try { connectLambda(e as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context */ }
  const { claims, inst } = await claimsEnInstellingen();
  const termijn = (inst || INST_STANDAARD).dagen;
  const vandaag = claims.filter((c) => !c.verwijderd && isOpen(c) && !c.uitbesteed && dagenOpen(c)?.dagen === termijn);
  if (!vandaag.length) return { statusCode: 200, body: "niets over termijn vandaag" };
  const namen = vandaag.slice(0, 3).map(titelVan).join(", ") + (vandaag.length > 3 ? ` en nog ${vandaag.length - 3}` : "");
  const r = await stuur(await ontvangers("termijn"), {
    titel: vandaag.length === 1 ? "Claim vandaag over de termijn" : `${vandaag.length} claims vandaag over de termijn`,
    tekst: `${namen}. Vraag informatie op bij de VAM.`,
    url: vandaag.length === 1 ? `/claims/${vandaag[0].id}` : "/claims?tab=aandacht",
    tag: "termijn",
  });
  console.log(`meldingen: ${vandaag.length} claims, ${r.verstuurd} verstuurd, ${r.mislukt} mislukt`);
  return { statusCode: 200, body: JSON.stringify(r) };
};
