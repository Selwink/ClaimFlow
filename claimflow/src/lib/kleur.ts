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
