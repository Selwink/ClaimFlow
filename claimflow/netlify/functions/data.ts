// /.netlify/functions/data — the only way into the register.
// Personal accounts: create one with the branch code, then log in with your own name and password.
// Every other call needs a signed pass; changes need the "beheer" role.
import { connectLambda } from "@netlify/blobs";
import type { Claim, Instellingen } from "../../src/lib/types";
import * as db from "../lib/db";
import { haalBackup, herstel, lijst, maakBackup } from "../lib/backup";
import { verzend } from "../lib/verzend";
import * as push from "../lib/push";

const SITE = process.env.URL || "https://garantieclaims-meppel.netlify.app";
import { geheim, klopt, leesPas, maakPas, MIN_LENGTE, rolVoorCode, sleutelVoor, versleutel } from "../lib/toegang";

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
    const tekst = (k: string, max = 200) => (typeof body[k] === "string" ? (body[k] as string).slice(0, max) : "");
    const naamOk = (n: string) => n.trim().length >= 2 && n.trim().length <= 40 && sleutelVoor(n).length >= 2;
    const pasVoor = async (g: db.Gebruiker) => json(200, { naam: g.naam, rol: g.rol, ...(await maakPas({ s: g.sleutel, v: g.v })) });

    // ---- open to everyone: create an account, log in, set a new password after a reset
    if (actie === "aanmelden") {
      const naam = tekst("naam", 40).trim().replace(/\s+/g, " "), wachtwoord = tekst("wachtwoord"), code = tekst("code");
      if (!naamOk(naam)) return fout(400, "Vul je naam in (2 tot 40 tekens).");
      if (wachtwoord.length < MIN_LENGTE) return fout(400, `Kies een wachtwoord van minstens ${MIN_LENGTE} tekens.`);
      const rolNieuw = rolVoorCode(code);
      if (!rolNieuw) { await wacht(700); return fout(401, "De vestigingscode klopt niet."); }
      const sleutel = sleutelVoor(naam);
      if (await db.gebruiker(sleutel)) return fout(409, "Er is al een account met deze naam. Log in, of kies een andere naam.");
      // The very first account becomes the administrator; every later one waits for approval,
      // because a branch code like "Meppel" is easy to guess.
      const eerste = (await db.alleGebruikers()).length === 0;
      const g: db.Gebruiker = { sleutel, naam, hash: await versleutel(wachtwoord), rol: eerste ? "beheer" : rolNieuw, actief: true, v: 1,
        gemaakt: new Date().toISOString(), laatst: eerste ? new Date().toISOString() : undefined, wacht: !eerste };
      await db.bewaarGebruiker(g);
      if (eerste) return pasVoor(g);
      await Promise.all([
        verzend({ _subject: `Nieuw account wacht op goedkeuring: ${naam}`, Naam: naam, Wat: "Keur het account goed of verwijder het in Beheer → Gebruikers.", Register: `${SITE}/beheer` }, SITE).catch(() => undefined),
        push.ontvangers("accounts", true).then((o) => push.stuur(o, { titel: "Nieuw account wacht op goedkeuring", tekst: `${naam} wil ClaimFlow gebruiken. Tik om goed te keuren.`, url: "/beheer", tag: "account" })).catch(() => undefined),
      ]);
      return json(202, { wacht: true, naam });
    }
    if (actie === "login") {
      // name and the branch code are needed. A new name gets its account on the spot.
      const rolCode = rolVoorCode(tekst("code"));
      if (!rolCode) { await wacht(700); return fout(401, "De vestigingscode klopt niet."); }
      const naam = tekst("naam", 40).trim().replace(/\s+/g, " ");
      if (!naamOk(naam)) return fout(400, "Vul je naam in (2 tot 40 tekens).");
      const sleutel = sleutelVoor(naam);
      let g = await db.gebruiker(sleutel);
      if (!g) {
        const eerste = (await db.alleGebruikers()).length === 0;
        g = { sleutel, naam, hash: await versleutel(crypto.randomUUID()), rol: eerste ? "beheer" : rolCode, actief: true, v: 1,
          gemaakt: new Date().toISOString(), laatst: new Date().toISOString() };
        await db.bewaarGebruiker(g);
      }
      if (g.wacht) return fout(403, "Je account wacht nog op goedkeuring van een beheerder.");
      if (!g.actief) return fout(403, "Dit account is geblokkeerd. Vraag de beheerder om het weer te openen.");
      await db.bewaarGebruiker({ ...g, laatst: new Date().toISOString() }).catch(() => undefined);
      return pasVoor(g);
    }
    if (actie === "herstel") { return fout(410, "Niet meer nodig: inloggen gaat met je naam en de vestigingscode."); }
    if (actie === "herstel_oud") {
      const g = await db.gebruiker(sleutelVoor(tekst("naam", 40)));
      const wachtwoord = tekst("wachtwoord");
      if (!g || !g.reset || !rolVoorCode(tekst("code"))) { await wacht(700); return fout(403, "Dit lukt alleen als de beheerder een nieuw wachtwoord voor je heeft toegestaan, en met de juiste vestigingscode."); }
      if (wachtwoord.length < MIN_LENGTE) return fout(400, `Kies een wachtwoord van minstens ${MIN_LENGTE} tekens.`);
      const nieuw = { ...g, hash: await versleutel(wachtwoord), reset: false, actief: true, v: g.v + 1, laatst: new Date().toISOString() };
      await db.bewaarGebruiker(nieuw);
      return pasVoor(nieuw);
    }

    // ---- everything else needs a valid pass for an active account; the role is read live from the account
    const pas = await leesPas(e.headers.authorization || e.headers.Authorization);
    const ik = pas ? await db.gebruiker(pas.s) : null;
    if (!pas || !ik || !ik.actief || ik.wacht || ik.v !== pas.v) return fout(401, "Log opnieuw in");
    const rol = ik.rol;
    const beheer = () => rol === "beheer";
    const alleenBeheer = () => fout(403, "Alleen een beheerder kan dit wijzigen");

    switch (actie) {
      case "alles": return json(200, { rol, naam: ik.naam, ...(await db.claimsEnInstellingen()) });
      case "wachtwoord": {
        if (!(await klopt(tekst("oud"), ik.hash))) { await wacht(500); return fout(401, "Je huidige wachtwoord klopt niet."); }
        if (tekst("nieuw").length < MIN_LENGTE) return fout(400, `Kies een wachtwoord van minstens ${MIN_LENGTE} tekens.`);
        const nieuw = { ...ik, hash: await versleutel(tekst("nieuw")), v: ik.v + 1 };
        await db.bewaarGebruiker(nieuw);
        return pasVoor(nieuw);
      }
      case "pushsleutel": return json(200, { sleutel: await push.publiekeSleutel() });
      case "pushstatus": {
        const mijn = await db.pushAbonnementen(ik.sleutel);
        const endpoint = tekst("endpoint", 1000) || e.queryStringParameters?.endpoint || "";
        const dit = mijn.find((a) => a.sub.endpoint === endpoint);
        return json(200, { aan: !!dit, soorten: dit?.soorten || [], apparaten: mijn.length });
      }
      case "pushaan": {
        const sub = body.sub as db.PushAbonnement["sub"] | undefined;
        if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth || sub.endpoint.length > 1000) return fout(400, "Ongeldige aanmelding");
        const gevraagd = Array.isArray(body.soorten) ? (body.soorten as string[]) : ["termijn", "accounts"];
        const soorten = gevraagd.filter((s): s is "termijn" | "accounts" => s === "termijn" || (s === "accounts" && rol === "beheer"));
        await db.bewaarPush({ gebruiker: ik.sleutel, sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, soorten, apparaat: tekst("apparaat", 80), gemaakt: new Date().toISOString() });
        return json(200, { ok: true, soorten });
      }
      case "pushuit": {
        const endpoint = tekst("endpoint", 1000);
        for (const a of await db.pushAbonnementen(ik.sleutel)) if (!endpoint || a.sub.endpoint === endpoint) await db.verwijder(a.id);
        return json(200, { ok: true });
      }
      case "pushtest": {
        const mijn = (await db.pushAbonnementen(ik.sleutel)).filter((a) => !tekst("endpoint", 1000) || a.sub.endpoint === tekst("endpoint", 1000));
        const r = await push.stuur(mijn, { titel: "ClaimFlow werkt!", tekst: `Hoi ${ik.naam.split(" ")[0]}, zo zien je meldingen eruit.`, url: "/", tag: "test" });
        return json(200, r);
      }
      case "gebruikers": {
        if (!beheer()) return alleenBeheer();
        const lijst_ = await db.alleGebruikers();
        return json(200, { gebruikers: lijst_.map(({ hash: _h, v: _v, ...g }) => ({ ...g, ikzelf: g.sleutel === ik.sleutel })) });
      }
      case "gebruiker": {
        if (!beheer()) return alleenBeheer();
        const doel = await db.gebruiker(tekst("sleutel", 60));
        if (!doel) return fout(404, "Account niet gevonden");
        const actieG = tekst("wat", 20);
        const beheerders = (await db.alleGebruikers()).filter((g) => g.rol === "beheer" && g.actief && !g.wacht);
        const laatsteBeheerder = doel.rol === "beheer" && doel.actief && !doel.wacht && beheerders.length <= 1;
        if (actieG === "rol") {
          const nieuweRol = tekst("rol", 10) === "kijken" ? "kijken" : "beheer";
          if (nieuweRol === "kijken" && laatsteBeheerder) return fout(400, "Er moet minstens één beheerder overblijven.");
          await db.bewaarGebruiker({ ...doel, rol: nieuweRol });
        } else if (actieG === "blokkeer") {
          if (laatsteBeheerder) return fout(400, "Er moet minstens één beheerder overblijven.");
          await db.bewaarGebruiker({ ...doel, actief: false, v: doel.v + 1 });
        } else if (actieG === "keur") {
          await db.bewaarGebruiker({ ...doel, wacht: false });
        } else if (actieG === "activeer") {
          await db.bewaarGebruiker({ ...doel, actief: true });
        } else if (actieG === "reset") {
          await db.bewaarGebruiker({ ...doel, reset: true, v: doel.v + 1 });
        } else if (actieG === "verwijder") {
          if (laatsteBeheerder) return fout(400, "Er moet minstens één beheerder overblijven.");
          await db.verwijderGebruiker(doel.sleutel);
        } else return fout(400, "Onbekende actie");
        return json(200, { ok: true });
      }
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
      case "beveiliging": return json(200, { serviceSleutel: db.heeftServiceSleutel(), tabelOpen: await db.tabelOpen(), sleutel: (await geheim()).bron });
      default: return fout(404, "Onbekende actie");
    }
  } catch (err) {
    console.error(actie, err);
    if (err instanceof Error && err.message.includes("TOKEN_GEHEIM")) return fout(503, "De server is nog niet ingesteld: zet TOKEN_GEHEIM in Netlify.");
    return fout(502, "De database is niet bereikbaar");
  }
};
