// Server-side access to the Supabase `claims` table. Only the Netlify functions use this.
// With SUPABASE_SERVICE_KEY set (and row level security on), the browser has no way into the table.
import { createHash } from "node:crypto";
import type { Claim, Instellingen } from "../../src/lib/types";
import { INST_ID, leesInstellingen } from "../../src/lib/instellingen";

const URL_ = (process.env.SUPABASE_URL || "https://xpktjqdtwmqznhgcicim.supabase.co").replace(/\/+$/, "");
const TABEL = "claims";
const API = `${URL_}/rest/v1/${TABEL}`;
/** Old public key: only used until the service key is configured, so the app keeps working during the switch. */
export const PUBLIEKE_SLEUTEL = "sb_publishable_Pg8KNp50y2EzGkYurn117w_4Llr27bI";
/** A named key from Supabase's JSON key lists (SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS), "default" first. */
function uitLijst(naam: string): string {
  try {
    const l = JSON.parse(process.env[naam] || "{}") as Record<string, string>;
    return l.default || Object.values(l)[0] || "";
  } catch { return ""; }
}
// Netlify/Railway: SUPABASE_SERVICE_KEY. Supabase Edge Functions (GitHub Pages setup) get the key from Supabase itself:
// new projects as SUPABASE_SECRET_KEYS, older ones as SUPABASE_SERVICE_ROLE_KEY.
const serviceSleutel = () => process.env.SUPABASE_SERVICE_KEY || uitLijst("SUPABASE_SECRET_KEYS") || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
/** Public key of this project (only used to check that the table is closed to the public). */
const publiekeSleutel = () => uitLijst("SUPABASE_PUBLISHABLE_KEYS") || process.env.SUPABASE_ANON_KEY || PUBLIEKE_SLEUTEL;
const sleutel = () => serviceSleutel() || publiekeSleutel();
/** Which key the server uses, for the status check (never the key itself). */
export const sleutelBron = () => process.env.SUPABASE_SERVICE_KEY ? "SUPABASE_SERVICE_KEY" : uitLijst("SUPABASE_SECRET_KEYS") ? "SUPABASE_SECRET_KEYS"
  : process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "geen";
export const heeftServiceSleutel = () => !!serviceSleutel();

// New-style keys (sb_secret_…, sb_publishable_…) go in the apikey header only; the old JWT keys also as Bearer.
const kop = (extra?: Record<string, string>, k = sleutel()) => ({ apikey: k, ...(k.startsWith("sb_") ? {} : { Authorization: `Bearer ${k}` }), "Content-Type": "application/json", ...extra });
const q = (s: string) => encodeURIComponent(s);

export const FOTO = "_foto:";
export const BACKUP = "_backup:";
export const GEBRUIKER = "_gebruiker:";
export const PUSH = "_push:";
const GEEN_BIJLAGEN = `id=not.like.${q(`${FOTO}*`)}&id=not.like.${q(`${BACKUP}*`)}&id=not.like.${q(`${GEBRUIKER}*`)}&id=not.like.${q(`${PUSH}*`)}`;

const KOLOMMEN = ["id", "nummer", "onderdeel", "voorziening", "type", "frame", "storing", "inkoopnummer", "leverancier", "aankoop",
  "bouwjaar", "bedrag", "datum", "periode", "status", "locatie", "uitbesteed", "bijzonderheden", "notities", "bijgewerkt", "verwijderd"] as const;
const onbekend = new Set<string>();

function naarRij(c: Claim): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const k of KOLOMMEN) {
    if (onbekend.has(k)) continue;
    let v = (c as unknown as Record<string, unknown>)[k];
    if (k === "notities") v = Array.isArray(v) ? v : [];
    else if (k === "uitbesteed") v = !!v;
    else if (k === "bedrag") v = v == null || v === "" ? null : Number(v);
    else if (v === undefined || v === "") v = k === "verwijderd" || k === "datum" ? null : "";
    r[k] = v;
  }
  return r;
}

function naarClaim(x: Record<string, unknown>): Claim {
  return {
    ...(x as unknown as Claim),
    bedrag: x.bedrag == null || x.bedrag === "" ? null : Number(x.bedrag),
    notities: Array.isArray(x.notities) ? (x.notities as Claim["notities"]) : [],
  };
}

async function haal(pad: string): Promise<Array<Record<string, unknown>>> {
  const r = await fetch(`${API}?${pad}`, { headers: kop() });
  if (!r.ok) throw new Error(`Database ${r.status}`);
  return (await r.json()) as Array<Record<string, unknown>>;
}

