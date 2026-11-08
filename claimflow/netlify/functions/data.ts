// /.netlify/functions/data — the only way into the register.
// Every call needs a signed pass from `login`; changes need the "beheer" role.
import { connectLambda } from "@netlify/blobs";
import type { Claim, Instellingen } from "../../src/lib/types";
import * as db from "../lib/db";
import { haalBackup, herstel, lijst, maakBackup } from "../lib/backup";
import { leesPas, maakPas, rolVoorWachtwoord } from "../lib/toegang";

interface Verzoek { httpMethod: string; headers: Record<string, string | undefined>; body: string | null; isBase64Encoded?: boolean; queryStringParameters?: Record<string, string | undefined> | null; blobs?: string }
const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });
const fout = (statusCode: number, bericht: string) => json(statusCode, { fout: bericht });
const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length < 200;

export const handler = async (e: Verzoek) => {
  try { connectLambda(e as unknown as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context (local) */ }
  const actie = e.queryStringParameters?.actie || "";
  let body: Record<string, unknown> = {};
  if (e.body) {
    try { body = JSON.parse(e.isBase64Encoded ? Buffer.from(e.body, "base64").toString() : e.body); }
    catch { return fout(400, "Ongeldig verzoek"); }
  }

  try {
    if (actie === "login") {
      const rol = typeof body.wachtwoord === "string" ? rolVoorWachtwoord(body.wachtwoord) : null;
      if (!rol) { await wacht(700); return fout(401, "Dat wachtwoord klopt niet"); }
      return json(200, { rol, ...maakPas(rol) });
    }

    const rol = leesPas(e.headers.authorization || e.headers.Authorization);
    if (!rol) return fout(401, "Log opnieuw in");
    const beheer = () => rol === "beheer";
    const alleenBeheer = () => fout(403, "Alleen een beheerder kan dit wijzigen");

    switch (actie) {
      case "alles": return json(200, { rol, ...(await db.claimsEnInstellingen()) });
      case "bewaar": {
        if (!beheer()) return alleenBeheer();
        const claims = (Array.isArray(body.claims) ? body.claims : []) as Claim[];
        if (!claims.length || claims.length > 500 || !claims.every((c) => isId(c?.id) && !c.id.startsWith("_"))) return fout(400, "Ongeldige claims");
        await db.bewaar(claims);
        return json(200, { ok: true });
      }
      case "verwijder": {
        if (!beheer()) return alleenBeheer();
        if (!isId(body.id) || body.id.startsWith("_")) return fout(400, "Ongeldige claim");
        await db.verwijder(body.id);
        return json(200, { ok: true });
      }
      case "instellingen": {
        if (!beheer()) return alleenBeheer();
        await db.bewaarInstellingen(body.inst as Instellingen);
        return json(200, { ok: true });
      }
      case "fotos": {
        const claim = e.queryStringParameters?.claim;
        if (!isId(claim)) return fout(400, "Geen claim");
        return json(200, { fotos: await db.fotos(claim) });
      }
      case "foto": {
        if (!beheer()) return alleenBeheer();
        const { claim, data, wie, datum } = body as Record<string, string>;
        if (!isId(claim) || claim.startsWith("_") || !/^data:image\/(jpeg|png|webp);base64,/.test(data || "") || data.length > 3_000_000) return fout(400, "Ongeldige foto");
        return json(200, { foto: await db.bewaarFoto(claim, data, String(wie || "").slice(0, 80), String(datum || "").slice(0, 10)) });
      }
      case "fotoweg": {
        if (!beheer()) return alleenBeheer();
        if (!isId(body.id) || !body.id.startsWith(db.FOTO)) return fout(400, "Ongeldige foto");
        await db.verwijder(body.id);
        return json(200, { ok: true });
      }
      case "backups": return json(200, { backups: await lijst() });
      case "backup": {
        if (!beheer()) return alleenBeheer();
        return json(200, { backup: await maakBackup() });
      }
      case "backupinhoud": {
        const id = e.queryStringParameters?.id;
        if (!isId(id)) return fout(400, "Geen back-up");
        const b = await haalBackup(id);
        return b ? json(200, b) : fout(404, "Back-up niet gevonden");
      }
      case "herstel": {
        if (!beheer()) return alleenBeheer();
        if (!isId(body.id)) return fout(400, "Geen back-up");
        return json(200, { teruggezet: await herstel(body.id) });
      }
      case "beveiliging": return json(200, { serviceSleutel: db.heeftServiceSleutel(), tabelOpen: await db.tabelOpen() });
      default: return fout(404, "Onbekende actie");
    }
  } catch (err) {
    console.error(actie, err);
    if (err instanceof Error && err.message.includes("TOKEN_GEHEIM")) return fout(503, "De server is nog niet ingesteld: zet TOKEN_GEHEIM in Netlify.");
    return fout(502, "De database is niet bereikbaar");
  }
};
