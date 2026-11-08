import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/ui";

/** Logistiek Flow: reserved for keeping track of the codes Logistiek processes. Intentionally empty for now. */
export function Logistiek() {
  useEffect(() => {
    const oud = document.title;
    document.title = "Logistiek Flow Medipoint";
    return () => { document.title = oud; };
  }, []);

  return (
    <main className="start logistiek">
      <div className="start-band">
        <div className="toegang-gloed" aria-hidden="true"><i /><i /><i /></div>
        <div className="start-binnen">
          <Link to="/" className="terugknop"><Icon naam="terug" maat={18} /> Terug naar start</Link>
          <Logo logistiek />
          <h1>Logistiek Flow<br /><span>Codeverwerking van Logistiek.</span></h1>
        </div>
      </div>
      <div className="start-keuzes">
        <div className="start-leeg">
          <span className="start-ic" aria-hidden="true"><Icon naam="vrachtwagen" maat={30} /></span>
          <b>Hier komt de codeverwerking</b>
          <p>In Logistiek Flow ga je bijhouden welke codes Logistiek verwerkt. Dit deel wordt nog ingericht.</p>
          <Link to="/" className="knop knop-zacht knop-vol"><Icon naam="terug" maat={18} /> Terug naar start</Link>
        </div>
      </div>
    </main>
  );
}
