// Bundles server/supabase.ts and its npm packages into one file that Supabase Edge Functions (Deno) can run.
import { build } from "esbuild";
import { builtinModules } from "node:module";

// Deno only knows Node's built-ins with the node: prefix ("node:crypto", not "crypto").
const nodePrefix = {
  name: "node-prefix",
  setup(b) {
    const namen = new Set(builtinModules);
    b.onResolve({ filter: /^node:/ }, (a) => ({ path: a.path, external: true }));
    b.onResolve({ filter: /^[a-z_/]+$/ }, (a) => (namen.has(a.path) ? { path: `node:${a.path}`, external: true } : undefined));
  },
};

await build({
  entryPoints: ["server/supabase.ts"],
  outfile: "supabase/functions/claimflow/index.js",
  bundle: true, platform: "node", format: "esm", target: "es2022", logLevel: "info", plugins: [nodePrefix],
  // Shared code from src/ reads Vite settings; on the server there are none.
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/" }) },
  // Deno has Node's built-ins under node:*; these globals make Node-style code work there too.
  banner: { js: [
    'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
    'import __process from "node:process"; import { Buffer as __Buffer } from "node:buffer";',
    "globalThis.process ??= __process; globalThis.Buffer ??= __Buffer;",
  ].join("\n") },
});
