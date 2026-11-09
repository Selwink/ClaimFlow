import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { metRegel, titelVan } from "../lib/claims";
import { datum, meervoud } from "../lib/format";
import { GROEP, laterDatum, laterTekst, VAM_GEVRAAGD, WEER_OPGEPAKT, werkbak, type Bak, type Taak } from "../lib/werkbak";
import { Icon } from "../components/Icon";
import { Leeg, Sheet } from "../components/ui";
import { TeamKaart, TotaalKaart, UitbesteedKaart } from "../components/Team";

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

  return (
    <div className="werkbak">
      <header className="werkbak-kop">
        <div className="werkbak-kop-binnen">
          <div className="werkbak-titel">
            <div>
              <h1>Werkbalk</h1>
              <p className="werkbak-slogan" aria-label="Wat kapot gaat, komt terug.">
                <span aria-hidden="true">Wat <span className="kapot">{"kapot".split("").map((l, i) => <i key={i}>{l}</i>)}</span> gaat, </span>
                <span className="sl-terug" aria-hidden="true">komt terug.</span>
              </p>
            </div>
            {magBewerken && <Link to="/nieuw" className="knop knop-rood knop-klein alleen-desktop"><Icon naam="plus" maat={16} /> Nieuwe claim</Link>}
          </div>
          <label className="werkbak-zoek">
            <Icon naam="lijst" maat={16} />
            <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op onderdeel, leverancier of inkoopnummer" aria-label="Zoeken in de Werkbalk" />
          </label>
          <div className="werkbak-tabs" role="tablist" aria-label="Werkbalk">
            {BAKKEN.map((b) => (
              <button key={b.id} type="button" role="tab" aria-selected={bak === b.id} onClick={() => setBak(b.id)}>
                <b className={b.id === "nu" && tel("nu") ? "rood" : undefined}>{tel(b.id)}</b>{b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="werkbak-inhoud">
        <div className="werkbak-doel"><TotaalKaart /><UitbesteedKaart /><TeamKaart /></div>
        <div className="werkbak-lijsten" key={bak}>
        {lijst.length === 0 ? (
          <Leeg titel={bak === "nu" ? "Werkbalk leeg" : bak === "week" ? "Niets voor deze week" : "Nergens op wachten"}
            tekst={bak === "nu" ? "Alles wat nu moest, is gedaan. Mooi werk." : undefined}>
            {bak === "nu" && magBewerken && <Link to="/nieuw" className="knop knop-rood"><Icon naam="plus" maat={18} /> Nieuwe claim</Link>}
          </Leeg>
        ) : groepen.map((g) => (
          <section key={g.reden} aria-labelledby={`groep-${g.reden}`}>
            <h2 className="werkbak-groep" id={`groep-${g.reden}`}><span>{GROEP[g.reden]}</span><span className={`chip ${CHIP[g.reden].toon}`}>{g.taken.length}</span></h2>
            <ul className="werkbak-lijst">
              {g.taken.map((t) => (
                <li key={t.claim.id} className={`werktaak${t.reden === "termijn" ? " werktaak-laat" : ""}`}>
                  <div className="werktaak-boven">
                    <Link to={`/claims/${t.claim.id}`} className="werktaak-t">
                      <b>{titelVan(t.claim)}</b>
                      <span>{[t.claim.leverancier, t.claim.inkoopnummer && `ink ${t.claim.inkoopnummer}`, t.sinds ? `${t.tekst} · ${datum(t.sinds)}` : t.tekst].filter(Boolean).join(" · ")}</span>
                    </Link>
                    <span className={`chip ${CHIP[t.reden].toon}`}>{CHIP[t.reden].tekst}</span>
                  </div>
                  {magBewerken && <div className="werktaak-acties">{acties(t)}</div>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        </div>
        {taken.length > 0 && <p className="hint">{meervoud(taken.length, "taak", "taken")} in totaal · claims binnen de termijn staan in <Link to="/claims">Claims</Link></p>}
      </div>

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
