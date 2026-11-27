import { useState } from "react";
import { haalAgendaSleutel, REMOTE } from "../lib/api";
import { functie } from "../lib/config";
import { agendaBestand, LANG_OPEN_DAGEN } from "../lib/export";
import { meervoud } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { AgendaKnop } from "./AgendaKnop";
import { appUrl } from "../lib/config";

let sleutelCache = "";
/** The subscription link for the calendar feed, with the chosen contents. */
export async function agendaLink(opties: { termijnen?: boolean; maandag?: boolean } = {}): Promise<string> {
  if (!sleutelCache) sleutelCache = await haalAgendaSleutel();
  const basis = functie("agenda");
  const l = `${basis.startsWith("http") ? basis : location.origin + basis}?k=${encodeURIComponent(sleutelCache)}`;
  return `${l}${opties.termijnen === false ? "&termijnen=0" : ""}${opties.maandag ? "&maandag=1" : ""}`;
}
/** Opens Outlook on the web to subscribe to the feed. */
export function openOutlook(link: string, naam: string, soort: "werk" | "prive" = "werk") {
  const host = soort === "werk" ? "https://outlook.office.com" : "https://outlook.live.com";
  window.open(`${host}/calendar/0/addfromweb?url=${encodeURIComponent(link)}&name=${encodeURIComponent(naam)}`, "_blank", "noopener");
}

/** Profiel → "In je Outlook-agenda": subscribe to a live calendar of all claim deadlines, or download them once. */
export function AgendaKoppelen() {
  const { actief, inst } = useStore();
  const toast = useToast();
  const [link, setLink] = useState("");
  const [bezig, setBezig] = useState(false);
  const [termijnen, setTermijnen] = useState(true);
  const [maandag, setMaandag] = useState(true);
  const opties = `${termijnen ? "" : "&termijnen=0"}${maandag ? "&maandag=1" : ""}`;

  const haal = async (): Promise<string> => {
    if (link) return link + opties;
    setBezig(true);
    try {
      const k = await haalAgendaSleutel();
      const basis = functie("agenda");
      const l = `${basis.startsWith("http") ? basis : location.origin + basis}?k=${encodeURIComponent(k)}`;
      setLink(l); return l + opties;
    } finally { setBezig(false); }
  };
  const outlook = async (soort: "werk" | "prive") => {
    try {
      const l = await haal();
      const host = soort === "werk" ? "https://outlook.office.com" : "https://outlook.live.com";
      window.open(`${host}/calendar/0/addfromweb?url=${encodeURIComponent(l)}&name=${encodeURIComponent("ClaimFlow termijnen")}`, "_blank", "noopener");
    } catch (e) { toast(`Agendalink ophalen lukte niet${e instanceof Error && e.message ? `: ${e.message}` : ""}`); }
  };
  const kopieer = async () => {
    try { const l = await haal(); await navigator.clipboard.writeText(l); toast("Agendalink gekopieerd"); }
    catch { toast("Kopiëren lukte niet. Houd de link hieronder ingedrukt om hem te kopiëren."); }
  };
  const bestand = () => { const n = agendaBestand(actief, inst, { termijnen, maandag }); toast(n ? `${meervoud(n, "afspraak", "afspraken")} gedownload. Open het bestand om ze in Outlook te zetten.` : "Geen open claims met een termijn"); };

  return (
    <div className="agenda-koppel">
      <div className="agenda-kop">
        <span className="rij-ic"><Icon naam="agenda" maat={18} /></span>
        <span className="rij-t"><b>In je Outlook-agenda</b><span>Zet afspraken in je eigen agenda, of kies hieronder een aparte agenda die zichzelf bijwerkt.</span></span>
      </div>
      <div className="agenda-eigen">
        <b>In je eigen agenda</b>
        <small>Een gewone afspraak in je eigen agenda. Termijnen van één claim zet je via de knop "In mijn agenda" op die claim.</small>
        <AgendaKnop className="knop knop-rood knop-klein" afspraak={() => {
          const ma = new Date(); ma.setHours(9, 0, 0, 0); ma.setDate(ma.getDate() + ((8 - ma.getDay()) % 7 || 7));
          return { titel: "Claims nakijken (ClaimFlow)", start: ma, minuten: 30, wekelijks: true,
            tekst: `Kijk de claims na die ${LANG_OPEN_DAGEN} dagen of langer openstaan en vink ze af op Home.\nBel of mail de leverancier, of vraag informatie op bij de VAM.\nOpenen: ${appUrl()}` };
        }}><Icon naam="agenda" maat={16} /> Elke maandag claims nakijken</AgendaKnop>
      </div>
      <b className="agenda-sub">Of: een aparte agenda die zichzelf bijwerkt</b>
      <div className="agenda-keuzes" role="group" aria-label="Wat in je agenda komt">
        <label><input type="checkbox" checked={termijnen} onChange={(e) => setTermijnen(e.target.checked)} /> <span><b>Termijnen</b><small>Elke open claim op de dag dat de termijn afloopt</small></span></label>
        <label><input type="checkbox" checked={maandag} onChange={(e) => setMaandag(e.target.checked)} /> <span><b>Elke maandag claims nakijken</b><small>Om 9:00 een afspraak met de claims die {LANG_OPEN_DAGEN} dagen of langer open staan</small></span></label>
      </div>
      {REMOTE && (
        <div className="agenda-knoppen">
          <button type="button" className="knop knop-rood knop-klein" onClick={() => outlook("werk")} disabled={bezig || (!termijnen && !maandag)}><Icon naam="extern" maat={16} /> Outlook (werk, Microsoft 365)</button>
          <button type="button" className="knop knop-zacht knop-klein" onClick={() => outlook("prive")} disabled={bezig}><Icon naam="extern" maat={16} /> Outlook.com</button>
          <button type="button" className="knop knop-zacht knop-klein" onClick={kopieer} disabled={bezig}><Icon naam="kopie" maat={16} /> Link kopiëren</button>
        </div>
      )}
      <button type="button" className="knop-link agenda-bestand" onClick={bestand}>Of download alles één keer als agendabestand (.ics)</button>
      {link && <p className="agenda-link"><small>Outlook-app op de computer: Agenda → Agenda toevoegen → Van internet, en plak deze link:</small><code>{link + opties}</code></p>}
    </div>
  );
}
