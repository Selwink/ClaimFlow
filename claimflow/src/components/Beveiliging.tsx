import { useEffect, useState } from "react";
import { beveiliging } from "../lib/api";

type Status = Awaited<ReturnType<typeof beveiliging>>;

/** Shows how well the register is shielded, with the one next step when something is still open. */
export function Beveiliging() {
  const [s, setS] = useState<Status | null | "fout">(null);
  useEffect(() => { beveiliging().then(setS).catch(() => setS("fout")); }, []);
  if (s === null) return <div className="mailstatus ms-onbekend"><i /><span>Beveiliging controleren…</span></div>;
  if (s === "fout") return <div className="mailstatus ms-onbekend"><i /><span>Beveiliging kon niet worden gecontroleerd.</span></div>;

  const punten: Array<{ ok: boolean; tekst: JSX.Element }> = [
    { ok: true, tekst: <>Eigen accounts; wachtwoorden versleuteld opgeslagen.</> },
    { ok: s.sleutel !== "nood", tekst: s.sleutel === "nood"
      ? <>Noodsleutel voor de inlogpassen in gebruik. Zet <code>TOKEN_GEHEIM</code> in Netlify.</>
      : <>Inlogpassen ondertekend met een geheime sleutel{s.sleutel === "server" ? " (door de server aangemaakt)" : ""}.</> },
    { ok: s.serviceSleutel, tekst: s.serviceSleutel ? <>Server gebruikt de service-sleutel.</> : <>Zet <code>SUPABASE_SERVICE_KEY</code> in Netlify.</> },
    { ok: !s.tabelOpen, tekst: s.tabelOpen ? <>Database nog direct bereikbaar: voer daarna <code>supabase-afschermen.sql</code> uit.</> : <>Database alleen via ClaimFlow bereikbaar.</> },
  ];
  const alles = punten.every((p) => p.ok);
  return (
    <>
      <div className={`mailstatus ${alles ? "ms-ok" : "ms-reserve"}`}><i />
        <span><b>{alles ? "Volledig afgeschermd." : "Nog niet volledig afgeschermd."}</b> {alles ? "De database is alleen via ClaimFlow bereikbaar." : "Zie de punten hieronder."}</span>
      </div>
      <ul className="beveiliging-punten">
        {punten.map((p, i) => <li key={i} className={p.ok ? "ok" : "open"}><span aria-hidden="true">{p.ok ? "✓" : "!"}</span><span>{p.tekst}</span></li>)}
      </ul>
    </>
  );
}
