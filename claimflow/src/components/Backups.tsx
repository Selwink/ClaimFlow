import { useEffect, useState } from "react";
import { backupInhoud, haalBackups, herstelBackup, maakBackup, type BackupInfo } from "../lib/api";
import { download } from "../lib/export";
import { meervoud } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

const wanneer = (b: BackupInfo) => {
  const d = new Date(b.datum.length > 10 ? b.datum : `${b.id}T02:00:00`);
  return isNaN(d.getTime()) ? b.id : d.toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** Nightly backups: list, make one now, download, and restore after confirmation. */
export function Backups() {
  const { magBewerken, vernieuw } = useStore();
  const toast = useToast();
  const [lijst, setLijst] = useState<BackupInfo[] | null>(null);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState("");
  const [terug, setTerug] = useState<BackupInfo | null>(null);
  const [alles, setAlles] = useState(false);

  const laad = () => haalBackups().then((l) => { setLijst(l); setFout(""); }).catch(() => { setLijst([]); setFout("Back-ups konden niet worden opgehaald."); });
  useEffect(() => { void laad(); }, []);

  const nu = async () => {
    setBezig("nu");
    try { const b = await maakBackup(); toast(`Back-up gemaakt: ${meervoud(b.aantal, "claim", "claims")}`); await laad(); }
    catch { toast("Back-up maken mislukt"); }
    setBezig("");
  };
  const haal = async (b: BackupInfo) => {
    setBezig(b.id);
    try { download(`claimflow-backup-${b.id}.json`, JSON.stringify(await backupInhoud(b.id), null, 2), "application/json"); }
    catch { toast("Downloaden mislukt"); }
    setBezig("");
  };
  const herstel = async () => {
    if (!terug) return;
    setBezig("herstel");
    try { const n = await herstelBackup(terug.id); toast(`${meervoud(n, "claim", "claims")} teruggezet uit ${terug.id}`); await vernieuw(); setTerug(null); }
    catch { toast("Terugzetten mislukt"); }
    setBezig("");
  };

  const zichtbaar = alles ? lijst || [] : (lijst || []).slice(0, 5);
  return (
    <>
      <div className="backups-kop">
        <p className="t-zacht">Elke nacht automatisch, de laatste 30 dagen blijven bewaard.</p>
        {magBewerken && <button type="button" className="knop knop-zacht knop-klein" onClick={nu} disabled={!!bezig}><Icon naam="kopie" maat={16} /> {bezig === "nu" ? "Bezig…" : "Nu maken"}</button>}
      </div>
      {fout && <p className="veld-fout">{fout}</p>}
      {lijst === null ? <p className="t-zacht">Laden…</p> : lijst.length === 0 && !fout ? (
        <p className="t-zacht backups-leeg">Nog geen back-ups. De eerste wordt vannacht gemaakt{magBewerken ? ", of druk op Nu maken" : ""}.</p>
      ) : (
        <ul className="backups">
          {zichtbaar.map((b) => (
            <li key={b.id}>
              <span className="rij-ic"><Icon naam="klok" maat={16} /></span>
              <span className="rij-t"><b>{wanneer(b)}</b><span>{b.aantal ? meervoud(b.aantal, "claim", "claims") : "claims"} · {b.opslag === "netlify" ? "Netlify-opslag" : "in de database"}</span></span>
              <button type="button" className="icoonknop" onClick={() => haal(b)} disabled={!!bezig} aria-label={`Back-up ${b.id} downloaden`} title="Downloaden"><Icon naam="download" maat={16} /></button>
              {magBewerken && <button type="button" className="icoonknop" onClick={() => setTerug(b)} disabled={!!bezig} aria-label={`Back-up ${b.id} terugzetten`} title="Terugzetten"><Icon naam="ongedaan" maat={16} /></button>}
            </li>
          ))}
        </ul>
      )}
      {(lijst?.length || 0) > 5 && <button type="button" className="meer-link" onClick={() => setAlles(!alles)}>{alles ? "Minder tonen" : `Alle ${lijst!.length} tonen`}</button>}

      <Sheet titel="Back-up terugzetten?" open={!!terug} sluit={() => setTerug(null)}
        voet={<><button type="button" className="knop knop-zacht" onClick={() => setTerug(null)}>Annuleren</button>
          <button type="button" className="knop knop-rood" onClick={herstel} disabled={bezig === "herstel"}>{bezig === "herstel" ? "Bezig…" : "Terugzetten"}</button></>}>
        {terug && <p>Alle claims krijgen weer de stand van <b>{wanneer(terug)}</b>. Wijzigingen daarna aan die claims gaan verloren. Claims die later zijn toegevoegd blijven staan.</p>}
        <p className="t-zacht">Tip: maak eerst met <b>Nu maken</b> een back-up van de huidige stand, dan kun je altijd terug.</p>
      </Sheet>
    </>
  );
}
