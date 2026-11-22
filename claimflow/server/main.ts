// Node server for hosts like Railway. Serves the built app (dist/), runs the same function handlers
// that Netlify runs, and does the schedules the Netlify config had (netlify.toml).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import * as data from "../netlify/functions/data";
import * as mail from "../netlify/functions/mail";
import * as weekoverzicht from "../netlify/functions/weekoverzicht";
import * as backup from "../netlify/functions/backup";
import * as meldingen from "../netlify/functions/meldingen";

const DIST = join(process.cwd(), "dist");
const PORT = Number(process.env.PORT) || 8080;
const FUNCTIES: Record<string, { handler: (e: unknown) => Promise<unknown> }> = {
  data: data as never, mail: mail as never, weekoverzicht: weekoverzicht as never, backup: backup as never, meldingen: meldingen as never,
};
// The Netlify schedules, in UTC: weekly overview Monday 06:00, backup daily 01:00, notices daily 06:15.
const PLANNING: Array<{ naam: string; minuut: number; uur: number; dag?: number }> = [
  { naam: "weekoverzicht", minuut: 0, uur: 6, dag: 1 },
  { naam: "backup", minuut: 0, uur: 1 },
  { naam: "meldingen", minuut: 15, uur: 6 },
];

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".wasm": "application/wasm", ".woff2": "font/woff2" };

async function lees(req: IncomingMessage): Promise<string> {
  const delen: Buffer[] = [];
  for await (const d of req) delen.push(d as Buffer);
  return Buffer.concat(delen).toString("utf8");
}

async function roepAan(naam: string, e: Record<string, unknown>) {
  const f = FUNCTIES[naam];
  if (!f) return { statusCode: 404, body: "" };
  return (await f.handler(e)) as { statusCode: number; headers?: Record<string, string>; body?: string; isBase64Encoded?: boolean };
}

async function stuurStatisch(res: ServerResponse, pad: string): Promise<boolean> {
  const veilig = normalize(join(DIST, pad));
  if (!veilig.startsWith(DIST)) return false;
  try {
    const info = await stat(veilig);
    if (info.isFile()) {
      res.writeHead(200, { "Content-Type": TYPES[extname(veilig)] || "application/octet-stream", "Cache-Control": veilig.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache" });
      res.end(await readFile(veilig));
      return true;
    }
  } catch { /* not a file: fall through */ }
  return false;
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const m = u.pathname.match(/^\/\.netlify\/functions\/([a-z]+)$/);
    if (m) {
      const body = req.method === "GET" || req.method === "HEAD" ? null : await lees(req);
      const r = await roepAan(m[1], {
        httpMethod: req.method, headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])),
        body, isBase64Encoded: false, queryStringParameters: Object.fromEntries(u.searchParams),
      });
      res.writeHead(r.statusCode, r.headers || { "Content-Type": "application/json" });
      res.end(r.body || "");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    if (await stuurStatisch(res, u.pathname === "/" ? "index.html" : u.pathname.slice(1))) return;
    // single-page app: any other address gets the start page
    if (await stuurStatisch(res, "index.html")) return;
    res.writeHead(404); res.end("Niet gevonden");
  } catch (fout) {
    console.error("verzoek mislukt", fout);
    res.writeHead(500); res.end("Er ging iets mis");
  }
});

// Minimal scheduler: checks every minute, runs a job once when its time comes.
const gedraaid = new Set<string>();
function plan() {
  const nu = new Date();
  for (const p of PLANNING) {
    if (nu.getUTCHours() !== p.uur || nu.getUTCMinutes() !== p.minuut) continue;
    if (p.dag !== undefined && nu.getUTCDay() !== p.dag) continue;
    const sleutel = `${p.naam}-${nu.toISOString().slice(0, 10)}`;
    if (gedraaid.has(sleutel)) continue;
    gedraaid.add(sleutel);
    roepAan(p.naam, { httpMethod: "POST", headers: {}, body: null, queryStringParameters: {} })
      .then((r) => console.log(`${p.naam}: ${r.statusCode}`))
      .catch((e) => console.error(`${p.naam} mislukt`, e));
  }
  if (gedraaid.size > 50) gedraaid.clear();
}

server.listen(PORT, () => console.log(`ClaimFlow luistert op poort ${PORT}`));
setInterval(plan, 60_000);
