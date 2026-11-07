import { CONFIG } from "./config";
import type { Claim } from "./types";
import { STATUS_LABEL } from "./types";
import { geenBedrag, statusVan, titelVan } from "./claims";
import { euro, ls, periodLabel } from "./format";

/** E-mail notifications through FormSubmit, with a retry queue for when it is unreachable. */

const SLEUTEL = "claimflow-mailwachtrij";
type Velden = Record<string, string>;

export async function stuur(velden: Velden): Promise<{ ok: boolean; activatie?: boolean; bericht: string }> {
  if (!CONFIG.MELDING_EMAIL) return { ok: false, bericht: "Geen e-mailadres ingesteld" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONFIG.MELDING_EMAIL)}`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _template: "table", _captcha: "false", ...velden }), signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = (await r.json().catch(() => ({}))) as { success?: string | boolean; message?: string };
    if (j.success === true || j.success === "true") return { ok: true, bericht: "Verstuurd" };
    if (/activat/i.test(j.message || "")) return { ok: true, activatie: true, bericht: j.message || "" };
    return { ok: false, bericht: j.message || `Fout ${r.status}` };
  } catch {
    return { ok: false, bericht: "FormSubmit is niet bereikbaar" };
  }
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
    Register: `${location.origin}/claims/${c.id}`,
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
