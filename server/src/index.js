// Visual Bible Studier server: holds the Claude API key, checks the family passcode,
// keeps the shared study library in Workers KV and caps how many new studies are written each month.
//
//   GET  /health              is the server set up?
//   GET  /library             list of finished studies (no passcode needed)
//   GET  /study?ref=James 4    one finished study, by reference or slug (no passcode needed)
//   POST /check               {}                 passcode check and this month's usage
//   POST /generate            {ref, part}        write one part (setting first, then scene, look, words)
//   POST /finish              {ref}              file the finished study in the library

import {PROMPTS} from "./prompts.js";

const PARTS = ["setting", "scene", "look", "words"];
const DAY = 86400;

export default {
  async fetch(request, env){
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers:cors});
    try {
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e){
      const out = e instanceof Fail ? e : new Fail(500, "server_error", "The server hit a problem.");
      if (!(e instanceof Fail)) console.error(e && e.stack || e);
      return json({error:out.code, message:out.message}, out.status, cors);
    }
  }
};

class Fail {
  constructor(status, code, message){ this.status = status; this.code = code; this.message = message; }
}

function corsHeaders(origin, env){
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes("*") || allowed.includes(origin);
  return ok ? {"Access-Control-Allow-Origin":allowed.includes("*") ? "*" : origin, "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type, X-Passcode", "Access-Control-Max-Age":"86400", "Vary":"Origin"} : {"Vary":"Origin"};
}
const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), {status, headers:{"Content-Type":"application/json; charset=utf-8", ...headers}});

async function route(request, env){
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, "") || "/";
  if (!env.LIBRARY) throw new Fail(500, "not_configured", "The study library (KV) is not connected to the server.");
  if (request.method === "GET"){
    if (path === "/health" || path === "/") return json({ok:true, ready:!!(env.ANTHROPIC_API_KEY && env.FAMILY_PASSCODE), model:model(env)});
    if (path === "/library") return library(env);
    if (path === "/study") return getStudy(env, url.searchParams.get("ref") || "");
    throw new Fail(404, "not_found", "No such page.");
  }
  if (request.method !== "POST") throw new Fail(405, "method", "Use GET or POST.");
  checkPasscode(request, env);
  let body = {};
  try { body = await request.json(); } catch { throw new Fail(400, "bad_request", "The request was not valid JSON."); }
  if (path === "/check") return json({ok:true, ...(await usage(env)), model:model(env)});
  if (path === "/generate") return generate(env, cleanRef(body.ref), String(body.part || ""));
  if (path === "/finish") return finish(env, cleanRef(body.ref));
  throw new Fail(404, "not_found", "No such page.");
}

