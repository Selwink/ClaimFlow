import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Instellingen, VastBedrag } from "../lib/types";
import { appUrl, CONFIG } from "../lib/config";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { agendaBestand, download, naarCsv } from "../lib/export";
import { maildienst, stuur, verstuurWachtrij, wachtrijLengte, type Dienst } from "../lib/mail";
import { weekOverzicht } from "../lib/overzicht";
import { dezeMaand, euro, geleden, meervoud, parseBedrag, vandaag } from "../lib/format";
import { Icon, type IconNaam } from "../components/Icon";
import { PaginaKop } from "../components/ui";
import { Backups } from "../components/Backups";
import { Verhuizen } from "../components/Verhuizen";
import { ProfielKop } from "../components/Showcase";
import { Gebruikers, WachtwoordWijzigen } from "../components/Gebruikers";
import { toonWelkom } from "../components/Welkom";
import { PushMeldingen } from "../components/PushMeldingen";
import { KLEUREN, leesKleur, leesWeergave, zetKleur, zetWeergave, type Kleur, type Weergave } from "../lib/kleur";
import { datumOntbreekt } from "../lib/claims";

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
  const [i, setI] = useState<Instellingen>(s.inst);
  const [levTekst, setLevTekst] = useState(lijstNaarTekst(s.inst.leveranciers));
  const [uitTekst, setUitTekst] = useState(lijstNaarTekst(s.inst.uitbesteedLev));
  const [prijzen, setPrijzen] = useState<Array<{ woord: string; bedrag: string }>>(s.inst.prijzen.map((p) => ({ woord: p.woord, bedrag: String(p.bedrag) })));
  const [mailStatus, setMailStatus] = useState("");
  const [wachtrij, setWachtrij] = useState(wachtrijLengte());
  const [weekStatus, setWeekStatus] = useState("");
  const [dienst, setDienst] = useState<Dienst | null | undefined>(undefined);
  useEffect(() => { void maildienst().then(setDienst); }, []);

  useEffect(() => {
    setI(s.inst); setLevTekst(lijstNaarTekst(s.inst.leveranciers)); setUitTekst(lijstNaarTekst(s.inst.uitbesteedLev));
    setPrijzen(s.inst.prijzen.map((p) => ({ woord: p.woord, bedrag: String(p.bedrag) })));
  }, [s.inst]);

  const levs = tekstNaarLijst(levTekst);
  const bewaarInst = (e: FormEvent) => {
    e.preventDefault();
    const vast: VastBedrag[] = prijzen.map((p) => ({ woord: p.woord.trim(), bedrag: parseBedrag(p.bedrag) || 0 })).filter((p) => p.woord && p.bedrag > 0);
    void s.bewaarInst({ ...i, dagen: Math.max(1, Math.round(i.dagen) || 42), maanddoel: Math.max(100, Math.round(i.maanddoel) || 3000), leveranciers: levs, uitbesteedLev: tekstNaarLijst(uitTekst), prijzen: vast });
  };
  const testMail = async () => {
    setMailStatus("Versturen…");
    const r = await stuur({ _subject: "Testmelding ClaimFlow Medipoint", Bericht: `Testmelding vanuit ${s.inst.vestiging}`, Door: s.naam || "onbekend" });
    setMailStatus(r.ok ? (r.activatie ? "Activeer FormSubmit via de mail in je inbox." : `${r.bericht} — kijk in je inbox.`) : `Niet gelukt: ${r.bericht}`);
  };
  const stuurWeek = async () => {
    setWeekStatus("Versturen…");
    const r = await stuur(weekOverzicht(s.claims, s.inst, appUrl().replace(/\/$/, "")).velden);
    setWeekStatus(r.ok ? `${r.bericht} — kijk in je inbox.` : `Niet gelukt: ${r.bericht}`);
  };
  const backup = () => download(`claimflow-backup-${vandaag()}.json`, JSON.stringify({ gemaakt: new Date().toISOString(), instellingen: s.inst, claims: s.claims }, null, 2), "application/json");
  const agenda = () => { const n = agendaBestand(s.actief, s.inst); toast(n ? `${meervoud(n, "herinnering", "herinneringen")} gedownload` : "Geen open claims met een termijn"); };
  const uit = !s.magBewerken;

  return (
    <div className="pagina pagina-smal">
      <PaginaKop boven={s.inst.vestiging} titel="Profiel" />
      <ProfielKop />

      <Blok titel="Jij">
        <Rij icoon="persoon" titel={s.naam || "Je account"} tekst={s.rol === "beheer" ? "Je kunt claims toevoegen en wijzigen. Je naam komt in de tijdlijn." : "Je kunt alles zien maar niets wijzigen. Vraag een beheerder om meer rechten."} />
        <WachtwoordWijzigen />
        <Rij icoon="bericht" titel="Uitleg bekijken" tekst="De rondleiding van de eerste keer, nog een keer." onClick={toonWelkom} />
        <Rij icoon="uitloggen" titel="Uitloggen" tekst="Wist ook de opgeslagen gegevens op dit apparaat." onClick={s.uitloggen} />
      </Blok>

      <Blok titel="Weergave en kleuren" uitleg="Licht of donker, en de kleuren van de app. Geldt alleen voor dit apparaat; collega's kiezen hun eigen.">
        <KleurKeus />
      </Blok>
      <Blok titel="Meldingen op je telefoon" uitleg="Krijg een melding als een claim over de termijn gaat. Stel het per apparaat in.">
        <PushMeldingen />
      </Blok>

      {!uit && (
        <Blok titel="Gebruikers">
          <Gebruikers />
        </Blok>
      )}


      <Blok titel="Back-ups">
        <Backups />
      </Blok>

      {s.magBewerken && (
        <Blok titel="Verhuizen" uitleg="Het hele register naar een andere database overzetten.">
          <Verhuizen />
        </Blok>
      )}

      <Blok titel="Gegevens" uitleg={`${meervoud(s.actief.length, "claim", "claims")} · ${s.online ? `bijgewerkt ${geleden(s.syncTijd)}` : "offline"}`}>
        <Rij icoon="download" titel="Exporteren naar Excel" tekst="CSV met alle claims en tijdlijnen" onClick={() => download(`garantieclaims-${dezeMaand()}.csv`, naarCsv(s.actief), "text/csv;charset=utf-8")} />
        <Rij icoon="agenda" titel="Herinneringen in je agenda" tekst="Eén afspraak per open claim op de termijndatum" onClick={agenda} />
        {!uit && <Link to="/datums" className="instelrij"><span className="rij-ic"><Icon naam="agenda" maat={18} /></span><span className="rij-t"><b>Datums aanvullen</b><span>{meervoud(s.actief.filter((c) => datumOntbreekt(c)).length, "claim mist", "claims missen")} een datum</span></span><Icon naam="verder" maat={16} /></Link>}
        <Rij icoon="kopie" titel="Alles downloaden" tekst="De huidige stand als JSON-bestand" onClick={backup} />
        <Rij icoon="vernieuw" titel="Nu verversen" tekst="Haal de laatste stand op" onClick={() => void s.vernieuw().then(() => toast("Bijgewerkt"))} />
        <Link to="/prullenbak" className="instelrij"><span className="rij-ic"><Icon naam="prullenbak" maat={18} /></span><span className="rij-t"><b>Prullenbak</b><span>{meervoud(s.prullenbak.length, "claim", "claims")}</span></span><Icon naam="verder" maat={16} /></Link>
        <Link to="/leveranciers" className="instelrij alleen-mobiel"><span className="rij-ic"><Icon naam="fabriek" maat={18} /></span><span className="rij-t"><b>Leveranciers</b><span>Cijfers per leverancier</span></span><Icon naam="verder" maat={16} /></Link>
      </Blok>

      <Blok titel="E-mailmeldingen" uitleg={s.inst.mail ? `Bij elke nieuwe claim, statuswijziging, notitie en nieuw account gaat er een mail naar ${CONFIG.MELDING_EMAIL || "niemand"}.` : "Staat uit: wat er moet gebeuren zie je in een pop-up zodra je de app opent."}>
        <label className="instelrij schakelrij">
          <span className="rij-ic"><Icon naam="mail" maat={18} /></span>
          <span className="rij-t"><b>Ook mailen</b><span>Uit: alleen de pop-up in de app. Aan: ook een mail bij een nieuwe claim en op maandag.</span></span>
          <input type="checkbox" role="switch" className="schakelaar" checked={s.inst.mail} disabled={uit}
            onChange={(e) => void s.bewaarInst({ ...s.inst, mail: e.target.checked })} />
        </label>
        {s.inst.mail && <>
        <div className={`mailstatus ${dienst === "resend" ? "ms-ok" : dienst === "formsubmit" ? "ms-reserve" : "ms-onbekend"}`}>
          <i />
          {dienst === "resend" ? <span><b>Verstuurd via Resend</b> — betrouwbare maildienst actief.</span>
            : dienst === "formsubmit" ? <span><b>Mail gaat via FormSubmit.</b> Eerste keer? Tik op <b>Testmail sturen</b> en klik in de mail van FormSubmit op <b>Activate Form</b> (kijk ook in de spam).</span>
            : dienst === null ? <span>Maildienst niet bereikbaar vanaf hier.</span> : <span>Maildienst controleren…</span>}
        </div>
        <Rij icoon="mail" titel="Testmail sturen" tekst={mailStatus || "Controleer of de meldingen aankomen"} onClick={testMail} />
        <label className="instelrij schakelrij">
          <span className="rij-ic"><Icon naam="agenda" maat={18} /></span>
          <span className="rij-t"><b>Weekoverzicht op maandag</b><span>Elke maandagochtend: wat open staat, wat over termijn is en waarvoor je informatie bij de VAM opvraagt.</span></span>
          <input type="checkbox" role="switch" className="schakelaar" checked={s.inst.weekmail} disabled={uit}
            onChange={(e) => void s.bewaarInst({ ...s.inst, weekmail: e.target.checked })} />
        </label>
        <label className="instelrij schakelrij">
          <span className="rij-ic"><Icon naam="klok" maat={18} /></span>
          <span className="rij-t"><b>Herinneringen per mail</b><span>Elke ochtend als er iets is: claims die bijna of vandaag over de termijn gaan, en leveranciers die 14 dagen niets lieten horen.</span></span>
          <input type="checkbox" role="switch" className="schakelaar" checked={s.inst.herinnermail} disabled={uit}
            onChange={(e) => void s.bewaarInst({ ...s.inst, herinnermail: e.target.checked })} />
        </label>
        <Rij icoon="bericht" titel="Weekoverzicht nu sturen" tekst={weekStatus || "Stuur de samenvatting van vandaag meteen"} onClick={stuurWeek} />
        {wachtrij > 0 && <Rij icoon="klok" titel={`${meervoud(wachtrij, "mail wacht", "mails wachten")} op verzending`} tekst="Worden automatisch opnieuw geprobeerd"
          onClick={async () => { const n = await verstuurWachtrij(); setWachtrij(wachtrijLengte()); toast(n ? `${n} verstuurd` : "Nog niet bereikbaar"); }} />}
        </>}
      </Blok>

      <form onSubmit={bewaarInst}>
        <Blok titel="Instellingen" uitleg={uit ? "Alleen een beheerder kan dit wijzigen." : "Gelden voor iedereen in de vestiging."}>
          <fieldset disabled={uit} className="velden">
            <label className="veld"><span className="veld-label">Vestiging</span><input value={i.vestiging} onChange={(e) => setI({ ...i, vestiging: e.target.value })} /></label>
            <label className="veld"><span className="veld-label">Termijn (dagen)</span><input type="number" min={1} value={i.dagen} onChange={(e) => setI({ ...i, dagen: Number(e.target.value) })} /></label>
            <label className="veld"><span className="veld-label">Maanddoel teruggehaald (€)</span><input type="number" min={100} step={100} inputMode="numeric" value={i.maanddoel} onChange={(e) => setI({ ...i, maanddoel: Number(e.target.value) })} />
              <span className="veld-hint">Het team ziet op Vandaag hoe ver jullie zijn; bij het halen volgt een felicitatie.</span></label>
            <label className="veld"><span className="veld-label">Leveranciers (één per regel)</span><textarea rows={6} value={levTekst} onChange={(e) => setLevTekst(e.target.value)} /></label>
            <label className="veld"><span className="veld-label">Altijd uitbesteed</span><textarea rows={6} value={uitTekst} onChange={(e) => setUitTekst(e.target.value)} /></label>
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
      <p className="hint mono">ClaimFlow Medipoint · {s.inst.vestiging}</p>
    </div>
  );
}

/** Colour scheme picker: applies straight away and is remembered on this device. */
function KleurKeus() {
  const [k, setK] = useState<Kleur>(leesKleur());
  const [w, setW] = useState<Weergave>(leesWeergave());
  return (
    <>
    <div className="segment weergave-keus" role="radiogroup" aria-label="Weergave">
      {([["licht", "☀ Licht"], ["donker", "☾ Donker"], ["auto", "◐ Automatisch"]] as const).map(([id, l]) => (
        <button key={id} type="button" role="radio" aria-checked={w === id} onClick={() => { zetWeergave(id); setW(id); }}>{l}</button>
      ))}
    </div>
    <div className="kleur-keus" role="group" aria-label="Kleurenschema">
      {KLEUREN.map((x) => (
        <button key={x.id} type="button" aria-pressed={k === x.id} onClick={() => { zetKleur(x.id); setK(x.id); }}>
          <i aria-hidden="true">{x.staal.map((c) => <b key={c} style={{ background: c }} />)}</i>
          {x.naam}
        </button>
      ))}
    </div>
    </>
  );
}
