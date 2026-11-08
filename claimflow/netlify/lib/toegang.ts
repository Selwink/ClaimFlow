// Password check and signed access passes. Lives on the server only.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Rol } from "../../src/lib/types";

const ZOUT = "medipoint-meppel";
/** sha256(password + ZOUT). Override with env vars to change passwords without a code change. */
const WACHTWOORD_HASH = process.env.WACHTWOORD_HASH || "1360561d88563bcbd4716c3e1dc928fc6275afe52d64e830ef5c025446d567a9";
const BEHEER_HASH = process.env.BEHEER_HASH || "";
const GELDIG_DAGEN = 30;

const hash = (pw: string) => createHash("sha256").update(pw + ZOUT).digest("hex");
const gelijk = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const b64 = (s: string) => Buffer.from(s).toString("base64url");
/** Changes whenever a password changes, which invalidates every pass issued before. */
const versie = () => createHash("sha256").update(WACHTWOORD_HASH + "|" + BEHEER_HASH).digest("hex").slice(0, 10);

function geheim(): string {
  const g = process.env.TOKEN_GEHEIM;
  if (!g || g.length < 32) throw new Error("TOKEN_GEHEIM ontbreekt");
  return g;
}

export function rolVoorWachtwoord(pw: string): Rol | null {
  const h = hash(pw);
  if (BEHEER_HASH && gelijk(h, BEHEER_HASH)) return "beheer";
  if (gelijk(h, WACHTWOORD_HASH)) return BEHEER_HASH ? "kijken" : "beheer";
  return null;
}

export function maakPas(rol: Rol): { token: string; verloopt: number } {
  const verloopt = Date.now() + GELDIG_DAGEN * 864e5;
  const inhoud = b64(JSON.stringify({ r: rol, e: verloopt, v: versie() }));
  const sig = createHmac("sha256", geheim()).update(inhoud).digest("base64url");
  return { token: `${inhoud}.${sig}`, verloopt };
}

export function leesPas(kopwaarde?: string): Rol | null {
  const token = (kopwaarde || "").replace(/^Bearer\s+/i, "").trim();
  const [inhoud, sig] = token.split(".");
  if (!inhoud || !sig) return null;
  const verwacht = createHmac("sha256", geheim()).update(inhoud).digest("base64url");
  if (!gelijk(sig, verwacht)) return null;
  try {
    const { r, e, v } = JSON.parse(Buffer.from(inhoud, "base64url").toString()) as { r: Rol; e: number; v: string };
    if (Date.now() > e || v !== versie() || (r !== "beheer" && r !== "kijken")) return null;
    return r;
  } catch { return null; }
}
