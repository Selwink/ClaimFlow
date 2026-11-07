// POST /.netlify/functions/mail — sends a notification to the fixed register address.
// The recipient is never taken from the request, so this cannot be used to mail anyone else.
import { dienst, verzend } from "../lib/verzend";

const SITE = process.env.URL || "https://garantieclaims-meppel.netlify.app";
const toegestaan = (o: string) => !o || o === SITE || /^https:\/\/[a-z0-9-]+--garantieclaims-meppel\.netlify\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
const json = (statusCode: number, body: unknown) => ({ statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

interface Verzoek { httpMethod: string; headers: Record<string, string | undefined>; body: string | null; isBase64Encoded?: boolean }

export const handler = async (e: Verzoek) => {
  if (e.httpMethod === "GET") return json(200, { dienst: dienst() });
  if (e.httpMethod !== "POST") return json(405, { ok: false, bericht: "Alleen POST" });
  if (!toegestaan(e.headers.origin || "")) return json(403, { ok: false, bericht: "Niet toegestaan" });

  let velden: Record<string, string>;
  try {
    const ruw = e.isBase64Encoded ? Buffer.from(e.body || "", "base64").toString() : e.body || "";
    if (ruw.length > 40000) return json(413, { ok: false, bericht: "Te groot" });
    const b = JSON.parse(ruw) as { velden?: Record<string, unknown> };
    velden = Object.fromEntries(Object.entries(b.velden || {}).slice(0, 30).map(([k, v]) => [k.slice(0, 80), String(v ?? "").slice(0, 4000)]));
  } catch { return json(400, { ok: false, bericht: "Ongeldig verzoek" }); }
  if (!Object.keys(velden).length) return json(400, { ok: false, bericht: "Leeg bericht" });

  const r = await verzend(velden, SITE);
  return json(r.ok ? 200 : 502, r);
};
