import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../state/Store";
import { SUGGESTIES, vraagFlow, type Antwoord } from "../lib/assistent";
import { Icon } from "../components/Icon";

interface Bericht { van: "ik" | "flow"; tekst: string; antwoord?: Antwoord }

/** Flow, the ClaimFlow assistant: a chat that answers from the register itself. */
export function Assistent() {
  const { actief, inst, naam } = useStore();
  const [zoek] = useSearchParams();
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [vraag, setVraag] = useState("");
  const eind = useRef<HTMLDivElement>(null);

  const stel = (v: string) => {
    const t = v.trim(); if (!t) return;
    setBerichten((b) => [...b, { van: "ik", tekst: t }, { van: "flow", tekst: "", antwoord: vraagFlow(t, actief, inst) }]);
    setVraag("");
  };
  const gesteld = useRef(false);
  useEffect(() => { const v = zoek.get("v"); if (v && !gesteld.current) { gesteld.current = true; stel(v); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { eind.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [berichten]);
  const verstuur = (e: FormEvent) => { e.preventDefault(); stel(vraag); };

  return (
    <div className="pagina pagina-smal flow">
      {berichten.length === 0 ? (
        <div className="flow-start">
          <span className="flow-bot" aria-hidden="true"><Icon naam="robot" maat={44} /></span>
          <h1>Hoi{naam ? ` ${naam.split(" ")[0]}` : ""}, ik ben Flow</h1>
          <p>Je claimhulp. Ik kijk in het register en geef antwoord.<br />Waar kan ik mee helpen?</p>
        </div>
      ) : (
        <div className="flow-gesprek" aria-live="polite">
          {berichten.map((b, i) => b.van === "ik" ? <p key={i} className="flow-ik">{b.tekst}</p> : (
            <div key={i} className="flow-antw"><span aria-hidden="true"><Icon naam="robot" maat={18} /></span>
              <div><p>{b.antwoord?.tekst}</p>
                {b.antwoord?.punten && <ul>{b.antwoord.punten.map((p, j) => <li key={j}>{p.id ? <Link to={`/claims/${p.id}`}>{p.tekst}</Link> : p.tekst}</li>)}</ul>}
              </div>
            </div>
          ))}
          <div ref={eind} />
        </div>
      )}
      <div className="flow-sug">{SUGGESTIES.map((s) => <button key={s} type="button" onClick={() => stel(s)}><Icon naam="vink" maat={14} /> {s}</button>)}</div>
      <form className="flow-invoer" onSubmit={verstuur}>
        <input value={vraag} onChange={(e) => setVraag(e.target.value)} placeholder="Vraag iets aan Flow…" aria-label="Vraag aan Flow" enterKeyHint="send" />
        <button type="submit" aria-label="Versturen" disabled={!vraag.trim()}><Icon naam="pijl" maat={18} /></button>
      </form>
      <p className="hint">Flow gebruikt alleen de gegevens in ClaimFlow. Er gaat niets naar buiten.</p>
    </div>
  );
}
