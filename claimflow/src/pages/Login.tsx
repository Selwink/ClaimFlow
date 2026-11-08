import { useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { useStore } from "../state/Store";
import { Icon, type IconNaam } from "../components/Icon";
import { Logo } from "../components/ui";

const KENMERKEN: Array<[IconNaam, string]> = [
  ["klok", "42 dagen bewaakt"], ["camera", "LGAR scannen"], ["afbeelding", "Foto’s als bewijs"],
  ["mail", "Weekoverzicht op maandag"], ["vink", "Vaste bedragen"], ["grafiek", "Rapportage per leverancier"],
];

/** Looping example claim (desktop only): the term ring fills, then the status flips to honoured. No amounts. */
function DemoClaim() {
  return (
    <div className="demo-claim" aria-hidden="true">
      <svg viewBox="0 0 76 76" className="demo-ring"><circle cx="38" cy="38" r="30" className="dr-bodem" /><circle cx="38" cy="38" r="30" className="dr-boog" pathLength="100" transform="rotate(-90 38 38)" /></svg>
      <div className="demo-t"><b>Speling kolom 700E</b><span>Eureva · ink 2455457</span></div>
      <span className="demo-status"><span className="ds-in">Ingediend</span><span className="ds-ok">Gehonoreerd ✓</span></span>
    </div>
  );
}

export function Login() {
  const { login, naam, setNaam } = useStore();
  const [pw, setPw] = useState("");
  const [wie, setWie] = useState(naam);
  const [zien, setZien] = useState(false);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [hoofdletters, setHoofdletters] = useState(false);
  const [schud, setSchud] = useState(0);
  const pwVeld = useRef<HTMLInputElement>(null);

  const mis = (tekst: string) => { setFout(tekst); setSchud((n) => n + 1); pwVeld.current?.focus(); };

  const verstuur = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw) { mis("Vul het wachtwoord in."); return; }
    setBezig(true);
    let ok = false;
    try { ok = await login(pw); }
    catch (err) {
      setBezig(false);
      mis(err instanceof Error && /TOKEN_GEHEIM/.test(err.message) ? err.message : "Geen verbinding met het register. Controleer je internet en probeer het opnieuw.");
      return;
    }
    setBezig(false);
    if (!ok) { setPw(""); mis("Dat wachtwoord klopt niet."); return; }
    if (wie.trim()) setNaam(wie.trim());
  };
  const kijkToetsen = (e: KeyboardEvent<HTMLInputElement>) => setHoofdletters(e.getModifierState?.("CapsLock") ?? false);

  return (
    <main className="toegang">
      <div className="toegang-band">
        <div className="toegang-gloed" aria-hidden="true"><i /><i /><i /></div>
        <div className="toegang-ringen" aria-hidden="true"><i /><i /><i /></div>
        <div className="toegang-band-binnen">
          <Logo />
          <div className="toegang-slogan">
            <h1 aria-label="Wat kapot gaat, komt terug.">
              <span className="sl-regel" aria-hidden="true">Wat <span className="kapot">{"kapot".split("").map((l, i) => <i key={i} style={{ "--i": i } as CSSProperties}>{l}</i>)}</span> gaat,</span>
              <span className="sl-terug" aria-hidden="true">komt terug.</span>
            </h1>
            <p>Garantieclaims van Medipoint Meppel.</p>
          </div>
          <div className="toegang-band-kenmerken" aria-label="Wat ClaimFlow doet">
            <ul className="kenmerken-loop">
              {[0, 1].map((rij) => KENMERKEN.map(([icoon, tekst]) => (
                <li key={`${rij}-${tekst}`} aria-hidden={rij === 1 || undefined}><Icon naam={icoon} maat={15} /> {tekst}</li>
              )))}
            </ul>
          </div>
          <DemoClaim />
        </div>
      </div>
      <div className="toegang-plek">
        <form className={`toegang-kaart${schud ? " schud" : ""}`} key={schud} onSubmit={verstuur} noValidate>
          <span className="greep" aria-hidden="true" />
          <h2>Inloggen</h2>
          {/* name + password let iPhone and browser password managers save the login and fill it with Face ID */}
          <label className="veld">
            <span className="veld-label">Je naam</span>
            <input name="username" value={wie} onChange={(e) => setWie(e.target.value)} autoComplete="username" autoCapitalize="words"
              placeholder="Komt in de tijdlijn bij je wijzigingen" enterKeyHint="next" />
          </label>
          <label className="veld">
            <span className="veld-label">Wachtwoord</span>
            <span className="met-na">
              <input ref={pwVeld} name="password" type={zien ? "text" : "password"} value={pw} enterKeyHint="go"
                onChange={(e) => { setPw(e.target.value); setFout(""); }} onKeyUp={kijkToetsen} onKeyDown={kijkToetsen}
                autoComplete="current-password" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                aria-invalid={!!fout} aria-describedby={fout ? "pw-fout" : hoofdletters ? "pw-caps" : undefined} />
              <button type="button" className="oogknop" onClick={() => setZien(!zien)} aria-label={zien ? "Wachtwoord verbergen" : "Wachtwoord tonen"} aria-pressed={zien}>
                <Icon naam={zien ? "oogDicht" : "oog"} maat={20} />
              </button>
            </span>
          </label>
          {hoofdletters && !fout && <p className="veld-hint" id="pw-caps"><Icon naam="waarschuwing" maat={14} /> Caps Lock staat aan</p>}
          {fout && <p className="veld-fout" id="pw-fout" role="alert">{fout}</p>}
          <button className="knop knop-rood knop-groot knop-vol" disabled={bezig}>
            {bezig ? <><span className="mini-spinner" aria-hidden="true" /> Controleren…</> : <>Open het register <Icon naam="pijl" maat={18} /></>}
          </button>
          <p className="toegang-tip"><Icon naam="slot" maat={14} /> Je blijft 30 dagen ingelogd op dit apparaat.</p>
        </form>
      </div>
    </main>
  );
}
