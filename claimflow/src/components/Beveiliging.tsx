import { useEffect, useState } from "react";
import { beveiliging } from "../lib/api";

/** Shows whether the database is shielded from direct access. */
export function Beveiliging() {
  const [s, setS] = useState<{ serviceSleutel: boolean; tabelOpen: boolean } | null | "fout">(null);
  useEffect(() => { beveiliging().then(setS).catch(() => setS("fout")); }, []);
  if (s === null) return <div className="mailstatus ms-onbekend"><i /><span>Beveiliging controleren…</span></div>;
  if (s === "fout") return <div className="mailstatus ms-onbekend"><i /><span>Beveiliging kon niet worden gecontroleerd.</span></div>;
  if (s.serviceSleutel && !s.tabelOpen) return <div className="mailstatus ms-ok"><i /><span><b>Afgeschermd.</b> De database is alleen via ClaimFlow bereikbaar.</span></div>;
  return (
    <div className="mailstatus ms-reserve"><i />
      <span><b>Nog niet volledig afgeschermd.</b>{" "}
        {!s.serviceSleutel ? <>Zet <code>SUPABASE_SERVICE_KEY</code> in Netlify.</> : <>Voer <code>supabase-afschermen.sql</code> uit in Supabase.</>}
      </span>
    </div>
  );
}