/* ---------- passcode and limits ---------- */
function checkPasscode(request, env){
  if (!env.FAMILY_PASSCODE || !env.ANTHROPIC_API_KEY) throw new Fail(503, "not_configured", "The server is missing its passcode or API key. See the setup guide.");
  const got = request.headers.get("X-Passcode") || "";
  if (!sameText(got.trim(), String(env.FAMILY_PASSCODE).trim())) throw new Fail(401, "bad_passcode", "That passcode isn't right.");
}
function sameText(a, b){
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
const month = () => new Date().toISOString().slice(0, 7);
const limit = env => Math.max(0, parseInt(env.MONTHLY_STUDY_LIMIT || "60", 10) || 0);
async function usage(env){
  const m = month();
  const [studies, calls] = await Promise.all([env.LIBRARY.get("count:studies:" + m), env.LIBRARY.get("count:calls:" + m)]);
  return {month:m, studies:+studies || 0, calls:+calls || 0, limit:limit(env)};
}
async function bump(env, what){
  const k = "count:" + what + ":" + month(), n = (+(await env.LIBRARY.get(k)) || 0) + 1;
  await env.LIBRARY.put(k, String(n), {expirationTtl:120 * DAY});
  return n;
}
const model = env => String(env.MODEL || "claude-opus-5-5");

/* ---------- references ---------- */
function cleanRef(ref){
  const r = String(ref || "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!r || r.length > 60 || !/^[\p{L}\p{N} .:,;'’\-–—]+$/u.test(r)) throw new Fail(400, "bad_ref", "Enter a book and chapter, such as Ruth 1 or Acts 16–17.");
  return r;
}
// Same idea as the app: "james 4", "James  4", "James 4" and "james-4" all land on one key.
const slugOf = ref => String(ref || "").toLowerCase().replace(/\bchapters?\b/g, " ").replace(/[–—]/g, "-").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
async function findSlug(env, ref){
  const s = slugOf(ref);
  if (!s) return null;
  if (await env.LIBRARY.get("study:" + s, {type:"text"}) !== null) return s;
  return await env.LIBRARY.get("alias:" + s);
}

/* ---------- library ---------- */
async function library(env){
  const items = [];
  let cursor;
  do {
    const page = await env.LIBRARY.list({prefix:"study:", cursor});
    for (const k of page.keys) items.push({slug:k.name.slice(6), name:(k.metadata && k.metadata.name) || k.name.slice(6), title:(k.metadata && k.metadata.title) || "", savedAt:(k.metadata && k.metadata.savedAt) || 0});
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return json({studies:items}, 200, {"Cache-Control":"no-store"});
}
async function getStudy(env, ref){
  const slug = await findSlug(env, cleanRef(ref));
  const rec = slug && await env.LIBRARY.get("study:" + slug, {type:"json"});
  if (!rec) throw new Fail(404, "not_in_library", "That passage isn't in the library yet.");
  return json({slug, ...rec});
}

/* ---------- writing a study ---------- */
async function generate(env, ref, part){
  if (!PARTS.includes(part)) throw new Fail(400, "bad_part", "Unknown part of a study.");
  const s = slugOf(ref), draft = k => "draft:" + s + ":" + k;

  // Already finished? Hand back the library copy at no cost.
  const done = await findSlug(env, ref);
  if (done){
    const rec = await env.LIBRARY.get("study:" + done, {type:"json"});
    if (rec && rec.study && rec.study[part]) return json({part, data:rec.study[part], slug:done, cached:true});
  }
  // A part written earlier for this passage (say, before a failed step) is reused.
  const kept = await env.LIBRARY.get(draft(part), {type:"json"});
  if (kept) return json({part, data:kept, cached:true});

  const u = await usage(env);
  if (part === "setting"){
    if (u.studies >= u.limit) throw new Fail(429, "monthly_limit", `This month's limit of ${u.limit} new studies has been reached. Studies already in the library still open.`);
  } else if (!(await env.LIBRARY.get(draft("setting")))){
    throw new Fail(409, "need_setting", "Start this passage from the top.");
  }
  if (u.calls >= u.limit * 8) throw new Fail(429, "monthly_limit", "This month's limit for writing studies has been reached.");

  await bump(env, "calls");
  const data = await askClaude(env, PROMPTS[part](ref));

  if (part === "setting"){
    if (!data || data.valid === false) return json({part, data:{valid:false, reason:String((data && data.reason) || "")}});
    // The model may tidy the reference ("jas 4" -> "James 4"): if that study already exists, point there.
    const canon = String(data.reference || ref);
    const existing = await findSlug(env, canon);
    if (existing){
      await env.LIBRARY.put("alias:" + s, existing);
      return json({part, data, slug:existing, existing:true});
    }
    await bump(env, "studies");
  }
  await env.LIBRARY.put(draft(part), JSON.stringify(data), {expirationTtl:7 * DAY});
  return json({part, data});
}

async function finish(env, ref){
  const s = slugOf(ref), existing = await findSlug(env, ref);
  if (existing){
    const rec = await env.LIBRARY.get("study:" + existing, {type:"json"});
    if (rec) return json({slug:existing, ...rec});
  }
  const parts = await Promise.all(PARTS.map(k => env.LIBRARY.get("draft:" + s + ":" + k, {type:"json"})));
  if (parts.some(p => !p)) throw new Fail(409, "incomplete", "Some parts of this study are missing. Write them again.");
  const [setting, scene, look, words] = parts;
  const name = String(setting.reference || ref).trim(), slug = slugOf(name) || s;
  const rec = {name, savedAt:Date.now(), model:model(env), study:{ref:name, setting, scene, look, words}};
  await env.LIBRARY.put("study:" + slug, JSON.stringify(rec), {metadata:{name, title:String(setting.title || "").slice(0, 120), savedAt:rec.savedAt}});
  if (slug !== s) await env.LIBRARY.put("alias:" + s, slug);
  await Promise.all(PARTS.map(k => env.LIBRARY.delete("draft:" + s + ":" + k)));
  return json({slug, ...rec});
}

/* ---------- Claude ---------- */
async function askClaude(env, prompt){
  let res;
  try {
    res = await fetch((env.ANTHROPIC_URL || "https://api.anthropic.com") + "/v1/messages", {
      method:"POST",
      headers:{"content-type":"application/json", "x-api-key":env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:model(env), max_tokens:12000, messages:[{role:"user", content:prompt}]})
    });
  } catch { throw new Fail(502, "upstream", "Couldn't reach Claude. Try again in a moment."); }
  if (!res.ok){
    let msg = ""; try { msg = String(((await res.json()).error || {}).message || ""); } catch {}
    if (res.status === 401 || res.status === 403) throw new Fail(502, "server_key", "The server's Claude API key was refused. Check it in Cloudflare.");
    if (/credit balance/i.test(msg)) throw new Fail(402, "billing", "The Claude API account is out of credit. Add credit in the Claude Console.");
    if (res.status === 429 || res.status === 529 || res.status >= 500) throw new Fail(503, "busy", "Claude is busy right now. Try again in a minute.");
    throw new Fail(502, "upstream", "Claude couldn't write this part" + (msg ? ": " + msg.slice(0, 160) : "."));
  }
  const out = await res.json();
  const text = (out.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  if (out.stop_reason === "max_tokens") throw new Fail(502, "too_long", "The answer ran too long. Try a shorter passage.");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  try { return JSON.parse(text.slice(a, b + 1)); }
  catch { throw new Fail(502, "invalid_json", "The answer came back incomplete. Try again."); }
}
