import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { useStore } from "../state/Store";
import { aankoopVan, dagenOpen, doorlooptijd, geenBedrag, isOpen, overTermijn, statusVan, titelVan, afgehandeldOp } from "../lib/claims";
import { datum, euro, periodLabel } from "../lib/format";
import { agendaBestand } from "../lib/export";
import { Icon } from "../components/Icon";
import { Bovenschrift, Leeg, Sheet, StatusPil } from "../components/ui";
import { TermRing } from "../components/TermRing";
import { Fotos } from "../components/Fotos";

const VOLGENDE: Record<Status, Status | null> = { nieuw: "ingediend", ingediend: "gehonoreerd", gehonoreerd: null, afgewezen: null };

export function ClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { claims, inst, magBewerken, zetStatus, notitie, naarPrullenbak, terugzetten } = useStore();
  const [notitieOpen, setNotitieOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [naarStatus, setNaarStatus] = useState<Status | "">("");
  const c = claims.find((x) => x.id === id);

  if (!c) return (
    <div className="pagina"><Leeg kop="h1" titel="Claim niet gevonden" tekst="Misschien is hij verwijderd of nog niet geladen."><Link className="knop knop-zacht" to="/claims">Naar alle claims</Link></Leeg></div>
  );

  const st = statusVan(c);
  const d = dagenOpen(c);
  const laat = overTermijn(c, inst.dagen);
  const volgende = VOLGENDE[st];
  const levMail = c.leverancier ? inst.levMail[c.leverancier] : "";
  const ringTekst = !isOpen(c) ? (st === "gehonoreerd" ? `Gehonoreerd${doorlooptijd(c) != null ? ` na ${doorlooptijd(c)} dagen` : ""}.` : "Afgewezen door de leverancier.")
    : c.uitbesteed ? "Uitbesteed — de leverancier handelt dit zelf af."
    : !d ? "Nog geen datum: vul ‘ingediend op’ in om de termijn te volgen."
    : laat ? `${d.dagen - inst.dagen} dagen over de termijn van ${inst.dagen} dagen. Tijd om informatie bij de VAM op te vragen.`
    : `Nog ${inst.dagen - d.dagen} dagen binnen de termijn van ${inst.dagen} dagen.`;
  const mailBody = encodeURIComponent(`Beste ${c.leverancier},\n\nGraag horen wij de stand van zaken van onze garantieclaim:\n\n${titelVan(c)}\nInkoopnummer: ${c.inkoopnummer || "-"}\nFramenummer: ${c.frame || "-"}\nIngediend: ${c.datum ? datum(c.datum) : periodLabel(c.periode)}\n\nMet vriendelijke groet,\nMedipoint ${inst.vestiging.replace(/^Vestiging /, "")}`);

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
          </section>

          {c.storing && <section className="kaart"><h2 className="sectiekop">Storing</h2><p className="doorlopend">{c.storing}</p></section>}

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
                  <li key={i} className={n.soort === "status" ? `tl-status tl-${n.naar}` : i === 0 ? "tl-nieuw" : undefined}>
                    <b>{n.t}</b><span>{datum(n.d)}{n.w ? ` · ${n.w}` : ""}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="kaart acties-kaart">
            <h2 className="sectiekop">Acties</h2>
            {levMail && <a className="actie" href={`mailto:${levMail}?subject=${encodeURIComponent(`Garantieclaim ${titelVan(c)}${c.inkoopnummer ? ` — inkoop ${c.inkoopnummer}` : ""}`)}&body=${mailBody}`}><Icon naam="mail" maat={18} /> Mail {c.leverancier}</a>}
            {isOpen(c) && !c.uitbesteed && <button type="button" className="actie" onClick={() => agendaBestand([c], inst)}><Icon naam="agenda" maat={18} /> Herinnering in agenda</button>}
            {magBewerken && <Link className="actie" to={`/claims/${c.id}/bewerken`}><Icon naam="potlood" maat={18} /> Bewerken</Link>}
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
            <button type="button" className={`knop ${volgende === "gehonoreerd" ? "knop-turk" : "knop-rood"}`} onClick={() => zetStatus([c.id], volgende)}>
              <Icon naam="vink" maat={18} /> {STATUS_LABEL[volgende]}
            </button>
          ) : <span className="actiebalk-klaar"><Icon naam="vink" maat={18} /> Afgehandeld</span>}
        </div>
      )}

      <Sheet titel="Notitie toevoegen" open={notitieOpen} sluit={() => setNotitieOpen(false)}
        voet={<><button type="button" className="knop knop-zacht" onClick={() => setNotitieOpen(false)}>Annuleren</button>
          <button type="button" className="knop knop-rood" disabled={!tekst.trim() && !naarStatus} onClick={bewaarNotitie}>Opslaan</button></>}>
        <label className="veld"><span className="veld-label">Wat is er gebeurd?</span>
          <textarea rows={4} value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={`Bijv. Gebeld met ${c.leverancier || "leverancier"} — creditnota volgt`} autoFocus /></label>
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
