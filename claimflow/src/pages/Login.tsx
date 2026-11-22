import { useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { aanmelden, herstelWachtwoord, login } from "../lib/api";
import { useStore } from "../state/Store";
import { Icon, type IconNaam } from "../components/Icon";
import { Logo } from "../components/ui";
import { LogoMerk } from "../components/LogoMerk";
import { Voorpagina } from "../components/Voorpagina";

const KENMERKEN: Array<[IconNaam, string]> = [
  ["klok", "42 dagen bewaakt"], ["camera", "LGAR scannen"], ["afbeelding", "Foto’s als bewijs"],
  ["lijst", "Takenlijst bij openen"], ["vink", "Vaste bedragen"], ["grafiek", "Rapportage per leverancier"],
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

type Stand = "inloggen" | "aanmelden" | "herstel";
const MIN = 8;
const KNOP: Record<Stand, string> = { inloggen: "Inloggen", aanmelden: "Account maken", herstel: "Wachtwoord opslaan" };

/** Rough strength hint for a new password; the server only enforces the minimum length. */
function sterkte(pw: string): { score: number; tekst: string } {
  if (!pw) return { score: 0, tekst: "" };
  let s = pw.length >= MIN ? 1 : 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return { score: s, tekst: pw.length < MIN ? `Nog ${MIN - pw.length} tekens` : ["Zwak", "Redelijk", "Goed", "Sterk", "Sterk"][s] };
}

function LoginFormulier() {
  const { naInloggen } = useStore();
  const [stand, setStand] = useState<Stand>("inloggen");
  const [naam, setNaam] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [zien, setZien] = useState(false);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [hoofdletters, setHoofdletters] = useState(false);
  const [schud, setSchud] = useState(0);
  const [wachtOp, setWachtOp] = useState("");
  const pwVeld = useRef<HTMLInputElement>(null);
  const nieuwWachtwoord = stand !== "inloggen";
  const st = sterkte(pw);

  const wissel = (s: Stand) => { setStand(s); setFout(""); setPw(""); setCode(""); setZien(false); };
  const mis = (tekst: string) => { setFout(tekst); setSchud((n) => n + 1); };

  const verstuur = async (e: FormEvent) => {
    e.preventDefault();
    if (naam.trim().length < 2) { mis("Vul je naam in."); return; }
    if (nieuwWachtwoord && !pw) { mis("Vul je wachtwoord in."); pwVeld.current?.focus(); return; }
    if (nieuwWachtwoord && pw.length < MIN) { mis(`Kies een wachtwoord van minstens ${MIN} tekens.`); pwVeld.current?.focus(); return; }
    if (!code) { mis("Vul de vestigingscode in."); return; }
    setBezig(true);
    try {
      const r = stand === "inloggen" ? await login(naam.trim(), code) : stand === "aanmelden" ? await aanmelden(naam.trim(), pw, code) : await herstelWachtwoord(naam.trim(), code, pw);
      if ("wacht" in r) { setBezig(false); setWachtOp(r.naam); setPw(""); setCode(""); return; }

      naInloggen(r);
    } catch (err) {
      setBezig(false);
      const m = err instanceof Error ? err.message : "";
      if (stand === "inloggen") setPw("");
      mis(m && !/^Fout \d/.test(m) && !/fetch|network/i.test(m) ? m : "Geen verbinding met het register. Controleer je internet en probeer het opnieuw.");
    }
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
        {wachtOp ? (
          <div className="toegang-kaart toegang-wacht" role="status">
            <span className="greep" aria-hidden="true" />
            <span className="wacht-ic"><Icon naam="klok" maat={26} /></span>
            <h2>Account aangemaakt</h2>
            <p>Bedankt, {wachtOp.split(" ")[0]}. Een beheerder krijgt een melding en moet je account nog goedkeuren. Daarna log je in met je naam en wachtwoord.</p>
            <button type="button" className="knop knop-zacht knop-vol" onClick={() => { setWachtOp(""); wissel("inloggen"); }}>Naar inloggen</button>
          </div>
        ) : (
        <form className={`toegang-kaart${schud ? " schud" : ""}`} key={`${stand}-${schud}`} onSubmit={verstuur} noValidate>
          <span className="greep" aria-hidden="true" />
          <div className="lg-kop"><span className="lg-merk" aria-hidden="true"><LogoMerk maat={64} /></span><b>ClaimFlow</b><h2>{stand === "aanmelden" ? "Account maken" : "Welkom terug!"}</h2><small>Log in om verder te gaan</small></div>
          <p className="toegang-uitleg">Vul je eigen naam in en de vestigingscode. Heb je nog geen account, dan maakt de app die nu voor je aan.</p>
          {stand === "herstel" && <p className="toegang-uitleg">Dit werkt nadat de beheerder een nieuw wachtwoord voor je heeft toegestaan in Beheer.</p>}

          <label className="veld">
            <span className="veld-label">Naam</span>
            <span className="lg-veld"><Icon naam="persoon" maat={18} /><input name="username" value={naam} onChange={(e) => { setNaam(e.target.value); setFout(""); }} autoComplete="username" autoCapitalize="words"
              placeholder={stand === "aanmelden" ? "Voor- en achternaam" : "Je naam"} enterKeyHint="next" maxLength={40} /></span>
          </label>
          {stand !== "inloggen" && (
          <label className="veld">
            <span className="veld-label">{nieuwWachtwoord ? "Kies een wachtwoord" : "Wachtwoord"}</span>
            <span className="met-na">
              <input ref={pwVeld} name="password" type={zien ? "text" : "password"} value={pw} enterKeyHint={nieuwWachtwoord ? "next" : "go"}
                onChange={(e) => { setPw(e.target.value); setFout(""); }} onKeyUp={kijkToetsen} onKeyDown={kijkToetsen}
                autoComplete={nieuwWachtwoord ? "new-password" : "current-password"} autoCapitalize="off" autoCorrect="off" spellCheck={false}
                aria-invalid={!!fout} aria-describedby={nieuwWachtwoord ? "pw-sterkte" : hoofdletters ? "pw-caps" : undefined} />
              <button type="button" className="oogknop" onClick={() => setZien(!zien)} aria-label={zien ? "Wachtwoord verbergen" : "Wachtwoord tonen"} aria-pressed={zien}>
                <Icon naam={zien ? "oogDicht" : "oog"} maat={20} />
              </button>
            </span>
            {nieuwWachtwoord && (
              <span className="sterkte" id="pw-sterkte" aria-live="polite">
                <span className="sterkte-balk" aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} className={pw.length >= MIN && st.score >= n ? `aan s${st.score}` : ""} />)}</span>
                <span>{st.tekst || `Minstens ${MIN} tekens`}</span>
              </span>
            )}
          </label>
          )}
          {(
            <label className="veld">
              <span className="veld-label">Vestigingscode</span>
              <span className="lg-veld"><Icon naam="slot" maat={18} /><input type="password" value={code} onChange={(e) => { setCode(e.target.value); setFout(""); }} autoComplete="off" autoCapitalize="off" autoCorrect="off"
                spellCheck={false} enterKeyHint="go" aria-describedby="code-uitleg" /></span>
              <span className="veld-hint" id="code-uitleg">De code van je vestiging. Vraag hem aan je werkvoorbereider.</span>
            </label>
          )}
          {hoofdletters && !fout && <p className="veld-hint" id="pw-caps"><Icon naam="waarschuwing" maat={14} /> Caps Lock staat aan</p>}
          {fout && <p className="veld-fout" role="alert">{fout}</p>}
          <button className="knop knop-rood knop-groot knop-vol" disabled={bezig}>
            {bezig ? <><span className="mini-spinner" aria-hidden="true" /> Even geduld…</> : <>{KNOP[stand]} <Icon naam="pijl" maat={18} /></>}
          </button>
          {stand === "herstel" && <button type="button" className="knop-link" onClick={() => wissel("inloggen")}>Terug naar inloggen</button>}
          <p className="toegang-tip"><Icon naam="slot" maat={14} /> Je blijft 30 dagen ingelogd op dit apparaat.</p>
          <p className="lg-voet">Nog geen account? <b>Vul je naam en de code in</b>, dan maken we er een.</p>
        </form>
        )}
      </div>
    </main>
  );
}

/** Start page before login (design "Element"); "Inloggen" opens the form. Remembered for this browser session. */
export function Login() {
  const [formulier, setFormulier] = useState(() => { return true });
  const open = () => { try { sessionStorage.setItem("claimflow-voorpagina", "gezien"); } catch { /* geen opslag */ } setFormulier(true); window.scrollTo(0, 0); };
  return formulier ? <LoginFormulier /> : <Voorpagina onInloggen={open} />;
}
