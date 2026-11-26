import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { aankoopVan, dagenOpen, doorlooptijd, geenBedrag, isOpen, overTermijn, statusVan, titelVan, afgehandeldOp } from "../lib/claims";
import { datum, euro, periodLabel } from "../lib/format";
import { agendaBestand } from "../lib/export";
import { leesBestand, leesVelden } from "../lib/lgar";
import { Icon } from "../components/Icon";
import { Bovenschrift, Leeg, Sheet, StatusPil } from "../components/ui";
import { TermRing } from "../components/TermRing";
import { Fotos } from "../components/Fotos";
import { logoVan } from "../lib/levlogo";
import { Bonnen } from "../components/Bonnen";
import { slaBonOp } from "../components/Bonnen";
import type { Notitie } from "../lib/types";
import type { IconNaam } from "../components/Icon";

/** The icon for a line in the timeline, from what happened. */
function tlIcoon(n: Notitie): { ic: IconNaam; toon: string } {
  if (n.soort === "status") return n.naar === "gehonoreerd" ? { ic: "vink", toon: "groen" } : n.naar === "afgewezen" ? { ic: "kruis", toon: "rood" } : n.naar === "ingediend" ? { ic: "pijl", toon: "blauw" } : { ic: "vernieuw", toon: "grijs" };
  if (/^Claim (vastgelegd|aangemaakt)/.test(n.t)) return { ic: "plus", toon: "rood" };
  if (/^Bon /.test(n.t)) return { ic: "document", toon: "paars" };
  if (/^Foto/.test(n.t)) return { ic: "camera", toon: "paars" };
  if (/^Nagekeken/.test(n.t)) return { ic: "oog", toon: "groen" };
  if (/^Aangevuld|^Gewijzigd|bewerkt/i.test(n.t)) return { ic: "potlood", toon: "grijs" };
  return { ic: "bericht", toon: "geel" };
}
const STAPPEN: Array<{ s: Status; l: string }> = [{ s: "nieuw", l: "Aangemaakt" }, { s: "ingediend", l: "Ingediend" }, { s: "gehonoreerd", l: "Gehonoreerd" }];

/** The VAM e-mails what may be done with the part; these record it in one tap. */
const VAM_SNEL = ["VAM: Onderdeel retour sturen", "VAM: Onderdeel vernietigen", "VAM: Onderdeel bewaren", "VAM: Informatie opgevraagd"];

const VOLGENDE: Record<Status, Status | null> = { nieuw: "ingediend", ingediend: "gehonoreerd", gehonoreerd: null, afgewezen: null };

