// Scheduled every morning: phone notifications about the term.
//  - "bijna": a claim reaches the term in 3 days (still time to act);
//  - "over":  a claim crosses the term today.
// Claims that wait on the VAM or a supplier (Werkbalk "wacht") are skipped. Storage-free: each claim is
// announced on the one day its day count matches, so nobody gets the same claim twice.
import { connectLambda } from "@netlify/blobs";
import { claimsEnInstellingen } from "../lib/db";
import { INST_STANDAARD } from "../../src/lib/instellingen";
import { titelVan } from "../../src/lib/claims";
import { STIL_DAGEN, stilBijLeverancier, werkbak } from "../../src/lib/werkbak";
import { verzend } from "../lib/verzend";
import { ontvangers, stuur } from "../lib/push";
import type { Claim } from "../../src/lib/types";

const VOORAF = 3;
const SITE = (process.env.APP_URL || process.env.URL || "https://selwink.github.io/ClaimFlow").replace(/\/$/, "");

const namen = (l: Claim[]) => l.slice(0, 3).map(titelVan).join(", ") + (l.length > 3 ? ` en nog ${l.length - 3}` : "");

export const handler = async (e: unknown) => {
  try { connectLambda(e as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context */ }
  const { claims, inst } = await claimsEnInstellingen();
  const termijn = (inst || INST_STANDAARD).dagen;
  const taken = werkbak(claims, termijn).filter((t) => t.bak !== "wacht");
  const over = taken.filter((t) => t.dagen === termijn).map((t) => t.claim);
  const bijna = taken.filter((t) => t.dagen === termijn - VOORAF).map((t) => t.claim);
  // supplier silent: on day 14 without news, then once a week
  const stilAlle = stilBijLeverancier(claims);
  const stil = stilAlle.filter((x) => (x.dagen - STIL_DAGEN) % 7 === 0).map((x) => x.claim);
  if (!over.length && !bijna.length && !stil.length) return { statusCode: 200, body: "niets te melden vandaag" };

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
  if (stil.length) tel(await stuur(await ontvangers("leverancier"), {
    titel: stil.length === 1 ? `${stil[0].leverancier || "Leverancier"} laat niets horen` : `${stil.length} claims: leverancier laat niets horen`,
    tekst: `${namen(stil)}. Al ${STIL_DAGEN}+ dagen geen nieuws — even nabellen.`,
    url: stil.length === 1 ? `/claims/${stil[0].id}` : "/",
    tag: "leverancier",
  }));

  // the same reminders by e-mail, when mail is on
  const i = inst || INST_STANDAARD;
  let mail = "mail staat uit";
  if (i.mail && i.herinnermail !== false) {
    const regel = (c: Claim) => `• ${titelVan(c)}${c.leverancier ? ` — ${c.leverancier}` : ""}${c.inkoopnummer ? ` (ink ${c.inkoopnummer})` : ""}`;
    const velden: Record<string, string> = { _subject: `ClaimFlow herinnering: ${[over.length && `${over.length} over termijn`, bijna.length && `${bijna.length} bijna`, stil.length && `${stil.length} leverancier stil`].filter(Boolean).join(", ")}` };
    if (over.length) velden["Vandaag over de termijn"] = over.map(regel).join("\n") + "\nVraag informatie op bij de VAM.";
    if (bijna.length) velden[`Nog ${VOORAF} dagen tot de termijn`] = bijna.map(regel).join("\n");
    if (stil.length) velden[`Leverancier ${STIL_DAGEN}+ dagen stil`] = stil.map(regel).join("\n") + "\nEven nabellen of mailen.";
    velden.Openen = `${SITE}/`;
    const r = await verzend(velden, SITE);
    mail = `${r.dienst}: ${r.bericht}`;
  }
  console.log(`meldingen: ${stil.length} stil, mail ${mail}`);
  console.log(`meldingen: ${over.length} over, ${bijna.length} bijna, ${uit.verstuurd} verstuurd, ${uit.mislukt} mislukt`);
  return { statusCode: 200, body: JSON.stringify(uit) };
};
