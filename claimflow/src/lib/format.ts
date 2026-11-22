const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const euroKortFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const euro = (n: number | null | undefined) => euroFmt.format(Number(n) || 0);
export const euroKort = (n: number | null | undefined) => euroKortFmt.format(Number(n) || 0);

export const isPeriode = (p?: string) => /^\d{4}-\d{2}$/.test(p || "");

const hoofd = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function periodLabel(p?: string): string {
  if (!p || !isPeriode(p)) return "Zonder periode";
  const [y, m] = p.split("-");
  return `${hoofd(MAANDEN[Number(m) - 1])} ${y}`;
}

export function periodKort(p?: string): string {
  if (!p || !isPeriode(p)) return "Overig";
  const [y, m] = p.split("-");
  return `${hoofd(MAANDEN[Number(m) - 1].slice(0, 3))} '${y.slice(2)}`;
}

export function vandaag(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const dezeMaand = () => vandaag().slice(0, 7);

export function dag(iso: string): Date | null {
  const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function datum(iso?: string | null): string {
  const d = iso ? dag(iso) : null;
  return d ? d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export const meervoud = (n: number, een: string, veel: string) => `${n} ${n === 1 ? een : veel}`;

export function parseBedrag(v: string): number | null {
  if (!v.trim()) return null;
  const s = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function nieuwId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export async function sha256(tekst: string): Promise<string | null> {
  if (!crypto?.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function geleden(t?: number): string {
  if (!t) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  return new Date(t).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export const ls = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* opslag vol of geblokkeerd */ }
  },
  del(k: string) {
    try { localStorage.removeItem(k); } catch { /* idem */ }
  },
  json<T>(k: string): T | null {
    try { return JSON.parse(localStorage.getItem(k) || "null") as T; } catch { return null; }
  },
};
