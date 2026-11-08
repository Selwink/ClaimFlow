import { CONFIG, INST_ID } from "./config";
import type { Claim, Instellingen } from "./types";
import { ls } from "./format";

/** Thin REST client for the Supabase `claims` table (no SDK needed). */

const BASE = CONFIG.SUPABASE_URL.replace(/\/+$/, "");
const API = `${BASE}/rest/v1/${CONFIG.TABEL}`;
/** Photos live in the same table as rows with id `_foto:<claimId>:<uuid>`, so no schema change is needed. */
const FOTO = "_foto:";
export const REMOTE = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);

const KOLOMMEN = ["id", "nummer", "onderdeel", "voorziening", "type", "frame", "storing", "inkoopnummer", "leverancier", "aankoop",
  "bouwjaar", "bedrag", "datum", "periode", "status", "locatie", "uitbesteed", "bijzonderheden", "notities", "bijgewerkt", "verwijderd"] as const;

const SLEUTEL_ONBEKEND = "claimflow-onbekende-kolommen";
const onbekend = new Set<string>(ls.json<string[]>(SLEUTEL_ONBEKEND) || []);

const kop = (extra?: Record<string, string>) => ({
  apikey: CONFIG.SUPABASE_KEY,
  Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
  "Content-Type": "application/json",
  ...extra,
});

export const INST_STANDAARD: Instellingen = {
  vestiging: "Vestiging Meppel",
  dagen: 42,
  leveranciers: ["Direct Healthcare", "Eureva", "Mercado", "Sowecare", "UnitedCare", "Umotion", "Wellco"],
  uitbesteedLev: ["Wellco"],
  levMail: {},
  autoInvoer: true,
  weekmail: true,
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
    prijzen: Array.isArray(x.prijzen) ? x.prijzen.filter((r) => r?.woord && Number(r.bedrag) > 0) : INST_STANDAARD.prijzen,
  };
}

function naarRij(c: Claim): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const k of KOLOMMEN) {
    if (onbekend.has(k)) continue;
    let v = (c as unknown as Record<string, unknown>)[k];
    if (k === "notities") v = Array.isArray(v) ? v : [];
    else if (k === "uitbesteed") v = !!v;
    else if (k === "bedrag") v = v == null || v === "" ? null : Number(v);
    else if (v === undefined || v === "") v = k === "verwijderd" || k === "datum" ? null : "";
    r[k] = v;
  }
  return r;
}

export async function haalAlles(): Promise<{ claims: Claim[]; inst: Instellingen | null }> {
  const r = await fetch(`${API}?select=*&id=not.like.${encodeURIComponent(`${FOTO}*`)}`, { headers: kop() });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  const rows = (await r.json()) as Array<Record<string, unknown>>;
  const instRij = rows.find((x) => x.id === INST_ID);
  let inst: Instellingen | null = null;
  if (instRij) {
    try { inst = leesInstellingen(JSON.parse(String(instRij.bijzonderheden || "{}"))); } catch { inst = null; }
  }
  const claims = rows
    .filter((x) => x.id && !String(x.id).startsWith("_"))
    .map((x) => ({
      ...(x as unknown as Claim),
      bedrag: x.bedrag == null || x.bedrag === "" ? null : Number(x.bedrag),
      notities: Array.isArray(x.notities) ? (x.notities as Claim["notities"]) : [],
    }));
  return { claims, inst };
}

/** Upsert claims. Columns unknown to the table are dropped and remembered. */
export async function bewaarClaims(claims: Claim[]): Promise<void> {
  for (let poging = 0; poging < KOLOMMEN.length; poging++) {
    const body = claims.map(naarRij);
    const r = await fetch(API, { method: "POST", headers: kop({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(body) });
    if (r.ok) return;
    const t = await r.text().catch(() => "");
    const m = t.match(/'([a-z_]+)' column/i) || t.match(/column "?([a-z_]+)"? (?:of|does)/i);
    if (m && m[1] !== "id" && !onbekend.has(m[1])) {
      onbekend.add(m[1]);
      ls.set(SLEUTEL_ONBEKEND, JSON.stringify([...onbekend]));
      continue;
    }
    throw new Error(`POST ${r.status}`);
  }
}

export async function verwijderClaim(id: string): Promise<void> {
  const r = await fetch(`${API}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: kop() });
  if (!r.ok) throw new Error(`DELETE ${r.status}`);
  await fetch(`${API}?id=like.${encodeURIComponent(`${FOTO}${id}:*`)}`, { method: "DELETE", headers: kop() }).catch(() => undefined);
}

export interface Foto { id: string; claim: string; data: string; datum: string; wie: string }

export async function haalFotos(claimId: string): Promise<Foto[]> {
  const r = await fetch(`${API}?select=id,nummer,bijzonderheden,bijgewerkt,type&id=like.${encodeURIComponent(`${FOTO}${claimId}:*`)}`, { headers: kop() });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  const rows = (await r.json()) as Array<Record<string, string>>;
  return rows
    .filter((x) => x.id?.startsWith(`${FOTO}${claimId}:`) && /^data:image\//.test(x.bijzonderheden || ""))
    .map((x) => ({ id: x.id, claim: x.nummer, data: x.bijzonderheden, datum: x.bijgewerkt || "", wie: x.type || "" }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.id.localeCompare(b.id));
}

export async function bewaarFoto(claimId: string, data: string, wie: string, datum: string): Promise<Foto> {
  const id = `${FOTO}${claimId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await bewaarClaims([{ id, nummer: claimId, type: wie, onderdeel: "foto", bijzonderheden: data, bijgewerkt: datum, status: "nieuw", locatie: "binnen", periode: "" } as Claim]);
  return { id, claim: claimId, data, datum, wie };
}

export const verwijderFoto = (id: string) => fetch(`${API}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: kop() })
  .then((r) => { if (!r.ok) throw new Error(`DELETE ${r.status}`); });

export async function bewaarInstellingen(inst: Instellingen): Promise<void> {
  await bewaarClaims([{ id: INST_ID, onderdeel: "", nummer: "", leverancier: "", status: "nieuw", locatie: "binnen", bedrag: 0, periode: "",
    bijzonderheden: JSON.stringify(inst) } as Claim]);
}
