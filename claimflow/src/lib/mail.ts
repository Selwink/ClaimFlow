import { appUrl, CONFIG, functie } from "./config";
import type { Claim } from "./types";
import { STATUS_LABEL } from "./types";
import { geenBedrag, statusVan, titelVan } from "./claims";
import { euro, ls, periodLabel } from "./format";
import { pas } from "./api";
import { voorFormSubmit } from "./mailHtml";
import { datum } from "./format";

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
      body: JSON.stringify(voorFormSubmit(velden)), signal: ctrl.signal,
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

export async function mailNieuweClaim(c: Claim, bron: string, wie: string): Promise<Resultaat | null> {
  if (location.protocol !== "https:") return null;
  const lgar = /LGAR/i.test(bron);
  const wat = titelVan(c);
  const velden: Velden = {
    _subject: `${lgar ? "Nieuwe LGAR-claim" : "Nieuwe garantieclaim"}: ${wat}${c.leverancier ? ` · ${c.leverancier}` : ""}`,
    _soort: lgar ? "LGAR geclaimd" : "Nieuwe claim",
    _intro: `${wie || "Een collega"} heeft een nieuwe garantieclaim vastgelegd${lgar ? " door de LGAR-bon in te lezen. De bon is bij de claim bewaard en voor iedereen in te zien" : ""}. De termijn bij de leverancier loopt vanaf vandaag.`,
    _bedrag: geenBedrag(c) ? "Volgt later" : euro(c.bedrag),
    _bedraglabel: "Bedrag van de claim",
    _knop: "Claim openen",
    Leverancier: c.leverancier || "-",
    Hulpmiddel: c.type || "-",
    ...(c.onderdeel && c.onderdeel !== c.type ? { Onderdeel: c.onderdeel } : {}),
    Storing: c.storing || "-",
    Inkoopnummer: c.inkoopnummer || "Nog niet bekend",
    ...(c.frame ? { Framenummer: c.frame } : {}),
    ...(c.voorziening ? { Voorzieningnummer: c.voorziening } : {}),
    ...(c.aankoop ? { Aankoopdatum: datum(c.aankoop) || c.aankoop } : {}),
    Status: STATUS_LABEL[statusVan(c)],
    Maand: periodLabel(c.periode),
    "Vastgelegd door": wie || "onbekend",
    Bron: bron,
    Register: appUrl(`claims/${c.id}`),
  };
  const r = await stuur(velden);
  if (!r.ok) ls.set(SLEUTEL, JSON.stringify([...(ls.json<Velden[]>(SLEUTEL) || []), velden].slice(-50)));
  return r;
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

/** Mail when claims change status (one mail for a whole batch). */
export async function mailStatus(claims: Claim[], naar: string, wie: string) {
  if (location.protocol !== "https:" || !claims.length) return;
  const totaal = claims.reduce((t, c) => t + (geenBedrag(c) ? 0 : Number(c.bedrag) || 0), 0);
  const een = claims.length === 1 ? claims[0] : null;
  const velden: Velden = {
    _subject: een ? `Claim ${naar.toLowerCase()}: ${titelVan(een)}${een.leverancier ? ` · ${een.leverancier}` : ""}` : `${claims.length} claims ${naar.toLowerCase()}`,
    _soort: `Status: ${naar}`,
    _intro: een ? `${wie || "Een collega"} heeft de claim op ${naar.toLowerCase()} gezet.` : `${wie || "Een collega"} heeft ${claims.length} claims tegelijk op ${naar.toLowerCase()} gezet.`,
    ...(totaal ? { _bedrag: euro(totaal), _bedraglabel: een ? "Bedrag" : "Samen" } : {}),
    _knop: een ? "Claim openen" : "Claims openen",
    "Nieuwe status": naar,
    [een ? "Claim" : "Claims"]: (een ? [een] : claims.slice(0, 20)).map((c) => `${een ? "" : "• "}${titelVan(c)}${c.leverancier ? ` · ${c.leverancier}` : ""}${c.inkoopnummer ? ` · ink ${c.inkoopnummer}` : ""}${geenBedrag(c) ? "" : ` · ${euro(c.bedrag)}`}`).join("\n") + (claims.length > 20 ? `\n• en nog ${claims.length - 20}` : ""),
    "Gewijzigd door": wie || "onbekend",
    Register: appUrl(een ? `claims/${een.id}` : "claims"),
  };
  const r = await stuur(velden);
  if (!r.ok) ls.set(SLEUTEL, JSON.stringify([...(ls.json<Velden[]>(SLEUTEL) || []), velden].slice(-50)));
}

/** Mail when someone writes a note on a claim. */
export async function mailNotitie(c: Claim, tekst: string, wie: string) {
  if (location.protocol !== "https:" || !tekst.trim()) return;
  const velden: Velden = {
    _subject: `Nieuwe notitie: ${titelVan(c)}${c.leverancier ? ` · ${c.leverancier}` : ""}`,
    _soort: "Notitie",
    _intro: `${wie || "Een collega"} schreef een notitie bij deze claim.`,
    _knop: "Claim openen",
    Notitie: tekst,
    Claim: `${titelVan(c)}${c.inkoopnummer ? ` · ink ${c.inkoopnummer}` : ""}`,
    Status: STATUS_LABEL[statusVan(c)],
    "Geschreven door": wie || "onbekend",
    Register: appUrl(`claims/${c.id}`),
  };
  const r = await stuur(velden);
  if (!r.ok) ls.set(SLEUTEL, JSON.stringify([...(ls.json<Velden[]>(SLEUTEL) || []), velden].slice(-50)));
}
