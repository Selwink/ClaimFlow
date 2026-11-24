import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Claim } from "../lib/types";
import { CONFIG } from "../lib/config";
import { useStore } from "../state/Store";
import { metRegel } from "../lib/claims";
import { dezeMaand, nieuwId, vandaag } from "../lib/format";
import { leesBestand, leesVelden } from "../lib/lgar";
import { mailNieuweClaim } from "../lib/mail";
import { neemBestand } from "../lib/overdracht";
import { ClaimForm } from "../components/ClaimForm";
import { Icon, type IconNaam } from "../components/Icon";
import { Bovenschrift, Leeg } from "../components/ui";
import { levNaam } from "../lib/levnamen";
import { bonWacht, slaBonOp } from "../components/Bonnen";
import { useToast } from "../state/Toast";

type Stap = "kies" | "formulier-uit" | "inlezen" | "controle" | "zelf";
const VELD_LABEL: Partial<Record<keyof Claim, string>> = {
  type: "Type", onderdeel: "Onderdeel", leverancier: "Leverancier", inkoopnummer: "Inkoopnummer", voorziening: "Voorzieningnummer",
  frame: "Framenummer", aankoop: "Aankoopdatum", storing: "Storing", nummer: "Claimnummer",
};

function leegClaim(): Claim {
  return { id: nieuwId(), periode: dezeMaand(), datum: vandaag(), status: "nieuw", locatie: "binnen", uitbesteed: false, notities: [] };
}

