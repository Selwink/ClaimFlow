import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Claim, Status } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { prijsVoor, titelVan, zoekDubbel } from "../lib/claims";
import { euro, parseBedrag } from "../lib/format";
import { useStore } from "../state/Store";
import { Icon } from "./Icon";

function Veld({ label, children, breed, hint }: { label: string; children: ReactNode; breed?: boolean; hint?: ReactNode }) {
  return (
    <label className={`veld${breed ? " veld-breed" : ""}`}>
      <span className="veld-label">{label}</span>
      {children}
      {hint && <span className="veld-hint">{hint}</span>}
    </label>
  );
}

interface Props {
  start: Claim;
  knop: string;
  bezig?: boolean;
  onBewaar: (c: Claim) => void;
  onAnnuleer?: () => void;
  herkend?: Set<keyof Claim>;
}

/** Full claim form, used for "zelf invullen", reviewing an imported LGAR and editing. */
export function ClaimForm({ start, knop, bezig, onBewaar, onAnnuleer, herkend }: Props) {
  const { inst, claims } = useStore();
  const [c, setC] = useState<Claim>(start);
  const [bedragTekst, setBedragTekst] = useState(start.bedrag != null && start.bedrag !== 0 ? String(start.bedrag).replace(".", ",") : "");
  const [bedragZelf, setBedragZelf] = useState(start.bedrag != null && start.bedrag !== 0);
  const [fout, setFout] = useState("");

  const zet = <K extends keyof Claim>(k: K, v: Claim[K]) => setC((o) => {
    const n = { ...o, [k]: v };
    if (k === "leverancier" && typeof v === "string" && inst.uitbesteedLev.some((l) => l.toLowerCase() === v.trim().toLowerCase())) {
      n.uitbesteed = true;
      if (!o.status || o.status === "nieuw") n.status = "gehonoreerd";
    }
    return n;
  });

  const vast = prijsVoor([c.storing, c.type, c.onderdeel].filter(Boolean).join(" "), inst);
  const bedrag = bedragZelf ? parseBedrag(bedragTekst) : vast?.bedrag ?? parseBedrag(bedragTekst);
  const dubbel = useMemo(() => zoekDubbel(c, claims), [c, claims]);
  const leveranciers = useMemo(() => [...new Set([...inst.leveranciers, ...claims.map((x) => x.leverancier || "").filter(Boolean)])].sort(), [inst, claims]);
  const mark = (k: keyof Claim) => (herkend?.has(k) ? " herkend" : "");

  const verstuur = (e: FormEvent) => {
    e.preventDefault();
    if (!c.type?.trim() && !c.onderdeel?.trim()) { setFout("Vul een type of onderdeel in."); return; }
    if (!/^\d{4}-\d{2}$/.test(c.periode || "")) { setFout("Kies de maand van de claim."); return; }
    setFout("");
    // The inkoop field holds only the number: right of a slash if there is one, otherwise the first number.
    const ruw = (c.inkoopnummer || "").trim();
    const inkoop = ruw ? (ruw.includes("/") ? ruw.split("/").pop() : ruw)?.match(/\d+/)?.[0] : undefined;
    onBewaar({ ...c, type: c.type?.trim(), onderdeel: c.onderdeel?.trim() || c.type?.trim(), bedrag, inkoopnummer: inkoop });
  };

  return (
    <form className="formulier" onSubmit={verstuur} noValidate>
      <fieldset>
        <legend>Hulpmiddel</legend>
        <div className="velden">
          <Veld label="Type"><input className={mark("type")} value={c.type || ""} onChange={(e) => zet("type", e.target.value)} placeholder="Bijv. Vela 700E" autoComplete="off" /></Veld>
          <Veld label="Onderdeel"><input className={mark("onderdeel")} value={c.onderdeel || ""} onChange={(e) => zet("onderdeel", e.target.value)} placeholder="Bijv. kolom, wiel, jukmotor" /></Veld>
          <Veld label="Leverancier">
            <input className={mark("leverancier")} list="lev-lijst" value={c.leverancier || ""} onChange={(e) => zet("leverancier", e.target.value)} placeholder="Kies of typ" />
            <datalist id="lev-lijst">{leveranciers.map((l) => <option key={l} value={l} />)}</datalist>
          </Veld>
          <Veld label="Inkoopnummer" hint={!c.inkoopnummer ? "Mag later — de claim krijgt dan een herinnering." : undefined}>
            <input className={`mono${mark("inkoopnummer")}`} inputMode="numeric" value={c.inkoopnummer || ""} onChange={(e) => zet("inkoopnummer", e.target.value)} />
          </Veld>
          <Veld label="Voorzieningnummer"><input className={`mono${mark("voorziening")}`} value={c.voorziening || ""} onChange={(e) => zet("voorziening", e.target.value)} /></Veld>
          <Veld label="Framenummer"><input className={`mono${mark("frame")}`} value={c.frame || ""} onChange={(e) => zet("frame", e.target.value)} /></Veld>
          <Veld label="Aankoopdatum / bouwjaar"><input className={mark("aankoop")} value={c.aankoop || ""} onChange={(e) => zet("aankoop", e.target.value)} placeholder="dd-mm-jjjj of jaar" /></Veld>
          <Veld label="Monteur">
            <div className="segment" role="radiogroup" aria-label="Monteur">
              {(["binnen", "buiten"] as const).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={(c.locatie || "binnen") === l} onClick={() => zet("locatie", l)}>
                  {l === "binnen" ? "Binnenmonteur" : "Buitenmonteur"}
                </button>
              ))}
            </div>
          </Veld>
          <Veld label="Storing" breed><textarea className={mark("storing")} rows={3} value={c.storing || ""} onChange={(e) => zet("storing", e.target.value)} placeholder="Wat is er kapot?" /></Veld>
        </div>
      </fieldset>

      <fieldset>
        <legend>Claim</legend>
        <div className="velden">
          <Veld label="Bedrag" hint={vast && !bedragZelf ? <span className="t-turk">Vast bedrag {euro(vast.bedrag)} bij “{vast.woord}”</span> : "Leeg laten als het bedrag later volgt."}>
            <div className="met-voor"><span>€</span>
              <input className="mono" inputMode="decimal" value={!bedragZelf && vast ? String(vast.bedrag) : bedragTekst}
                onChange={(e) => { setBedragTekst(e.target.value); setBedragZelf(true); }} placeholder="0,00" />
            </div>
          </Veld>
          <Veld label="Maand"><input type="month" value={c.periode || ""} onChange={(e) => zet("periode", e.target.value)} required /></Veld>
          <Veld label="Ingediend op"><input type="date" value={c.datum || ""} onChange={(e) => zet("datum", e.target.value || null)} /></Veld>
          <Veld label="Status">
            <select value={c.status || "nieuw"} onChange={(e) => zet("status", e.target.value as Status)}>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Veld>
          <label className="vinkje veld-breed">
            <input type="checkbox" checked={!!c.uitbesteed} onChange={(e) => zet("uitbesteed", e.target.checked)} />
            <span><b>Uitbesteed</b> — leverancier handelt zelf af, telt niet mee in de termijn</span>
          </label>
          <Veld label="Bijzonderheden" breed><textarea rows={2} value={c.bijzonderheden || ""} onChange={(e) => zet("bijzonderheden", e.target.value)} /></Veld>
        </div>
      </fieldset>

      {dubbel.length > 0 && (
        <div className="melding melding-oker" role="alert">
          <Icon naam="waarschuwing" />
          <div><b>Lijkt al te bestaan</b>
            {dubbel.slice(0, 3).map((d) => <span key={d.claim.id}><Link to={`/claims/${d.claim.id}`}>{titelVan(d.claim)}</Link> — zelfde {d.waarom}</span>)}
          </div>
        </div>
      )}
      {fout && <div className="melding melding-rood" role="alert"><Icon naam="waarschuwing" /><div>{fout}</div></div>}

      <div className="formulier-voet">
        {onAnnuleer && <button type="button" className="knop knop-zacht" onClick={onAnnuleer}>Annuleren</button>}
        <button type="submit" className="knop knop-rood knop-groot" disabled={bezig}>{bezig ? "Bezig…" : knop} <Icon naam="pijl" maat={18} /></button>
      </div>
    </form>
  );
}
