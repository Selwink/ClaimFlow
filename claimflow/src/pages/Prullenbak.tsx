import { Link } from "react-router-dom";
import { useState } from "react";
import { useStore } from "../state/Store";
import { titelVan } from "../lib/claims";
import { datum, euroKort } from "../lib/format";
import { Icon } from "../components/Icon";
import { Leeg, PaginaKop, Sheet } from "../components/ui";

export function Prullenbak() {
  const { prullenbak, magBewerken, terugzetten, definitiefWeg } = useStore();
  const [weg, setWeg] = useState<string | null>(null);
  const lijst = [...prullenbak].sort((a, b) => String(b.verwijderd).localeCompare(String(a.verwijderd)));
  return (
    <div className="pagina pagina-smal">
      <Link to="/claims" className="terugknop terugknop-donker"><Icon naam="terug" maat={18} /> Claims</Link>
      <PaginaKop boven={`${lijst.length} verwijderd`} titel="Prullenbak" />
      {lijst.length === 0 ? <Leeg titel="De prullenbak is leeg" /> : (
        <ul className="kaartlijst">
          {lijst.map((c) => (
            <li key={c.id} className="taak taak-statisch">
              <span className="taak-ic ic-grijs"><Icon naam="prullenbak" maat={18} /></span>
              <Link to={`/claims/${c.id}`} className="taak-t"><b>{titelVan(c)}</b><span>{c.leverancier} · {euroKort(c.bedrag)} · verwijderd {datum(c.verwijderd)}</span></Link>
              {magBewerken && <>
                <button type="button" className="icoonknop" onClick={() => terugzetten(c.id)} aria-label={`${titelVan(c)} terugzetten`} title="Terugzetten"><Icon naam="ongedaan" maat={18} /></button>
                <button type="button" className="icoonknop icoonknop-rood" onClick={() => setWeg(c.id)} aria-label={`${titelVan(c)} definitief verwijderen`} title="Definitief verwijderen"><Icon naam="kruis" maat={18} /></button>
              </>}
            </li>
          ))}
        </ul>
      )}
      <Sheet titel="Definitief verwijderen?" open={!!weg} sluit={() => setWeg(null)}
        voet={<><button type="button" className="knop knop-zacht" onClick={() => setWeg(null)}>Annuleren</button>
          <button type="button" className="knop knop-rood" onClick={async () => { if (weg) await definitiefWeg(weg); setWeg(null); }}>Verwijderen</button></>}>
        <p>Deze claim en zijn tijdlijn verdwijnen voorgoed. Dit kan niet ongedaan worden gemaakt.</p>
      </Sheet>
    </div>
  );
}
