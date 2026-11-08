import { useState, type FormEvent } from "react";
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

  const verstuur = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw) { setFout("Vul het wachtwoord in."); return; }
    setBezig(true);
    const ok = await login(pw);
    setBezig(false);
    if (!ok) { setFout("Dat wachtwoord klopt niet."); setPw(""); return; }
    if (wie.trim()) setNaam(wie.trim());
  };

  return (
    <main className="toegang">
      <div className="toegang-band">
        <Logo />
        <h1>Elke claim terug.<br /><span>Op tijd.</span></h1>
        <p>Het garantieregister van Medipoint Meppel.</p>
      </div>
      <form className="toegang-kaart" onSubmit={verstuur} noValidate>
        <h2>Inloggen</h2>
        <p className="t-zacht">Gebruik het wachtwoord van de vestiging.</p>
        <label className="veld">
          <span className="veld-label">Je naam</span>
          <input value={wie} onChange={(e) => setWie(e.target.value)} autoComplete="name" placeholder="Komt in de tijdlijn bij je wijzigingen" />
        </label>
        <label className="veld">
          <span className="veld-label">Wachtwoord</span>
          <div className="met-na">
            <input type={zien ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setFout(""); }} autoComplete="current-password" autoFocus
              aria-invalid={!!fout} aria-describedby={fout ? "pw-fout" : undefined} />
            <button type="button" onClick={() => setZien(!zien)}>{zien ? "Verberg" : "Toon"}</button>
          </div>
        </label>
        {fout && <p className="veld-fout" id="pw-fout" role="alert">{fout}</p>}
        <button className="knop knop-rood knop-groot knop-vol" disabled={bezig}>{bezig ? "Controleren…" : "Open het register"} <Icon naam="pijl" maat={18} /></button>
        <p className="toegang-tip"><Icon naam="slot" maat={14} /> Je blijft ingelogd op dit apparaat tot je uitlogt.</p>
      </form>
    </main>
  );
}
