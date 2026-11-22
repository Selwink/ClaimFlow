import { appUrl, CONFIG, functie } from "./config";
import type { Claim } from "./types";
import { STATUS_LABEL } from "./types";
import { geenBedrag, statusVan, titelVan } from "./claims";
import { euro, ls, periodLabel } from "./format";
import { pas } from "./api";

/** E-mail notifications. Sent through our Netlify function (Resend), falling back to FormSubmit; failed mails are queued and retried. */

const SLEUTEL = "claimflow-mailwachtrij";
type Velden = Record<string, string>;

export type Dienst = "resend" | "formsubmit";
interface Resultaat { ok: boolean; activatie?: boolean; bericht: string; dienst?: Dienst }
const FUNCTIE = functie("mail");

async function viaFormSubmit(velden: Velden): Promise<Resultaat> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONFIG.MELDING_EMAIL)}`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _template: "table", _captcha: "false", ...velden }), signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = (await r.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    if (j.success === true || j.success === "true") return { ok: true, bericht: "Verstuurd", dienst: "formsubmit" };
    if (/activat/i.test(j.message || "")) return { ok: true, activatie: true, bericht: j.message || "", dienst: "formsubmit" };
    return { ok: false, bericht: j.message || `Fout ${r.status}`, dienst: "formsubmit" };
  } catch {
    return { ok: false, bericht: "FormSubmit is niet bereikbaar", dienst: "formsubmit" };
  }
}

export async function stuur(velden: Velden): Promise<Resultaat> {
  if (!CONFIG.MELDING_EMAIL) return { ok: false, bericht: "Geen e-mailadres ingesteld" };
  try {
    const p = pas.get();
    const r = await fetch(FUNCTIE, { method: "POST", headers: { "Content-Type": "application/json", ...(p ? { Authorization: `Bearer ${p.token}` } : {}) }, body: JSON.stringify({ velden }) });
    if (r.status !== 404 && (r.headers.get("content-type") || "").includes("json")) {
      const j = (await r.json()) as Resultaat;
      // FormSubmit often refuses requests from cloud servers; then send from this browser instead.
      if (j.ok || j.dienst === "resend") return j;
    }
  } catch { /* function unreachable (offline or local dev): try FormSubmit directly */ }
  return viaFormSubmit(velden);
}

/** Which mail service the server uses, or null when the function is not available (local dev). */
export async function maildienst(): Promise<Dienst | null> {
  try {
    const r = await fetch(FUNCTIE);
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return null;
    return ((await r.json()) as { dienst?: Dienst }).dienst ?? null;
  } catch { return null; }
}

export async function mailNieuweClaim(c: Claim, bron: string, wie: string) {
  if (location.protocol !== "https:") return;
  const velden: Velden = {
    _subject: `Nieuwe garantieclaim: ${titelVan(c)}${c.leverancier ? ` (${c.leverancier})` : ""}`,
    "Type / onderdeel": [c.type, c.onderdeel !== c.type ? c.onderdeel : ""].filter(Boolean).join(" / "),
    Leverancier: c.leverancier || "",
    Inkoopnummer: c.inkoopnummer || "nog niet bekend",
    Bedrag: geenBedrag(c) ? "volgt later" : euro(c.bedrag),
    Status: STATUS_LABEL[statusVan(c)],
    Maand: periodLabel(c.periode),
    Storing: c.storing || "-",
    "Toegevoegd door": wie || "onbekend",
    Bron: bron,
    Register: appUrl(`claims/${c.id}`),
  };
  const r = await stuur(velden);
  if (!r.ok) ls.set(SLEUTEL, JSON.stringify([...(ls.json<Velden[]>(SLEUTEL) || []), velden].slice(-50)));
}

export async function verstuurWachtrij(): Promise<number> {
  const rij = ls.json<Velden[]>(SLEUTEL) || [];
  if (!rij.length || location.protocol !== "https:") return 0;
  const over: Velden[] = [];
  for (const v of rij) if (!(await stuur(v)).ok) over.push(v);
  if (over.length) ls.set(SLEUTEL, JSON.stringify(over)); else ls.del(SLEUTEL);
  return rij.length - over.length;
}
export const wachtrijLengte = () => (ls.json<Velden[]>(SLEUTEL) || []).length;
