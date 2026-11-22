// Nightly backups of all claims and settings (photos excluded: they are large and rarely change).
// Stored in Netlify Blobs; falls back to rows inside the claims table when Blobs is not available.
import { getStore } from "@netlify/blobs";
import type { Claim } from "../../src/lib/types";
import { BACKUP, backupRij, backupRijen, bewaar, bewaarBackupRij, ruweRijen, verwijder } from "./db";

const BEWAAR = 30;
export interface BackupInfo { id: string; datum: string; aantal: number; opslag: "netlify" | "database" }
interface Inhoud { gemaakt: string; aantal: number; rijen: Array<Record<string, unknown>> }

function winkel() { try { return getStore({ name: "claimflow-backups", consistency: "strong" }); } catch { return null; } }
const sleutelVan = (d: Date) => d.toISOString().slice(0, 10);

export async function maakBackup(): Promise<BackupInfo> {
  const rijen = await ruweRijen();
  const nu = new Date();
  const inhoud: Inhoud = { gemaakt: nu.toISOString(), aantal: rijen.filter((r) => !String(r.id).startsWith("_")).length, rijen };
  const id = sleutelVan(nu);
  const w = winkel();
  if (w) {
    try {
      await w.setJSON(id, inhoud, { metadata: { aantal: inhoud.aantal, gemaakt: inhoud.gemaakt } });
      await opruimen();
      return { id, datum: inhoud.gemaakt, aantal: inhoud.aantal, opslag: "netlify" };
    } catch (e) { console.error("blobs niet beschikbaar, val terug op database", e); }
  }
  await bewaarBackupRij(`${BACKUP}${id}`, JSON.stringify(inhoud), inhoud.gemaakt, inhoud.aantal);
  await opruimen();
  return { id, datum: inhoud.gemaakt, aantal: inhoud.aantal, opslag: "database" };
}

export async function lijst(): Promise<BackupInfo[]> {
  const uit: BackupInfo[] = [];
  const w = winkel();
  if (w) {
    try {
      const { blobs } = await w.list();
      for (const b of blobs) {
        const m = await w.getMetadata(b.key).catch(() => null);
        const meta = (m?.metadata || {}) as { aantal?: number; gemaakt?: string };
        uit.push({ id: b.key, datum: meta.gemaakt || b.key, aantal: Number(meta.aantal) || 0, opslag: "netlify" });
      }
    } catch { /* Blobs not available */ }
  }
  for (const r of await backupRijen().catch(() => [])) {
    const id = r.id.slice(BACKUP.length);
    if (!uit.some((x) => x.id === id)) uit.push({ id, datum: r.bijgewerkt || id, aantal: r.aantal, opslag: "database" });
  }
  return uit.sort((a, b) => b.id.localeCompare(a.id));
}

export async function haalBackup(id: string): Promise<Inhoud | null> {
  const w = winkel();
  if (w) { try { const x = (await w.get(id, { type: "json" })) as Inhoud | null; if (x) return x; } catch { /* fall through */ } }
  const t = await backupRij(`${BACKUP}${id}`);
  return t ? (JSON.parse(t) as Inhoud) : null;
}

/** Puts every claim from the backup back. Claims created after the backup are left alone. */
export async function herstel(id: string): Promise<number> {
  const b = await haalBackup(id);
  if (!b) throw new Error("Back-up niet gevonden");
  const rijen = b.rijen.filter((r) => r.id && !String(r.id).startsWith(BACKUP)) as unknown as Claim[];
  for (let i = 0; i < rijen.length; i += 200) await bewaar(rijen.slice(i, i + 200));
  return rijen.filter((r) => !String(r.id).startsWith("_")).length;
}

async function opruimen() {
  const alle = await lijst();
  for (const b of alle.slice(BEWAAR)) {
    if (b.opslag === "netlify") await winkel()?.delete(b.id).catch(() => undefined);
    else await verwijder(`${BACKUP}${b.id}`).catch(() => undefined);
  }
}
