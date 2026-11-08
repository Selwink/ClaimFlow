import type { Claim } from "./types";
import { titelVan } from "./claims";

/**
 * Logistiek: what happens to the physical part after the VAM has e-mailed what may be done with it.
 * Everything is read from the claim's timeline, so it needs no extra storage:
 *  - the order comes from the latest note "VAM: Onderdeel retour sturen | vernietigen | bewaren";
 *  - progress comes from the latest note "Logistiek: Klaargezet | Verzonden | Vernietigd | Afgerond".
 */

export type Opdracht = "retour" | "vernietigen" | "bewaren";
export type LogStatus = "open" | "klaargezet" | "verzonden" | "vernietigd" | "afgerond";
export type Tab = "tedoen" | "verzonden" | "opslag" | "afgerond";

export const OPDRACHT_LABEL: Record<Opdracht, string> = { retour: "Retour sturen", vernietigen: "Vernietigen", bewaren: "Bewaren" };
export const STATUS_LABEL: Record<LogStatus, string> = { open: "Nog doen", klaargezet: "Klaargezet", verzonden: "Verzonden", vernietigd: "Vernietigd", afgerond: "Afgerond" };
export const VERVOERDERS = ["PostNL", "DHL", "DPD", "UPS", "GLS", "Leverancier haalt op", "Eigen vervoer"];

export interface LogItem { claim: Claim; opdracht: Opdracht; status: LogStatus; sinds: string; vervoer?: string; tt?: string; titel: string }

function laatste<T>(c: Claim, test: (t: string) => T | null): { waarde: T; d: string; t: string } | null {
  const n = c.notities || [];
  for (let i = n.length - 1; i >= 0; i--) {
    const w = test(n[i].t);
    if (w) return { waarde: w, d: n[i].d, t: n[i].t };
  }
  return null;
}

const opdrachtVan = (t: string): Opdracht | null => {
  const m = t.match(/^VAM:\s*Onderdeel\s+(retour sturen|vernietigen|bewaren)/i);
  return !m ? null : /retour/i.test(m[1]) ? "retour" : /vernietig/i.test(m[1]) ? "vernietigen" : "bewaren";
};
const statusVan = (t: string): LogStatus | null => {
  const m = t.match(/^Logistiek:\s*(Klaargezet|Verzonden|Vernietigd|Afgerond)/i);
  return m ? (m[1].toLowerCase() as LogStatus) : null;
};

export function logItems(claims: Claim[]): LogItem[] {
  const uit: LogItem[] = [];
  for (const c of claims) {
    if (c.verwijderd) continue;
    const o = laatste(c, opdrachtVan);
    if (!o) continue;
    // only progress recorded after the latest VAM instruction counts
    const s = laatste(c, statusVan);
    const geldig = s && s.d >= o.d ? s : null;
    const extra = geldig?.t.match(/·\s*(.+?)(?:\s*·\s*T&T\s*(.+))?$/);
    uit.push({ claim: c, opdracht: o.waarde, status: geldig?.waarde || "open", sinds: geldig?.d || o.d, vervoer: extra?.[1], tt: extra?.[2], titel: titelVan(c) });
  }
  return uit.sort((a, b) => a.sinds.localeCompare(b.sinds));
}

export function tabVan(i: LogItem): Tab {
  if (i.status === "afgerond" || i.status === "vernietigd") return "afgerond";
  if (i.status === "verzonden") return "verzonden";
  if (i.opdracht === "bewaren") return "opslag";
  return "tedoen";
}

export const teDoen = (claims: Claim[]) => logItems(claims).filter((i) => tabVan(i) === "tedoen").length;

/** Timeline text for a step, e.g. "Logistiek: Verzonden · PostNL · T&T 3SABC123". */
export function regelVoor(status: Exclude<LogStatus, "open">, vervoer?: string, tt?: string): string {
  const delen = [`Logistiek: ${STATUS_LABEL[status]}`];
  if (vervoer) delen.push(vervoer);
  if (tt) delen.push(`T&T ${tt}`);
  return delen.join(" · ");
}

/** Public tracking page for common carriers, when the code is known. */
export function volgLink(vervoer?: string, tt?: string): string | null {
  if (!tt) return null;
  const c = encodeURIComponent(tt.trim());
  switch (vervoer) {
    case "PostNL": return `https://jouw.postnl.nl/track-and-trace/${c}`;
    case "DHL": return `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${c}`;
    case "DPD": return `https://www.dpd.com/nl/nl/ontvangen/track-en-trace/?parcelNumber=${c}`;
    case "UPS": return `https://www.ups.com/track?tracknum=${c}`;
    case "GLS": return `https://gls-group.com/NL/nl/pakket-volgen?match=${c}`;
    default: return null;
  }
}
