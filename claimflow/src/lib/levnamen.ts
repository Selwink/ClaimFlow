/** Old supplier names that now go by another name. Applied when data is loaded, typed or scanned. */
const OUD_NIEUW: Record<string, string> = {
  wellco: "Aleidis Fitform",
};
const sleutel = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
export function levNaam(n?: string): string | undefined {
  if (!n) return n;
  return OUD_NIEUW[sleutel(n)] || n;
}
export const isOudeNaam = (n?: string) => !!n && !!OUD_NIEUW[sleutel(n)];
export const levLijst = (l: string[]) => [...new Set(l.map((x) => levNaam(x) || x))];
