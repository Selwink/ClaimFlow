import { useEffect, useState } from "react";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { aanzetten, isIOS, ondersteund, opBeginscherm, status, testmelding, uitzetten, type PushSoort } from "../lib/push";
import { Icon } from "./Icon";

const SOORTEN: Array<{ id: PushSoort; titel: string; tekst: string; beheer?: boolean }> = [
  { id: "termijn", titel: "Claim over de termijn", tekst: "3 dagen vooraf en op de dag dat een claim de termijn passeert." },
  { id: "leverancier", titel: "Leverancier laat niets horen", tekst: "Als een ingediende claim 14 dagen geen nieuws heeft, daarna elke week." },
  { id: "accounts", titel: "Nieuw account wacht op goedkeuring", tekst: "Zodra iemand zich aanmeldt.", beheer: true },
];

/** Beheer block: turn phone notifications on or off for this device, choose which ones, send a test. */
export function PushMeldingen() {
  const { magBewerken } = useStore();
  const toast = useToast();
  const [st, setSt] = useState<{ aan: boolean; soorten: PushSoort[]; toestemming: NotificationPermission } | null>(null);
  const [keuze, setKeuze] = useState<PushSoort[]>(["termijn", "leverancier", "accounts"]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const kan = ondersteund();
  const iosZonderBeginscherm = isIOS() && !opBeginscherm();
  const soorten = SOORTEN.filter((s) => !s.beheer || magBewerken);

  useEffect(() => {
    if (!kan) return;
    status().then((s) => { setSt(s); if (s.aan) setKeuze(s.soorten); }).catch(() => setSt({ aan: false, soorten: [], toestemming: Notification.permission }));
  }, [kan]);

  const zetAan = async (lijst = keuze) => {
    setBezig(true); setFout("");
    try {
      const s = await aanzetten(lijst.filter((x) => soorten.some((y) => y.id === x)));
      setSt({ aan: true, soorten: s, toestemming: "granted" }); setKeuze(s);
      toast("Meldingen staan aan op dit apparaat");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setFout(m === "geweigerd" ? "Je hebt meldingen geweigerd. Zet ze aan in de instellingen van je telefoon of browser en probeer het opnieuw." : m || "Aanzetten lukte niet.");
      setSt((o) => (o ? { ...o, toestemming: Notification.permission } : o));
    }
    setBezig(false);
  };
  const zetUit = async () => {
    setBezig(true);
    try { await uitzetten(); setSt((o) => (o ? { ...o, aan: false, soorten: [] } : o)); toast("Meldingen staan uit op dit apparaat"); }
    catch { toast("Uitzetten lukte niet"); }
    setBezig(false);
  };
  const test = async () => {
    setBezig(true);
    try { const n = await testmelding(); toast(n ? "Testmelding verstuurd" : "Geen apparaat gevonden: zet meldingen opnieuw aan"); }
    catch { toast("Testmelding lukte niet"); }
    setBezig(false);
  };
  const wissel = (id: PushSoort) => {
    const nieuw = keuze.includes(id) ? keuze.filter((x) => x !== id) : [...keuze, id];
    setKeuze(nieuw);
    if (st?.aan) void zetAan(nieuw);
  };

  if (iosZonderBeginscherm) {
    return (
      <div className="push-ios">
        <p><b>Op de iPhone werken meldingen alleen vanaf je beginscherm.</b> Zo zet je ClaimFlow erop:</p>
        <ol>
          <li><span className="push-stap">1</span>Tik onderin Safari op <b>Deel</b> <Icon naam="upload" maat={16} /></li>
          <li><span className="push-stap">2</span>Kies <b>Zet op beginscherm</b></li>
          <li><span className="push-stap">3</span>Open ClaimFlow via het nieuwe icoon en log in</li>
          <li><span className="push-stap">4</span>Kom terug naar Beheer en zet meldingen aan</li>
        </ol>
      </div>
    );
  }
  if (!kan) return <p className="t-zacht">Deze browser ondersteunt geen meldingen. Gebruik Chrome, Edge, Firefox of Safari (iPhone: vanaf je beginscherm).</p>;

  return (
    <>
      <div className={`mailstatus ${st?.aan ? "ms-ok" : "ms-onbekend"}`}><i />
        <span>{st === null ? "Controleren…" : st.aan ? <><b>Aan</b> op dit apparaat.</> : st.toestemming === "denied" ? <><b>Geblokkeerd.</b> Sta meldingen toe in de instellingen.</> : <><b>Uit</b> op dit apparaat.</>}</span>
      </div>
      <ul className="push-soorten">
        {soorten.map((s) => (
          <li key={s.id}>
            <label className="schakelrij instelrij">
              <span className="rij-ic"><Icon naam={s.id === "termijn" ? "klok" : s.id === "leverancier" ? "telefoon" : "persoon"} maat={18} /></span>
              <span className="rij-t"><b>{s.titel}</b><span>{s.tekst}</span></span>
              <input type="checkbox" role="switch" className="schakelaar" checked={keuze.includes(s.id)} disabled={bezig} onChange={() => wissel(s.id)} />
            </label>
          </li>
        ))}
      </ul>
      {fout && <p className="veld-fout" role="alert">{fout}</p>}
      <div className="push-knoppen">
        {st?.aan ? (
          <>
            <button type="button" className="knop knop-zacht knop-klein" onClick={test} disabled={bezig}><Icon naam="bericht" maat={16} /> Testmelding</button>
            <button type="button" className="knop knop-zacht knop-klein" onClick={zetUit} disabled={bezig}>Uitzetten</button>
          </>
        ) : (
          <button type="button" className="knop knop-rood" onClick={() => zetAan()} disabled={bezig || !keuze.length}><Icon naam="bericht" maat={18} /> {bezig ? "Bezig…" : "Meldingen aanzetten"}</button>
        )}
      </div>
    </>
  );
}