export function NieuweClaim() {
  const nav = useNavigate();
  const { bewaar, naam, inst, claims, magBewerken } = useStore();
  const [stap, setStap] = useState<Stap>("kies");
  const [start, setStart] = useState<Claim>(leegClaim);
  const [bon, setBon] = useState<File | null>(null);
  const bonKies = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [bron, setBron] = useState<{ naam: string; tijd: number; herkend: Set<keyof Claim>; ocr: boolean } | null>(null);
  const [voortgang, setVoortgang] = useState<{ stap: string; deel?: number }>({ stap: "" });
  const [fout, setFout] = useState("");
  const [sleep, setSleep] = useState(false);
  const [bezig, setBezig] = useState(false);
  const bestand = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  // a file dropped on the Home LGAR card is read in right away
  const leesInRef = useRef<(f?: File | null) => Promise<void>>(async () => {});
  useEffect(() => { const f = neemBestand(); if (f) void leesInRef.current(f); }, []);

  if (!magBewerken) return <div className="pagina"><Leeg titel="Alleen voor beheerders" tekst="Log in als beheerder om claims toe te voegen." /></div>;

  const leesIn = async (f?: File | null) => {
    if (!f) return;
    setFout(""); setStap("inlezen"); setVoortgang({ stap: "Bestand openen" });
    const t0 = performance.now();
    try {
      const { tekst, ocr } = await leesBestand(f, (stap, deel) => setVoortgang({ stap, deel }));
      const lev = [...new Set([...inst.leveranciers, ...claims.map((c) => c.leverancier || "").filter(Boolean)])];
      const velden = leesVelden(tekst, [...lev, "Wellco"]);
      if (velden.leverancier) velden.leverancier = levNaam(velden.leverancier);
      const herkend = new Set(Object.keys(velden).filter((k) => velden[k as keyof Claim]) as Array<keyof Claim>);
      if (!herkend.size) throw new Error("leeg");
      const c = { ...leegClaim(), ...velden };
      if (velden.type && !velden.onderdeel) c.onderdeel = velden.type;
      if (inst.uitbesteedLev.some((l) => l.toLowerCase() === (c.leverancier || "").toLowerCase())) { c.uitbesteed = true; c.status = "gehonoreerd"; }
      setStart(c);
      setBon(f);
      setBron({ naam: f.name || "Foto", tijd: (performance.now() - t0) / 1000, herkend, ocr });
      setStap("controle");
    } catch {
      setFout("Er kon niets uit dit bestand gelezen worden. Maak de foto recht van boven, met goed licht en het hele formulier in beeld — of vul de claim zelf in.");
      setStap("kies");
    }
  };

  const opslaan = async (c: Claim) => {
    setBezig(true);
    const bronTekst = bron ? (bron.ocr ? "LGAR gescand" : "LGAR-pdf") : "zelf ingevuld";
    const nieuw = metRegel(c, bron ? `Claim vastgelegd uit ${bron.ocr ? "scan van " : ""}${bron.naam}` : "Claim aangemaakt", naam);
    const ok = await bewaar([nieuw], "Claim vastgelegd", { verwijder: c.id });
    if (!ok) { setBezig(false); return; }
    // the receipt is stored with the claim before the claim opens, so it is there straight away
    if (bon) {
      try { const pag = await slaBonOp(c.id, bon, naam); if (!pag.length) toast("De bon kon niet als afbeelding worden opgeslagen"); }
      catch (e) { bonWacht(c.id, bon, e instanceof Error && e.message ? e.message : "onbekende fout"); }
    }
    setBezig(false);
    void mailNieuweClaim(nieuw, bronTekst, naam).then((r) => { if (r && !r.ok) toast(`Mail niet verstuurd: ${r.bericht}. Kijk in Profiel → E-mailmeldingen.`); else if (r?.activatie) toast("Mail wacht op activatie: klik in je inbox op Activate Form"); });
    nav(`/claims/${c.id}`, { replace: true });
  };

  const drop = (e: DragEvent) => { e.preventDefault(); setSleep(false); void leesIn(e.dataTransfer.files[0]); };
  const stapNr = stap === "kies" || stap === "formulier-uit" ? 1 : 2;

  const Optie = ({ icoon, titel, tekst, doe, hoofd }: { icoon: IconNaam; titel: string; tekst: string; doe: () => void; hoofd?: boolean }) => (
    <button type="button" className={`optie${hoofd ? " optie-hoofd" : ""}`} onClick={doe}>
      <span className="optie-ic"><Icon naam={icoon} maat={22} /></span>
      <span className="optie-t"><b>{titel}</b><span>{tekst}</span></span>
      <Icon naam="verder" maat={18} className="optie-pijl" />
    </button>
  );

  leesInRef.current = leesIn;
  return (
    <div className="pagina pagina-smal nieuw" onDragOver={(e) => { e.preventDefault(); setSleep(true); }} onDragLeave={() => setSleep(false)} onDrop={drop}>
      <div className="stappen" role="img" aria-label={`Stap ${stapNr} van 3`}>{[1, 2, 3].map((n) => <i key={n} className={n <= stapNr ? "aan" : ""} />)}</div>
      <Bovenschrift rood>Stap {stapNr} van 3 · {stap === "controle" ? "LGAR" : stap === "zelf" ? "Zelf invullen" : "Nieuwe claim"}</Bovenschrift>

      {(stap === "kies" || stap === "formulier-uit") && (
        <>
          <h1 className="nieuw-titel">Nieuwe claim.<br /><span>Hoe wil je beginnen?</span></h1>
          {fout && <div className="melding melding-rood" role="alert"><Icon naam="waarschuwing" /><div>{fout}</div></div>}
          <div className="opties">
            <Optie hoofd icoon="upload" titel="LGAR-pdf inlezen" tekst="Sleep de pdf hierheen of kies een bestand — ook gescande pdf’s en foto’s. De velden vullen zich vanzelf." doe={() => bestand.current?.click()} />
            <Optie icoon="formulier" titel="LGAR-formulier invullen" tekst="Open het Microsoft-formulier, vul het in en lees daarna de pdf in."
              doe={() => { window.open(CONFIG.LGAR_FORMULIER, "_blank", "noopener"); setStap("formulier-uit"); }} />
            <Optie icoon="potlood" titel="Zelf invullen" tekst="Typ de gegevens over. Vaste bedragen worden automatisch ingevuld." doe={() => { setBron(null); setStart(leegClaim()); setStap("zelf"); }} />
          </div>
          {stap === "formulier-uit" && (
            <div className="melding melding-turk" role="status">
              <Icon naam="formulier" />
              <div><b>Formulier ingevuld en verstuurd?</b><span>Download de pdf uit de bevestiging en lees hem hier in. Dan staat de claim meteen in het register.</span>
                <div className="melding-acties">
                  <button type="button" className="knop knop-rood" onClick={() => bestand.current?.click()}><Icon naam="upload" maat={18} /> Pdf inlezen</button>
                  <button type="button" className="knop knop-zacht" onClick={() => setStap("zelf")}>Zelf overnemen</button>
                </div>
              </div>
            </div>
          )}
          <input ref={bestand} type="file" accept=".pdf,.txt,application/pdf,text/plain,image/*" hidden onChange={(e) => { void leesIn(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void leesIn(e.target.files?.[0]); e.target.value = ""; }} />
          <div className={`sleepvak${sleep ? " sleepvak-aan" : ""}`} aria-hidden="true"><Icon naam="upload" maat={28} /><span>Laat los om in te lezen</span></div>
        </>
      )}

      {stap === "inlezen" && (
        <div className="inlezen" role="status" aria-live="polite">
          <div className="spinner" />
          <b>LGAR wordt gelezen…</b>
          <span>{voortgang.stap}{voortgang.deel != null && voortgang.deel > 0 ? ` · ${Math.round(voortgang.deel * 100)}%` : ""}</span>
          {voortgang.deel != null && <div className="inlezen-balk"><i style={{ width: `${Math.round(voortgang.deel * 100)}%` }} /></div>}
          <small className="t-zacht">Een foto herkennen duurt 5 tot 20 seconden.</small>
        </div>
      )}

      {stap === "controle" && bron && (
        <>
          <h1 className="nieuw-titel">Klopt dit?<br /><span>Dan ben je klaar.</span></h1>
          <div className="bestandkaart">
            <b>{bron.naam}</b>
            <span>{bron.ocr ? "Gescand" : "Gelezen"} in {bron.tijd.toFixed(1).replace(".", ",")} sec · {bron.herkend.size} {bron.herkend.size === 1 ? "veld" : "velden"} herkend</span>
          </div>
          <dl className="herkend">
            {[...bron.herkend].filter((k) => VELD_LABEL[k]).map((k) => (
              <div key={k}><dt>{VELD_LABEL[k]}</dt><dd className="mono">{String(start[k] ?? "")}<Icon naam="vink" maat={14} /></dd></div>
            ))}
          </dl>
          <p className="hint">{bron.ocr ? "Herkende tekst uit een foto kan kleine fouten bevatten — controleer vooral de nummers." : "Controleer en vul aan wat ontbreekt."} Herkende velden zijn groen gemarkeerd.</p>
          <div className="bon-kies">
            <input ref={bonKies} type="file" accept=".pdf,application/pdf,image/*" hidden onChange={(e) => { setBon(e.target.files?.[0] || null); e.target.value = ""; }} />
            <Icon naam="document" maat={18} />
            {bon ? <span><b>Bon wordt opgeslagen bij deze claim</b><small>{bon.name || "Foto van de bon"}</small></span> : <span><b>Bon toevoegen</b><small>Pdf of foto — iedereen kan hem daarna bij de claim inzien</small></span>}
            <button type="button" className="knop knop-zacht knop-klein" onClick={() => bonKies.current?.click()}>{bon ? "Andere bon" : "Kiezen"}</button>
            {bon && <button type="button" className="knop-link" onClick={() => setBon(null)}>Weghalen</button>}
          </div>
          <ClaimForm key={start.id} start={start} herkend={bron.herkend} knop="Claim vastleggen" bezig={bezig} onBewaar={opslaan} onAnnuleer={() => setStap("kies")} />
        </>
      )}

      {stap === "zelf" && (
        <>
          <h1 className="nieuw-titel">Zelf invullen.<br /><span>Alleen type en maand zijn verplicht.</span></h1>
          <div className="bon-kies">
            <input ref={bonKies} type="file" accept=".pdf,application/pdf,image/*" hidden onChange={(e) => { setBon(e.target.files?.[0] || null); e.target.value = ""; }} />
            <Icon naam="document" maat={18} />
            {bon ? <span><b>Bon wordt opgeslagen bij deze claim</b><small>{bon.name || "Foto van de bon"}</small></span> : <span><b>Bon toevoegen</b><small>Pdf of foto — iedereen kan hem daarna bij de claim inzien</small></span>}
            <button type="button" className="knop knop-zacht knop-klein" onClick={() => bonKies.current?.click()}>{bon ? "Andere bon" : "Kiezen"}</button>
            {bon && <button type="button" className="knop-link" onClick={() => setBon(null)}>Weghalen</button>}
          </div>
          <ClaimForm key={start.id} start={start} knop="Claim vastleggen" bezig={bezig} onBewaar={opslaan} onAnnuleer={() => setStap("kies")} />
        </>
      )}
    </div>
  );
}
