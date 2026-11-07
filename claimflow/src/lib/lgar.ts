import type { Claim } from "./types";

/** Reads an LGAR form (PDF or text) and extracts claim fields. */

export async function leesBestand(file: File): Promise<string> {
  const naam = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || naam.endsWith(".pdf");
  if (!isPdf) return file.text();
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  let uit = "";
  for (let p = 1; p <= Math.min(doc.numPages, 12); p++) {
    const inhoud = await (await doc.getPage(p)).getTextContent();
    let r = "";
    for (const it of inhoud.items as Array<{ str?: string; hasEOL?: boolean }>) {
      r += it.str || "";
      if (it.hasEOL) { uit += r.trim() + "\n"; r = ""; } else r += " ";
    }
    if (r.trim()) uit += r.trim() + "\n";
  }
  return uit;
}

const REGELS: Array<{ k: keyof Claim; labels: string[]; lang?: boolean }> = [
  { k: "voorziening", labels: ["voorzieningsnummer", "voorzieningnummer", "voorzienings?\\s*nr\\.?", "voorziening"] },
  { k: "frame", labels: ["framenummer", "frame\\s*nummer", "frame\\s*nr\\.?", "serienummer", "frame"] },
  { k: "type", labels: ["type\\s*hulpmiddel", "hulpmiddel\\s*type", "type\\s*/?\\s*model", "hulpmiddel", "type"] },
  { k: "storing", labels: ["omschrijving\\s*(?:van\\s*)?(?:de\\s*)?storing", "klachtomschrijving", "storing", "klacht", "omschrijving"], lang: true },
  { k: "leverancier", labels: ["leverancier", "fabrikant", "merk"] },
  { k: "nummer", labels: ["claimnummer", "werkordernummer", "werkorder", "meldingsnummer"] },
  { k: "inkoopnummer", labels: ["inkoopnummer", "inkoop\\s*nr\\.?", "inkooporder", "bestelnummer"] },
  { k: "aankoop", labels: ["aankoopdatum", "datum\\s*(?:van\\s*)?aankoop", "aanschafdatum", "leverdatum"] },
  { k: "onderdeel", labels: ["vervangen\\s*onderdeel", "defect\\s*onderdeel", "onderdeel"] },
];
const EXTRA = ["monteur", "vestiging", "datum", "cli[eë]nt", "naam", "adres", "telefoon", "e-?mail", "aantal", "bedrag", "handtekening"];
const ALLE = REGELS.flatMap((r) => r.labels).concat(EXTRA);
const isLabel = (r: string) => ALLE.some((l) => new RegExp(`^\\s*(?:${l})\\s*(?:nr\\.?|nummer)?\\s*[:=]?\\s*$`, "i").test(r));

export function leesVelden(tekst: string, bekendeLeveranciers: string[]): Partial<Claim> {
  const regels = tekst.replace(/\r/g, "").split("\n").map((r) => r.replace(/\s+/g, " ").trim()).filter(Boolean);
  const uit: Partial<Record<keyof Claim, string>> = {};
  for (const v of REGELS) {
    for (const lab of v.labels) {
      const re = new RegExp(`(?:^|[^a-z])${lab}\\s*[:=\\u2013-]?\\s*(.*)$`, "i");
      const i = regels.findIndex((r) => re.test(r));
      if (i < 0) continue;
      let w = (regels[i].match(re)?.[1] || "").trim();
      if (v.lang) { const onder = regels[i + 1]; if (onder && !isLabel(onder)) w = onder; }
      else if (!w && regels[i + 1] && !isLabel(regels[i + 1])) w = regels[i + 1];
      for (const l of ALLE) {
        if (l === lab) continue;
        const m = w.match(new RegExp(`(?:^|[^a-z])${l}\\s*[:=]`, "i"));
        if (m && m.index != null) w = w.slice(0, m.index);
      }
      w = w.replace(/[\s:=,;.-]+$/, "").trim();
      if (w && !isLabel(w)) { uit[v.k] = w.slice(0, 400); break; }
    }
  }
  const match = bekendeLeveranciers.find((l) => new RegExp(`(?:^|[^a-z])${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`, "i").test(tekst));
  if (match) uit.leverancier = match;
  for (const k of ["nummer", "inkoopnummer"] as const) {
    const brok = uit[k]?.match(/\d[\d./ -]{2,}\d|\d{4,}/)?.[0];
    if (!brok) { delete uit[k]; continue; }
    const delen = brok.split("/").map((s) => s.replace(/\D/g, "")).filter(Boolean);
    uit[k] = k === "inkoopnummer" ? delen[delen.length - 1] : delen[0];
  }
  if (uit.aankoop) {
    const d = uit.aankoop.match(/\d{1,2}[-/. ]\d{1,2}[-/. ]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:19|20)\d{2}/)?.[0];
    if (d) uit.aankoop = d; else delete uit.aankoop;
  }
  return uit as Partial<Claim>;
}
