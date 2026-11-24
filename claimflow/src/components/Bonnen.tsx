import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Claim } from "../lib/types";
import { REMOTE, bewaarBon, haalBonLijst, haalBonnen, verwijderFoto, type Foto } from "../lib/api";
import { bonNaarAfbeeldingen } from "../lib/lgar";
import { metRegel, titelVan } from "../lib/claims";
import { datum, vandaag } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

/** Receipts that could not be stored right after a scan: kept for this session so the claim page retries them itself. */
const wachtend = new Map<string, { file: File; fout: string }>();
export function bonWacht(claimId: string, file: File, fout: string) { wachtend.set(claimId, { file, fout }); }
const foutTekst = (e: unknown) => (e instanceof Error && e.message ? e.message : "onbekende fout");

/** Stores a receipt (LGAR pdf or photo) with a claim. Used by the claim page and right after a scan. */
export async function slaBonOp(claimId: string, file: File, wie: string): Promise<Foto[]> {
  const beelden = await bonNaarAfbeeldingen(file);
  const uit: Foto[] = [];
  for (const b of beelden) {
    // one retry for a flaky connection
    try { uit.push(await bewaarBon(claimId, b, wie, vandaag())); }
    catch { await new Promise((r) => setTimeout(r, 1200)); uit.push(await bewaarBon(claimId, b, wie, vandaag())); }
  }
  if (uit.length) window.dispatchEvent(new Event("claimflow-bon"));
  return uit;
}

/** The receipt on the claim page: everyone can view it; administrators can add or remove one. */
export function Bonnen({ claim }: { claim: Claim }) {
  const { magBewerken, naam, bewaar } = useStore();
  const toast = useToast();
  const [bonnen, setBonnen] = useState<Foto[] | null>(null);
  const [bezig, setBezig] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [fout, setFout] = useState("");
  const kies = useRef<HTMLInputElement>(null);
  const geprobeerd = useRef(false);

  const laad = useCallback(async () => {
    if (!REMOTE) { setBonnen([]); return; }
    try { setBonnen(await haalBonnen(claim.id)); } catch { setBonnen([]); }
  }, [claim.id]);
  useEffect(() => { void laad(); const h = () => void laad(); window.addEventListener("claimflow-bon", h); return () => window.removeEventListener("claimflow-bon", h); }, [laad]);

  const voegToe = async (f?: File | null) => {
    if (!f) return;
    setBezig(true); setFout("");
    try {
      const nieuw = await slaBonOp(claim.id, f, naam);
      if (!nieuw.length) { toast("Kies een pdf of een foto van de bon"); return; }
      wachtend.delete(claim.id);
      setBonnen((o) => [...(o || []), ...nieuw]);
      await bewaar([metRegel(claim, `Bon toegevoegd: ${f.name || "foto"}`, naam)], "Bon opgeslagen");
    } catch (e) {
      wachtend.set(claim.id, { file: f, fout: foutTekst(e) });
      setFout(foutTekst(e));
      toast(`De bon kon niet worden opgeslagen: ${foutTekst(e)}`);
    } finally { setBezig(false); }
  };
  // a receipt that failed right after the scan is tried again here, once, without choosing it again
  useEffect(() => {
    const w = wachtend.get(claim.id);
    if (!w || geprobeerd.current || !magBewerken || bonnen === null || bonnen.length) return;
    geprobeerd.current = true;
    void voegToe(w.file);
  });
  const opnieuw = wachtend.get(claim.id);
  const weg = async (b: Foto) => {
    try {
      await verwijderFoto(b.id);
      setBonnen((o) => (o || []).filter((x) => x.id !== b.id));
      setOpen(null);
      await bewaar([metRegel(claim, "Bon verwijderd", naam)], "Bon verwijderd");
    } catch { toast("Verwijderen mislukt"); }
  };

  const aantal = bonnen?.length ?? 0;
  const scan = (claim.notities || []).find((n) => n.t.startsWith("Claim vastgelegd uit"))?.t.replace(/^Claim vastgelegd uit (scan van )?/, "");
  const huidig = open != null && bonnen ? bonnen[open] : null;
  return (
    <section className="kaart bonnen">
      <div className="fotos-kop">
        <h2 className="sectiekop">Bon{aantal > 1 ? ` · ${aantal} pagina’s` : ""}</h2>
        {magBewerken && (
          <button type="button" className="knop knop-zacht knop-klein" onClick={() => kies.current?.click()} disabled={bezig}>
            <Icon naam="document" maat={16} /> {bezig ? "Opslaan…" : aantal ? "Bon toevoegen" : "Bon koppelen"}
          </button>
        )}
      </div>
      <input ref={kies} type="file" accept=".pdf,application/pdf,image/*" hidden onChange={(e) => { void voegToe(e.target.files?.[0]); e.target.value = ""; }} />
      {fout && !bezig && (
        <div className="bon-fout" role="alert">
          <span>De bon is nog niet opgeslagen: {fout}</span>
          {opnieuw && <button type="button" className="knop knop-rood knop-klein" onClick={() => void voegToe(opnieuw.file)}>Opnieuw proberen</button>}
        </div>
      )}
      {bonnen === null ? <div className="bonnen-raster"><span className="foto-laden bon-laden" /></div>
        : aantal === 0 && !bezig ? (
          <button type="button" className="fotos-leeg" onClick={() => magBewerken && kies.current?.click()} disabled={!magBewerken}>
            <Icon naam="document" maat={22} />
            <span>{magBewerken
              ? (scan ? <>De bon van de scan (<b>{scan}</b>) is niet bewaard. Tik hier en kies hem opnieuw, dan kan iedereen hem hier inzien.</> : "Koppel de LGAR-bon (pdf of foto), dan kan iedereen hem hier inzien.")
              : "Er is nog geen bon gekoppeld."}</span>
          </button>
        ) : (
          <div className="bonnen-raster">
            {bonnen.map((b, i) => (
              <button key={b.id} type="button" className="bon" onClick={() => setOpen(i)} aria-label={`Bon pagina ${i + 1} bekijken`}>
                <img src={b.data} alt="" loading="lazy" />
                <span>Pagina {i + 1}</span>
              </button>
            ))}
            {bezig && <span className="foto-laden bon-laden" />}
          </div>
        )}
      <Sheet titel={`Bon${aantal > 1 && open != null ? ` · pagina ${open + 1} van ${aantal}` : ""}`} open={!!huidig} sluit={() => setOpen(null)}
        voet={huidig && <>
          {aantal > 1 && <button type="button" className="knop knop-zacht" disabled={open === 0} onClick={() => setOpen((i) => Math.max(0, (i ?? 0) - 1))}>Vorige</button>}
          {aantal > 1 && <button type="button" className="knop knop-zacht" disabled={open === aantal - 1} onClick={() => setOpen((i) => Math.min(aantal - 1, (i ?? 0) + 1))}>Volgende</button>}
          {magBewerken && <button type="button" className="knop knop-zacht" onClick={() => weg(huidig)}><Icon naam="prullenbak" maat={16} /> Verwijderen</button>}
          <a className="knop knop-rood" href={huidig.data} download={`bon-${titelVan(claim).replace(/[^\w-]+/g, "-")}-${(open ?? 0) + 1}.jpg`}><Icon naam="download" maat={16} /> Downloaden</a>
        </>}>
        {huidig && <>
          <img className="foto-groot bon-groot" src={huidig.data} alt={`Bon bij ${titelVan(claim)}`} />
          <p className="t-zacht">{[datum(huidig.datum), huidig.wie].filter(Boolean).join(" · ")}</p>
        </>}
      </Sheet>
    </section>
  );
}

