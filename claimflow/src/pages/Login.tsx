import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { aanmelden, herstelWachtwoord, login } from "../lib/api";
import { useStore } from "../state/Store";
import { Icon } from "../components/Icon";
import { LogoMerk } from "../components/LogoMerk";
import { BASIS } from "../lib/config";
import { Voorpagina } from "../components/Voorpagina";

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
    <main className="lg2">
      <div className="lg2-aurora" aria-hidden="true" />
      <div className="lg2-korrel" aria-hidden="true" />
      <div className="lg2-wrap">
        <header className="lg2-nav">
          <span className="lg2-logo"><LogoMerk maat={30} />ClaimFlow</span>
          <a className="lg2-navlink" href={`${BASIS}site/`}>Over ClaimFlow</a>
        </header>

        <div className="lg2-raster">
          <section className="lg2-held" aria-label="Over ClaimFlow">
            <span className="lg2-ey">Medipoint Meppel · Garantieclaims</span>
            <h1>Wat kapot gaat, <span className="lg2-glans">komt terug.</span></h1>
            <p className="lg2-lead">ClaimFlow bewaakt elke garantietermijn en leest je LGAR-bon in seconden in. Jij dient in, de app onthoudt de rest.</p>
            <p className="lg2-print"><span>42 dagen bewaakt</span><span>LGAR scannen</span><span>Rapportage per leverancier</span></p>
            <div className="lg2-demo" aria-hidden="true">
              <span className="lg2-demo-ring"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="30" className="b" /><circle cx="38" cy="38" r="30" className="v" pathLength="100" transform="rotate(-90 38 38)" /></svg></span>
              <span className="lg2-demo-t"><b>Speling kolom 700E</b><small>Eureva · ink 2455457</small></span>
              <span className="lg2-demo-st"><i className="in">Ingediend</i><i className="ok">Gehonoreerd ✓</i></span>
            </div>
          </section>

          {wachtOp ? (
            <div className="lg2-kaart" role="status">
              <span className="lg2-wacht"><Icon naam="klok" maat={26} /></span>
              <h2>Account aangemaakt</h2>
              <p className="lg2-uitleg">Bedankt, {wachtOp.split(" ")[0]}. Een beheerder krijgt een melding en moet je account nog goedkeuren. Daarna log je in met je naam en wachtwoord.</p>
              <button type="button" className="lg2-knop glas" onClick={() => { setWachtOp(""); wissel("inloggen"); }}>Naar inloggen</button>
            </div>
          ) : (
          <form className={`lg2-kaart${schud ? " schud" : ""}`} key={`${stand}-${schud}`} onSubmit={verstuur} noValidate>
            <span className="lg2-ey">{stand === "aanmelden" ? "Nieuw account" : stand === "herstel" ? "Wachtwoord" : "Welkom terug"}</span>
            <h2>{stand === "aanmelden" ? "Account maken" : stand === "herstel" ? "Nieuw wachtwoord" : "Inloggen"}</h2>
            <p className="lg2-uitleg">{stand === "herstel" ? "Dit werkt nadat de beheerder een nieuw wachtwoord voor je heeft toegestaan in Beheer." : "Vul je eigen naam in en de vestigingscode. Heb je nog geen account, dan maakt de app die nu voor je aan."}</p>

            <label className="lg2-veld">
              <span>Naam</span>
              <span className="lg2-in"><Icon naam="persoon" maat={18} /><input name="username" value={naam} onChange={(e) => { setNaam(e.target.value); setFout(""); }} autoComplete="username" autoCapitalize="words"
                placeholder={stand === "aanmelden" ? "Voor- en achternaam" : "Je naam"} enterKeyHint="next" maxLength={40} /></span>
            </label>
            {stand !== "inloggen" && (
            <label className="lg2-veld">
              <span>{nieuwWachtwoord ? "Kies een wachtwoord" : "Wachtwoord"}</span>
              <span className="lg2-in"><Icon naam="slot" maat={18} />
                <input ref={pwVeld} name="password" type={zien ? "text" : "password"} value={pw} enterKeyHint={nieuwWachtwoord ? "next" : "go"}
                  onChange={(e) => { setPw(e.target.value); setFout(""); }} onKeyUp={kijkToetsen} onKeyDown={kijkToetsen}
                  autoComplete={nieuwWachtwoord ? "new-password" : "current-password"} autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  aria-invalid={!!fout} aria-describedby={nieuwWachtwoord ? "pw-sterkte" : hoofdletters ? "pw-caps" : undefined} />
                <button type="button" className="lg2-oog" onClick={() => setZien(!zien)} aria-label={zien ? "Wachtwoord verbergen" : "Wachtwoord tonen"} aria-pressed={zien}>
                  <Icon naam={zien ? "oogDicht" : "oog"} maat={19} />
                </button>
              </span>
              {nieuwWachtwoord && (
                <span className="lg2-sterkte" id="pw-sterkte" aria-live="polite">
                  <span aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} className={pw.length >= MIN && st.score >= n ? `aan s${st.score}` : ""} />)}</span>
                  <small>{st.tekst || `Minstens ${MIN} tekens`}</small>
                </span>
              )}
            </label>
            )}
            <label className="lg2-veld">
              <span>Vestigingscode</span>
              <span className="lg2-in"><Icon naam="slot" maat={18} /><input type="password" value={code} onChange={(e) => { setCode(e.target.value); setFout(""); }} autoComplete="off" autoCapitalize="off" autoCorrect="off"
                spellCheck={false} enterKeyHint="go" aria-describedby="code-uitleg" /></span>
              <small className="lg2-hint" id="code-uitleg">De code van je vestiging. Vraag hem aan je werkvoorbereider.</small>
            </label>
            {hoofdletters && !fout && <p className="lg2-hint" id="pw-caps"><Icon naam="waarschuwing" maat={14} /> Caps Lock staat aan</p>}
            {fout && <p className="lg2-fout" role="alert">{fout}</p>}
            <button className="lg2-knop rood" disabled={bezig}>
              {bezig ? <><span className="mini-spinner" aria-hidden="true" /> Even geduld…</> : <>{KNOP[stand]} <Icon naam="pijl" maat={18} /></>}
            </button>
            {stand === "herstel" && <button type="button" className="lg2-link" onClick={() => wissel("inloggen")}>Terug naar inloggen</button>}
            <p className="lg2-tip"><Icon naam="slot" maat={14} /> Je blijft 30 dagen ingelogd op dit apparaat.</p>
          </form>
          )}
        </div>
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