/** All claim rows plus the settings row, without photos or backups. */
export async function ruweRijen(): Promise<Array<Record<string, unknown>>> {
  return haal(`select=*&${GEEN_BIJLAGEN}`);
}

export async function claimsEnInstellingen(): Promise<{ claims: Claim[]; inst: Instellingen | null }> {
  const rows = await ruweRijen();
  const instRij = rows.find((x) => x.id === INST_ID);
  let inst: Instellingen | null = null;
  if (instRij) { try { inst = leesInstellingen(JSON.parse(String(instRij.bijzonderheden || "{}"))); } catch { inst = null; } }
  const claims = rows.filter((x) => x.id && !String(x.id).startsWith("_")).map(naarClaim);
  return { claims, inst };
}

/** Upsert. Columns the table does not know are dropped and the request retried. */
export async function bewaar(claims: Claim[]): Promise<void> {
  for (let poging = 0; poging < KOLOMMEN.length; poging++) {
    const r = await fetch(API, { method: "POST", headers: kop({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(claims.map(naarRij)) });
    if (r.ok) return;
    const t = await r.text().catch(() => "");
    const m = t.match(/'([a-z_]+)' column/i) || t.match(/column "?([a-z_]+)"? (?:of|does)/i);
    if (m && m[1] !== "id" && !onbekend.has(m[1])) { onbekend.add(m[1]); continue; }
    throw new Error(`Database ${r.status}`);
  }
}

export async function verwijder(id: string): Promise<void> {
  const r = await fetch(`${API}?id=eq.${q(id)}`, { method: "DELETE", headers: kop() });
  if (!r.ok) throw new Error(`Database ${r.status}`);
  if (!id.startsWith("_")) await fetch(`${API}?id=like.${q(`${FOTO}${id}:*`)}`, { method: "DELETE", headers: kop() }).catch(() => undefined);
}

export async function bewaarInstellingen(inst: Instellingen): Promise<void> {
  await bewaar([{ id: INST_ID, onderdeel: "", nummer: "", leverancier: "", status: "nieuw", locatie: "binnen", bedrag: 0, periode: "", bijzonderheden: JSON.stringify(inst) } as Claim]);
}

// ---- photos: rows `_foto:<claimId>:<n>` with the JPEG data URL in `bijzonderheden`
export interface Foto { id: string; claim: string; data: string; datum: string; wie: string }

export async function fotos(claimId: string): Promise<Foto[]> {
  const rows = await haal(`select=id,nummer,bijzonderheden,bijgewerkt,type&id=like.${q(`${FOTO}${claimId}:*`)}`);
  return rows
    .filter((x) => String(x.id).startsWith(`${FOTO}${claimId}:`) && /^data:image\//.test(String(x.bijzonderheden || "")))
    .map((x) => ({ id: String(x.id), claim: String(x.nummer), data: String(x.bijzonderheden), datum: String(x.bijgewerkt || ""), wie: String(x.type || "") }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.id.localeCompare(b.id));
}

export async function bewaarFoto(claimId: string, data: string, wie: string, datum: string): Promise<Foto> {
  const id = `${FOTO}${claimId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await bewaar([{ id, nummer: claimId, type: wie, onderdeel: "foto", bijzonderheden: data, bijgewerkt: datum, status: "nieuw", locatie: "binnen", periode: "" } as Claim]);
  return { id, claim: claimId, data, datum, wie };
}

// ---- moving the register to another database: every row (claims, settings, accounts, photos, devices), no backups
/** One page of rows, in a fixed order. Pages stay small because photo rows carry whole images. */
export async function exportRijen(vanaf: number, aantal: number): Promise<Array<Record<string, unknown>>> {
  return haal(`select=*&id=not.like.${q(`${BACKUP}*`)}&order=id.asc&limit=${aantal}&offset=${vanaf}`);
}
/** Writes exported rows back as they were (same id = replaced). Only the table's own columns are sent. */
export async function importRijen(rijen: Array<Record<string, unknown>>): Promise<void> {
  const schoon = rijen.map((x) => Object.fromEntries(KOLOMMEN.filter((k) => k in x && !onbekend.has(k)).map((k) => [k, x[k]])));
  const r = await fetch(API, { method: "POST", headers: kop({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(schoon) });
  if (!r.ok) throw new Error(`Database ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
}

// ---- backup fallback storage inside the table (used only when Netlify Blobs is unavailable)
export async function backupRijen(): Promise<Array<{ id: string; bijgewerkt: string; aantal: number }>> {
  const rows = await haal(`select=id,bijgewerkt,nummer&id=like.${q(`${BACKUP}*`)}`);
  return rows.map((x) => ({ id: String(x.id), bijgewerkt: String(x.bijgewerkt || ""), aantal: Number(x.nummer) || 0 }));
}
export async function backupRij(id: string): Promise<string | null> {
  const rows = await haal(`select=bijzonderheden&id=eq.${q(id)}`);
  return rows[0] ? String(rows[0].bijzonderheden || "") : null;
}
export async function bewaarBackupRij(id: string, inhoud: string, datum: string, aantal: number): Promise<void> {
  await bewaar([{ id, onderdeel: "backup", nummer: String(aantal), leverancier: "", status: "nieuw", locatie: "binnen", periode: "", bijgewerkt: datum, bijzonderheden: inhoud } as Claim]);
}

/** True when the old public key can still read the table, i.e. row level security is not switched on yet. */
export async function tabelOpen(): Promise<boolean> {
  try {
    const r = await fetch(`${API}?select=id&limit=1`, { headers: kop(undefined, publiekeSleutel()) });
    if (!r.ok) return false;
    return ((await r.json()) as unknown[]).length > 0;
  } catch { return false; }
}

// ---- accounts: rows `_gebruiker:<key>`; display name in `nummer`, the rest as JSON in `bijzonderheden`
export interface Gebruiker {
  sleutel: string; naam: string; hash: string; rol: "beheer" | "kijken"; actief: boolean; v: number;
  gemaakt: string; laatst?: string; reset?: boolean;
  /** New account waiting for a beheerder to approve it. */
  wacht?: boolean;
}

function naarGebruiker(x: Record<string, unknown>): Gebruiker | null {
  try {
    const d = JSON.parse(String(x.bijzonderheden || "{}")) as Omit<Gebruiker, "sleutel" | "naam">;
    return { ...d, sleutel: String(x.id).slice(GEBRUIKER.length), naam: String(x.nummer || "") };
  } catch { return null; }
}

export async function gebruiker(sleutel: string): Promise<Gebruiker | null> {
  const rows = await haal(`select=id,nummer,bijzonderheden&id=eq.${q(GEBRUIKER + sleutel)}`);
  return rows[0] ? naarGebruiker(rows[0]) : null;
}

export async function alleGebruikers(): Promise<Gebruiker[]> {
  const rows = await haal(`select=id,nummer,bijzonderheden&id=like.${q(`${GEBRUIKER}*`)}`);
  return rows.map(naarGebruiker).filter((g): g is Gebruiker => !!g).sort((a, b) => a.naam.localeCompare(b.naam));
}

export async function bewaarGebruiker(g: Gebruiker): Promise<void> {
  const { sleutel, naam, ...rest } = g;
  await bewaar([{ id: GEBRUIKER + sleutel, nummer: naam, onderdeel: "gebruiker", leverancier: "", status: "nieuw", locatie: "binnen", periode: "", bijzonderheden: JSON.stringify(rest) } as Claim]);
}

export const verwijderGebruiker = (sleutel: string) => verwijder(GEBRUIKER + sleutel);

// ---- push subscriptions: rows `_push:<account>:<device>`; account key in `nummer`, details as JSON
export interface PushAbonnement {
  id: string; gebruiker: string; sub: { endpoint: string; keys: { p256dh: string; auth: string } };
  soorten: Array<"termijn" | "accounts">; apparaat: string; gemaakt: string;
}

export async function pushAbonnementen(gebruiker?: string): Promise<PushAbonnement[]> {
  const rows = await haal(`select=id,nummer,bijzonderheden&id=like.${q(`${PUSH}${gebruiker ? `${gebruiker}:` : ""}*`)}`);
  return rows.flatMap((x) => {
    try { return [{ ...(JSON.parse(String(x.bijzonderheden)) as Omit<PushAbonnement, "id" | "gebruiker">), id: String(x.id), gebruiker: String(x.nummer) }]; }
    catch { return []; }
  });
}

export async function bewaarPush(a: Omit<PushAbonnement, "id">): Promise<string> {
  const apparaat = createHash("sha256").update(a.sub.endpoint).digest("hex").slice(0, 16);
  const id = `${PUSH}${a.gebruiker}:${apparaat}`;
  const { gebruiker, ...rest } = a;
  await bewaar([{ id, nummer: gebruiker, onderdeel: "push", leverancier: "", status: "nieuw", locatie: "binnen", periode: "", bijzonderheden: JSON.stringify(rest) } as Claim]);
  return id;
}
