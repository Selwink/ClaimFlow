import type { Instellingen } from "./types";

/** Settings are stored as one row with this id; its JSON lives in the `bijzonderheden` column. */
export const INST_ID = "_instellingen";

export const INST_STANDAARD: Instellingen = {
  vestiging: "Vestiging Meppel",
  dagen: 42,
  leveranciers: ["Direct Healthcare", "Eureva", "Mercado", "Sowecare", "UnitedCare", "Umotion", "Wellco"],
  uitbesteedLev: ["Wellco"],
  levMail: {},
  autoInvoer: true,
  weekmail: true,
  maanddoel: 3000,
  prijzen: [
    { woord: "speling", bedrag: 780 }, { woord: "beremd wiel", bedrag: 114 },
    { woord: "seatsupport", bedrag: 507 }, { woord: "seat support", bedrag: 507 }, { woord: "jukmotor", bedrag: 351 },
  ],
};

export function leesInstellingen(o: unknown): Instellingen {
  const x = (o && typeof o === "object" ? o : {}) as Partial<Instellingen>;
  return {
    vestiging: x.vestiging?.trim() || INST_STANDAARD.vestiging,
    dagen: Number(x.dagen) > 0 ? Math.round(Number(x.dagen)) : INST_STANDAARD.dagen,
    leveranciers: Array.isArray(x.leveranciers) && x.leveranciers.length ? x.leveranciers : INST_STANDAARD.leveranciers,
    uitbesteedLev: Array.isArray(x.uitbesteedLev) ? x.uitbesteedLev : INST_STANDAARD.uitbesteedLev,
    levMail: x.levMail && typeof x.levMail === "object" ? x.levMail : {},
    autoInvoer: x.autoInvoer !== false,
    weekmail: x.weekmail !== false,
    maanddoel: Number(x.maanddoel) > 0 ? Math.round(Number(x.maanddoel)) : INST_STANDAARD.maanddoel,
    prijzen: Array.isArray(x.prijzen) ? x.prijzen.filter((r) => r?.woord && Number(r.bedrag) > 0) : INST_STANDAARD.prijzen,
  };
}
