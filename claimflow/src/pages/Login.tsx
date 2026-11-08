import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useStore } from "../state/Store";
import { Icon } from "../components/Icon";
import { Logo } from "../components/ui";

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
        <div className="toegang-ringen" aria-hidden="true"><i /><i /><i /></div>
        <div className="toegang-band-binnen">
          <Logo />
          <div className="toegang-slogan">
            <h1>Wat kapot gaat,<br /><span>komt terug.</span></h1>
            <p>Garantieclaims van Medipoint Meppel, van melding tot creditnota.</p>
          </div>
          <ul className="toegang-kenmerken" aria-label="Wat ClaimFlow doet">
            <li><Icon naam="klok" maat={15} /> 42 dagen bewaakt</li>
            <li><Icon naam="camera" maat={15} /> LGAR scannen</li>
            <li><Icon naam="mail" maat={15} /> Weekoverzicht</li>
          </ul>
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
            <span className="veld-label">Wachtwoord van de vestiging</span>
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
