import { useCallback, useEffect, useRef, useState } from "react";
import type { Claim } from "../lib/types";
import { REMOTE, bewaarFoto, haalFotos, verwijderFoto, type Foto } from "../lib/api";
import { verkleinFoto } from "../lib/foto";
import { metRegel, titelVan } from "../lib/claims";
import { datum, meervoud, vandaag } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

/** Photo strip on the claim page: add from camera or gallery, view full size, download, delete. */
export function Fotos({ claim }: { claim: Claim }) {
  const { magBewerken, naam, bewaar } = useStore();
  const toast = useToast();
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [bezig, setBezig] = useState(0);
  const [open, setOpen] = useState<Foto | null>(null);
  const kies = useRef<HTMLInputElement>(null);

  const laad = useCallback(async () => {
    if (!REMOTE) { setFotos([]); return; }
    try { setFotos(await haalFotos(claim.id)); } catch { setFotos([]); }
  }, [claim.id]);
  useEffect(() => { void laad(); }, [laad]);

  const voegToe = async (lijst: FileList | null) => {
    const bestanden = [...(lijst || [])].filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)).slice(0, 8);
    if (!bestanden.length) return;
    setBezig(bestanden.length);
    const nieuw: Foto[] = [];
    for (const f of bestanden) {
      try { nieuw.push(await bewaarFoto(claim.id, await verkleinFoto(f), naam, vandaag())); }
      catch { toast("Een foto kon niet worden opgeslagen"); }
      setBezig((n) => n - 1);
    }
    if (nieuw.length) {
      setFotos((o) => [...(o || []), ...nieuw]);
      await bewaar([metRegel(claim, meervoud(nieuw.length, "foto toegevoegd", "foto’s toegevoegd"), naam)], meervoud(nieuw.length, "foto opgeslagen", "foto’s opgeslagen"));
    }
  };

  const weg = async (f: Foto) => {
    try {
      await verwijderFoto(f.id);
      setFotos((o) => (o || []).filter((x) => x.id !== f.id));
      setOpen(null);
      await bewaar([metRegel(claim, "Foto verwijderd", naam)], "Foto verwijderd");
    } catch { toast("Verwijderen mislukt"); }
  };

  const aantal = fotos?.length ?? 0;
  return (
    <section className="kaart fotos">
      <div className="fotos-kop">
        <h2 className="sectiekop">Foto’s{aantal ? ` · ${aantal}` : ""}</h2>
        {magBewerken && (
          <button type="button" className="knop knop-zacht knop-klein" onClick={() => kies.current?.click()} disabled={bezig > 0}>
            <Icon naam="camera" maat={16} /> {bezig ? `Opslaan… (${bezig})` : "Foto toevoegen"}
          </button>
        )}
      </div>
      <input ref={kies} type="file" accept="image/*" multiple hidden onChange={(e) => { void voegToe(e.target.files); e.target.value = ""; }} />
      {fotos === null ? <div className="fotos-raster"><span className="foto-laden" /><span className="foto-laden" /></div>
        : aantal === 0 && !bezig ? (
          <button type="button" className="fotos-leeg" onClick={() => magBewerken && kies.current?.click()} disabled={!magBewerken}>
            <Icon naam="afbeelding" maat={22} />
            <span>{magBewerken ? "Handig als bewijs voor jezelf." : "Nog geen foto’s."}</span>
          </button>
        ) : (
          <div className="fotos-raster">
            {fotos.map((f, i) => (
              <button key={f.id} type="button" className="foto" onClick={() => setOpen(f)} aria-label={`Foto ${i + 1} bekijken`}>
                <img src={f.data} alt="" loading="lazy" />
              </button>
            ))}
            {Array.from({ length: bezig }, (_, i) => <span key={`b${i}`} className="foto-laden" />)}
          </div>
        )}

      <Sheet titel="Foto" open={!!open} sluit={() => setOpen(null)}
        voet={open && <>
          {magBewerken && <button type="button" className="knop knop-zacht" onClick={() => weg(open)}><Icon naam="prullenbak" maat={16} /> Verwijderen</button>}
          <a className="knop knop-rood" href={open.data} download={`${titelVan(claim).replace(/[^\w-]+/g, "-")}-${open.datum || "foto"}.jpg`}><Icon naam="download" maat={16} /> Downloaden</a>
        </>}>
        {open && <>
          <img className="foto-groot" src={open.data} alt={`Foto bij ${titelVan(claim)}`} />
          <p className="t-zacht">{[datum(open.datum), open.wie].filter(Boolean).join(" · ")}</p>
        </>}
      </Sheet>
    </section>
  );
}
