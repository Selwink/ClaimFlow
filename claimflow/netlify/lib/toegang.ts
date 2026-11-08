// Accounts, password hashing and signed passes. Server only.
// Passwords are stored as salted scrypt hashes: nobody, including administrators, can read them back.
import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Rol } from "../../src/lib/types";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const ZOUT = "medipoint-meppel";
/** Branch code needed to create an account (default "Meppel", case-insensitive). sha256(lowercase code + ZOUT). */
const CODE_HASH = process.env.WACHTWOORD_HASH || "79d1949b172777a305a8fa238414b0c2c561bb8f1ff29b4c4af6279da0a8be62";
/** Optional separate code that creates accounts with edit rights; without it every new account may edit. */
const BEHEER_CODE_HASH = process.env.BEHEER_HASH || "";
const GELDIG_DAGEN = 30;
export const MIN_LENGTE = 8;

const gelijk = (a: string | Buffer, b: string | Buffer) => {
  const x = Buffer.isBuffer(a) ? a : Buffer.from(a);
  const y = Buffer.isBuffer(b) ? b : Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Role a new account gets for this branch code, or null when the code is wrong. */
export function rolVoorCode(code: string): Rol | null {
  const h = createHash("sha256").update(code.trim().toLowerCase() + ZOUT).digest("hex");
  if (BEHEER_CODE_HASH && gelijk(h, BEHEER_CODE_HASH)) return "beheer";
  if (gelijk(h, CODE_HASH)) return BEHEER_CODE_HASH ? "kijken" : "beheer";
  return null;
}

export async function versleutel(pw: string): Promise<string> {
  const zout = randomBytes(16);
  const h = await scrypt(pw.normalize("NFC"), zout, 64);
  return `scrypt$${zout.toString("base64")}$${h.toString("base64")}`;
}

export async function klopt(pw: string, opgeslagen: string): Promise<boolean> {
  const [soort, zout, hash] = opgeslagen.split("$");
  if (soort !== "scrypt" || !zout || !hash) return false;
  const h = await scrypt(pw.normalize("NFC"), Buffer.from(zout, "base64"), 64);
  return gelijk(h, Buffer.from(hash, "base64"));
}

/** Stable key for a display name: "Selwin Kok" → "selwin-kok". */
export const sleutelVoor = (naam: string) =>
  naam.trim().toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function geheim(): string {
  const g = process.env.TOKEN_GEHEIM;
  if (!g || g.length < 32) throw new Error("TOKEN_GEHEIM ontbreekt");
  return g;
}

/** A pass names the account and its version; bumping the version (block, reset, new password) ends every session. */
export interface Pas { s: string; v: number }

export function maakPas(p: Pas): { token: string; verloopt: number } {
  const verloopt = Date.now() + GELDIG_DAGEN * 864e5;
  const inhoud = Buffer.from(JSON.stringify({ ...p, e: verloopt })).toString("base64url");
  return { token: `${inhoud}.${createHmac("sha256", geheim()).update(inhoud).digest("base64url")}`, verloopt };
}

export function leesPas(kopwaarde?: string): Pas | null {
  const token = (kopwaarde || "").replace(/^Bearer\s+/i, "").trim();
  const [inhoud, sig] = token.split(".");
  if (!inhoud || !sig) return null;
  if (!gelijk(sig, createHmac("sha256", geheim()).update(inhoud).digest("base64url"))) return null;
  try {
    const { s, v, e } = JSON.parse(Buffer.from(inhoud, "base64url").toString()) as Pas & { e: number };
    return typeof s === "string" && typeof v === "number" && Date.now() < e ? { s, v } : null;
  } catch {
    return null;
  }
}
