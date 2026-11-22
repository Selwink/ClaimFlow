import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { titelVan } from "../lib/claims";
import { datum } from "../lib/format";
import { Icon } from "../components/Icon";
import { Leeg, PaginaKop } from "../components/ui";

type Soort = "alles" | "vam" | "leverancier" | "intern";
const SOORTEN: Array<[Soort, string]> = [["alles", "Alles"], ["vam", "VAM"], ["leverancier", "Leverancier"], ["intern", "Intern"]];
const KLEUR: Record<Exclude<Soort, "alles">, string> = { vam: "#FDE68A", leverancier: "#93C5FD", intern: "#D8B4FE" };

/** Every note from every claim's timeline in one place, newest first. Status changes and system lines are left out. */
export function Notities() {
  const { actief } = useStore();
  const [soort, setSoort] = useState<Soort>("alles");
  const [zoek, setZoek] = useState("");
  const alle = useMemo(() => actief.flatMap((c) => (c.notities || [])
    .filter((n) => n.soort !== "status" && !/^(Claim (aangemaakt|vastgelegd)|Bewerkt:|Datums aangevuld|Naar de prullenbak|Werkbak:)/.test(n.t))
    .map((n) => ({ c, n, s: (/vam/i.test(n.t) ? "vam" : /leverancier|mail|retour|eureva|umotion|mercado|wellco|unitedcare|sowecare/i.test(n.t + (c.leverancier || "")) && /mail|lev|retour|gebeld|contact/i.test(n.t) ? "leverancier" : "intern") as Exclude<Soort, "alles"> })))
    .sort((a, b) => b.n.d.localeCompare(a.n.d)), [actief]);
  const z = zoek.trim().toLowerCase();
  const lijst = alle.filter((x) => (soort === "alles" || x.s === soort) && (!z || `${x.n.t} ${titelVan(x.c)} ${x.c.leverancier || ""}`.toLowerCase().includes(z)));

  return (
    <div className="pagina pagina-smal">
      <PaginaKop boven={`${alle.length} notities`} titel="Notities" />
      <label className="zoekbalk"><Icon naam="zoek" maat={18} /><input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek in notities" /></label>
      <div className="chiprij">{SOORTEN.map(([k, l]) => <button key={k} type="button" className="pil" aria-pressed={soort === k} onClick={() => setSoort(k)}>{l}</button>)}</div>
      {lijst.length === 0 ? <Leeg titel="Geen notities" tekst="Notities schrijf je bij een claim, met de knop Notitie." /> : (
        <ul className="notitielijst">
          {lijst.map(({ c, n, s }, i) => (
            <li key={`${c.id}-${i}`}><Link to={`/claims/${c.id}`}>
              <span className="nt-ic" style={{ background: KLEUR[s] }}><Icon naam="notitie" maat={16} /></span>
              <span className="nt-t"><b>{n.t}</b><small>{titelVan(c)} · {datum(n.d)}{n.w ? ` · ${n.w}` : ""}</small></span>
              <Icon naam="verder" maat={16} />
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
