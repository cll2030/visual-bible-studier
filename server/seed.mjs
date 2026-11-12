// Builds seed/bulk.json from the studies in seed/, ready for `wrangler kv bulk put`.
import {readdirSync, readFileSync, writeFileSync} from "node:fs";
const slugOf = ref => String(ref || "").toLowerCase().replace(/\bchapters?\b/g, " ").replace(/[–—]/g, "-").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const out = [];
for (const f of readdirSync("seed").filter(f => f.endsWith(".json") && f !== "bulk.json")){
  const rec = JSON.parse(readFileSync("seed/" + f, "utf8"));
  const slug = slugOf(rec.name);
  out.push({key:"study:" + slug, value:JSON.stringify(rec), metadata:{name:rec.name, title:String(rec.study.setting.title || "").slice(0, 120), savedAt:rec.savedAt}});
}
writeFileSync("seed/bulk.json", JSON.stringify(out));
console.log("Seed studies:", out.map(o => o.key).join(", "));