export function ClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { claims, inst, magBewerken, zetStatus, notitie, naarPrullenbak, terugzetten, bewaar, naam } = useStore();
  const [frameBezig, setFrameBezig] = useState("");
  const [params] = useSearchParams();
  const [notitieOpen, setNotitieOpen] = useState(() => params.get("notitie") === "1");
  const [tekst, setTekst] = useState("");
  const [naarStatus, setNaarStatus] = useState<Status | "">("");
  const [feest, setFeest] = useState(0);
  const naar = async (st: Status) => {
    await zetStatus([id!], st);
    if (st === "gehonoreerd") { setFeest(Date.now()); setTimeout(() => setFeest(0), 2600); }
  };
  const c = claims.find((x) => x.id === id);

  if (!c) return (
    <div className="pagina"><Leeg kop="h1" titel="Claim niet gevonden" tekst="Misschien is hij verwijderd of nog niet geladen."><Link className="knop knop-zacht" to="/claims">Naar alle claims</Link></Leeg></div>
  );

  const st = statusVan(c);
  const d = dagenOpen(c);
  const laat = overTermijn(c, inst.dagen);
  const volgende = VOLGENDE[st];
  const ringTekst = !isOpen(c) ? (st === "gehonoreerd" ? `Gehonoreerd${doorlooptijd(c) != null ? ` na ${doorlooptijd(c)} dagen` : ""}.` : "Afgewezen door de leverancier.")
    : c.uitbesteed ? "Uitbesteed — de leverancier handelt dit zelf af."
    : !d ? "Nog geen datum: vul ‘ingediend op’ in om de termijn te volgen."
    : laat ? `${d.dagen - inst.dagen} dagen over de termijn van ${inst.dagen} dagen. Tijd om informatie bij de VAM op te vragen.`
    : `Nog ${inst.dagen - d.dagen} dagen binnen de termijn van ${inst.dagen} dagen.`;

  const feiten: Array<[string, string | undefined, boolean?]> = [
    ["Leverancier", c.leverancier], ["Inkoopnummer", c.inkoopnummer, true], ["Voorzieningnummer", c.voorziening, true], ["Framenummer", c.frame, true],
    ["Onderdeel", c.type && c.onderdeel !== c.type ? c.onderdeel : ""], ["Aankoop / bouwjaar", aankoopVan(c)], ["Ingediend op", c.datum ? datum(c.datum) : ""],
    ["Afgehandeld op", afgehandeldOp(c) ? datum(afgehandeldOp(c)) : ""], ["Claimnummer", c.nummer, true],
  ];

  const bewaarNotitie = async () => {
    await notitie(c.id, tekst.trim(), naarStatus || undefined);
    setTekst(""); setNaarStatus(""); setNotitieOpen(false);
  };

  return (
    <div className="detail">
      <header className="detail-kop">
        <div className="detail-kop-binnen">
          {logoVan(c.leverancier) ? <span className="lev-logo"><img src={logoVan(c.leverancier)!} alt={`Logo ${c.leverancier}`} /></span>
            : c.leverancier ? <span className="lev-letters" aria-hidden="true">{c.leverancier.slice(0, 2).toUpperCase()}</span> : null}
          <button type="button" className="terugknop" onClick={() => (loc.key !== "default" ? nav(-1) : nav("/claims"))}><Icon naam="terug" maat={18} /> Claims</button>
          <Bovenschrift>{[c.inkoopnummer ? `INK ${c.inkoopnummer}` : "Geen inkoopnummer", c.leverancier].filter(Boolean).join(" · ")}</Bovenschrift>
          <h1>{titelVan(c)}</h1>
          <p>{c.locatie === "buiten" ? "Buitenmonteur" : "Binnenmonteur"} · {periodLabel(c.periode)}{c.verwijderd ? " · in de prullenbak" : ""}</p>
        </div>
      </header>

      <div className="detail-raster">
        <div className="detail-hoofd">
          <section className={`ringkaart${laat ? " ringkaart-laat" : ""}`}>
            <TermRing dagen={c.uitbesteed ? null : d?.dagen ?? null} termijn={inst.dagen} klaar={!isOpen(c)} />
            <div>
              <b className="ringkaart-bedrag">{geenBedrag(c) ? "Bedrag volgt" : euro(c.bedrag)}</b>
              <p>{ringTekst}</p>
              <StatusPil status={st} />
            </div>
            <ol className={`cd-stappen${st === "afgewezen" ? " cd-af" : ""}`} aria-label="Voortgang" style={{ ["--v" as string]: `${((st === "afgewezen" ? 2 : Math.max(0, STAPPEN.findIndex((y) => y.s === st))) / 2) * 66.8}%` }}>
              {STAPPEN.map((x, i) => {
                const nu = st === "afgewezen" ? 2 : STAPPEN.findIndex((y) => y.s === st);
                const af = st === "afgewezen" && i === 2;
                return <li key={x.s} className={`${i <= nu ? "gedaan" : ""}${i === nu ? " nu" : ""}${af ? " afgewezen" : ""}`}><i aria-hidden="true">{af ? "✕" : i <= nu ? "✓" : i + 1}</i><span>{af ? "Afgewezen" : x.l}</span></li>;
              })}
            </ol>
          </section>

          {c.storing && <section className="kaart"><h2 className="sectiekop">Storing</h2><p className="doorlopend">{c.storing}</p></section>}

          <Bonnen claim={c} />
          <Fotos claim={c} />

          <section className="kaart">
            <h2 className="sectiekop">Gegevens</h2>
            <dl className="feiten">
              {feiten.filter(([, v]) => v).map(([k, v, mono]) => (<div key={k}><dt>{k}</dt><dd className={mono ? "mono" : undefined}>{v}</dd></div>))}
            </dl>
            {c.bijzonderheden && <p className="doorlopend t-zacht">{c.bijzonderheden}</p>}
          </section>
        </div>

        <div className="detail-zij">
          <section className="kaart">
            <h2 className="sectiekop">Tijdlijn</h2>
            {(c.notities || []).length === 0 ? <p className="t-zacht">Nog geen notities.</p> : (
              <ol className="tijdlijn">
                {[...(c.notities || [])].reverse().map((n, i) => (
                  <li key={i} className={`tl-rij tl-${tlIcoon(n).toon}${n.soort === "status" ? ` tl-status tl-${n.naar}` : i === 0 ? " tl-nieuw" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <span className="tl-ic" aria-hidden="true"><Icon naam={tlIcoon(n).ic} maat={14} /></span>
                    <b>{n.t}</b><span>{datum(n.d)}{n.w ? ` · ${n.w}` : ""}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="kaart acties-kaart">
            <h2 className="sectiekop">Acties</h2>
            {isOpen(c) && !c.uitbesteed && <button type="button" className="actie" onClick={() => agendaBestand([c], inst)}><Icon naam="agenda" maat={18} /> Herinnering in agenda</button>}
            {magBewerken && <Link className="actie" to={`/claims/${c.id}/bewerken`}><Icon naam="potlood" maat={18} /> Bewerken</Link>}
            {magBewerken && (!c.frame || !c.inkoopnummer) && (
              <label className="actie" style={{ cursor: "pointer" }}>
                <Icon naam="document" maat={18} /> {frameBezig || "Nummers uit LGAR-pdf"}
                <input type="file" accept=".pdf,application/pdf,image/*" hidden onChange={async (e) => {
                  const f = e.target.files?.[0]; e.target.value = "";
                  if (!f) return;
                  setFrameBezig("Pdf wordt gelezen…");
                  try {
                    const { tekst: uitTekst, ocr } = await leesBestand(f);
                    void slaBonOp(c.id, f, naam).then((p) => { if (p.length) window.dispatchEvent(new Event("claimflow-bon")); }).catch(() => undefined);
                    const velden = leesVelden(uitTekst, inst.leveranciers);
                    const nieuwFrame = !c.frame && velden.frame ? velden.frame : c.frame;
                    const nieuwInkoop = !c.inkoopnummer && velden.inkoopnummer ? velden.inkoopnummer : c.inkoopnummer;
                    if (nieuwFrame === c.frame && nieuwInkoop === c.inkoopnummer) { setFrameBezig("Deze pdf geeft niets nieuws voor deze claim"); return; }
                    if (velden.inkoopnummer && c.inkoopnummer && velden.inkoopnummer !== c.inkoopnummer) { setFrameBezig(`Pdf hoort bij inkoop ${velden.inkoopnummer}, niet bij deze claim`); return; }
                    await bewaar([{ ...c, frame: nieuwFrame, inkoopnummer: nieuwInkoop, notities: [...(c.notities || []), { d: new Date().toISOString().slice(0, 10), t: `Aangevuld uit LGAR-pdf${ocr ? " (gescand)" : ""}: ${[nieuwFrame !== c.frame ? `frame ${nieuwFrame}` : "", nieuwInkoop !== c.inkoopnummer ? `inkoop ${nieuwInkoop}` : ""].filter(Boolean).join(", ")}`, w: naam }] }], "Opgeslagen uit de pdf", [c]);
                    setFrameBezig("");
                  } catch { setFrameBezig("Pdf kon niet worden gelezen"); }
                }} />
              </label>
            )}
            {magBewerken && (c.verwijderd
              ? <button type="button" className="actie" onClick={() => terugzetten(c.id)}><Icon naam="ongedaan" maat={18} /> Terugzetten</button>
              : <button type="button" className="actie actie-rood" onClick={async () => { await naarPrullenbak([c.id]); nav("/claims"); }}><Icon naam="prullenbak" maat={18} /> Naar prullenbak</button>)}
            {magBewerken && st !== "afgewezen" && isOpen(c) && <button type="button" className="actie" onClick={() => zetStatus([c.id], "afgewezen")}><Icon naam="kruis" maat={18} /> Afgewezen</button>}
            {magBewerken && !isOpen(c) && <button type="button" className="actie" onClick={() => zetStatus([c.id], "ingediend")}><Icon naam="ongedaan" maat={18} /> Weer openzetten</button>}
          </section>
        </div>
      </div>

      {magBewerken && !c.verwijderd && (
        <div className="actiebalk">
          <button type="button" className="knop knop-zacht" onClick={() => setNotitieOpen(true)}><Icon naam="bericht" maat={18} /> Notitie</button>
          {volgende ? (
            <button type="button" className={`knop ${volgende === "gehonoreerd" ? "knop-turk" : "knop-rood"}`} onClick={() => naar(volgende)}>
              <Icon naam="vink" maat={18} /> {STATUS_LABEL[volgende]}
            </button>
          ) : <span className="actiebalk-klaar"><Icon naam="vink" maat={18} /> Afgehandeld</span>}
        </div>
      )}

      {feest > 0 && <div className="confetti confetti-scherm" key={feest} aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}

      <Sheet titel="Notitie toevoegen" open={notitieOpen} sluit={() => setNotitieOpen(false)}
        voet={<><button type="button" className="knop knop-zacht" onClick={() => setNotitieOpen(false)}>Annuleren</button>
          <button type="button" className="knop knop-rood" disabled={!tekst.trim() && !naarStatus} onClick={bewaarNotitie}>Opslaan</button></>}>
        <div className="veld"><span className="veld-label">Mail van de VAM</span>
          <div className="chiprij chiprij-wrap">
            {VAM_SNEL.map((t) => <button key={t} type="button" className="pil" aria-pressed={tekst === t} onClick={() => setTekst(t)}>{t.replace(/^VAM: /, "")}</button>)}
          </div>
        </div>
        <label className="veld"><span className="veld-label">Wat is er gebeurd?</span>
          <textarea rows={4} value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Bijv. Mail van de VAM: Onderdeel retour sturen" autoFocus /></label>
        <div className="veld"><span className="veld-label">Status meteen aanpassen (optioneel)</span>
          <div className="chiprij">
            {(Object.keys(STATUS_LABEL) as Status[]).filter((s) => s !== st).map((s) => (
              <button key={s} type="button" className="pil" aria-pressed={naarStatus === s} onClick={() => setNaarStatus(naarStatus === s ? "" : s)}>{STATUS_LABEL[s]}</button>
            ))}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
