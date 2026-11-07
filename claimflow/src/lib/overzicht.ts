import type { Claim, Instellingen } from "./types";
import { dagenOpen, geenBedrag, isOpen, overTermijn, som, statusVan, titelVan } from "./claims";
import { datum, euro, euroKort, meervoud, periodLabel, vandaag } from "./format";

/** The Monday summary e-mail. Pure, so it runs both in the browser and in the scheduled Netlify function. */

const regels = (lijst: Claim[], extra: (c: Claim) => string, max = 12) => {
  const r = lijst.slice(0, max).map((c) => `• ${titelVan(c)}${c.leverancier ? ` (${c.leverancier})` : ""} — ${extra(c)}`);
  if (lijst.length > max) r.push(`… en nog ${lijst.length - max}`);
  return r.join("\n") || "Geen";
};

function sinds(c: Claim, van: string, test: (t: string, soort?: string, naar?: string) => boolean) {
  return (c.notities || []).some((n) => n.d >= van && test(n.t, n.soort, n.naar));
}

export function weekOverzicht(claims: Claim[], inst: Instellingen, adres: string): { onderwerp: string; velden: Record<string, string> } {
  const actief = claims.filter((c) => !c.verwijderd);
  const open = actief.filter((c) => isOpen(c) && !c.uitbesteed);
  const laat = open.filter((c) => overTermijn(c, inst.dagen)).sort((a, b) => (dagenOpen(b)?.dagen ?? 0) - (dagenOpen(a)?.dagen ?? 0));
  const zonderInkoop = open.filter((c) => !c.inkoopnummer);
  const nietIngediend = open.filter((c) => statusVan(c) === "nieuw");
  const binnenkort = open.filter((c) => !overTermijn(c, inst.dagen) && (dagenOpen(c)?.dagen ?? 0) >= inst.dagen - 7);

  const week = new Date(); week.setDate(week.getDate() - 7);
  const van = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, "0")}-${String(week.getDate()).padStart(2, "0")}`;
  const terug = actief.filter((c) => statusVan(c) === "gehonoreerd" && sinds(c, van, (_t, soort, naar) => soort === "status" && naar === "gehonoreerd"));
  const nieuw = actief.filter((c) => sinds(c, van, (t) => /^Claim (aangemaakt|vastgelegd)/.test(t)));

  const perLev = new Map<string, Claim[]>();
  for (const c of laat) perLev.set(c.leverancier || "Onbekend", [...(perLev.get(c.leverancier || "Onbekend") || []), c]);
  const bellen = [...perLev.entries()].sort((a, b) => som(b[1]) - som(a[1]))
    .map(([l, lijst]) => `• ${l}: ${meervoud(lijst.length, "claim", "claims")}, ${euroKort(som(lijst))}${inst.levMail[l] ? ` — ${inst.levMail[l]}` : ""}`).join("\n");

  const onderwerp = laat.length
    ? `Weekoverzicht garantieclaims: ${laat.length} over termijn, ${euroKort(som(open))} open`
    : `Weekoverzicht garantieclaims: alles binnen termijn, ${euroKort(som(open))} open`;

  return {
    onderwerp,
    velden: {
      _subject: onderwerp,
      Week: `t/m ${datum(vandaag())} · ${inst.vestiging}`,
      "Nog terug te halen": `${euro(som(open))} (${meervoud(open.length, "open claim", "open claims")})`,
      [`Over termijn (> ${inst.dagen} dagen)`]: regels(laat, (c) => `${dagenOpen(c)?.dagen} dagen${geenBedrag(c) ? "" : `, ${euroKort(c.bedrag)}`}`),
      "Deze week bellen": bellen || "Niemand — alles loopt binnen de termijn",
      "Termijn verloopt binnen 7 dagen": regels(binnenkort, (c) => `nog ${inst.dagen - (dagenOpen(c)?.dagen ?? 0)} dagen`),
      "Nog niet ingediend": regels(nietIngediend, (c) => `${dagenOpen(c)?.dagen ?? "?"} dagen oud`),
      "Inkoopnummer ontbreekt": regels(zonderInkoop, (c) => periodLabel(c.periode)),
      "Afgelopen week teruggehaald": terug.length ? `${euro(som(terug))} uit ${meervoud(terug.length, "claim", "claims")}` : "Niets",
      "Afgelopen week nieuw": meervoud(nieuw.length, "claim", "claims"),
      Register: adres,
    },
  };
}
