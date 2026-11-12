// One-time setup: creates the study library (Workers KV) and writes its id into wrangler.toml.
import {execSync} from "node:child_process";
import {readFileSync, writeFileSync} from "node:fs";
const toml = readFileSync("wrangler.toml", "utf8");
if (!toml.includes("REPLACE_WITH_KV_ID")){ console.log("The library is already set up in wrangler.toml."); process.exit(0); }
const out = execSync("npx wrangler kv namespace create LIBRARY", {encoding:"utf8", stdio:["inherit", "pipe", "inherit"]});
const m = out.match(/id\s*=\s*"([0-9a-f]{32})"/) || out.match(/"id"\s*:\s*"([0-9a-f]{32})"/) || out.match(/\b([0-9a-f]{32})\b/);
if (!m){ console.error(out + "\nCouldn't find the new library's id above. Paste it into wrangler.toml in place of REPLACE_WITH_KV_ID."); process.exit(1); }
writeFileSync("wrangler.toml", toml.replace("REPLACE_WITH_KV_ID", m[1]));
console.log("Library created and saved in wrangler.toml:", m[1]);
