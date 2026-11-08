import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Logo } from "../components/ui";

/** The codes from our logistics systems that Logistiek Flow will process. Each gets its own card. */
const CODES = [
  { code: "53", naam: "Werkvoorbereiding", tekst: "Verwerking van code 53 voor de werkvoorbereiding." },
];

/** Logistiek Flow: processing of codes from our logistics systems. The first one, code 53, is being set up. */
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
          <h1>Logistiek Flow<br /><span>Codeverwerking vanuit onze logistieke systemen.</span></h1>
        </div>
      </div>
      <div className="start-keuzes">
        {CODES.map((c) => (
          <section key={c.code} className="code-kaart" aria-labelledby={`code-${c.code}`}>
            <span className="code-nr" aria-hidden="true"><small>Code</small>{c.code}</span>
            <div className="code-t">
              <h2 id={`code-${c.code}`}>{c.naam}</h2>
              <p>{c.tekst}</p>
              <span className="chip chip-oker">Wordt ingericht</span>
            </div>
          </section>
        ))}
        <Link to="/" className="knop knop-zacht knop-vol code-terug"><Icon naam="terug" maat={18} /> Terug naar start</Link>
      </div>
    </main>
  );
}
