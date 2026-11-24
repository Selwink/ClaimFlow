import type { Claim, Instellingen, Rol } from "./types";
import { ls } from "./format";
import { functie } from "./config";

/**
 * Client for /.netlify/functions/data. The browser never talks to the database directly:
 * it logs in once, gets a signed pass, and sends that pass with every request.
 */

const FUNCTIE = functie("data");
const SLEUTEL_PAS = "claimflow-pas";
export const REMOTE = true;

/** Thrown when the pass is missing or expired: the app returns to the login screen. */
export class Uitgelogd extends Error {}

export interface PasInfo { token: string; rol: Rol; naam: string; verloopt: number }
export const pas = {
  get: () => ls.json<PasInfo>(SLEUTEL_PAS),
  zet: (p: PasInfo) => ls.set(SLEUTEL_PAS, JSON.stringify(p)),
  wis: () => ls.del(SLEUTEL_PAS),
};
const OPEN = new Set(["login", "aanmelden", "herstel"]);

async function vraag<T>(actie: string, opties: { body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const p = pas.get();
  const qs = new URLSearchParams({ actie, ...(opties.query || {}) });
  const r = await fetch(`${FUNCTIE}?${qs}`, {
    method: opties.body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(p ? { Authorization: `Bearer ${p.token}` } : {}) },
    body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
  });
  const j = (await r.json().catch(() => ({}))) as T & { fout?: string };
  if (r.status === 401 && !OPEN.has(actie) && actie !== "wachtwoord") { pas.wis(); throw new Uitgelogd(j.fout || "Log opnieuw in"); }
  if (!r.ok) throw new Error(j.fout || `Fout ${r.status}`);
  return j;
}

/** Log in, create an account, or set a new password after a reset. Throws an Error with a readable message. */
async function metPas(actie: "login" | "aanmelden" | "herstel" | "wachtwoord", body: Record<string, string>): Promise<PasInfo> {
  const r = await vraag<PasInfo>(actie, { body });
  pas.zet(r);
  return r;
}
export const login = (naam: string, code: string) => metPas("login", { naam, code });
/** Creates an account. The first account logs straight in; later ones wait for approval and get `{ wacht: true }`. */
export async function aanmelden(naam: string, wachtwoord: string, code: string): Promise<PasInfo | { wacht: true; naam: string }> {
  const r = await vraag<PasInfo | { wacht: true; naam: string }>("aanmelden", { body: { naam, wachtwoord, code } });
  if ("token" in r) pas.zet(r);
  return r;
}
export const herstelWachtwoord = (naam: string, code: string, wachtwoord: string) => metPas("herstel", { naam, code, wachtwoord });
export const wijzigWachtwoord = (oud: string, nieuw: string) => metPas("wachtwoord", { oud, nieuw });

export interface Account { sleutel: string; naam: string; rol: Rol; actief: boolean; gemaakt: string; laatst?: string; reset?: boolean; wacht?: boolean; ikzelf: boolean }
export const haalGebruikers = () => vraag<{ gebruikers: Account[] }>("gebruikers").then((r) => r.gebruikers);
export const wijzigGebruiker = (sleutel: string, wat: "rol" | "keur" | "blokkeer" | "activeer" | "reset" | "verwijder", rol?: Rol) =>
  vraag("gebruiker", { body: { sleutel, wat, rol: rol || "" } }).then(() => undefined);

export const haalAlles = () => vraag<{ rol: Rol; naam: string; claims: Claim[]; inst: Instellingen | null }>("alles");
export const bewaarClaims = (claims: Claim[]) => vraag("bewaar", { body: { claims } }).then(() => undefined);
export const verwijderClaim = (id: string) => vraag("verwijder", { body: { id } }).then(() => undefined);
export const bewaarInstellingen = (inst: Instellingen) => vraag("instellingen", { body: { inst } }).then(() => undefined);

export interface Foto { id: string; claim: string; data: string; datum: string; wie: string }
export const haalFotos = (claim: string) => vraag<{ fotos: Foto[] }>("fotos", { query: { claim } }).then((r) => r.fotos);
/** Pieces of at most this many characters per request, so a large image never hits a size limit on the way. */
const DEEL = 120_000;
/** Stores an image in pieces: the first request creates the row, the rest add to it. A half-stored image is removed again. */
async function bewaarBijlage(claim: string, data: string, wie: string, datum: string, soort?: "bon"): Promise<Foto> {
  const delen: string[] = [];
  for (let i = 0; i < data.length; i += DEEL) delen.push(data.slice(i, i + DEEL));
  const { foto } = await vraag<{ foto: Foto }>("foto", { body: { claim, data: delen[0], wie, datum, soort, delen: delen.length } });
  try {
    for (let n = 1; n < delen.length; n++) await vraag("fotodeel", { body: { id: foto.id, n, data: delen[n] } });
  } catch (e) {
    await vraag("fotoweg", { body: { id: foto.id } }).catch(() => undefined);
    throw e;
  }
  return { ...foto, data };
}
export const bewaarFoto = (claim: string, data: string, wie: string, datum: string) => bewaarBijlage(claim, data, wie, datum);
export const haalBonnen = (claim: string) => vraag<{ fotos: Foto[] }>("fotos", { query: { claim, soort: "bon" } }).then((r) => r.fotos);
export const bewaarBon = (claim: string, data: string, wie: string, datum: string) => bewaarBijlage(claim, data, wie, datum, "bon");
export const haalBonLijst = () => vraag<{ claims: string[] }>("bonlijst").then((r) => r.claims);
export const verwijderFoto = (id: string) => vraag("fotoweg", { body: { id } }).then(() => undefined);

export interface BackupInfo { id: string; datum: string; aantal: number; opslag: "netlify" | "database" }
export const haalBackups = () => vraag<{ backups: BackupInfo[] }>("backups").then((r) => r.backups);
export const maakBackup = () => vraag<{ backup: BackupInfo }>("backup", { body: {} }).then((r) => r.backup);
export const backupInhoud = (id: string) => vraag<{ gemaakt: string; aantal: number; rijen: unknown[] }>("backupinhoud", { query: { id } });
export const herstelBackup = (id: string) => vraag<{ teruggezet: number }>("herstel", { body: { id } }).then((r) => r.teruggezet);
/** Moving to another database: one page of every row, and writing exported rows into this database. */
export const exportPagina = (vanaf: number) => vraag<{ rijen: Array<Record<string, unknown>>; meer: boolean }>("export", { query: { vanaf: String(vanaf) } });
export const importRijen = (rijen: Array<Record<string, unknown>>) => vraag<{ aantal: number }>("import", { body: { rijen } }).then((r) => r.aantal);
export const beveiliging = () => vraag<{ serviceSleutel: boolean; tabelOpen: boolean; sleutel: "variabele" | "server" | "nood" }>("beveiliging");
