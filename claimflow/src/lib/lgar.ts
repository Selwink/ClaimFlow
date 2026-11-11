import type { Claim } from "./types";

/** Reads an LGAR form (text pdf, scanned pdf, photo or text file) and extracts claim fields. */

export interface LeesResultaat { tekst: string; ocr: boolean }
export type Voortgang = (stap: string, deel?: number) => void;

const isAfbeelding = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(f.name);
const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

async function laadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
}

/** Converts an image to a grey, contrast-boosted canvas of at most `max` px, which OCR reads far better. */
function voorbewerk(bron: CanvasImageSource, b: number, h: number, max = 2200): HTMLCanvasElement {
  const schaal = Math.min(1, max / Math.max(b, h));
  const c = document.createElement("canvas");
  c.width = Math.round(b * schaal); c.height = Math.round(h * schaal);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bron, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grijs = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (grijs - 128) * 1.35 + 140));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

async function afbeeldingNaarCanvas(file: File): Promise<HTMLCanvasElement> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return voorbewerk(bmp, bmp.width, bmp.height);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return voorbewerk(img, img.naturalWidth, img.naturalHeight);
    } finally { URL.revokeObjectURL(url); }
  }
}

/** Optical character recognition with Tesseract, self-hosted under /ocr (Dutch model). */
async function herken(beelden: HTMLCanvasElement[], voortgang?: Voortgang): Promise<string> {
  voortgang?.("Tekstherkenning laden", 0);
  const { createWorker } = await import("tesseract.js");
  const basis = `${location.origin}/ocr`;
  const worker = await createWorker("nld", 1, {
    workerPath: `${basis}/worker.min.js`, corePath: basis, langPath: basis, gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") voortgang?.("Tekst herkennen", m.progress);
    },
  });
  try {
    let tekst = "";
    for (let i = 0; i < beelden.length; i++) {
      if (beelden.length > 1) voortgang?.(`Pagina ${i + 1} van ${beelden.length} herkennen`, 0);
      tekst += (await worker.recognize(beelden[i])).data.text + "\n";
    }
    return tekst;
  } finally { await worker.terminate(); }
}

export async function leesBestand(file: File, voortgang?: Voortgang): Promise<LeesResultaat> {
  if (isAfbeelding(file)) return { tekst: await herken([await afbeeldingNaarCanvas(file)], voortgang), ocr: true };
  if (!isPdf(file)) return { tekst: await file.text(), ocr: false };

  voortgang?.("Pdf openen");
  const doc = await laadPdf(file);
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
  if (uit.replace(/\s/g, "").length >= 40) return { tekst: uit, ocr: false };

  // Scanned pdf: no text layer, so render the pages and recognise them.
  const beelden: HTMLCanvasElement[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
    voortgang?.(`Pagina ${p} omzetten`);
    const pagina = await doc.getPage(p);
    const vp = pagina.getViewport({ scale: 2.2 });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pagina.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    beelden.push(voorbewerk(c, c.width, c.height, 2600));
  }
  return { tekst: await herken(beelden, voortgang), ocr: true };
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
  const regels = tekst.replace(/\r/g, "").split("\n").map((r) => r.replace(/[|_~«»]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
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
  // The "aan:" line in the header is the supplier. Its legal form (B.V., N.V.) is dropped; a known name from the list wins.
  const aanRegel = regels.find((r) => /^aan\s*[:=]/i.test(r))?.replace(/^aan\s*[:=]\s*/i, "").trim();
  const schoon = aanRegel?.replace(/\b(b\.?\s?v\.?|n\.?\s?v\.?|gmbh|bv|nv)\b\.?/gi, "").replace(/[\s,.;:-]+$/, "").trim();
  const bekende = schoon ? bekendeLeveranciers.find((l) => l.toLowerCase() === schoon.toLowerCase()) : undefined;
  if (bekende) uit.leverancier = bekende;
  else if (schoon && schoon.length >= 2) uit.leverancier = schoon;
  else {
    const match = bekendeLeveranciers.find((l) => new RegExp(`(?:^|[^a-z])${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`, "i").test(tekst));
    if (match) uit.leverancier = match;
  }
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
