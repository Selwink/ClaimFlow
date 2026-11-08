// Web Push: phone notifications. Server only.
// The VAPID key pair is derived from the pass-signing secret, so nothing extra has to be stored or configured.
import { createECDH, createHash } from "node:crypto";
import webpush from "web-push";
import * as db from "./db";
import { geheim } from "./toegang";

export type PushSoort = "termijn" | "accounts";

async function vapid(): Promise<{ publiek: string; prive: string }> {
  const { sleutel } = await geheim();
  const prive = createHash("sha256").update(`vapid|${sleutel}`).digest();
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(prive);
  return { publiek: ecdh.getPublicKey().toString("base64url"), prive: prive.toString("base64url") };
}

export async function publiekeSleutel(): Promise<string> {
  return (await vapid()).publiek;
}

export interface Melding { titel: string; tekst: string; url?: string; tag?: string }

/** Sends to every given subscription; subscriptions the push service no longer knows are removed. */
export async function stuur(abonnementen: db.PushAbonnement[], m: Melding): Promise<{ verstuurd: number; mislukt: number }> {
  if (!abonnementen.length) return { verstuurd: 0, mislukt: 0 };
  const { publiek, prive } = await vapid();
  webpush.setVapidDetails("mailto:s.kok@medipoint.nl", publiek, prive);
  let verstuurd = 0, mislukt = 0;
  await Promise.all(abonnementen.map(async (a) => {
    try {
      await webpush.sendNotification(a.sub, JSON.stringify(m), { TTL: 60 * 60 * 24, urgency: "normal" });
      verstuurd++;
    } catch (e) {
      mislukt++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410 || code === 403) await db.verwijder(a.id).catch(() => undefined);
      else console.error("push mislukt", code, (e as Error).message);
    }
  }));
  return { verstuurd, mislukt };
}

/** Everyone (active, approved accounts) who wants this kind of notification; `alleenBeheer` limits it to administrators. */
export async function ontvangers(soort: PushSoort, alleenBeheer = false): Promise<db.PushAbonnement[]> {
  const [abonnementen, gebruikers] = await Promise.all([db.pushAbonnementen(), db.alleGebruikers()]);
  const mag = new Map(gebruikers.filter((g) => g.actief && !g.wacht && (!alleenBeheer || g.rol === "beheer")).map((g) => [g.sleutel, g]));
  return abonnementen.filter((a) => mag.has(a.gebruiker) && a.soorten.includes(soort));
}
