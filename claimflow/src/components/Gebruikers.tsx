import { useEffect, useState, type FormEvent } from "react";
import { haalGebruikers, wijzigGebruiker, wijzigWachtwoord, type Account } from "../lib/api";
import { datum } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

/** Change your own password. The current one is checked on the server; the new one is never shown anywhere. */
export function WachtwoordWijzigen() {
  const { naInloggen, naam } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [oud, setOud] = useState("");
  const [nieuw, setNieuw] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  const sluit = () => { setOpen(false); setOud(""); setNieuw(""); setFout(""); };
  const opslaan = async (e: FormEvent) => {
    e.preventDefault();
    if (nieuw.length < 8) { setFout("Kies een wachtwoord van minstens 8 tekens."); return; }
    setBezig(true);
    try { naInloggen(await wijzigWachtwoord(oud, nieuw)); toast("Wachtwoord gewijzigd. Je andere apparaten zijn uitgelogd."); sluit(); }
    catch (err) { setFout(err instanceof Error ? err.message : "Wijzigen mislukt"); }
    setBezig(false);
  };

  return (
    <>
      <button type="button" className="instelrij" onClick={() => setOpen(true)}>
        <span className="rij-ic"><Icon naam="slot" maat={18} /></span>
        <span className="rij-t"><b>Wachtwoord wijzigen</b><span>Je wordt dan op je andere apparaten uitgelogd.</span></span>
        <Icon naam="verder" maat={16} />
      </button>
      <Sheet titel="Wachtwoord wijzigen" open={open} sluit={sluit}>
        <form className="formulier-los" onSubmit={opslaan}>
          <input type="text" name="username" autoComplete="username" value={naam} readOnly hidden />
          <label className="veld"><span className="veld-label">Huidig wachtwoord</span>
            <input type="password" value={oud} onChange={(e) => { setOud(e.target.value); setFout(""); }} autoComplete="current-password" /></label>
          <label className="veld"><span className="veld-label">Nieuw wachtwoord</span>
            <input type="password" value={nieuw} onChange={(e) => { setNieuw(e.target.value); setFout(""); }} autoComplete="new-password" />
            <span className="veld-hint">Minstens 8 tekens.</span></label>
          {fout && <p className="veld-fout" role="alert">{fout}</p>}
          <div className="formulier-voet">
            <button type="button" className="knop knop-zacht" onClick={sluit}>Annuleren</button>
            <button className="knop knop-rood" disabled={bezig || !oud || !nieuw}>{bezig ? "Opslaan…" : "Opslaan"}</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}

const ACTIE_TEKST = {
  reset: { titel: "Nieuw wachtwoord toestaan?", tekst: "wordt uitgelogd. Daarna kan die op het inlogscherm via ‘Wachtwoord vergeten?’ met de vestigingscode zelf een nieuw wachtwoord kiezen.", knop: "Toestaan" },
  blokkeer: { titel: "Account blokkeren?", tekst: "wordt meteen uitgelogd en kan niet meer inloggen tot je het account weer opent.", knop: "Blokkeren" },
  verwijder: { titel: "Account verwijderen?", tekst: "wordt uitgelogd en het account verdwijnt. De claims en de tijdlijn blijven gewoon staan.", knop: "Verwijderen" },
} as const;
type Bevestig = { account: Account; wat: keyof typeof ACTIE_TEKST };

/** Accounts overview for administrators. Passwords are never shown: there is nothing to show. */
export function Gebruikers() {
  const toast = useToast();
  const [lijst, setLijst] = useState<Account[] | null>(null);
  const [fout, setFout] = useState("");
  const [bevestig, setBevestig] = useState<Bevestig | null>(null);
  const [bezig, setBezig] = useState(false);

  const laad = () => haalGebruikers().then((l) => { setLijst(l); setFout(""); }).catch(() => { setLijst([]); setFout("Accounts konden niet worden opgehaald."); });
  useEffect(() => { void laad(); }, []);

  const doe = async (a: Account, wat: "rol" | "activeer" | "blokkeer" | "reset" | "verwijder", rol?: Account["rol"]) => {
    setBezig(true);
    try {
      await wijzigGebruiker(a.sleutel, wat, rol);
      toast({ rol: `${a.naam} kan nu ${rol === "beheer" ? "wijzigen" : "alleen kijken"}`, activeer: `${a.naam} kan weer inloggen`, blokkeer: `${a.naam} is geblokkeerd`, reset: `${a.naam} kan een nieuw wachtwoord kiezen`, verwijder: `Account van ${a.naam} verwijderd` }[wat]);
      setBevestig(null);
      await laad();
    } catch (e) { toast(e instanceof Error ? e.message : "Dat lukte niet"); }
    setBezig(false);
  };

  return (
    <>
      <p className="t-zacht gebruikers-uitleg">Iedereen maakt zelf een account met de vestigingscode. Wachtwoorden worden versleuteld opgeslagen: niemand kan ze zien, ook jij niet.</p>
      {fout && <p className="veld-fout">{fout}</p>}
      {lijst === null ? <p className="t-zacht">Laden…</p> : (
        <ul className="gebruikers">
          {lijst.map((a) => (
            <li key={a.sleutel} className={a.actief ? undefined : "geblokkeerd"}>
              <span className="avatar-klein" aria-hidden="true">{a.naam.split(/\s+/).map((d) => d[0]).join("").slice(0, 2).toUpperCase()}</span>
              <span className="rij-t">
                <b>{a.naam}{a.ikzelf && <span className="chip chip-grijs">jij</span>}{!a.actief && <span className="chip chip-rood">geblokkeerd</span>}{a.reset && <span className="chip chip-oker">mag nieuw wachtwoord kiezen</span>}</b>
                <span>{a.laatst ? `Laatst ingelogd ${datum(a.laatst)}` : `Aangemaakt ${datum(a.gemaakt)}`}</span>
              </span>
              <select aria-label={`Rechten van ${a.naam}`} value={a.rol} disabled={bezig} onChange={(e) => doe(a, "rol", e.target.value as Account["rol"])}>
                <option value="beheer">Wijzigen</option>
                <option value="kijken">Alleen kijken</option>
              </select>
              {!a.ikzelf && (
                <span className="gebruiker-acties">
                  <button type="button" className="icoonknop" title="Nieuw wachtwoord toestaan" aria-label={`Nieuw wachtwoord toestaan voor ${a.naam}`} disabled={bezig} onClick={() => setBevestig({ account: a, wat: "reset" })}><Icon naam="slot" maat={16} /></button>
                  {a.actief
                    ? <button type="button" className="icoonknop" title="Blokkeren" aria-label={`${a.naam} blokkeren`} disabled={bezig} onClick={() => setBevestig({ account: a, wat: "blokkeer" })}><Icon naam="kruis" maat={16} /></button>
                    : <button type="button" className="icoonknop" title="Weer openen" aria-label={`${a.naam} weer openen`} disabled={bezig} onClick={() => doe(a, "activeer")}><Icon naam="ongedaan" maat={16} /></button>}
                  <button type="button" className="icoonknop icoonknop-rood" title="Verwijderen" aria-label={`Account van ${a.naam} verwijderen`} disabled={bezig} onClick={() => setBevestig({ account: a, wat: "verwijder" })}><Icon naam="prullenbak" maat={16} /></button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Sheet titel={bevestig ? ACTIE_TEKST[bevestig.wat].titel : ""} open={!!bevestig} sluit={() => setBevestig(null)}
        voet={bevestig && <>
          <button type="button" className="knop knop-zacht" onClick={() => setBevestig(null)}>Annuleren</button>
          <button type="button" className="knop knop-rood" disabled={bezig} onClick={() => doe(bevestig.account, bevestig.wat)}>{ACTIE_TEKST[bevestig.wat].knop}</button>
        </>}>
        {bevestig && <p><b>{bevestig.account.naam}</b> {ACTIE_TEKST[bevestig.wat].tekst}</p>}
      </Sheet>
    </>
  );
}
