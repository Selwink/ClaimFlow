// Prints the hash of a vestigingscode, for the GitHub secret WACHTWOORD_HASH (or BEHEER_HASH).
// Usage: node scripts/code-hash.mjs "jouw nieuwe code"
import { createHash } from "node:crypto";
const code = process.argv.slice(2).join(" ");
if (!code) { console.error('Gebruik: node scripts/code-hash.mjs "jouw nieuwe code"'); process.exit(1); }
console.log(createHash("sha256").update(code.trim().toLowerCase() + "medipoint-meppel").digest("hex"));
