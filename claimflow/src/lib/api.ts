import type { Claim, Instellingen, Rol } from "./types";
import { ls } from "./format";

/**
 * Client for /.netlify/functions/data. The browser never talks to the database directly:
 * it logs in once, gets a signed pass, and sends that pass with every request.
 */

const FUNCTIE = "/.netlify/functions/data";
const SLEUTEL_PAS = "claimflow-pas";
export const REMOTE = true;

/** Thrown when the pass is missing or expired: the app returns to the login screen. */
export class Uitgelogd extends Error {}

export const pas = {
  get: () => ls.json<{ token: string; rol: Rol; verloopt: number }>(SLEUTEL_PAS),
  zet: (p: { token: string; rol: Rol; verloopt: number }) => ls.set(SLEUTEL_PAS, JSON.stringify(p)),
  wis: () => ls.del(SLEUTEL_PAS),
};

async function vraag<T>(actie: string, opties: { body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const p = pas.get();
  const qs = new URLSearchParams({ actie, ...(opties.query || {}) });
  const r = await fetch(`${FUNCTIE}?${qs}`, {
    method: opties.body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(p ? { Authorization: `Bearer ${p.token}` } : {}) },
    body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
  });
  const j = (await r.json().catch(() => ({}))) as T & { fout?: string };
  if (r.status === 401 && actie !== "login") { pas.wis(); throw new Uitgelogd(j.fout || "Log opnieuw in"); }
  if (!r.ok) throw new Error(j.fout || `Fout ${r.status}`);
  return j;
}

export async function login(wachtwoord: string): Promise<Rol | null> {
  try {
    const r = await vraag<{ token: string; rol: Rol; verloopt: number }>("login", { body: { wachtwoord } });
    pas.zet(r);
    return r.rol;
  } catch (e) {
    if (e instanceof Error && /wachtwoord klopt niet/i.test(e.message)) return null;
    throw e;
  }
}

export const haalAlles = () => vraag<{ rol: Rol; claims: Claim[]; inst: Instellingen | null }>("alles");
export const bewaarClaims = (claims: Claim[]) => vraag("bewaar", { body: { claims } }).then(() => undefined);
export const verwijderClaim = (id: string) => vraag("verwijder", { body: { id } }).then(() => undefined);
export const bewaarInstellingen = (inst: Instellingen) => vraag("instellingen", { body: { inst } }).then(() => undefined);

export interface Foto { id: string; claim: string; data: string; datum: string; wie: string }
export const haalFotos = (claim: string) => vraag<{ fotos: Foto[] }>("fotos", { query: { claim } }).then((r) => r.fotos);
export const bewaarFoto = (claim: string, data: string, wie: string, datum: string) => vraag<{ foto: Foto }>("foto", { body: { claim, data, wie, datum } }).then((r) => r.foto);
export const verwijderFoto = (id: string) => vraag("fotoweg", { body: { id } }).then(() => undefined);

export interface BackupInfo { id: string; datum: string; aantal: number; opslag: "netlify" | "database" }
export const haalBackups = () => vraag<{ backups: BackupInfo[] }>("backups").then((r) => r.backups);
export const maakBackup = () => vraag<{ backup: BackupInfo }>("backup", { body: {} }).then((r) => r.backup);
export const backupInhoud = (id: string) => vraag<{ gemaakt: string; aantal: number; rijen: unknown[] }>("backupinhoud", { query: { id } });
export const herstelBackup = (id: string) => vraag<{ teruggezet: number }>("herstel", { body: { id } }).then((r) => r.teruggezet);
export const beveiliging = () => vraag<{ serviceSleutel: boolean; tabelOpen: boolean }>("beveiliging");
