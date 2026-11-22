import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { geenBedrag, isOpen, metRegel, titelVan } from "../lib/claims";
import { datum, euroKort, meervoud } from "../lib/format";
import { GROEP, laterDatum, laterTekst, VAM_GEVRAAGD, WEER_OPGEPAKT, werkbak, type Bak, type Taak } from "../lib/werkbak";
import { Icon } from "../components/Icon";
import { Leeg, Sheet } from "../components/ui";
import { TeamKaart, TotaalKaart, UitbesteedKaart } from "../components/Team";
import { EcoDashboard } from "../components/Eco";

const BAKKEN: Array<{ id: Bak; label: string }> = [{ id: "nu", label: "Nu doen" }, { id: "week", label: "Deze week" }, { id: "wacht", label: "Wacht op lev." }];
const CHIP: Record<Taak["reden"], { toon: string; tekst: string }> = {
  termijn: { toon: "chip-rood", tekst: "VAM vragen" }, inkoop: { toon: "chip-oker", tekst: "Aanvullen" }, indienen: { toon: "chip-oker", tekst: "Indienen" },
  bijna: { toon: "chip-oker", tekst: "Opvolgen" }, vam: { toon: "chip-grijs", tekst: "Wacht op VAM" }, antwoord: { toon: "chip-turk", tekst: "Wacht op lev." }, later: { toon: "chip-grijs", tekst: "Later" },
};

