import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Instellingen, VastBedrag } from "../lib/types";
import { CONFIG } from "../lib/config";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { agendaBestand, download, naarCsv } from "../lib/export";
import { stuur, verstuurWachtrij, wachtrijLengte } from "../lib/mail";
import { dezeMaand, euro, geleden, meervoud, parseBedrag, vandaag } from "../lib/format";
import { Icon, type IconNaam } from "../components/Icon";
import { PaginaKop } from "../components/ui";

function Blok({ titel, uitleg, children }: { titel: string; uitleg?: string; children: ReactNode }) {
  return (
    <section className="kaart beheerblok">
      <header><h2>{titel}</h2>{uitleg && <p className="t-zacht">{uitleg}</p>}</header>
      {children}
    </section>
  );
}
function Rij({ icoon, titel, tekst, children, onClick }: { icoon: IconNaam; titel: string; tekst?: string; children?: ReactNode; onClick?: () => void }) {
  const inhoud = (<><span className="rij-ic"><Icon naam={icoon} maat={18} /></span><span className="rij-t"><b>{titel}</b>{tekst && <span>{tekst}</span>}</span>{children}</>);
  return onClick ? <button type="button" className="instelrij" onClick={onClick}>{inhoud}<Icon naam="verder" maat={16} /></button> : <div className="instelrij">{inhoud}</div>;
}

