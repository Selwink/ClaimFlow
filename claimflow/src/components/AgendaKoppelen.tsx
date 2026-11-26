import { useState } from "react";
import { haalAgendaSleutel, REMOTE } from "../lib/api";
import { functie } from "../lib/config";
import { agendaBestand } from "../lib/export";
import { meervoud } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";

/** Profiel → "In je Outlook-agenda": subscribe to a live calendar of all claim deadlines, or download them once. */
export function AgendaKoppelen() {
  const { actief, inst } = useStore();
  const toast = useToast();
  const [link, setLink] = useState("");
  const [bezig, setBezig] = useState(false);

  const haal = async (): Promise<string> => {
    if (link) return link;
    setBezig(true);
    try {
      const k = await haalAgendaSleutel();
      const basis = functie("agenda");
      const l = `${basis.startsWith("http") ? basis : location.origin + basis}?k=${encodeURIComponent(k)}`;
      setLink(l); return l;
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
  const bestand = () => { const n = agendaBestand(actief, inst); toast(n ? `${meervoud(n, "afspraak", "afspraken")} gedownload. Open het bestand om ze in Outlook te zetten.` : "Geen open claims met een termijn"); };

  return (
    <div className="agenda-koppel">
      <div className="agenda-kop">
        <span className="rij-ic"><Icon naam="agenda" maat={18} /></span>
        <span className="rij-t"><b>In je Outlook-agenda</b><span>Elke open claim staat op de dag dat de termijn afloopt, met een herinnering de dag ervoor. Bij een abonnement werkt Outlook zichzelf bij.</span></span>
      </div>
      {REMOTE && (
        <div className="agenda-knoppen">
          <button type="button" className="knop knop-rood knop-klein" onClick={() => outlook("werk")} disabled={bezig}><Icon naam="extern" maat={16} /> Outlook (werk, Microsoft 365)</button>
          <button type="button" className="knop knop-zacht knop-klein" onClick={() => outlook("prive")} disabled={bezig}><Icon naam="extern" maat={16} /> Outlook.com</button>
          <button type="button" className="knop knop-zacht knop-klein" onClick={kopieer} disabled={bezig}><Icon naam="kopie" maat={16} /> Link kopiëren</button>
        </div>
      )}
      <button type="button" className="knop-link agenda-bestand" onClick={bestand}>Of download alles één keer als agendabestand (.ics)</button>
      {link && <p className="agenda-link"><small>Outlook-app op de computer: Agenda → Agenda toevoegen → Van internet, en plak deze link:</small><code>{link}</code></p>}
    </div>
  );
}
