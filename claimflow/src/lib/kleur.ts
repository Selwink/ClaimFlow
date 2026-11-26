/** Colour schemes for the layout, chosen per device in Profiel and remembered in this browser. */
export type Kleur = "rood" | "blauw" | "groen" | "paars" | "oranje" | "grafiet";
export const KLEUREN: Array<{ id: Kleur; naam: string; staal: string[] }> = [
  { id: "rood", naam: "Medipoint rood", staal: ["#DA2F24", "#2E9CB2", "#6CC8CA", "#F7D4DB"] },
  { id: "blauw", naam: "Oceaan blauw", staal: ["#2563EB", "#0E7490", "#9BD3E0", "#DCE7FB"] },
  { id: "groen", naam: "Bos groen", staal: ["#15803D", "#3F7D58", "#A7DCB5", "#E4F2D9"] },
  { id: "paars", naam: "Lavendel paars", staal: ["#7C3AED", "#5B4BB7", "#C9BEF7", "#F3D9EE"] },
  { id: "oranje", naam: "Zon oranje", staal: ["#C2410C", "#0F766E", "#9ED8CF", "#FDE3D0"] },
  { id: "grafiet", naam: "Grafiet", staal: ["#E11D48", "#334155", "#CBD5E1", "#F1D5DD"] },
];
const SLEUTEL = "claimflow-kleur";

export function leesKleur(): Kleur {
  try { const k = localStorage.getItem(SLEUTEL) as Kleur | null; return k && KLEUREN.some((x) => x.id === k) ? k : "rood"; } catch { return "rood"; }
}

export function zetKleur(k: Kleur) {
  if (k === "rood") delete document.documentElement.dataset.kleur; else document.documentElement.dataset.kleur = k;
  try { localStorage.setItem(SLEUTEL, k); } catch { /* no storage: the choice lasts until the page closes */ }
}

/** Light or dark appearance (Prime), per device; "auto" follows the phone or computer setting. */
export type Weergave = "aurora" | "groen" | "aurora-auto" | "licht" | "donker" | "auto";
const W_SLEUTEL = "claimflow-weergave";
export function leesWeergave(): Weergave {
  try { const w = localStorage.getItem(W_SLEUTEL) as Weergave | null; return w === "groen" || w === "aurora-auto" || w === "licht" || w === "donker" || w === "auto" ? w : "aurora"; } catch { return "aurora"; }
}
const mq = () => (typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null);
function pasToe(w: Weergave) {
  const aurora = w === "aurora" || w === "groen" || (w === "aurora-auto" && !!mq()?.matches);
  if (w === "groen") document.documentElement.dataset.aurora = "groen"; else delete document.documentElement.dataset.aurora;
  const donker = aurora || w === "donker" || (w === "auto" && !!mq()?.matches);
  if (aurora) document.documentElement.dataset.sfeer = "aurora"; else delete document.documentElement.dataset.sfeer;
  if (donker) document.documentElement.dataset.weergave = "donker"; else delete document.documentElement.dataset.weergave;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", w === "groen" ? "#06140F" : aurora ? "#07081A" : donker ? "#0B0C10" : "#FFFFFF");
}
export function zetWeergave(w: Weergave) {
  pasToe(w);
  try { localStorage.setItem(W_SLEUTEL, w); } catch { /* no storage */ }
}
/** Apply at start and keep following the system setting when on "auto". */
export function startWeergave() {
  pasToe(leesWeergave());
  mq()?.addEventListener?.("change", () => { const w = leesWeergave(); if (w === "auto" || w === "aurora-auto") pasToe(w); });
}