// ---------- receipts from the claim list ----------
let bonLijst: Promise<Set<string>> | null = null;
const OPEN_BON = "claimflow-bon-open";
const NIEUW = "claimflow-bon";
/** Which claims have a receipt; fetched once and refreshed when a receipt is added. */
export function useBonLijst(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let weg = false;
    const laad = (vers = false) => {
      if (!REMOTE) return;
      if (!bonLijst || vers) bonLijst = haalBonLijst().then((l) => new Set(l)).catch(() => new Set<string>());
      void bonLijst.then((s) => { if (!weg) setIds(s); });
    };
    laad();
    const h = () => laad(true);
    window.addEventListener(NIEUW, h);
    return () => { weg = true; window.removeEventListener(NIEUW, h); };
  }, []);
  return ids;
}
export const openBon = (claim: Claim) => window.dispatchEvent(new CustomEvent(OPEN_BON, { detail: claim }));

/** Small receipt button for a row or card in the claim list. */
export function BonKnop({ claim, klein }: { claim: Claim; klein?: boolean }) {
  return (
    <button type="button" className={`bon-knop${klein ? " bon-knop-klein" : ""}`} aria-label={`Bon van ${titelVan(claim)} bekijken`} title="Bon bekijken"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); openBon(claim); }}>
      <Icon naam="document" maat={15} /><span>Bon</span>
    </button>
  );
}

/** Viewer for a claim's receipt, opened from the claim list. Mounted once in the layout. */
export function BonKijker() {
  const nav = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [bonnen, setBonnen] = useState<Foto[] | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const h = (e: Event) => {
      const c = (e as CustomEvent<Claim>).detail;
      setClaim(c); setBonnen(null); setI(0);
      haalBonnen(c.id).then(setBonnen).catch(() => setBonnen([]));
    };
    window.addEventListener(OPEN_BON, h);
    return () => window.removeEventListener(OPEN_BON, h);
  }, []);
  const b = bonnen?.[i];
  const n = bonnen?.length ?? 0;
  return (
    <Sheet titel={claim ? `Bon · ${titelVan(claim)}${n > 1 ? ` · ${i + 1}/${n}` : ""}` : "Bon"} open={!!claim} sluit={() => setClaim(null)}
      voet={claim && <>
        {n > 1 && <button type="button" className="knop knop-zacht" disabled={i === 0} onClick={() => setI((x) => Math.max(0, x - 1))}>Vorige</button>}
        {n > 1 && <button type="button" className="knop knop-zacht" disabled={i === n - 1} onClick={() => setI((x) => Math.min(n - 1, x + 1))}>Volgende</button>}
        <button type="button" className="knop knop-zacht" onClick={() => { const id = claim.id; setClaim(null); nav(`/claims/${id}`); }}>Naar de claim</button>
        {b && <a className="knop knop-rood" href={b.data} download={`bon-${titelVan(claim).replace(/[^\w-]+/g, "-")}-${i + 1}.jpg`}><Icon naam="download" maat={16} /> Downloaden</a>}
      </>}>
      {bonnen === null ? <div className="foto-laden bon-laden" style={{ maxWidth: 320, margin: "0 auto" }} />
        : b ? <img className="foto-groot bon-groot" src={b.data} alt={claim ? `Bon bij ${titelVan(claim)}` : "Bon"} />
          : <p className="t-zacht">Bij deze claim is geen bon gevonden.</p>}
    </Sheet>
  );
}
