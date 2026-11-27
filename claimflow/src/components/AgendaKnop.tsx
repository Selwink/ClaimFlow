import { useState, type ReactNode } from "react";
import { download } from "../lib/export";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

export interface Afspraak { titel: string; start: Date; minuten: number; tekst: string; wekelijks?: boolean }

const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

/** Opens Outlook on the web with a new appointment in your own calendar, filled in; you press Save. */
export function outlookNieuw(a: Afspraak, soort: "werk" | "prive" = "werk") {
  const host = soort === "werk" ? "https://outlook.office.com" : "https://outlook.live.com";
  const eind = new Date(a.start.getTime() + a.minuten * 60000);
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: a.titel, startdt: a.start.toISOString(), enddt: eind.toISOString(),
    body: a.tekst + (a.wekelijks ? "\n\nTip: zet 'Herhalen' op 'Elke week' voordat je opslaat." : "") });
  window.open(`${host}/calendar/0/deeplink/compose?${q.toString().replace(/\+/g, "%20")}`, "_blank", "noopener");
}

/** One appointment as a file: opening it adds it to your own calendar (Outlook app, iPhone, Mac). */
export function afspraakBestand(a: Afspraak) {
  const eind = new Date(a.start.getTime() + a.minuten * 60000);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClaimFlow//Medipoint//NL", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@claimflow`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(a.start)}`, `DTEND:${utc(eind)}`,
    ...(a.wekelijks ? ["RRULE:FREQ=WEEKLY;BYDAY=MO"] : []), `SUMMARY:${esc(a.titel)}`, `DESCRIPTION:${esc(a.tekst)}`, "CATEGORIES:ClaimFlow",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(a.titel)}`, "TRIGGER:-PT15M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  download(`${a.titel.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "afspraak"}.ics`, ics, "text/calendar;charset=utf-8");
}

/** Button "In mijn agenda": choose Outlook (work), Outlook.com or a file for the iPhone/Outlook app. */
export function AgendaKnop({ afspraak, className = "actie", children }: { afspraak: () => Afspraak; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const a = open ? afspraak() : null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children ?? <><Icon naam="agenda" maat={18} /> In mijn agenda</>}</button>
      <Sheet titel="In mijn agenda zetten" open={open} sluit={() => setOpen(false)}>
        {a && <>
          <div className="ak-voorbeeld">
            <span className="ak-dag"><small>{a.start.toLocaleDateString("nl-NL", { weekday: "short" })}</small><b>{a.start.getDate()}</b></span>
            <span className="ak-t"><b>{a.titel}</b><small>{a.start.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} · {a.start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}{a.wekelijks ? " · elke maandag" : ""}</small></span>
          </div>
          <p className="t-zacht ak-uitleg">De afspraak komt in je eigen agenda, niet in een aparte agenda. Je krijgt 15 minuten van tevoren een herinnering.</p>
          <div className="ak-keuzes">
            <button type="button" className="knop knop-rood knop-vol" onClick={() => { outlookNieuw(a, "werk"); setOpen(false); }}><Icon naam="extern" maat={18} /> Outlook (werk, Microsoft 365)</button>
            <button type="button" className="knop knop-zacht knop-vol" onClick={() => { outlookNieuw(a, "prive"); setOpen(false); }}><Icon naam="extern" maat={18} /> Outlook.com</button>
            <button type="button" className="knop knop-zacht knop-vol" onClick={() => { afspraakBestand(a); setOpen(false); }}><Icon naam="download" maat={18} /> Outlook-app, iPhone of Mac</button>
          </div>
          <p className="t-zacht ak-uitleg"><small>Outlook opent met de afspraak al ingevuld: tik op <b>Opslaan</b>.{a.wekelijks ? " Bij Outlook op het web zet je 'Herhalen' op 'Elke week'; het bestand herhaalt al vanzelf." : " Bij het bestand tik je op Toevoegen of Opslaan en sluiten."}</small></p>
        </>}
      </Sheet>
    </>
  );
}
