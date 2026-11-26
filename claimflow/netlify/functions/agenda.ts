// GET /agenda?k=<key> — the claim deadlines as a calendar feed, for subscribing in Outlook, Google or Apple Calendar.
// The key in the link is the only protection (calendar apps cannot log in); it comes from the server secret.
import { connectLambda } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";
import { agendaSleutel } from "../lib/toegang";
import { claimsEnInstellingen } from "../lib/db";
import { agendaEvents, agendaIcs } from "../../src/lib/export";
import { INST_STANDAARD } from "../../src/lib/instellingen";

const SITE = (process.env.APP_URL || process.env.URL || "https://selwink.github.io/ClaimFlow").replace(/\/$/, "");
interface Verzoek { httpMethod: string; headers: Record<string, string | undefined>; queryStringParameters?: Record<string, string> | null }

export const handler = async (e: Verzoek) => {
  try { connectLambda(e as unknown as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context */ }
  const k = e.queryStringParameters?.k || "";
  const goed = await agendaSleutel();
  if (k.length !== goed.length || !timingSafeEqual(Buffer.from(k), Buffer.from(goed))) return { statusCode: 403, headers: { "Content-Type": "text/plain" }, body: "Geen toegang" };
  const { claims, inst } = await claimsEnInstellingen();
  const ics = agendaIcs(agendaEvents(claims, inst || INST_STANDAARD, (pad) => `${SITE}/${pad}`), `ClaimFlow · ${(inst || INST_STANDAARD).vestiging}`);
  return { statusCode: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=900", "Content-Disposition": 'inline; filename="claimflow.ics"' }, body: ics };
};
