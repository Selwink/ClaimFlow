// Scheduled every night: snapshot of all claims and settings, the newest 30 are kept.
import { connectLambda } from "@netlify/blobs";
import { maakBackup } from "../lib/backup";

export const handler = async (e: unknown) => {
  try { connectLambda(e as Parameters<typeof connectLambda>[0]); } catch { /* no Blobs context */ }
  const b = await maakBackup();
  console.log(`back-up ${b.id}: ${b.aantal} claims (${b.opslag})`);
  return { statusCode: 200, body: JSON.stringify(b) };
};