/** Start screen: everything that needs doing, each task with the button that does it. */
export function Werkbak() {
  const { actief, inst, magBewerken, bewaar, zetStatus, naam } = useStore();
  const [bak, setBak] = useState<Bak>("nu");
  const [inkoop, setInkoop] = useState<Claim | null>(null);
  const [nummer, setNummer] = useState("");
  const [bezig, setBezig] = useState("");
  const taken = useMemo(() => werkbak(actief, inst.dagen), [actief, inst.dagen]);
  const tel = (b: Bak) => taken.filter((t) => t.bak === b).length;
  const [zoek, setZoek] = useState("");
  const zoekt = zoek.trim().toLowerCase();
  const lijst = taken.filter((t) => t.bak === bak && (!zoekt || [titelVan(t.claim), t.claim.leverancier, t.claim.inkoopnummer, t.claim.nummer, t.claim.onderdeel]
    .some((v) => (v || "").toLowerCase().includes(zoekt))));
  const groepen = lijst.reduce<Array<{ reden: Taak["reden"]; taken: Taak[] }>>((acc, t) => {
    const g = acc.find((x) => x.reden === t.reden);
    if (g) g.taken.push(t); else acc.push({ reden: t.reden, taken: [t] });
    return acc;
  }, []);

  const notitie = async (c: Claim, tekst: string, melding: string) => {
    setBezig(c.id);
    await bewaar([metRegel(c, tekst, naam)], melding, [c]);
    setBezig("");
  };
  const status = async (c: Claim, naar: "ingediend" | "gehonoreerd") => { setBezig(c.id); await zetStatus([c.id], naar); setBezig(""); };
  const bewaarInkoop = async () => {
    if (!inkoop || !nummer.trim()) return;
    const c = inkoop;
    setBezig(c.id); setInkoop(null);
    await bewaar([metRegel({ ...c, inkoopnummer: nummer.trim() }, `Bewerkt: inkoopnummer ${nummer.trim()}`, naam)], "Inkoopnummer opgeslagen", [c]);
    setBezig(""); setNummer("");
  };

  const acties = (t: Taak) => {
    const c = t.claim, uit = bezig === c.id;
    const later = <button type="button" className="knopje knopje-z" disabled={uit} onClick={() => notitie(c, laterTekst(laterDatum()), `${titelVan(c)} een week opgeschoven`)}>Later</button>;
    const notitieKnop = <Link to={`/claims/${c.id}?notitie=1`} className="knopje knopje-z">Notitie</Link>;
    switch (t.reden) {
      case "termijn": case "bijna":
        return <><button type="button" className="knopje" disabled={uit} onClick={() => notitie(c, VAM_GEVRAAGD, "VAM gevraagd: claim staat bij Wacht")}><Icon naam="vink" maat={14} /> VAM gevraagd</button>{notitieKnop}{later}</>;
      case "inkoop":
        return <><button type="button" className="knopje" disabled={uit} onClick={() => { setNummer(""); setInkoop(c); }}>Inkoopnr invullen</button>{notitieKnop}{later}</>;
      case "indienen":
        return <><button type="button" className="knopje" disabled={uit} onClick={() => status(c, "ingediend")}><Icon naam="upload" maat={14} /> Indienen</button>{notitieKnop}{later}</>;
      default:
        return <><button type="button" className="knopje knopje-turk" disabled={uit} onClick={() => status(c, "gehonoreerd")}><Icon naam="vink" maat={14} /> Gehonoreerd</button>{notitieKnop}
          <button type="button" className="knopje knopje-z" disabled={uit} onClick={() => notitie(c, WEER_OPGEPAKT, `${titelVan(c)} staat weer in de Werkbalk`)}>Weer oppakken</button></>;
    }
  };

  // Summary for the welcome card: open claims, money still to come back, the most urgent task.
  const open = actief.filter((c) => isOpen(c) && !c.uitbesteed);
  const nogTerug = open.reduce((s, c) => s + (Number(c.bedrag) || 0), 0);
  const laat = taken.filter((t) => t.reden === "termijn");
  const dringend = taken.find((t) => t.bak === "nu");
  const uur = new Date().getHours();
  const groet = uur < 6 ? "Goedenacht" : uur < 12 ? "Goedemorgen" : uur < 18 ? "Goedemiddag" : "Goedenavond";
  const [zoekOpen, setZoekOpen] = useState(false);
  const overDagen = (t: Taak) => (t.reden === "termijn" && t.dagen != null ? `+${t.dagen - inst.dagen} d` : t.dagen != null ? `${t.dagen} d` : "");

  return (
    <div className="werkbak wb">
      {/* quick actions first on the phone; hidden on the computer, where the sidebar has them */}
      <nav className="wb-snel" aria-label="Snel naar">
        {magBewerken && <Link to="/nieuw?bron=camera"><i className="sn-1"><Icon naam="camera" maat={24} /></i>Scan LGAR</Link>}
        <Link to="/leveranciers"><i className="sn-2"><Icon naam="fabriek" maat={24} /></i>Leveranciers</Link>
        <button type="button" onClick={() => setZoekOpen((z) => !z)} aria-expanded={zoekOpen}><i className="sn-3"><Icon naam="zoek" maat={24} /></i>Zoeken</button>
        <Link to="/rapportage"><i className="sn-4"><Icon naam="grafiek" maat={24} /></i>Rapportage</Link>
      </nav>
      <EcoDashboard />
      <header className="wb-held">
        <div className="wb-held-top">
          <div>
            <p className="wb-groet">{groet}{naam ? `, ${naam.split(" ")[0]}` : ""} 👋</p>
            <h1 className="wb-merk">ClaimFlow</h1>
          </div>
          <Link to="/beheer" className="wb-bel" aria-label="Meldingen en instellingen"><Icon naam="bericht" maat={22} /></Link>
        </div>
        <p className="wb-samen">{meervoud(open.length, "open claim", "open claims")} · {euroKort(nogTerug)} nog terug te halen</p>
        <p className="wb-groot">
          <b>{laat.length || tel("nu")}</b>
          <span>{laat.length ? "over termijn" : tel("nu") === 1 ? "taak voor nu" : "taken voor nu"}</span>
        </p>
        {dringend ? (
          <Link to={`/claims/${dringend.claim.id}`} className="wb-dringend">
            <span><b>{titelVan(dringend.claim)}</b><small>{[dringend.claim.leverancier, CHIP[dringend.reden].tekst].filter(Boolean).join(" · ")}</small></span>
            <em className={dringend.reden === "termijn" ? "laat" : undefined}>{overDagen(dringend)}</em>
          </Link>
        ) : <p className="wb-dringend wb-rustig"><span><b>Alles bij</b><small>Er staat nu niets open dat moet.</small></span></p>}
      </header>


      {(zoekOpen || zoek) && (
        <label className="wb-zoek">
          <Icon naam="zoek" maat={18} />
          <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op onderdeel, leverancier of inkoopnummer" aria-label="Zoeken in de Werkbalk" autoFocus />
        </label>
      )}

      <div className="wb-chips" role="tablist" aria-label="Werkbalk">
        {BAKKEN.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={bak === b.id} className={`wb-chip${bak === b.id ? " aan" : ""}`} onClick={() => setBak(b.id)}>
            {b.label}<span>{tel(b.id)}</span>
          </button>
        ))}
      </div>

      <div className="wb-lijst" key={bak}>
        {lijst.length === 0 ? (
          <Leeg icoon={bak === "nu" ? <Icon naam="vink" maat={34} /> : undefined} titel={bak === "nu" ? "Werkbalk leeg" : bak === "week" ? "Niets voor deze week" : "Nergens op wachten"}
            tekst={bak === "nu" ? "Alles wat nu moest, is gedaan. Mooi werk." : undefined} />
        ) : groepen.map((g) => (
          <section key={g.reden} aria-labelledby={`groep-${g.reden}`}>
            <h2 className="wb-kop" id={`groep-${g.reden}`}>{GROEP[g.reden]}<span>{g.taken.length}</span></h2>
            <ul className="wb-kaarten">
              {g.taken.map((t) => (
                <li key={t.claim.id} className={`wb-kaart${t.reden === "termijn" ? " laat" : ""}`}>
                  <Link to={`/claims/${t.claim.id}`} className="wb-kaart-boven">
                    <span className="wb-ic" aria-hidden="true"><Icon naam="document" maat={22} /></span>
                    <span className="wb-kaart-t">
                      <b>{titelVan(t.claim)}</b>
                      <span>{[t.claim.leverancier, t.claim.onderdeel && t.claim.onderdeel !== titelVan(t.claim) ? t.claim.onderdeel : "", t.claim.inkoopnummer && `ink ${t.claim.inkoopnummer}`].filter(Boolean).join(" · ")}</span>
                      <span className="wb-rij"><i className={`wb-pil ${CHIP[t.reden].toon}`}>{CHIP[t.reden].tekst}</i>{t.sinds ? `${t.tekst} · ${datum(t.sinds)}` : t.tekst}</span>
                    </span>
                    {!geenBedrag(t.claim) && <span className="wb-bedrag">{euroKort(t.claim.bedrag)}</span>}
                  </Link>
                  {magBewerken && <div className="werktaak-acties wb-acties">{acties(t)}</div>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {taken.length > 0 && <p className="hint">{meervoud(taken.length, "taak", "taken")} in totaal · claims binnen de termijn staan in <Link to="/claims">Claims</Link></p>}
      </div>

      <section className="wb-maand" aria-label="Deze maand">
        <h2 className="wb-kop">Deze maand</h2>
        <div className="werkbak-doel"><TotaalKaart /><UitbesteedKaart /><TeamKaart /></div>
      </section>

      <Sheet titel="Inkoopnummer invullen" open={!!inkoop} sluit={() => setInkoop(null)}
        voet={<><button type="button" className="knop knop-zacht" onClick={() => setInkoop(null)}>Annuleren</button>
          <button type="button" className="knop knop-rood" disabled={!nummer.trim() || !!bezig} onClick={bewaarInkoop}>Opslaan</button></>}>
        {inkoop && <p className="t-zacht"><b>{titelVan(inkoop)}</b> · {inkoop.leverancier}</p>}
        <label className="veld"><span className="veld-label">Inkoopnummer</span>
          <input className="mono" inputMode="numeric" value={nummer} onChange={(e) => setNummer(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void bewaarInkoop(); }} autoFocus /></label>
      </Sheet>
    </div>
  );
}
