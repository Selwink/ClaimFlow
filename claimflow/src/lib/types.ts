export type Status = "nieuw" | "ingediend" | "gehonoreerd" | "afgewezen";
export type Locatie = "binnen" | "buiten";

/** One entry in a claim's timeline. `w` = who, `soort: "status"` marks a status change. */
export interface Notitie {
  d: string;
  t: string;
  w?: string;
  soort?: "status";
  naar?: Status;
}

/** A warranty claim, as stored in the Supabase `claims` table. */
export interface Claim {
  id: string;
  nummer?: string;
  onderdeel?: string;
  voorziening?: string;
  type?: string;
  frame?: string;
  storing?: string;
  inkoopnummer?: string;
  leverancier?: string;
  aankoop?: string;
  bouwjaar?: string;
  bedrag?: number | null;
  datum?: string | null;
  periode?: string;
  status?: Status;
  locatie?: Locatie;
  uitbesteed?: boolean;
  bijzonderheden?: string;
  notities?: Notitie[];
  bijgewerkt?: string;
  verwijderd?: string | null;
}

export interface VastBedrag {
  woord: string;
  bedrag: number;
}

export interface Instellingen {
  vestiging: string;
  dagen: number;
  leveranciers: string[];
  uitbesteedLev: string[];
  levMail: Record<string, string>;
  autoInvoer: boolean;
  /** Send the Monday summary e-mail. */
  weekmail: boolean;
  /** Daily reminder e-mail (term almost up / over, supplier silent) on mornings when there is something to report. */
  herinnermail: boolean;
  /** E-mails on at all (new claim + weekly overview). Off: only the in-app pop-up. */
  mail: boolean;
  /** Monthly team goal: euros to get back. */
  maanddoel: number;
  prijzen: VastBedrag[];
}

export type Rol = "beheer" | "kijken";

export const STATUS_LABEL: Record<Status, string> = {
  nieuw: "Nieuw",
  ingediend: "Ingediend",
  gehonoreerd: "Gehonoreerd",
  afgewezen: "Afgewezen",
};
