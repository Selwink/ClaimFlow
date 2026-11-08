import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Claim } from "../lib/types";
import { useStore } from "../state/Store";
import { datumOntbreekt, metAfgehandeld, metRegel, missendeDatums, statusVan, titelVan, voorstelDatums } from "../lib/claims";
import { meervoud, periodLabel, vandaag } from "../lib/format";
import { Icon } from "../components/Icon";
import { Leeg, PaginaKop, StatusPil } from "../components/ui";

interface Invoer { ingediend: string; afgehandeld: string; aangeraakt: boolean }

/** Fill in missing "submitted on" and "decided on" dates for older claims, with suggestions to accept in bulk. */
export function Datums() {
  const { actief, magBewerken, bewaar, naam } = useStore();
  const lijst = useMemo(() => actief.filter(datumOntbreekt).sort((a, b) => (a.periode || "").localeCompare(b.periode || "")), [actief]);
  const [invoer, setInvoer] = useState<Record<string, Invoer>>({});
  const [bezig, setBezig] = useState(false);

  const waarde = (c: Claim): Invoer => invoer[c.id] || { ...voorstelDatums(c), aangeraakt: false };
  const zet = (c: Claim, veld: "ingediend" | "afgehandeld", v: string) => setInvoer((o) => ({ ...o, [c.id]: { ...waarde(c), [veld]: v, aangeraakt: true } }));
  const vandaagStr = vandaag();

  /** Saving one of the two dates is fine; every date given must be in the past and in the right order. */
  const geldig = (c: Claim, w: Invoer) => {
    const m = missendeDatums(c);
    const met1 = m.ingediend && !!w.ingediend, met2 = m.afgehandeld && !!w.afgehandeld;
    if (!met1 && !met2) return false;
    if (met1 && w.ingediend > vandaagStr) return false;
    const begin = (met1 ? w.ingediend : c.datum) || "";
    if (met2 && (w.afgehandeld > vandaagStr || (begin && w.afgehandeld < begin))) return false;
    return true;
  };
  const toepassen = (c: Claim, w: Invoer): Claim => {
    const m = missendeDatums(c);
    let n: Claim = { ...c };
    if (m.ingediend && w.ingediend) n = { ...n, datum: w.ingediend };
    if (m.afgehandeld && w.afgehandeld) n = metAfgehandeld(n, w.afgehandeld, naam);
    return metRegel(n, "Datums aangevuld", naam);
  };
  const klaar = lijst.filter((c) => geldig(c, waarde(c)));

  const opslaan = async (claims: Claim[]) => {
    if (!claims.length) return;
    setBezig(true);
    const ok = await bewaar(claims.map((c) => toepassen(c, waarde(c))), `Datums opgeslagen voor ${meervoud(claims.length, "claim", "claims")}`, claims);
    if (ok) setInvoer((o) => { const n = { ...o }; claims.forEach((c) => delete n[c.id]); return n; });
    setBezig(false);
  };

  if (!magBewerken) return <div className="pagina pagina-smal"><Leeg kop="h1" titel="Alleen voor beheerders" tekst="Log in als beheerder om datums aan te vullen." /></div>;

  return (
    <div className="pagina pagina-smal datums">
      <Link to="/beheer" className="terugknop terugknop-donker"><Icon naam="terug" maat={18} /> Beheer</Link>
      <PaginaKop boven={meervoud(lijst.length, "claim mist", "claims missen") + " een datum"} titel="Datums aanvullen">
        {klaar.length > 0 && <button type="button" className="knop knop-rood" onClick={() => opslaan(klaar)} disabled={bezig}><Icon naam="vink" maat={18} /> {bezig ? "Opslaan…" : `Alles opslaan (${klaar.length})`}</button>}
      </PaginaKop>

      {lijst.length === 0 ? (
        <Leeg titel="Alle datums zijn compleet" tekst="De termijnring en de doorlooptijd kloppen nu voor elke claim."><Link to="/rapportage" className="knop knop-zacht">Naar rapportage</Link></Leeg>
      ) : (
        <>
          <p className="datums-uitleg">Met deze datums kloppen de termijnring en de doorlooptijd in Rapportage. Een <span className="voorstel-voorbeeld">gele datum</span> is een voorstel: de eerste dag van de maand van de claim. Pas hem aan als je de echte datum weet, of sla hem zo op. De datum van gehonoreerd of afgewezen vul je zelf in, bijvoorbeeld uit de creditnota.</p>
          <ul className="datumlijst">
            {lijst.map((c) => {
              const m = missendeDatums(c);
              const w = waarde(c);
              const ok = geldig(c, w);
              return (
                <li key={c.id} className="datumrij">
                  <div className="datumrij-kop">
                    <Link to={`/claims/${c.id}`} className="datumrij-titel"><b>{titelVan(c)}</b><span>{[c.leverancier, periodLabel(c.periode)].filter(Boolean).join(" · ")}</span></Link>
                    <StatusPil status={statusVan(c)} />
                  </div>
                  <div className="datumrij-velden">
                    {m.ingediend && (
                      <label className="veld"><span className="veld-label">Ingediend op</span>
                        <input type="date" max={vandaagStr} value={w.ingediend} className={w.aangeraakt ? "" : "voorstel"} onChange={(e) => zet(c, "ingediend", e.target.value)} /></label>
                    )}
                    {m.afgehandeld && (
                      <label className="veld"><span className="veld-label">{statusVan(c) === "afgewezen" ? "Afgewezen op" : "Gehonoreerd op"}</span>
                        <input type="date" max={vandaagStr} min={w.ingediend || undefined} value={w.afgehandeld} className={w.aangeraakt ? "" : "voorstel"} onChange={(e) => zet(c, "afgehandeld", e.target.value)} /></label>
                    )}
                    <button type="button" className="icoonknop datumrij-ok" onClick={() => opslaan([c])} disabled={!ok || bezig} aria-label={`Datums van ${titelVan(c)} opslaan`} title="Opslaan"><Icon naam="vink" maat={18} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
