// Supabase Edge Function for the GitHub Pages setup: GitHub serves the app, this one function does
// what the Netlify functions did (login, data, mail, backups, notices). Bundled by scripts/bouw-supabase.mjs
// into supabase/functions/claimflow/index.js. Address: https://<project>.supabase.co/functions/v1/claimflow/<naam>
import * as data from "../netlify/functions/data";
import * as mail from "../netlify/functions/mail";
import * as weekoverzicht from "../netlify/functions/weekoverzicht";
import * as backup from "../netlify/functions/backup";
import * as meldingen from "../netlify/functions/meldingen";

type Handler = { handler: (e: unknown) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }> };
const FUNCTIES: Record<string, Handler> = { data, mail, weekoverzicht, backup, meldingen } as never;
/** Scheduled jobs (run by GitHub Actions): only with the shared PLANNING_SLEUTEL, so nobody else can trigger them. */
const GEPLAND = new Set(["weekoverzicht", "backup", "meldingen"]);

/** Origins that may call this function from a browser: the app's own address and local development. */
function toegestaan(origin: string): boolean {
  if (!origin) return false;
  const app = process.env.URL ? new URL(process.env.URL).origin : "";
  return origin === app || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

async function behandel(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") || "";
  const cors: Record<string, string> = toegestaan(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" }
    : { Vary: "Origin" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const u = new URL(req.url);
  const naam = u.pathname.split("/").filter(Boolean).pop() || "";
  const f = FUNCTIES[naam];
  if (!f) return new Response("Niet gevonden", { status: 404, headers: cors });
  if (GEPLAND.has(naam)) {
    const sleutel = process.env.PLANNING_SLEUTEL || "";
    if (!sleutel || req.headers.get("x-planning-sleutel") !== sleutel) return new Response("Geen toegang", { status: 403, headers: cors });
  }
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const body = req.method === "GET" || req.method === "HEAD" ? null : await req.text();
  try {
    const r = await f.handler({ httpMethod: req.method, headers, body: body || null, isBase64Encoded: false, queryStringParameters: Object.fromEntries(u.searchParams) });
    return new Response(r.body ?? "", { status: r.statusCode, headers: { "Content-Type": "application/json", ...(r.headers || {}), ...cors } });
  } catch (fout) {
    console.error(`${naam} mislukt`, fout);
    return new Response(JSON.stringify({ fout: "Er ging iets mis op de server" }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });
  }
}

(globalThis as unknown as { Deno: { serve: (h: (r: Request) => Promise<Response>) => void } }).Deno.serve(behandel);
