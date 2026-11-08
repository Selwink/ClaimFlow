import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/Store";
import { metRegel } from "../lib/claims";
import { datum, meervoud } from "../lib/format";
import { logItems, OPDRACHT_LABEL, regelVoor, STATUS_LABEL, tabVan, VERVOERDERS, volgLink, type LogItem, type LogStatus, type Tab } from "../lib/logistiek";
import { Icon, type IconNaam } from "../components/Icon";
import { Leeg, Logo, Sheet } from "../components/ui";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "tedoen", label: "Te doen" }, { id: "verzonden", label: "Verzonden" }, { id: "opslag", label: "In opslag" }, { id: "afgerond", label: "Afgerond" },
];
const OPDRACHT_IC: Record<LogItem["opdracht"], IconNaam> = { retour: "vrachtwagen", vernietigen: "prullenbak", bewaren: "fabriek" };

/** The next steps that make sense for an item, in order of likelihood. */
function stappen(i: LogItem): Array<Exclude<LogStatus, "open">> {
  if (i.opdracht === "vernietigen") return i.status === "open" ? ["vernietigd"] : ["afgerond"];
  if (i.opdracht === "bewaren") return ["afgerond"];
  if (i.status === "open") return ["klaargezet", "verzonden"];
  if (i.status === "klaargezet") return ["verzonden"];
  if (i.status === "verzonden") return ["afgerond"];
  return [];
}

export function Logistiek() {
  const { actief, magBewerken, bewaar, naam } = useStore();
  const [tab, setTab] = useState<Tab>("tedoen");
  const [verzend, setVerzend] = useState<LogItem | null>(null);
  const [vervoer, setVervoer] = useState(VERVOERDERS[0]);
  const [tt, setTt] = useState("");
  const [bezig, setBezig] = useState(false);
  const items = useMemo(() => logItems(actief), [actief]);
  const perTab = (t: Tab) => items.filter((i) => tabVan(i) === t);
  const lijst = perTab(tab);
  useEffect(() => {
    const oud = document.title;
    document.title = "Logistiek Flow Medipoint";
    return () => { document.title = oud; };
  }, []);

  const zet = async (i: LogItem, status: Exclude<LogStatus, "open">, v?: string, code?: string) => {
    setBezig(true);
    await bewaar([metRegel(i.claim, regelVoor(status, v, code?.trim() || undefined), naam)], `${i.titel}: ${STATUS_LABEL[status].toLowerCase()}`, [i.claim]);
    setBezig(false);
  };
  const open = (i: LogItem) => { setVervoer(i.opdracht === "retour" ? VERVOERDERS[0] : VERVOERDERS[5]); setTt(""); setVerzend(i); };

  return (
    <main className="start logistiek">
      <div className="start-band">
        <div className="toegang-gloed" aria-hidden="true"><i /><i /><i /></div>
        <div className="start-binnen">
          <Link to="/" className="terugknop"><Icon naam="terug" maat={18} /> Terug naar start</Link>
          <Logo logistiek />
          <h1>Logistiek Flow<br /><span>{perTab("tedoen").length ? `${meervoud(perTab("tedoen").length, "onderdeel", "onderdelen")} te doen.` : "Alles is afgehandeld."}</span></h1>
        </div>
      </div>

      <div className="log-inhoud">
        <div className="teller log-teller" role="tablist" aria-label="Logistiek">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`teller-vak vak-${t.id}`} onClick={() => setTab(t.id)}>
              <span className="teller-label">{t.label}</span><b>{perTab(t.id).length}</b>
            </button>
          ))}
        </div>

        {lijst.length === 0 ? (
          <Leeg titel={tab === "tedoen" ? "Niets te doen" : "Nog niets hier"}
            tekst={tab === "tedoen" ? "Onderdelen verschijnen hier zodra je bij een claim de VAM-mail vastlegt: retour sturen, vernietigen of bewaren." : undefined}>
            {tab === "tedoen" && <Link to="/claims" className="knop knop-zacht">Naar de claims</Link>}
          </Leeg>
        ) : (
          <ul className="log-lijst">
            {lijst.map((i) => {
              const link = volgLink(i.vervoer, i.tt);
              return (
                <li key={i.claim.id} className={`log-kaart log-${i.opdracht}`}>
                  <div className="log-kop">
                    <span className="log-ic" aria-hidden="true"><Icon naam={OPDRACHT_IC[i.opdracht]} maat={20} /></span>
                    <Link to={`/claims/${i.claim.id}`} className="log-t">
                      <b>{i.titel}</b>
                      <span>{[i.claim.leverancier, i.claim.inkoopnummer && `ink ${i.claim.inkoopnummer}`].filter(Boolean).join(" · ")}</span>
                    </Link>
                    <span className={`chip ${i.status === "open" ? "chip-oker" : i.status === "klaargezet" ? "chip-grijs" : "chip-turk"}`}>{STATUS_LABEL[i.status]}</span>
                  </div>
                  <p className="log-sub">
                    <b>{OPDRACHT_LABEL[i.opdracht]}</b> · sinds {datum(i.sinds)}
                    {i.vervoer && <> · {i.vervoer}</>}
                    {i.tt && <> · T&amp;T {link ? <a href={link} target="_blank" rel="noreferrer">{i.tt}</a> : <span className="mono">{i.tt}</span>}</>}
                  </p>
                  {magBewerken && stappen(i).length > 0 && (
                    <div className="log-acties">
                      {stappen(i).map((s, n) => (
                        <button key={s} type="button" className={`knop knop-klein ${n === stappen(i).length - 1 ? "knop-rood" : "knop-zacht"}`} disabled={bezig}
                          onClick={() => (s === "verzonden" ? open(i) : zet(i, s))}>
                          <Icon naam={s === "verzonden" ? "vrachtwagen" : s === "vernietigd" ? "prullenbak" : "vink"} maat={16} /> {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet titel="Verzonden" open={!!verzend} sluit={() => setVerzend(null)}
        voet={<>
          <button type="button" className="knop knop-zacht" onClick={() => setVerzend(null)}>Annuleren</button>
          <button type="button" className="knop knop-rood" disabled={bezig} onClick={async () => { if (verzend) await zet(verzend, "verzonden", vervoer, tt); setVerzend(null); }}>Opslaan</button>
        </>}>
        {verzend && <p className="t-zacht"><b>{verzend.titel}</b> gaat retour naar {verzend.claim.leverancier || "de leverancier"}.</p>}
        <div className="veld"><span className="veld-label">Vervoerder</span>
          <div className="chiprij chiprij-wrap">{VERVOERDERS.map((v) => <button key={v} type="button" className="pil" aria-pressed={vervoer === v} onClick={() => setVervoer(v)}>{v}</button>)}</div>
        </div>
        <label className="veld"><span className="veld-label">Track-and-trace (optioneel)</span>
          <input value={tt} onChange={(e) => setTt(e.target.value)} className="mono" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Bijv. 3SABCD1234567" /></label>
      </Sheet>
    </main>
  );
}