const lijstNaarTekst = (l: string[]) => l.join("\n");
const tekstNaarLijst = (t: string) => [...new Set(t.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];

export function Beheer() {
  const s = useStore();
  const toast = useToast();
  const [naam, setNaam] = useState(s.naam);
  const [i, setI] = useState<Instellingen>(s.inst);
  const [levTekst, setLevTekst] = useState(lijstNaarTekst(s.inst.leveranciers));
  const [uitTekst, setUitTekst] = useState(lijstNaarTekst(s.inst.uitbesteedLev));
  const [prijzen, setPrijzen] = useState<Array<{ woord: string; bedrag: string }>>(s.inst.prijzen.map((p) => ({ woord: p.woord, bedrag: String(p.bedrag) })));
  const [beheerPw, setBeheerPw] = useState("");
  const [mailStatus, setMailStatus] = useState("");
  const [wachtrij, setWachtrij] = useState(wachtrijLengte());

  useEffect(() => {
    setI(s.inst); setLevTekst(lijstNaarTekst(s.inst.leveranciers)); setUitTekst(lijstNaarTekst(s.inst.uitbesteedLev));
    setPrijzen(s.inst.prijzen.map((p) => ({ woord: p.woord, bedrag: String(p.bedrag) })));
  }, [s.inst]);

  const levs = tekstNaarLijst(levTekst);
  const bewaarInst = (e: FormEvent) => {
    e.preventDefault();
    const vast: VastBedrag[] = prijzen.map((p) => ({ woord: p.woord.trim(), bedrag: parseBedrag(p.bedrag) || 0 })).filter((p) => p.woord && p.bedrag > 0);
    void s.bewaarInst({ ...i, dagen: Math.max(1, Math.round(i.dagen) || 42), leveranciers: levs, uitbesteedLev: tekstNaarLijst(uitTekst), prijzen: vast });
  };
  const testMail = async () => {
    setMailStatus("Versturen…");
    const r = await stuur({ _subject: "Testmelding Claimflow", Bericht: `Testmelding vanuit ${s.inst.vestiging}`, Door: s.naam || "onbekend" });
    setMailStatus(r.ok ? (r.activatie ? "Activeer FormSubmit via de mail in je inbox." : "Verstuurd — kijk in je inbox.") : `Niet gelukt: ${r.bericht}`);
  };
  const backup = () => download(`claimflow-backup-${vandaag()}.json`, JSON.stringify({ gemaakt: new Date().toISOString(), instellingen: s.inst, claims: s.claims }, null, 2), "application/json");
  const agenda = () => { const n = agendaBestand(s.actief, s.inst); toast(n ? `${meervoud(n, "herinnering", "herinneringen")} gedownload` : "Geen open claims met een termijn"); };
  const uit = !s.magBewerken;

  return (
    <div className="pagina pagina-smal">
      <PaginaKop boven={s.inst.vestiging} titel="Beheer" />

      <Blok titel="Jij">
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); s.setNaam(naam.trim()); toast("Naam opgeslagen"); }}>
          <label className="veld"><span className="veld-label">Naam in de tijdlijn</span><input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Selwin" /></label>
          <button className="knop knop-zacht" disabled={naam.trim() === s.naam}>Opslaan</button>
        </form>
        <Rij icoon="slot" titel={s.rol === "beheer" ? "Beheerder" : "Alleen kijken"} tekst={s.rol === "beheer" ? "Je kunt claims toevoegen en wijzigen." : "Je kunt alles zien maar niets wijzigen."}>
          {s.rol === "beheer" && CONFIG.BEHEER_HASH && <button type="button" className="knop knop-zacht knop-klein" onClick={s.naarKijken}>Naar kijken</button>}
        </Rij>
        {uit && CONFIG.BEHEER_HASH && (
          <form className="inline-form" onSubmit={async (e) => { e.preventDefault(); if (!(await s.loginBeheer(beheerPw))) toast("Onjuist beheerderswachtwoord"); setBeheerPw(""); }}>
            <label className="veld"><span className="veld-label">Beheerderswachtwoord</span><input type="password" value={beheerPw} onChange={(e) => setBeheerPw(e.target.value)} autoComplete="current-password" /></label>
            <button className="knop knop-rood">Ontgrendel</button>
          </form>
        )}
        <Rij icoon="uitloggen" titel="Uitloggen" tekst="Wist ook de opgeslagen gegevens op dit apparaat." onClick={s.uitloggen} />
      </Blok>

      <Blok titel="Gegevens" uitleg={`${meervoud(s.actief.length, "claim", "claims")} · ${s.online ? `bijgewerkt ${geleden(s.syncTijd)}` : "offline"}`}>
        <Rij icoon="download" titel="Exporteren naar Excel" tekst="CSV met alle claims en tijdlijnen" onClick={() => download(`garantieclaims-${dezeMaand()}.csv`, naarCsv(s.actief), "text/csv;charset=utf-8")} />
        <Rij icoon="agenda" titel="Herinneringen in je agenda" tekst="Eén afspraak per open claim op de termijndatum" onClick={agenda} />
        <Rij icoon="kopie" titel="Back-up downloaden" tekst="Alles als JSON-bestand" onClick={backup} />
        <Rij icoon="vernieuw" titel="Nu verversen" tekst="Haal de laatste stand op" onClick={() => void s.vernieuw().then(() => toast("Bijgewerkt"))} />
        <Link to="/prullenbak" className="instelrij"><span className="rij-ic"><Icon naam="prullenbak" maat={18} /></span><span className="rij-t"><b>Prullenbak</b><span>{meervoud(s.prullenbak.length, "claim", "claims")}</span></span><Icon naam="verder" maat={16} /></Link>
        <Link to="/leveranciers" className="instelrij alleen-mobiel"><span className="rij-ic"><Icon naam="fabriek" maat={18} /></span><span className="rij-t"><b>Leveranciers</b><span>Cijfers per leverancier</span></span><Icon naam="verder" maat={16} /></Link>
      </Blok>

      <Blok titel="E-mailmeldingen" uitleg={`Bij elke nieuwe claim gaat er een mail naar ${CONFIG.MELDING_EMAIL || "niemand"}.`}>
        <Rij icoon="mail" titel="Testmail sturen" tekst={mailStatus || "Controleer of de meldingen aankomen"} onClick={testMail} />
        {wachtrij > 0 && <Rij icoon="klok" titel={`${meervoud(wachtrij, "mail wacht", "mails wachten")} op verzending`} tekst="Worden automatisch opnieuw geprobeerd"
          onClick={async () => { const n = await verstuurWachtrij(); setWachtrij(wachtrijLengte()); toast(n ? `${n} verstuurd` : "Nog niet bereikbaar"); }} />}
      </Blok>

      <form onSubmit={bewaarInst}>
        <Blok titel="Instellingen" uitleg={uit ? "Alleen een beheerder kan dit wijzigen." : "Gelden voor iedereen in de vestiging."}>
          <fieldset disabled={uit} className="velden">
            <label className="veld"><span className="veld-label">Vestiging</span><input value={i.vestiging} onChange={(e) => setI({ ...i, vestiging: e.target.value })} /></label>
            <label className="veld"><span className="veld-label">Termijn (dagen)</span><input type="number" min={1} value={i.dagen} onChange={(e) => setI({ ...i, dagen: Number(e.target.value) })} /></label>
            <label className="veld"><span className="veld-label">Leveranciers (één per regel)</span><textarea rows={6} value={levTekst} onChange={(e) => setLevTekst(e.target.value)} /></label>
            <label className="veld"><span className="veld-label">Altijd uitbesteed</span><textarea rows={6} value={uitTekst} onChange={(e) => setUitTekst(e.target.value)} /></label>
            <div className="veld veld-breed"><span className="veld-label">E-mailadres per leverancier</span>
              <div className="levmail">
                {levs.map((l) => (
                  <label key={l}><span>{l}</span><input type="email" value={i.levMail[l] || ""} placeholder="garantie@…" onChange={(e) => setI({ ...i, levMail: { ...i.levMail, [l]: e.target.value.trim() } })} /></label>
                ))}
              </div>
            </div>
            <div className="veld veld-breed"><span className="veld-label">Vaste bedragen — worden ingevuld als het woord in de storing staat</span>
              <div className="prijzen">
                {prijzen.map((p, n) => (
                  <div key={n} className="prijsrij">
                    <input value={p.woord} aria-label="Woord" onChange={(e) => setPrijzen(prijzen.map((x, k) => (k === n ? { ...x, woord: e.target.value } : x)))} />
                    <div className="met-voor"><span>€</span><input className="mono" inputMode="decimal" aria-label="Bedrag" value={p.bedrag} onChange={(e) => setPrijzen(prijzen.map((x, k) => (k === n ? { ...x, bedrag: e.target.value } : x)))} /></div>
                    <button type="button" className="icoonknop" aria-label={`${p.woord} verwijderen`} onClick={() => setPrijzen(prijzen.filter((_, k) => k !== n))}><Icon naam="kruis" maat={16} /></button>
                  </div>
                ))}
                <button type="button" className="knop knop-zacht knop-klein" onClick={() => setPrijzen([...prijzen, { woord: "", bedrag: "" }])}><Icon naam="plus" maat={16} /> Vast bedrag</button>
              </div>
              <span className="veld-hint">Voorbeeld: “speling” → {euro(780)}</span>
            </div>
          </fieldset>
          {!uit && <div className="formulier-voet"><button className="knop knop-rood">Instellingen opslaan</button></div>}
        </Blok>
      </form>
      <p className="hint mono">Claimflow · {s.inst.vestiging}</p>
    </div>
  );
}
