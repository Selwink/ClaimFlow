import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { isOpen, overTermijn } from "../lib/claims";
import { meervoud } from "../lib/format";
import { Icon } from "../components/Icon";
import { Logo } from "../components/ui";

function groet() {
  const u = new Date().getHours();
  return u < 6 ? "Goedenacht" : u < 12 ? "Goedemorgen" : u < 18 ? "Goedemiddag" : "Goedenavond";
}

/** First screen after logging in: choose between the LGAR register and Logistiek. */
export function Start() {
  const { naam, actief, inst, uitloggen } = useStore();
  const laat = useMemo(() => actief.filter((c) => overTermijn(c, inst.dagen)).length, [actief, inst.dagen]);
  const open = useMemo(() => actief.filter(isOpen).length, [actief]);
  const voornaam = (naam || "").split(" ")[0];

  return (
    <main className="start">
      <div className="start-band">
        <div className="toegang-gloed" aria-hidden="true"><i /><i /><i /></div>
        <div className="start-binnen">
          <Logo />
          <h1>{groet()}{voornaam ? `, ${voornaam}` : ""}.<br /><span>Waar ga je mee aan de slag?</span></h1>
        </div>
      </div>
      <div className="start-keuzes">
        <Link to="/vandaag" className="start-knop start-lgar">
          <span className="start-ic" aria-hidden="true"><Icon naam="document" maat={30} /></span>
          <span className="start-t">
            <b>LGAR</b>
            <span>Garantieclaims, LGAR scannen en termijnen bewaken</span>
            <span className="start-chips">
              {laat > 0 && <span className="chip chip-rood">{meervoud(laat, "claim", "claims")} over termijn</span>}
              <span className="chip chip-grijs">{open} open</span>
            </span>
          </span>
          <Icon naam="verder" maat={22} className="start-pijl" />
        </Link>
        <Link to="/logistiek" className="start-knop start-logistiek">
          <span className="start-ic" aria-hidden="true"><Icon naam="vrachtwagen" maat={30} /></span>
          <span className="start-t">
            <b>Logistiek Flow</b>
            <span>Codeverwerking van Logistiek bijhouden</span>
            <span className="start-chips"><span className="chip chip-oker">Wordt ingericht</span></span>
          </span>
          <Icon naam="verder" maat={22} className="start-pijl" />
        </Link>
      </div>
      <div className="start-voet">
        <Link to="/beheer" className="knop-link">Beheer</Link>
        <span aria-hidden="true">·</span>
        <button type="button" className="knop-link" onClick={uitloggen}>Uitloggen</button>
      </div>
    </main>
  );
}
