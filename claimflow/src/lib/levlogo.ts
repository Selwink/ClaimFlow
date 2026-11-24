/** Supplier logos shown at the top of a claim. Matched on the supplier name, ignoring case, spaces and dashes. */
const LOGOS: Record<string, string> = {
  unitedcare: "leveranciers/unitedcare.png",
  eureva: "leveranciers/eureva-licht.png",
  umotion: "leveranciers/umotion-licht.png",
};
const sleutel = (naam?: string) => (naam || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function logoVan(naam?: string): string | null {
  const pad = LOGOS[sleutel(naam)];
  return pad ? `${import.meta.env.BASE_URL}${pad}` : null;
}
