import type { Claim, Instellingen } from "./types";
import { STATUS_LABEL } from "./types";
import { aankoopVan, afgehandeldOp, doorlooptijd, geenBedrag, isOpen, overTermijn, startDatum, statusVan, titelVan } from "./claims";
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

/** Calendar file with an alarm on each open claim's deadline. Returns the number of events. */
export function agendaBestand(claims: Claim[], inst: Instellingen): number {
  const morgen = new Date(); morgen.setHours(0, 0, 0, 0); morgen.setDate(morgen.getDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const events = claims.filter((c) => isOpen(c) && !c.uitbesteed && startDatum(c)).map((c) => {
    const d = new Date(`${startDatum(c)}T00:00:00`); d.setDate(d.getDate() + inst.dagen);
    const verlopen = overTermijn(c, inst.dagen) || d < morgen;
    const dag = verlopen ? morgen : d;
    const titel = `${verlopen ? "Garantieclaim over termijn" : "Termijn garantieclaim"}: ${titelVan(c)}${c.leverancier ? ` (${c.leverancier})` : ""}`;
    const tekst = [`Inkoopnummer: ${c.inkoopnummer || "nog niet bekend"}`, geenBedrag(c) ? "" : `Bedrag: ${euro(c.bedrag)}`,
      `Ingediend: ${c.datum ? datum(c.datum) : periodLabel(c.periode)}`, `Register: ${appUrl(`claims/${c.id}`)}`].filter(Boolean).join("\n");
    return ["BEGIN:VEVENT", `UID:${c.id}-termijn@claimflow`, `DTSTAMP:${stamp}`, `DTSTART:${icsDatum(dag)}T090000`, `DTEND:${icsDatum(dag)}T091500`,
      `SUMMARY:${icsTekst(titel)}`, `DESCRIPTION:${icsTekst(tekst)}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTekst(titel)}`,
      "TRIGGER:-PT0M", "END:VALARM", "END:VEVENT"].join("\r\n");
  });
  if (!events.length) return 0;
  download(events.length === 1 ? "herinnering-garantieclaim.ics" : "herinneringen-garantieclaims.ics",
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Claimflow//NL", "METHOD:PUBLISH", ...events, "END:VCALENDAR"].join("\r\n"), "text/calendar;charset=utf-8");
  return events.length;
}
