// Copies the Tesseract worker, wasm core and Dutch language data into public/ocr,
// so text recognition runs from our own domain instead of a CDN.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const doel = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "ocr");
mkdirSync(doel, { recursive: true });

const pakket = (naam) => dirname(require.resolve(`${naam}/package.json`));
const bestanden = [
  [join(pakket("tesseract.js"), "dist", "worker.min.js"), "worker.min.js"],
  [join(pakket("tesseract.js-core"), "tesseract-core-lstm.wasm.js"), "tesseract-core-lstm.wasm.js"],
  [join(pakket("tesseract.js-core"), "tesseract-core-simd-lstm.wasm.js"), "tesseract-core-simd-lstm.wasm.js"],
  [join(pakket("@tesseract.js-data/nld"), "4.0.0_best_int", "nld.traineddata.gz"), "nld.traineddata.gz"],
];
for (const [van, naar] of bestanden) {
  if (!existsSync(van)) throw new Error(`OCR-bestand ontbreekt: ${van}`);
  copyFileSync(van, join(doel, naar));
}
console.log(`OCR-bestanden klaar in public/ocr (${bestanden.length})`);
