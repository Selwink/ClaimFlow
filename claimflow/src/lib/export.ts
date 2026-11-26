import type { Claim, Instellingen } from "./types";
import { STATUS_LABEL } from "./types";
import { aankoopVan, afgehandeldOp, dagenOpen, doorlooptijd, geenBedrag, isOpen, overTermijn, startDatum, statusVan, titelVan } from "./claims";
import { datum, euro, periodLabel } from "./format";
import { appUrl } from "./config";

export function download(naam: string, inhoud: string, type: string) {
  const url = URL.createObjectURL(new Blob([inhoud], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: naam });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function naarCsv(claims: Claim[]): string {
  const kop = ["Nummer", "Type", "Onderdeel", "Voorzieningnummer", "Framenummer", "Aankoopdatum", "Leverancier", "Status", "Uitbesteed",
    "Monteur", "Bedrag", "Inkoopnummer", "Ingediend op", "Afgehandeld op", "Doorlooptijd (dagen)", "Periode", "Storing", "Bijzonderheden", "Tijdlijn"];
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rijen = claims.map((c) => [c.nummer, c.type, c.onderdeel, c.voorziening, c.frame, aankoopVan(c), c.leverancier, STATUS_LABEL[statusVan(c)],
    c.uitbesteed ? "Ja" : "Nee", c.locatie === "buiten" ? "Buitenmonteur" : "Binnenmonteur", geenBedrag(c) ? "" : String(c.bedrag).replace(".", ","),
    c.inkoopnummer, c.datum || "", afgehandeldOp(c) || "", doorlooptijd(c) ?? "", periodLabel(c.periode), c.storing, c.bijzonderheden,
    (c.notities || []).map((n) => `${n.d}: ${n.t}${n.w ? ` (${n.w})` : ""}`).join(" | ")].map(q).join(";"));
  return "\uFEFF" + [kop.map(q).join(";"), ...rijen].join("\r\n");
}

const icsTekst = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDatum = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** The events for each open claim's deadline (with an alarm the day before and on the day). Pure: also used by the calendar feed. */
export function agendaEvents(claims: Claim[], inst: Instellingen, adres: (pad: string) => string): string[] {
  const morgen = new Date(); morgen.setHours(0, 0, 0, 0); morgen.setDate(morgen.getDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return claims.filter((c) => !c.verwijderd && isOpen(c) && !c.uitbesteed && startDatum(c)).map((c) => {
    const d = new Date(`${startDatum(c)}T00:00:00`); d.setDate(d.getDate() + inst.dagen);
    const verlopen = overTermijn(c, inst.dagen) || d < morgen;
    const dag = verlopen ? morgen : d;
    const titel = `${verlopen ? "Garantieclaim over termijn" : "Termijn garantieclaim"}: ${titelVan(c)}${c.leverancier ? ` (${c.leverancier})` : ""}`;
    const tekst = [`Leverancier: ${c.leverancier || "-"}`, `Inkoopnummer: ${c.inkoopnummer || "nog niet bekend"}`, geenBedrag(c) ? "" : `Bedrag: ${euro(c.bedrag)}`,
      `Status: ${STATUS_LABEL[statusVan(c)]}`, `Ingediend: ${c.datum ? datum(c.datum) : periodLabel(c.periode)}`, verlopen ? "Vraag informatie op bij de VAM." : "",
      `Openen: ${adres(`claims/${c.id}`)}`].filter(Boolean).join("\n");
    return ["BEGIN:VEVENT", `UID:${c.id}-termijn@claimflow`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${icsDatum(dag)}`,
      `DTEND;VALUE=DATE:${icsDatum(new Date(dag.getTime() + 864e5))}`, `SUMMARY:${icsTekst(titel)}`, `DESCRIPTION:${icsTekst(tekst)}`,
      `URL:${adres(`claims/${c.id}`)}`, "TRANSP:TRANSPARENT", "CATEGORIES:ClaimFlow",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTekst(titel)}`, "TRIGGER:-PT15H", "END:VALARM", "END:VEVENT"].join("\r\n");
  });
}

/** Claims that have been open this long show up on the Monday check. */
export const LANG_OPEN_DAGEN = 21;

/** A recurring Monday 09:00 appointment "Claims nakijken" listing the claims that have been open a long time. Pure. */
export function maandagEvent(claims: Claim[], inst: Instellingen, adres: (pad: string) => string): string {
  const lang = claims.filter((c) => !c.verwijderd && isOpen(c) && !c.uitbesteed && (dagenOpen(c)?.dagen ?? 0) >= LANG_OPEN_DAGEN)
    .sort((a, b) => (dagenOpen(b)?.dagen ?? 0) - (dagenOpen(a)?.dagen ?? 0));
  const ma = new Date(); ma.setHours(0, 0, 0, 0); ma.setDate(ma.getDate() + ((8 - ma.getDay()) % 7 || 7));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const regels = lang.slice(0, 25).map((c) => `• ${titelVan(c)}${c.leverancier ? ` · ${c.leverancier}` : ""} · ${dagenOpen(c)?.dagen} dagen open${overTermijn(c, inst.dagen) ? " (over termijn)" : ""}${geenBedrag(c) ? "" : ` · ${euro(c.bedrag)}`}`);
  const tekst = [lang.length ? `${lang.length} ${lang.length === 1 ? "claim staat" : "claims staan"} ${LANG_OPEN_DAGEN} dagen of langer open:` : `Geen claims die ${LANG_OPEN_DAGEN} dagen of langer open staan. Mooi zo!`,
    ...regels, lang.length > 25 ? `• en nog ${lang.length - 25}` : "", "", "Bel of mail de leverancier, of vraag informatie op bij de VAM.", `Openen: ${adres("claims")}`].filter((r, i, a) => r !== "" || a[i - 1] !== "").join("\n");
  const titel = lang.length ? `Claims nakijken: ${lang.length} lang open` : "Claims nakijken";
  return ["BEGIN:VEVENT", "UID:maandag-nakijken@claimflow", `DTSTAMP:${stamp}`, `DTSTART:${icsDatum(ma)}T090000`, "DURATION:PT30M", "RRULE:FREQ=WEEKLY;BYDAY=MO",
    `SUMMARY:${icsTekst(titel)}`, `DESCRIPTION:${icsTekst(tekst)}`, `URL:${adres("claims")}`, "CATEGORIES:ClaimFlow",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTekst(titel)}`, "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT"].join("\r\n");
}

export function agendaIcs(events: string[], naam = "ClaimFlow termijnen"): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClaimFlow//Medipoint//NL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsTekst(naam)}`, "X-WR-TIMEZONE:Europe/Amsterdam", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...events, "END:VCALENDAR"].join("\r\n");
}

/** Calendar file with an alarm on each open claim's deadline. Returns the number of events. */
export function agendaBestand(claims: Claim[], inst: Instellingen, { termijnen = true, maandag = false } = {}): number {
  const events = [...(termijnen ? agendaEvents(claims, inst, appUrl) : []), ...(maandag ? [maandagEvent(claims, inst, appUrl)] : [])];
  if (!events.length) return 0;
  download(events.length === 1 ? "herinnering-garantieclaim.ics" : "herinneringen-garantieclaims.ics",
    agendaIcs(events), "text/calendar;charset=utf-8");
  return events.length;
}
