import { useRef, useState } from "react";
import { exportPagina, importRijen } from "../lib/api";
import { download } from "../lib/export";
import { meervoud, vandaag } from "../lib/format";
import { useStore } from "../state/Store";
import { useToast } from "../state/Toast";
import { Icon } from "./Icon";

/** Requests stay under this size; photo rows hold whole images. */
const MAX_BYTES = 1_500_000;

interface Bestand { soort: "claimflow-verhuizing"; gemaakt: string; rijen: Array<Record<string, unknown>> }

/** Moving the register to another database: export everything here, read it in at the new address. */
export function Verhuizen() {
  const { vernieuw } = useStore();
  const toast = useToast();
  const [bezig, setBezig] = useState("");
  const [fout, setFout] = useState("");
  const kies = useRef<HTMLInputElement>(null);

  const exporteer = async () => {
    setFout(""); setBezig("Exporteren…");
    try {
      const rijen: Bestand["rijen"] = [];
      for (let vanaf = 0; ; ) {
        const p = await exportPagina(vanaf);
        rijen.push(...p.rijen); vanaf += p.rijen.length;
        setBezig(`Exporteren… ${rijen.length} rijen`);
        if (!p.meer || !p.rijen.length) break;
      }
      const bestand: Bestand = { soort: "claimflow-verhuizing", gemaakt: new Date().toISOString(), rijen };
      download(`claimflow-verhuizing-${vandaag()}.json`, JSON.stringify(bestand), "application/json");
      toast(`Export klaar: ${meervoud(rijen.length, "rij", "rijen")}`);
    } catch (e) { setFout(`Exporteren mislukt: ${(e as Error).message}`); }
    setBezig("");
  };

  const leesIn = async (f?: File | null) => {
    if (!f) return;
    setFout(""); setBezig("Bestand lezen…");
    try {
      const b = JSON.parse(await f.text()) as Partial<Bestand>;
      if (b.soort !== "claimflow-verhuizing" || !Array.isArray(b.rijen)) throw new Error("Dit is geen ClaimFlow-verhuisbestand.");
      let klaar = 0, stapel: Bestand["rijen"] = [], grootte = 0;
      const stuur = async () => {
        if (!stapel.length) return;
        klaar += await importRijen(stapel);
        setBezig(`Inlezen… ${klaar} van ${b.rijen!.length}`);
        stapel = []; grootte = 0;
      };
      for (const r of b.rijen) {
        const n = JSON.stringify(r).length;
        if (stapel.length && (grootte + n > MAX_BYTES || stapel.length >= 200)) await stuur();
        stapel.push(r); grootte += n;
      }
      await stuur();
      await vernieuw();
      toast(`Verhuizing klaar: ${meervoud(klaar, "rij", "rijen")} ingelezen`);
    } catch (e) { setFout(`Inlezen mislukt: ${(e as Error).message}`); }
    setBezig("");
  };

  return (
    <div className="verhuizen">
      <p className="t-zacht">Alles in één bestand: claims, instellingen, accounts (met hun wachtwoorden), foto's en meldingen. Exporteer in de oude app en lees het bestand in de nieuwe in.</p>
      <div className="melding-acties">
        <button type="button" className="knop knop-zacht" disabled={!!bezig} onClick={() => void exporteer()}><Icon naam="download" maat={18} /> Alles exporteren</button>
        <button type="button" className="knop knop-zacht" disabled={!!bezig} onClick={() => kies.current?.click()}><Icon naam="upload" maat={18} /> Export inlezen</button>
      </div>
      <input ref={kies} type="file" accept=".json,application/json" hidden onChange={(e) => { void leesIn(e.target.files?.[0]); e.target.value = ""; }} />
      {bezig && <p role="status">{bezig}</p>}
      {fout && <div className="melding melding-rood" role="alert"><Icon naam="waarschuwing" /><div>{fout}</div></div>}
    </div>
  );
}
