import type { Claim, Instellingen } from "./types";
import { isOpen, overTermijn, som, statusVan, titelVan } from "./claims";
import { euro } from "./format";
import { teruggehaaldPerMaand } from "./team";
import { werkbak } from "./werkbak";
import { GROEP } from "./werkbak";

/** Flow: answers questions about the register from the claims themselves. No outside service, nothing leaves the app. */
export interface Antwoord { tekst: string; punten?: Array<{ tekst: string; id?: string }> }

export const SUGGESTIES = [
  "Welke claims moeten deze week aandacht?",
  "Welke claims zijn te laat?",
  "Hoeveel hebben we deze maand teruggehaald?",
  "Welke leverancier levert het meest op?",
  "Wat staat er nog open?",
  "Hoe staat het maanddoel ervoor?",
];

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export function vraagFlow(vraag: string, claims: Claim[], inst: Instellingen): Antwoord {
  const v = vraag.toLowerCase();
  const actief = claims.filter((c) => !c.verwijderd);
  const lijst = (cs: Claim[]) => cs.slice(0, 8).map((c) => ({ tekst: `${titelVan(c)}${c.leverancier ? ` · ${c.leverancier}` : ""}${c.bedrag ? ` · ${euro(c.bedrag)}` : ""}`, id: c.id }));

  if (/te laat|over (de )?termijn|vam/.test(v)) {
    const laat = actief.filter((c) => overTermijn(c, inst.dagen));
    return laat.length ? { tekst: `${laat.length === 1 ? "Eén claim is" : `${laat.length} claims zijn`} over de termijn van ${inst.dagen} dagen. Vraag hier VAM aan:`, punten: lijst(laat) }
      : { tekst: `Geen enkele claim is over de termijn van ${inst.dagen} dagen. Mooi zo!` };
  }
  if (/aandacht|deze week|vandaag|doen|taken/.test(v)) {
    const t = werkbak(actief, inst.dagen).filter((x) => x.bak !== "wacht");
    return t.length ? { tekst: `Dit vraagt nu aandacht (${t.length}):`, punten: t.slice(0, 8).map((x) => ({ tekst: `${titelVan(x.claim)} · ${GROEP[x.reden]}`, id: x.claim.id })) }
      : { tekst: "Er staat niets dat nu moet. Alles is bij!" };
  }
  const maandNr = MAANDEN.findIndex((m) => v.includes(m));
  if (/teruggehaald|opgeleverd|leverde|verdiend|deze maand|vorige maand/.test(v) || maandNr >= 0) {
    const nu = new Date();
    let j = nu.getFullYear(), m = nu.getMonth();
    if (/vorige maand/.test(v)) { m -= 1; if (m < 0) { m = 11; j -= 1; } }
    if (maandNr >= 0) { m = maandNr; if (m > nu.getMonth()) j -= 1; }
    const k = `${j}-${String(m + 1).padStart(2, "0")}`;
    const r = teruggehaaldPerMaand(actief).get(k) || { bedrag: 0, aantal: 0 };
    return { tekst: `In ${MAANDEN[m]} ${j} is ${euro(r.bedrag)} teruggehaald, uit ${r.aantal} ${r.aantal === 1 ? "gehonoreerde claim" : "gehonoreerde claims"}.` };
  }
  if (/leverancier|meest|beste/.test(v)) {
    const m = new Map<string, number>();
    for (const c of actief) if (statusVan(c) === "gehonoreerd") m.set(c.leverancier || "Onbekend", (m.get(c.leverancier || "Onbekend") || 0) + (Number(c.bedrag) || 0));
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return top.length ? { tekst: `${top[0][0]} levert het meest op. De top ${top.length}:`, punten: top.map(([n, b]) => ({ tekst: `${n} · ${euro(b)}` })) } : { tekst: "Er zijn nog geen gehonoreerde claims." };
  }
  if (/open|nog|onderweg|wacht/.test(v)) {
    const open = actief.filter((c) => isOpen(c) && !c.uitbesteed);
    return { tekst: `Er staan ${open.length} claims open, samen ${euro(som(open))}.`, punten: lijst(open) };
  }
  if (/doel|maanddoel/.test(v)) {
    const k = new Date().toISOString().slice(0, 7);
    const geclaimd = som(actief.filter((c) => c.periode === k));
    const p = inst.maanddoel ? Math.round((geclaimd / inst.maanddoel) * 100) : 0;
    return { tekst: geclaimd >= inst.maanddoel ? `Het maanddoel is gehaald: ${euro(geclaimd)} van ${euro(inst.maanddoel)} (${p}%).` : `Deze maand ${euro(geclaimd)} van ${euro(inst.maanddoel)} (${p}%). Nog ${euro(inst.maanddoel - geclaimd)} te gaan.` };
  }
  const woorden = v.split(/\s+/).filter((w) => w.length > 2);
  const gevonden = actief.filter((c) => woorden.some((w) => [titelVan(c), c.leverancier, c.inkoopnummer, c.voorziening, c.frame, c.storing].some((x) => (x || "").toLowerCase().includes(w))));
  if (gevonden.length) return { tekst: `Ik vond ${gevonden.length} ${gevonden.length === 1 ? "claim" : "claims"}:`, punten: lijst(gevonden) };
  return { tekst: "Dat weet ik nog niet. Vraag bijvoorbeeld naar claims die te laat zijn, wat er openstaat, het maanddoel, een maand of een leverancier. Je kunt ook een naam, inkoop- of framenummer typen." };
}
