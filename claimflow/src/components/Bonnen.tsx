import { useCallback, useEffect, useRef, useState } from "react";
import type { Claim } from "../lib/types";
import { REMOTE, bewaarBon, haalBonnen, verwijderFoto, type Foto } from "../lib/api";
import { bonNaarAfbeeldingen } from "../lib/lgar";
import { metRegel, titelVan } from "../lib/claims";
import { datum, vandaag } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

/** Stores a receipt (LGAR pdf or photo) with a claim. Used by the claim page and right after a scan. */
export async function slaBonOp(claimId: string, file: File, wie: string): Promise<Foto[]> {
  const beelden = await bonNaarAfbeeldingen(file);
  const uit: Foto[] = [];
  for (const b of beelden) uit.push(await bewaarBon(claimId, b, wie, vandaag()));
  return uit;
}

/** The receipt on the claim page: everyone can view it; administrators can add or remove one. */
export function Bonnen({ claim }: { claim: Claim }) {
  const { magBewerken, naam, bewaar } = useStore();
  const toast = useToast();
  const [bonnen, setBonnen] = useState<Foto[] | null>(null);
  const [bezig, setBezig] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const kies = useRef<HTMLInputElement>(null);

  const laad = useCallback(async () => {
    if (!REMOTE) { setBonnen([]); return; }
    try { setBonnen(await haalBonnen(claim.id)); } catch { setBonnen([]); }
  }, [claim.id]);
  useEffect(() => { void laad(); }, [laad]);

  const voegToe = async (f?: File | null) => {
    if (!f) return;
    setBezig(true);
    try {
      const nieuw = await slaBonOp(claim.id, f, naam);
      if (!nieuw.length) { toast("Kies een pdf of een foto van de bon"); return; }
      setBonnen((o) => [...(o || []), ...nieuw]);
      await bewaar([metRegel(claim, `Bon toegevoegd: ${f.name || "foto"}`, naam)], "Bon opgeslagen");
    } catch { toast("De bon kon niet worden opgeslagen"); }
    finally { setBezig(false); }
  };
  const weg = async (b: Foto) => {
    try {
      await verwijderFoto(b.id);
      setBonnen((o) => (o || []).filter((x) => x.id !== b.id));
      setOpen(null);
      await bewaar([metRegel(claim, "Bon verwijderd", naam)], "Bon verwijderd");
    } catch { toast("Verwijderen mislukt"); }
  };

  const aantal = bonnen?.length ?? 0;
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
      {bonnen === null ? <div className="bonnen-raster"><span className="foto-laden bon-laden" /></div>
        : aantal === 0 && !bezig ? (
          <button type="button" className="fotos-leeg" onClick={() => magBewerken && kies.current?.click()} disabled={!magBewerken}>
            <Icon naam="document" maat={22} />
            <span>{magBewerken ? "Koppel de LGAR-bon (pdf of foto), dan kan iedereen hem hier inzien." : "Er is nog geen bon gekoppeld."}</span>
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
