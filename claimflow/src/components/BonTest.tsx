import { useState } from "react";
import { bewaarBon, haalBonnen, verwijderFoto } from "../lib/api";
import { vandaag } from "../lib/format";
import { Icon } from "./Icon";

/** A test receipt the size of a real phone photo: noise compresses badly, so the JPEG ends up a few hundred KB. */
function testBeeld(): string {
  const c = document.createElement("canvas"); c.width = 1400; c.height = 1050;
  const x = c.getContext("2d")!; const d = x.createImageData(c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) { const v = 150 + Math.random() * 105; d.data[i] = v; d.data[i + 1] = v; d.data[i + 2] = v - 8; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  x.fillStyle = "#DA2F24"; x.font = "bold 64px sans-serif"; x.fillText("ClaimFlow bon-test", 80, 140);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Profiel → "Bonnen testen": stores a test receipt, reads it back and removes it, and says where it went wrong. */
export function BonTest() {
  const [stand, setStand] = useState<{ ok?: boolean; tekst: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  const test = async () => {
    setBezig(true); setStand({ tekst: "Testbon maken…" });
    const claim = `bontest-${Date.now().toString(36)}`;
    let id = "";
    try {
      const data = testBeeld();
      const kb = Math.round(data.length / 1024);
      setStand({ tekst: `Testbon van ${kb} KB opslaan…` });
      const t0 = performance.now();
      id = (await bewaarBon(claim, data, "bon-test", vandaag())).id;
      setStand({ tekst: "Teruglezen…" });
      const terug = await haalBonnen(claim);
      const gelijk = terug.length === 1 && terug[0].data === data;
      await verwijderFoto(id); id = "";
      const sec = ((performance.now() - t0) / 1000).toFixed(1).replace(".", ",");
      setStand(gelijk ? { ok: true, tekst: `Gelukt: een bon van ${kb} KB is opgeslagen, teruggelezen en weer verwijderd in ${sec} s. Bonnen opslaan werkt.` }
        : { ok: false, tekst: `De bon is opgeslagen maar kwam ${terug.length ? "niet compleet" : "niet"} terug. Stuur deze melding door.` });
    } catch (e) {
      if (id) await verwijderFoto(id).catch(() => undefined);
      setStand({ ok: false, tekst: `Mislukt: ${e instanceof Error && e.message ? e.message : "onbekende fout"}. Stuur deze melding door.` });
    } finally { setBezig(false); }
  };
  return (
    <>
      <button type="button" className="instelrij" onClick={test} disabled={bezig}>
        <span className="rij-ic"><Icon naam="document" maat={18} /></span>
        <span className="rij-t"><b>{bezig ? "Bezig met testen…" : "Bonnen testen"}</b><span>Slaat een testbon op, leest hem terug en haalt hem weer weg.</span></span>
        <Icon naam="verder" maat={16} />
      </button>
      {stand && <div className={`bontest-uitslag${stand.ok === true ? " ok" : stand.ok === false ? " fout" : ""}`} role="status">{stand.tekst}</div>}
    </>
  );
}
