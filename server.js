import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import { CHARACTERS } from "./characters.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = __dirname;

// Tiny .env loader so the project has zero npm dependencies.
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const idx = t.indexOf("=");
    const key = t.slice(0, idx).trim();
    let value = t.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const RESEARCH_MODEL = process.env.OPENAI_RESEARCH_MODEL || "gpt-5.4-mini";

// Real-character thumbnail sources for the fan-made roster.
// Most use the first suitable image from a version-specific Wikipedia page.
// A few exact screen versions use direct small web-image URLs when Wikipedia has no useful character image.
const PORTRAIT_SOURCES = {
  "mcu_iron_man": {
    "page": "Tony Stark (Marvel Cinematic Universe)"
  },
  "mcu_captain_america": {
    "page": "Steve Rogers (Marvel Cinematic Universe)"
  },
  "mcu_thor": {
    "page": "Thor (Marvel Cinematic Universe)"
  },
  "mcu_hulk": {
    "page": "Bruce Banner (Marvel Cinematic Universe)"
  },
  "mcu_spider_man": {
    "page": "Peter Parker (Marvel Cinematic Universe)",
    "preferred": [
      "Spider-Man_No_Way_Home_classic_suit",
      "Spider-Man_Far_From_Home_suit"
    ]
  },
  "mcu_black_panther": {
    "page": "T'Challa (Marvel Cinematic Universe)"
  },
  "mcu_doctor_strange": {
    "page": "Stephen Strange (Marvel Cinematic Universe)"
  },
  "mcu_scarlet_witch": {
    "page": "Wanda Maximoff (Marvel Cinematic Universe)"
  },
  "mcu_captain_marvel": {
    "page": "Carol Danvers (Marvel Cinematic Universe)"
  },
  "mcu_vision": {
    "page": "Vision (Marvel Cinematic Universe)"
  },
  "mcu_thanos": {
    "page": "Thanos (Marvel Cinematic Universe)"
  },
  "mcu_thanos_gauntlet": {
    "page": "Thanos (Marvel Cinematic Universe)"
  },
  "mcu_loki": {
    "page": "Loki (Marvel Cinematic Universe)"
  },
  "mcu_hela": {
    "page": "Hela (character)",
    "preferred": [
      "Cate_Blanchett_as_Hela"
    ],
    "requirePreferred": true
  },
  "fox_wolverine": {
    "page": "Logan (film character)"
  },
  "movie_deadpool": {
    "page": "Wade Wilson (film character)",
    "search": "Deadpool film character Ryan Reynolds"
  },
  "sony_venom": {
    "page": "Eddie Brock (Sony's Spider-Man Universe)",
    "search": "Eddie Brock Sony Spider-Man Universe Venom Tom Hardy"
  },
  "fox_magneto": {
    "page": "Magneto (film character)"
  },
  "fox_xavier": {
    "page": "Charles Xavier (film character)"
  },
  "fox_quicksilver": {
    "page": "Peter Maximoff"
  },
  "marvel_spider_man": {
    "page": "Spider-Man",
    "search": "Spider-Man Marvel Comics character"
  },
  "marvel_iron_man": {
    "page": "Iron Man",
    "search": "Iron Man Marvel Comics character"
  },
  "marvel_captain_america": {
    "page": "Captain America",
    "search": "Captain America Marvel Comics character"
  },
  "marvel_thor": {
    "page": "Thor (Marvel Comics)",
    "search": "Thor Marvel Comics character"
  },
  "marvel_hulk": {
    "page": "Hulk (Marvel Comics)",
    "search": "Hulk Marvel Comics character"
  },
  "marvel_wolverine": {
    "page": "Wolverine (character)",
    "search": "Wolverine Marvel Comics character"
  },
  "marvel_doctor_strange": {
    "page": "Doctor Strange",
    "search": "Doctor Strange Marvel Comics character"
  },
  "marvel_scarlet_witch": {
    "page": "Scarlet Witch",
    "search": "Scarlet Witch Marvel Comics character"
  },
  "marvel_silver_surfer": {
    "page": "Silver Surfer",
    "search": "Silver Surfer Marvel Comics character"
  },
  "marvel_thanos": {
    "page": "Thanos",
    "search": "Thanos Marvel Comics character"
  },
  "marvel_thanos_ig": {
    "page": "Thanos",
    "search": "Thanos Marvel Comics Infinity Gauntlet"
  },
  "marvel_doom": {
    "page": "Doctor Doom",
    "search": "Doctor Doom Marvel Comics"
  },
  "marvel_magneto": {
    "page": "Magneto (Marvel Comics)",
    "search": "Magneto Marvel Comics"
  },
  "marvel_phoenix": {
    "page": "Jean Grey",
    "search": "Jean Grey Phoenix Marvel Comics"
  },
  "marvel_sentry": {
    "page": "Sentry (Robert Reynolds)",
    "search": "Sentry Robert Reynolds Marvel Comics"
  },
  "marvel_black_bolt": {
    "page": "Black Bolt",
    "search": "Black Bolt Marvel Comics"
  },
  "marvel_apocalypse": {
    "page": "Apocalypse (Marvel Comics)",
    "search": "Apocalypse Marvel Comics character"
  },
  "marvel_galactus": {
    "page": "Galactus",
    "search": "Galactus Marvel Comics"
  },
  "dceu_superman": {
    "page": "Superman (DC Extended Universe)"
  },
  "dceu_batman": {
    "page": "Bruce Wayne (DC Extended Universe)",
    "preferred": [
      "Batman-BenAffleck",
      "Batman_tactical_suit",
      "Unmasked_Batman_DCEU"
    ]
  },
  "dceu_wonder_woman": {
    "page": "Diana Prince (DC Extended Universe)",
    "preferred": [
      "Gal_Gadot_as_Wonder_Woman"
    ]
  },
  "dceu_flash": {
    "page": "Barry Allen (DC Extended Universe)"
  },
  "dceu_aquaman": {
    "page": "Arthur Curry (DC Extended Universe)"
  },
  "dceu_black_adam": {
    "page": "Black Adam (film)",
    "allowPoster": true
  },
  "reeves_batman": {
    "page": "The Batman (film)",
    "preferred": [
      "Robert_Pattinson_Test_Footage_for_The_Batman"
    ],
    "requirePreferred": true
  },
  "nolan_batman": {
    "page": "Bruce Wayne (Dark Knight trilogy)",
    "preferred": [
      "Bruce_Wayne_(The_Dark_Knight_Trilogy)",
      "Bale_as_Batman"
    ]
  },
  "dc_superman": {
    "page": "Superman",
    "search": "Superman DC Comics character"
  },
  "dc_batman": {
    "page": "Batman",
    "search": "Batman DC Comics character"
  },
  "dc_wonder_woman": {
    "page": "Wonder Woman",
    "search": "Wonder Woman DC Comics character"
  },
  "dc_flash": {
    "page": "Wally West",
    "search": "Wally West Flash DC Comics"
  },
  "dc_green_lantern": {
    "page": "Hal Jordan",
    "search": "Hal Jordan Green Lantern DC Comics"
  },
  "dc_aquaman": {
    "page": "Aquaman",
    "search": "Aquaman DC Comics character"
  },
  "dc_martian_manhunter": {
    "page": "Martian Manhunter",
    "search": "Martian Manhunter DC Comics"
  },
  "dc_shazam": {
    "page": "Captain Marvel (DC Comics)",
    "search": "Shazam Billy Batson DC Comics"
  },
  "dc_doctor_fate": {
    "page": "Doctor Fate",
    "search": "Doctor Fate DC Comics"
  },
  "dc_zatanna": {
    "page": "Zatanna",
    "search": "Zatanna DC Comics"
  },
  "dc_raven": {
    "page": "Raven (DC Comics)",
    "search": "Raven DC Comics character"
  },
  "dc_darkseid": {
    "page": "Darkseid",
    "search": "Darkseid DC Comics"
  },
  "dc_doomsday": {
    "page": "Doomsday (DC Comics)",
    "search": "Doomsday DC Comics character"
  },
  "dc_reverse_flash": {
    "page": "Eobard Thawne",
    "search": "Eobard Thawne Reverse-Flash DC Comics"
  },
  "dc_lex": {
    "page": "Lex Luthor",
    "search": "Lex Luthor DC Comics"
  },
  "dc_constantine": {
    "page": "John Constantine",
    "search": "John Constantine DC Comics"
  },
  "sw_vader": {
    "page": "Darth Vader",
    "preferred": [
      "Darth_Vader_in_The_Empire_Strikes_Back",
      "Darth_Vader_at_Galaxy"
    ],
    "requirePreferred": true
  },
  "sw_luke": {
    "page": "Luke Skywalker"
  },
  "sw_yoda": {
    "page": "Yoda"
  },
  "sw_palpatine": {
    "page": "Palpatine"
  },
  "lotr_gandalf": {
    "page": "Gandalf",
    "preferred": [
      "Gandalf600ppx",
      "GANDALF.jpg"
    ],
    "requirePreferred": true
  },
  "lotr_aragorn": {
    "page": "Aragorn",
    "preferred": [
      "Aragorn300ppx"
    ],
    "requirePreferred": true
  },
  "lotr_legolas": {
    "page": "Legolas",
    "preferred": [
      "Legolas600ppx"
    ],
    "requirePreferred": true
  },
  "hp_dumbledore": {
    "page": "Albus Dumbledore",
    "preferred": [
      "Dumbledore_-_Prisoner_of_Azkaban"
    ],
    "requirePreferred": true
  },
  "hp_voldemort": {
    "remote": "https://wallpapercrafter.com/th8004/1289021-look-mantle-villain-evil-Harry-Potter-Ralph-Fiennes.jpg"
  },
  "matrix_neo": {
    "page": "Neo (The Matrix)"
  },
  "matrix_smith": {
    "page": "Agent Smith"
  },
  "terminator_t800": {
    "page": "Terminator (character)",
    "search": "T-800 Terminator character Arnold Schwarzenegger"
  },
  "terminator_t1000": {
    "page": "T-1000"
  },
  "alien_xenomorph": {
    "page": "Xenomorph"
  },
  "predator_hunter": {
    "page": "Predator (fictional species)",
    "search": "Predator fictional species film character"
  },
  "john_wick": {
    "page": "John Wick (character)"
  },
  "jack_reacher": {
    "remote": "https://hips.hearstapps.com/hmg-prod/images/alan-ritchson-reacher-season-2-654a4e61423fe.jpg?crop=0.635xw%3A0.952xh%3B0.266xw%2C0.0484xh&resize=980%3A%2A"
  },
  "boys_homelander": {
    "page": "Homelander"
  },
  "boys_soldier_boy": {
    "page": "Soldier Boy (The Boys)",
    "search": "Soldier Boy The Boys Jensen Ackles"
  },
  "invincible_omniman": {
    "remote": "https://images2.minutemediacdn.com/image/upload/c_fill%2Cw_1200%2Car_1%3A1%2Cf_auto%2Cq_auto%2Cg_auto/images/ImageExchange/mmsport/385/01j5qjvbkxg5qp94y5r3.jpg"
  },
  "invincible_mark": {
    "remote": "https://images2.minutemediacdn.com/image/upload/c_fill%2Cw_1200%2Car_1%3A1%2Cf_auto%2Cq_auto%2Cg_auto/shape/cover/sport/Inv-e6a68da74f4542298b1f43989cf194fc.jpg"
  },
  "st_eleven": {
    "page": "Eleven (Stranger Things)"
  },
  "witcher_geralt": {
    "remote": "https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A280%2Ccw%3A720%2Cch%3A720%2Cq%3A80%2Cw%3A720/rcPgfJvUj2WCfWMDbJXvLH.jpg"
  },
  "buffy": {
    "page": "Buffy Summers"
  },
  "robocop": {
    "page": "RoboCop (character)",
    "search": "RoboCop character 1987 Peter Weller"
  },
  "godzilla_mv": {
    "page": "Godzilla (Monsterverse)"
  },
  "kong_mv": {
    "page": "Kong (Monsterverse)"
  }
};
const portraitCache = new Map();
const portraitInFlight = new Map();

let wikiQueue = Promise.resolve();
let lastWikiRequestAt = 0;
const WIKI_MIN_GAP_MS = 450;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function queuedWikiFetch(url, options = {}) {
  const job = async () => {
    const elapsed = Date.now() - lastWikiRequestAt;
    if (elapsed < WIKI_MIN_GAP_MS) await sleep(WIKI_MIN_GAP_MS - elapsed);

    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      lastWikiRequestAt = Date.now();
      const response = await fetch(url, options);

      if (response.status !== 429) return response;

      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * (2 ** attempt);

      lastError = new Error(`Wikipedia API 429`);
      await sleep(waitMs);
    }

    throw lastError || new Error("Wikipedia portrait request failed.");
  };

  const result = wikiQueue.then(job, job);
  wikiQueue = result.catch(() => {});
  return result;
}


function normImageName(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function imageCandidateAllowed(name, allowPoster = false) {
  const n = String(name || "");
  if (!/\.(jpe?g|png|webp)$/i.test(n)) return false;
  if (/\b(symbol|icon|logo|flag|map|wiki|commons|wikipetan|dragon|shackle|ambox|question_book|edit-ltr|blank_television|cc_by|scale_of_justice)\b/i.test(n.replace(/[_-]/g, " "))) return false;
  if (!allowPoster && /poster/i.test(n)) return false;
  return true;
}

async function wikiJson(params) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", origin: "*", ...params })) u.searchParams.set(k, v);
  const r = await queuedWikiFetch(u, {
    headers: { "user-agent": "MultiverseBattleGenerator/2.9 (noncommercial fan project; portrait lookup)" },
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error(`Wikipedia API ${r.status}`);
  return await r.json();
}

async function wikiPageImages(pageTitle) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "parse", page: pageTitle, prop: "images", format: "json", origin: "*" })) u.searchParams.set(k, v);
  const r = await queuedWikiFetch(u, {
    headers: { "user-agent": "MultiverseBattleGenerator/2.9 (noncommercial fan project; portrait lookup)" },
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) return null;
  const data = await r.json();
  if (data?.error || !data?.parse?.images) return null;
  return { title: data.parse.title || pageTitle, images: data.parse.images };
}

async function wikiSearchPage(query) {
  const data = await wikiJson({ list: "search", srsearch: query, srlimit: "5", srnamespace: "0" });
  return data?.query?.search?.[0]?.title || null;
}

function chooseWikiImage(images, spec) {
  const candidates = (images || []).filter(n => imageCandidateAllowed(n, Boolean(spec.allowPoster)));
  const preferred = Array.isArray(spec.preferred) ? spec.preferred : (spec.preferred ? [spec.preferred] : []);
  if (preferred.length) {
    for (const p of preferred) {
      const pn = normImageName(p);
      const hit = candidates.find(n => normImageName(n).includes(pn));
      if (hit) return hit;
    }
    if (spec.requirePreferred) return null;
  }
  return candidates[0] || null;
}

async function wikiFileUrl(filename) {
  const data = await wikiJson({
    prop: "imageinfo",
    titles: `File:${filename}`,
    iiprop: "url",
    iiurlwidth: "360"
  });
  const pages = Object.values(data?.query?.pages || {});
  const info = pages[0]?.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

async function resolvePortraitUncached(id) {
  const fighter = CHARACTERS.find(c => c.id === id);
  if (!fighter) return null;

  // Reuse a persistent result across Render restarts when Upstash is configured.
  try {
    if (battleStorageConfigured()) {
      const persisted = await upstashCommand(["GET", `portrait:${id}`]);
      if (persisted === "__NONE__") {
        portraitCache.set(id, { url: null, expires: Date.now() + 6 * 3600000 });
        return null;
      }
      if (typeof persisted === "string" && /^https?:\/\//i.test(persisted)) {
        portraitCache.set(id, { url: persisted, expires: Date.now() + 30 * 86400000 });
        return persisted;
      }
    }
  } catch (err) {
    console.warn(`Portrait cache read failed for ${id}:`, err?.message || err);
  }

  const spec = PORTRAIT_SOURCES[id] || {
    search: fighter.portraitSearch || `${fighter.name} ${fighter.franchise} character`
  };

  try {
    if (spec.remote) {
      portraitCache.set(id, { url: spec.remote, expires: Date.now() + 30 * 86400000 });
      try {
        if (battleStorageConfigured()) {
          await upstashCommand(["SET", `portrait:${id}`, spec.remote, "EX", 2592000]);
        }
      } catch {}
      return spec.remote;
    }

    let parsed = spec.page ? await wikiPageImages(spec.page) : null;
    if (!parsed && spec.search) {
      const found = await wikiSearchPage(spec.search);
      if (found) parsed = await wikiPageImages(found);
    }
    if (!parsed) {
      portraitCache.set(id, { url: null, expires: Date.now() + 60 * 60000 });
      return null;
    }

    const filename = chooseWikiImage(parsed.images, spec);
    if (!filename) {
      portraitCache.set(id, { url: null, expires: Date.now() + 60 * 60000 });
      return null;
    }

    const imageUrl = await wikiFileUrl(filename);
    if (!imageUrl) {
      portraitCache.set(id, { url: null, expires: Date.now() + 60 * 60000 });
      return null;
    }

    portraitCache.set(id, { url: imageUrl, expires: Date.now() + 30 * 86400000 });

    try {
      if (battleStorageConfigured()) {
        await upstashCommand(["SET", `portrait:${id}`, imageUrl, "EX", 2592000]);
      }
    } catch (err) {
      console.warn(`Portrait cache write failed for ${id}:`, err?.message || err);
    }

    return imageUrl;
  } catch (err) {
    console.warn(`Portrait lookup failed for ${id}:`, err?.message || err);
    portraitCache.set(id, { url: null, expires: Date.now() + 30 * 60000 });
    return null;
  }
}

async function resolvePortrait(id) {
  const cached = portraitCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.url;

  // If multiple UI elements ask for the same fighter simultaneously,
  // perform one Wikipedia lookup and share the result.
  if (portraitInFlight.has(id)) return portraitInFlight.get(id);

  const task = resolvePortraitUncached(id).finally(() => portraitInFlight.delete(id));
  portraitInFlight.set(id, task);
  return task;
}

const PER_IP_HOURLY_LIMIT = Number(process.env.AI_BATTLES_PER_IP_PER_HOUR || 12);
const GLOBAL_HOURLY_LIMIT = Number(process.env.AI_GLOBAL_BATTLES_PER_HOUR || 120);
const rateState = { hour: Math.floor(Date.now() / 3_600_000), global: 0, ips: new Map() };

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(req) {
  const hour = Math.floor(Date.now() / 3_600_000);
  if (hour !== rateState.hour) {
    rateState.hour = hour;
    rateState.global = 0;
    rateState.ips.clear();
  }
  const ip = clientIp(req);
  const used = rateState.ips.get(ip) || 0;
  if (rateState.global >= GLOBAL_HOURLY_LIMIT) {
    return { ok: false, message: "The site's hourly AI battle limit has been reached. Try again next hour." };
  }
  if (used >= PER_IP_HOURLY_LIMIT) {
    return { ok: false, message: "Your hourly AI battle limit has been reached. Try again next hour." };
  }
  rateState.global += 1;
  rateState.ips.set(ip, used + 1);
  return { ok: true };
}

const MIME = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".ico":"image/x-icon"
};

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
    "cache-control": "no-store"
  });
  res.end(data);
}

function cleanFighter(f) {
  if (!f || typeof f !== "object") return null;
  const keys = ["id","name","version","franchise","medium","tier","tierName","traits"];
  const out = {};
  for (const k of keys) out[k] = f[k];
  if (!out.id || !out.name || !out.version) return null;
  return out;
}

function cleanSettings(s = {}) {
  const allowed = {
    mode: ["standard","bloodlusted"],
    prep: ["none","1-hour","24-hours","1-week"],
    battlefield: ["neutral-city","open-field","forest","space-capable","random"],
    distance: ["melee","30-feet","100-feet","1-mile"]
  };
  const out = {};
  for (const [key, vals] of Object.entries(allowed)) {
    out[key] = vals.includes(s[key]) ? s[key] : vals[0];
  }
  return out;
}

function outputText(response) {
  const chunks = [];
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n");
}

function extractSources(response) {
  const seen = new Set();
  const sources = [];
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      for (const ann of part.annotations || []) {
        if (ann.type !== "url_citation") continue;
        const c = ann.url_citation || ann;
        const url = c.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        let title = c.title;
        if (!title) {
          try { title = new URL(url).hostname; } catch { title = "Source"; }
        }
        sources.push({ title, url });
      }
    }
  }
  return sources.slice(0, 8);
}

function schemaFor(a, b) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      winnerId: { type: "string", enum: [a.id, b.id] },
      loserId: { type: "string", enum: [a.id, b.id] },
      winnerProbability: { type: "integer", minimum: 50, maximum: 100 },
      difficulty: {
        type: "string",
        enum: ["Stomp","No Difficulty","Low Difficulty","Mid Difficulty","High Difficulty","Extreme Difficulty"]
      },
      headline: { type: "string" },
      analysis: { type: "string" },
      decidingFactors: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
      caseForA: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      caseForB: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      swingFactor: { type: "string" },
      assumptions: { type: "string" }
    },
    required: [
      "winnerId","loserId","winnerProbability","difficulty","headline","analysis",
      "decidingFactors","caseForA","caseForB","swingFactor","assumptions"
    ]
  };
}

async function openAIRequest(body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    const message = data?.error?.message || `OpenAI API returned ${response.status}`;
    throw new Error(message);
  }
  return data;
}

const RESEARCH_SYSTEM = `You are the research stage for a fictional versus-battle judge.
Research only the exact versions specified. Do not silently combine comic, movie, TV, game, alternate-universe,
temporary power-up, or non-canon feats. Prefer representative portrayals over notorious one-off outliers.
Prioritize primary/official sources where available, then strong secondary references. Fan wikis can be supporting
sources but should not be the sole basis for a major claim when better evidence exists.
Focus on matchup-relevant feats: strength, speed/reaction speed, durability, attack potency, range, mobility,
combat skill, experience, unusual powers/hax, resistances, regeneration, weaknesses, and realistic win conditions.
If evidence is contradictory, say so. Keep the research concise enough to hand to a second judge.`;

const JUDGE_SYSTEM = `You are an impartial fictional-versus battle judge. Your job is not to maximize drama or split the difference.
Pick the most reasonable winner under the supplied rules. Do not make popularity-based decisions.

Core rules:
- Exact versions only. Never composite versions unless explicitly requested.
- Representative standard portrayal beats absurd one-off high-end or low-end feats.
- Distinguish travel speed from combat/reaction speed.
- A theoretical weakness is not automatically exploitable; the opponent needs a realistic way to discover/use it.
- Intelligence and prep matter only when the battle settings allow them to matter.
- "Batman with prep" is not a magic phrase; require a plausible plan and resources.
- Hax, speed, battlefield removal, mind effects, regeneration, intangibility, magic, etc. can trump raw strength when
  there is a demonstrated and realistic win condition.
- For massive mismatches, do not manufacture false suspense.
- Percentages are estimates of repeated fights under the same assumptions, not mathematical truth.
- Difficulty MUST match winnerProbability exactly:
  95-100 Stomp; 90-94 No Difficulty; 80-89 Low Difficulty; 65-79 Mid Difficulty;
  55-64 High Difficulty; 50-54 Extreme Difficulty.
- In analysis, cite useful supplied research sources using [1], [2], etc. Do not invent source numbers.
- Keep the verdict readable and decisive.`;

async function runJudge(body) {
  const a = cleanFighter(body?.fighterA);
  const b = cleanFighter(body?.fighterB);
  const settings = cleanSettings(body?.settings);

  if (!a || !b || a.id === b.id) {
    return { status: 400, body: { error: "Two different valid fighters are required." } };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { status: 503, body: { error: "OPENAI_API_KEY is not configured on the server.", code: "NO_API_KEY" } };
  }

  const researchPrompt = `Research this matchup.

FIGHTER A
${JSON.stringify(a, null, 2)}

FIGHTER B
${JSON.stringify(b, null, 2)}

BATTLE SETTINGS
${JSON.stringify(settings, null, 2)}

Do not decide the winner yet. Build a fair version-specific evidence dossier for the judge.`;

  const research = await openAIRequest({
    model: RESEARCH_MODEL,
    reasoning: { effort: "low" },
    tools: [{ type: "web_search", search_context_size: "low" }],
    input: [
      { role: "system", content: RESEARCH_SYSTEM },
      { role: "user", content: researchPrompt }
    ],
    max_output_tokens: 700
  });

  const researchText = outputText(research);
  const sources = extractSources(research);
  const sourceList = sources.length
    ? sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join("\n")
    : "(No web citation annotations were returned.)";

  const judgePrompt = `Decide this battle.

FIGHTER A
${JSON.stringify(a, null, 2)}

FIGHTER B
${JSON.stringify(b, null, 2)}

SETTINGS
${JSON.stringify(settings, null, 2)}

RESEARCH DOSSIER
${researchText}

AVAILABLE SOURCES
${sourceList}

Use only source numbers that exist above. winnerId and loserId must be the exact supplied fighter IDs.`;

  const judged = await openAIRequest({
    model: MODEL,
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: judgePrompt }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "battle_verdict",
        strict: true,
        schema: schemaFor(a, b)
      }
    },
    max_output_tokens: 1200
  });

  const judgedText = outputText(judged);
  const verdict = JSON.parse(judgedText);
  if (verdict.winnerId === verdict.loserId) throw new Error("Judge returned same winner and loser.");

  return {
    status: 200,
    body: {
      verdict,
      sources,
      model: MODEL,
      researchModel: RESEARCH_MODEL,
      researched: true,
      generatedAt: new Date().toISOString()
    }
  };
}


const TEAM_JUDGE_SYSTEM = `${JUDGE_SYSTEM}
Additional team-battle rules:
- Judge the teams as teams, not as a list of isolated 1v1s.
- Consider synergy, communication, battlefield roles, focus fire, protection, area control, speed mismatches, counters, and whether a team can realistically coordinate.
- Do not assume perfect teamwork between characters who would not naturally have it, but they understand that their listed teammates are allies.
- winnerTeam must be A or B.`;

function teamSchema() {
  return {
    type:"object", additionalProperties:false,
    properties:{
      winnerTeam:{type:"string",enum:["A","B"]},
      winnerProbability:{type:"integer",minimum:50,maximum:100},
      difficulty:{type:"string",enum:["Stomp","No Difficulty","Low Difficulty","Mid Difficulty","High Difficulty","Extreme Difficulty"]},
      headline:{type:"string"}, analysis:{type:"string"},
      decidingFactors:{type:"array",minItems:2,maxItems:5,items:{type:"string"}},
      caseForA:{type:"array",minItems:2,maxItems:4,items:{type:"string"}},
      caseForB:{type:"array",minItems:2,maxItems:4,items:{type:"string"}},
      swingFactor:{type:"string"}, assumptions:{type:"string"}
    },
    required:["winnerTeam","winnerProbability","difficulty","headline","analysis","decidingFactors","caseForA","caseForB","swingFactor","assumptions"]
  };
}

async function runTeamJudge(body) {
  const teamA=(Array.isArray(body?.teamA)?body.teamA:[]).map(cleanFighter).filter(Boolean).slice(0,3);
  const teamB=(Array.isArray(body?.teamB)?body.teamB:[]).map(cleanFighter).filter(Boolean).slice(0,3);
  const settings=cleanSettings(body?.settings);
  if(!teamA.length||!teamB.length) return {status:400,body:{error:"Both teams need at least one valid fighter."}};
  const ids=[...teamA,...teamB].map(x=>x.id);
  if(new Set(ids).size!==ids.length) return {status:400,body:{error:"A fighter can only appear once in a team battle."}};
  if(!process.env.OPENAI_API_KEY) return {status:503,body:{error:"OPENAI_API_KEY is not configured on the server.",code:"NO_API_KEY"}};

  const researchPrompt=`Research this team battle. Build one concise version-specific dossier covering matchup-relevant abilities and team interactions. Do not decide the winner yet.\n\nTEAM A\n${JSON.stringify(teamA,null,2)}\n\nTEAM B\n${JSON.stringify(teamB,null,2)}\n\nSETTINGS\n${JSON.stringify(settings,null,2)}`;
  const research=await openAIRequest({model:RESEARCH_MODEL,reasoning:{effort:"low"},tools:[{type:"web_search",search_context_size:"low"}],input:[{role:"system",content:RESEARCH_SYSTEM},{role:"user",content:researchPrompt}],max_output_tokens:900});
  const researchText=outputText(research),sources=extractSources(research);
  const sourceList=sources.length?sources.map((s,i)=>`[${i+1}] ${s.title} — ${s.url}`).join("\n"):"(No web citation annotations were returned.)";
  const judgePrompt=`Decide this team battle.\n\nTEAM A\n${JSON.stringify(teamA,null,2)}\n\nTEAM B\n${JSON.stringify(teamB,null,2)}\n\nSETTINGS\n${JSON.stringify(settings,null,2)}\n\nRESEARCH DOSSIER\n${researchText}\n\nAVAILABLE SOURCES\n${sourceList}\n\nUse only source numbers that exist above.`;
  const judged=await openAIRequest({model:MODEL,reasoning:{effort:"low"},input:[{role:"system",content:TEAM_JUDGE_SYSTEM},{role:"user",content:judgePrompt}],text:{format:{type:"json_schema",name:"team_battle_verdict",strict:true,schema:teamSchema()}},max_output_tokens:1400});
  const verdict=JSON.parse(outputText(judged));
  return {status:200,body:{verdict,sources,model:MODEL,researchModel:RESEARCH_MODEL,researched:true,generatedAt:new Date().toISOString()}};
}


const MULTI_TEAM_JUDGE_SYSTEM = `You are an impartial fictional free-for-all battle judge.
Judge a battle among 2 to 4 separate teams. Pick exactly one most likely winning team.
Evaluate exact character versions only and use representative standard portrayals rather than absurd one-off outliers.
Treat every listed team as hostile to every other team. Consider temporary tactical cooperation only when it is realistically useful; no team begins with a secret alliance.
Consider team synergy, coordination, battlefield roles, focus fire, area control, mobility, speed, hax, counters, survivability, threat prioritization, and the danger of third-party interference.
Do not simply choose the team with the strongest single character if the broader matchup does not support it.
teamProbabilities must contain every participating team exactly once and sum to 100.
winnerProbability must exactly match the winning team's probability.
Difficulty describes how secure the winning team's edge is:
- Dominant: winner probability 65%+
- Favored: 45-64%
- Competitive: 30-44%
- Razor Thin: below 30%
Use supplied research citations as [1], [2], etc. and never invent source numbers.`;

function multiTeamSchema(sides) {
  return {
    type:"object",
    additionalProperties:false,
    properties:{
      winnerTeam:{type:"string",enum:sides},
      winnerProbability:{type:"integer",minimum:0,maximum:100},
      teamProbabilities:{
        type:"array",minItems:sides.length,maxItems:sides.length,
        items:{
          type:"object",additionalProperties:false,
          properties:{
            team:{type:"string",enum:sides},
            probability:{type:"integer",minimum:0,maximum:100}
          },
          required:["team","probability"]
        }
      },
      difficulty:{type:"string",enum:["Dominant","Favored","Competitive","Razor Thin"]},
      headline:{type:"string"},
      analysis:{type:"string"},
      decidingFactors:{type:"array",minItems:2,maxItems:6,items:{type:"string"}},
      teamCases:{
        type:"array",minItems:sides.length,maxItems:sides.length,
        items:{
          type:"object",additionalProperties:false,
          properties:{
            team:{type:"string",enum:sides},
            points:{type:"array",minItems:1,maxItems:4,items:{type:"string"}}
          },
          required:["team","points"]
        }
      },
      swingFactor:{type:"string"},
      assumptions:{type:"string"}
    },
    required:["winnerTeam","winnerProbability","teamProbabilities","difficulty","headline","analysis","decidingFactors","teamCases","swingFactor","assumptions"]
  };
}

async function runMultiTeamJudge(body) {
  const rawTeams = body?.teams && typeof body.teams === "object" ? body.teams : {};
  const sides = ["A","B","C","D"].filter(side => Array.isArray(rawTeams[side]) && rawTeams[side].length);
  if (sides.length < 2 || sides.length > 4) {
    return {status:400,body:{error:"A multiplayer battle needs 2 to 4 teams."}};
  }

  const teams = {};
  for (const side of sides) {
    teams[side] = rawTeams[side].map(cleanFighter).filter(Boolean).slice(0,3);
    if (!teams[side].length) return {status:400,body:{error:`Team ${side} needs at least one valid fighter.`}};
  }

  const all = sides.flatMap(side => teams[side]);
  const ids = all.map(x => x.id);
  if (new Set(ids).size !== ids.length) {
    return {status:400,body:{error:"A fighter can only appear once in a multiplayer battle."}};
  }
  if (!process.env.OPENAI_API_KEY) {
    return {status:503,body:{error:"OPENAI_API_KEY is not configured on the server.",code:"NO_API_KEY"}};
  }

  const settings = cleanSettings(body?.settings);
  const teamText = sides.map(side => `TEAM ${side}\n${JSON.stringify(teams[side],null,2)}`).join("\n\n");

  const researchPrompt = `Research this ${sides.length}-team fictional free-for-all.
Build one concise version-specific dossier focused on matchup-relevant abilities, counters, team interactions, and third-party dynamics.
Do not decide the winner yet.

${teamText}

SETTINGS
${JSON.stringify(settings,null,2)}`;

  const research = await openAIRequest({
    model:RESEARCH_MODEL,
    reasoning:{effort:"low"},
    tools:[{type:"web_search",search_context_size:"low"}],
    input:[
      {role:"system",content:RESEARCH_SYSTEM},
      {role:"user",content:researchPrompt}
    ],
    max_output_tokens:1100
  });

  const researchText = outputText(research);
  const sources = extractSources(research);
  const sourceList = sources.length
    ? sources.map((s,i)=>`[${i+1}] ${s.title} — ${s.url}`).join("\n")
    : "(No web citation annotations were returned.)";

  const judgePrompt = `Decide this ${sides.length}-team free-for-all.

${teamText}

SETTINGS
${JSON.stringify(settings,null,2)}

RESEARCH DOSSIER
${researchText}

AVAILABLE SOURCES
${sourceList}

Return all participating teams in teamProbabilities and teamCases. Probabilities must sum to 100. Use only source numbers that exist above.`;

  const judged = await openAIRequest({
    model:MODEL,
    reasoning:{effort:"low"},
    input:[
      {role:"system",content:MULTI_TEAM_JUDGE_SYSTEM},
      {role:"user",content:judgePrompt}
    ],
    text:{
      format:{
        type:"json_schema",
        name:"multiplayer_battle_verdict",
        strict:true,
        schema:multiTeamSchema(sides)
      }
    },
    max_output_tokens:1700
  });

  const verdict = JSON.parse(outputText(judged));
  const probabilityMap = new Map((verdict.teamProbabilities||[]).map(x=>[x.team,x.probability]));
  const sum = [...probabilityMap.values()].reduce((a,b)=>a+b,0);
  if (probabilityMap.size !== sides.length || sides.some(s=>!probabilityMap.has(s)) || sum !== 100) {
    throw new Error("Multiplayer judge returned invalid team probabilities.");
  }
  if (probabilityMap.get(verdict.winnerTeam) !== verdict.winnerProbability) {
    throw new Error("Multiplayer judge winner probability did not match.");
  }

  return {
    status:200,
    body:{
      verdict,sources,model:MODEL,researchModel:RESEARCH_MODEL,researched:true,
      generatedAt:new Date().toISOString()
    }
  };
}

const SCENARIO_JUDGE_SYSTEM = `You are an impartial fictional survival-scenario judge.
Evaluate only the exact character version supplied. Judge whether that character can accomplish the stated objective and survive under the supplied assumptions.
Use representative feats, not absurd one-off outliers. Consider knowledge, temperament, equipment, mobility, endurance, vulnerabilities, environmental constraints, and whether the threats have realistic ways to stop them.
A 50% result means essentially a coin flip. survivalProbability can range from 0 to 100.
Use supplied research citations as [1], [2], etc. and never invent source numbers.`;

function scenarioSchema(){return {type:"object",additionalProperties:false,properties:{survives:{type:"boolean"},survivalProbability:{type:"integer",minimum:0,maximum:100},difficulty:{type:"string",enum:["Easy","Manageable","Dangerous","Brutal","Near Impossible"]},headline:{type:"string"},analysis:{type:"string"},keyAdvantages:{type:"array",minItems:2,maxItems:5,items:{type:"string"}},keyThreats:{type:"array",minItems:2,maxItems:5,items:{type:"string"}},winConditions:{type:"array",minItems:1,maxItems:4,items:{type:"string"}},failureConditions:{type:"array",minItems:1,maxItems:4,items:{type:"string"}},assumptions:{type:"string"}},required:["survives","survivalProbability","difficulty","headline","analysis","keyAdvantages","keyThreats","winConditions","failureConditions","assumptions"]};}

async function runScenarioJudge(body){
  const fighter=cleanFighter(body?.fighter),settings=cleanSettings(body?.settings);const scenario=String(body?.scenario||"").trim().slice(0,500);
  if(!fighter||!scenario)return {status:400,body:{error:"A valid fighter and scenario are required."}};
  if(!process.env.OPENAI_API_KEY)return {status:503,body:{error:"OPENAI_API_KEY is not configured on the server.",code:"NO_API_KEY"}};
  const researchPrompt=`Research the exact character version and any established fictional threats/settings named in this survival scenario. Focus only on evidence relevant to surviving and completing the objective. Do not decide the outcome yet.\n\nCHARACTER\n${JSON.stringify(fighter,null,2)}\n\nSCENARIO\n${scenario}\n\nGENERAL SETTINGS\n${JSON.stringify(settings,null,2)}`;
  const research=await openAIRequest({model:RESEARCH_MODEL,reasoning:{effort:"low"},tools:[{type:"web_search",search_context_size:"low"}],input:[{role:"system",content:RESEARCH_SYSTEM},{role:"user",content:researchPrompt}],max_output_tokens:800});
  const researchText=outputText(research),sources=extractSources(research);const sourceList=sources.length?sources.map((s,i)=>`[${i+1}] ${s.title} — ${s.url}`).join("\n"):"(No web citation annotations were returned.)";
  const judgePrompt=`Judge this survival scenario.\n\nCHARACTER\n${JSON.stringify(fighter,null,2)}\n\nSCENARIO\n${scenario}\n\nSETTINGS\n${JSON.stringify(settings,null,2)}\n\nRESEARCH DOSSIER\n${researchText}\n\nAVAILABLE SOURCES\n${sourceList}\n\nSet survives true when the character is more likely than not to complete the objective alive.`;
  const judged=await openAIRequest({model:MODEL,reasoning:{effort:"low"},input:[{role:"system",content:SCENARIO_JUDGE_SYSTEM},{role:"user",content:judgePrompt}],text:{format:{type:"json_schema",name:"survival_verdict",strict:true,schema:scenarioSchema()}},max_output_tokens:1300});
  const verdict=JSON.parse(outputText(judged));return {status:200,body:{verdict,sources,model:MODEL,researchModel:RESEARCH_MODEL,researched:true,generatedAt:new Date().toISOString()}};
}

async function readBody(req, maxBytes = 256_000) {
  return await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "content-length": stat.size,
      "cache-control": [".html", ".js"].includes(ext) ? "no-cache" : "public, max-age=3600"
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}



function battleStorageConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function upstashCommand(command) {
  if (!battleStorageConfigured()) {
    throw new Error("Battle storage is not configured.");
  }

  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {}; }

  if (!response.ok || data.error) {
    throw new Error(data.error || `Battle storage returned ${response.status}`);
  }

  return data.result;
}

const SHORT_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function makeBattleId(length = 8) {
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length];
  }
  return id;
}

function validStoredBattle(payload) {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    typeof payload.a === "string" &&
    typeof payload.b === "string" &&
    payload.r &&
    typeof payload.r === "object" &&
    payload.r.verdict &&
    typeof payload.r.verdict === "object"
  );
}

async function saveBattle(payload) {
  if (!validStoredBattle(payload)) {
    throw new Error("Invalid battle payload.");
  }

  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > 150_000) {
    throw new Error("Battle payload is too large to save.");
  }

  // SET ... NX gives us collision protection without a second network request.
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = makeBattleId(8);
    const result = await upstashCommand([
      "SET",
      `battle:${id}`,
      serialized,
      "NX"
    ]);

    if (result === "OK") return id;
  }

  throw new Error("Could not allocate a unique battle ID.");
}

async function loadBattle(id) {
  if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8}$/.test(id)) {
    return null;
  }

  const raw = await upstashCommand(["GET", `battle:${id}`]);
  if (!raw || typeof raw !== "string") return null;

  let payload;
  try { payload = JSON.parse(raw); } catch { return null; }
  return validStoredBattle(payload) ? payload : null;
}


const DRAFT_ROSTER = new Map(CHARACTERS.map(c => [c.id, c]));
const LIVE_DRAFT_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LIVE_DRAFT_ROOM_RE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

function makeLiveDraftCode(length = 6) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += LIVE_DRAFT_CODE_ALPHABET[bytes[i] % LIVE_DRAFT_CODE_ALPHABET.length];
  }
  return code;
}

function makeLiveDraftToken() {
  return randomBytes(24).toString("base64url");
}

const LIVE_DRAFT_SIDES = ["A","B","C","D"];

function cleanLiveDraftConfig(config = {}) {
  const rawPlayers = Number(config.playerCount);
  const playerCount = Number.isInteger(rawPlayers) && rawPlayers >= 2 && rawPlayers <= 4 ? rawPlayers : 2;
  const rawTeamSize = Number(config.teamSize);
  const teamSize = Number.isInteger(rawTeamSize) && rawTeamSize >= 1 && rawTeamSize <= 3 ? rawTeamSize : 2;
  const rawBudget = Number(config.budget);
  const budget = Number.isInteger(rawBudget) && rawBudget >= teamSize && rawBudget <= 30 ? rawBudget : 12;
  const order = ["alternating","snake"].includes(config.order) ? config.order : "snake";
  const mediumScope = ["all","comics","screen","games"].includes(config.mediumScope) ? config.mediumScope : "all";
  return { playerCount, teamSize, budget, order, mediumScope };
}

function liveDraftSides(roomOrConfig) {
  const config = roomOrConfig?.config || roomOrConfig || {};
  return LIVE_DRAFT_SIDES.slice(0, Math.max(2, Math.min(4, Number(config.playerCount) || 2)));
}

function liveDraftSideForPick(pickNumber, order, playerCount) {
  const count = Math.max(2, Math.min(4, Number(playerCount) || 2));
  const sides = LIVE_DRAFT_SIDES.slice(0, count);
  const round = Math.floor(pickNumber / count);
  const position = pickNumber % count;
  if (order === "snake" && round % 2 === 1) return sides[count - 1 - position];
  return sides[position];
}

function liveDraftSpent(room, side) {
  return (room.teams?.[side] || []).reduce((sum, id) => {
    const fighter = DRAFT_ROSTER.get(id);
    return sum + Math.max(1, Number(fighter?.tier) || 1);
  }, 0);
}

function liveDraftComplete(room) {
  return liveDraftSides(room).every(side => (room.teams?.[side] || []).length >= room.config.teamSize);
}

function liveDraftJoinedCount(room) {
  return liveDraftSides(room).filter(side => Boolean(room.players?.[side])).length;
}

function publicLiveDraftRoom(room, token = "") {
  const sides = liveDraftSides(room);
  const yourSide = token ? (sides.find(side => room.players?.[side] === token) || null) : null;
  const joinedSides = sides.filter(side => Boolean(room.players?.[side]));

  return {
    code: room.code,
    status: room.status,
    config: room.config,
    settings: room.settings,
    teams: room.teams,
    turn: room.turn || null,
    pickNumber: room.pickNumber || 0,
    result: room.result || null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    joinedCount: joinedSides.length,
    joinedSides,
    yourSide,
    spectator: !yourSide && joinedSides.length >= room.config.playerCount
  };
}

async function loadLiveDraftRoom(code) {
  const normalized = String(code || "").toUpperCase();
  if (!LIVE_DRAFT_ROOM_RE.test(normalized)) return null;
  const raw = await upstashCommand(["GET", `livedraft:${normalized}`]);
  if (!raw || typeof raw !== "string") return null;
  try {
    const room = JSON.parse(raw);
    return room?.code === normalized ? room : null;
  } catch {
    return null;
  }
}

async function saveLiveDraftRoom(room) {
  room.updatedAt = new Date().toISOString();
  const ttl = room.status === "complete" ? 604800 : 86400;
  await upstashCommand(["SET", `livedraft:${room.code}`, JSON.stringify(room), "EX", ttl]);
  return room;
}

async function createLiveDraftRoom(config, settings) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeLiveDraftCode();
    const token = makeLiveDraftToken();
    const now = new Date().toISOString();
    const cleanConfig = cleanLiveDraftConfig(config);
    const sides = liveDraftSides(cleanConfig);
    const teams = Object.fromEntries(sides.map(side => [side, []]));
    const players = Object.fromEntries(sides.map(side => [side, null]));
    players.A = token;

    const room = {
      version: 2,
      code,
      status: cleanConfig.playerCount === 1 ? "drafting" : "waiting",
      config: cleanConfig,
      settings: cleanSettings(settings),
      teams,
      players,
      turn: null,
      pickNumber: 0,
      result: null,
      createdAt: now,
      updatedAt: now
    };

    const created = await upstashCommand([
      "SET", `livedraft:${code}`, JSON.stringify(room), "NX", "EX", 86400
    ]);
    if (created === "OK") return { room, token };
  }
  throw new Error("Could not allocate a live draft room.");
}

async function acquireLiveDraftLock(code) {
  const lockToken = makeLiveDraftToken();
  const result = await upstashCommand([
    "SET", `livedraftlock:${code}`, lockToken, "NX", "PX", 8000
  ]);
  return result === "OK" ? lockToken : null;
}

async function releaseLiveDraftLock(code, lockToken) {
  if (!lockToken) return;
  try {
    const current = await upstashCommand(["GET", `livedraftlock:${code}`]);
    if (current === lockToken) await upstashCommand(["DEL", `livedraftlock:${code}`]);
  } catch {}
}

function liveDraftSideForToken(room, token) {
  if (!token) return null;
  return liveDraftSides(room).find(side => room.players?.[side] === token) || null;
}

function validateLiveDraftPick(room, side, fighterId) {
  if (room.status !== "drafting") return "The draft is not accepting picks right now.";
  if (!side) return "You are not a player in this draft.";
  if (room.turn !== side) return "It is not your turn.";
  const fighter = DRAFT_ROSTER.get(fighterId);
  if (!fighter) return "That fighter is not in the roster.";
  if (room.config.mediumScope === "comics" && fighter.medium !== "Comics") return "This room is Comics only.";
  if (room.config.mediumScope === "screen" && fighter.medium !== "Movie/TV") return "This room is Movies / TV only.";
  if (room.config.mediumScope === "games" && fighter.medium !== "Games") return "This room is Video Games only.";

  const allDrafted = liveDraftSides(room).flatMap(s => room.teams?.[s] || []);
  if (allDrafted.includes(fighterId)) return "That fighter has already been drafted.";
  if ((room.teams?.[side] || []).length >= room.config.teamSize) return "Your team is already full.";

  const cost = Math.max(1, Number(fighter.tier) || 1);
  const spentAfter = liveDraftSpent(room, side) + cost;
  if (spentAfter > room.config.budget) return "That pick would put your team over budget.";

  const slotsAfter = room.config.teamSize - ((room.teams?.[side] || []).length + 1);
  if (room.config.budget - spentAfter < slotsAfter) {
    return "That pick would leave too few points to finish your team.";
  }

  return "";
}

function publicOrigin(req) {
  const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwarded || "https";
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      shortLinksConfigured: battleStorageConfigured(),
      model: MODEL,
      researchModel: RESEARCH_MODEL
    });
  }

  if (req.method === "GET" && url.pathname === "/api/portrait") {
    const id = url.searchParams.get("id") || "";
    const imageUrl = await resolvePortrait(id);
    if (!imageUrl) {
      res.writeHead(404, { "cache-control": "public, max-age=900" });
      return res.end();
    }
    res.writeHead(302, {
      location: imageUrl,
      "cache-control": "public, max-age=604800"
    });
    return res.end();
  }

  if (req.method === "POST" && url.pathname === "/api/battles") {
    try {
      if (!battleStorageConfigured()) {
        return json(res, 503, {
          error: "Short battle links are not configured yet.",
          code: "BATTLE_STORAGE_NOT_CONFIGURED"
        });
      }

      const body = await readBody(req, 180_000);
      const payload = body?.battle;

      if (!validStoredBattle(payload)) {
        return json(res, 400, { error: "Invalid battle payload." });
      }

      const id = await saveBattle(payload);
      return json(res, 200, {
        id,
        url: `${publicOrigin(req)}/b/${id}`
      });
    } catch (err) {
      console.error("Battle-save error:", err);
      return json(res, 502, {
        error: "Could not save this battle right now."
      });
    }
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/battles/")) {
    try {
      if (!battleStorageConfigured()) {
        return json(res, 503, {
          error: "Short battle links are not configured yet.",
          code: "BATTLE_STORAGE_NOT_CONFIGURED"
        });
      }

      const id = url.pathname.slice("/api/battles/".length);
      const payload = await loadBattle(id);

      if (!payload) {
        return json(res, 404, { error: "Battle not found." });
      }

      return json(res, 200, { battle: payload });
    } catch (err) {
      console.error("Battle-load error:", err);
      return json(res, 502, {
        error: "Could not load this battle right now."
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/live-drafts") {
    try {
      if (!battleStorageConfigured()) {
        return json(res, 503, {
          error: "Live drafts require the Upstash storage already used by short battle links.",
          code: "BATTLE_STORAGE_NOT_CONFIGURED"
        });
      }
      const body = await readBody(req, 40_000);
      const created = await createLiveDraftRoom(body?.config, body?.settings);
      return json(res, 200, {
        token: created.token,
        room: publicLiveDraftRoom(created.room, created.token),
        url: `${publicOrigin(req)}/draft/${created.room.code}`
      });
    } catch (err) {
      console.error("Live draft create error:", err);
      return json(res, 502, { error: "Could not create a live draft room." });
    }
  }

  const liveDraftRoute = url.pathname.match(/^\/api\/live-drafts\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})(?:\/(join|pick|fight))?$/);
  if (liveDraftRoute) {
    const code = liveDraftRoute[1];
    const action = liveDraftRoute[2] || "";

    if (req.method === "GET" && !action) {
      try {
        const room = await loadLiveDraftRoom(code);
        if (!room) return json(res, 404, { error: "Live draft room not found." });
        const token = url.searchParams.get("token") || "";
        return json(res, 200, { room: publicLiveDraftRoom(room, token) });
      } catch (err) {
        console.error("Live draft read error:", err);
        return json(res, 502, { error: "Could not load the live draft." });
      }
    }

    if (req.method === "POST" && action === "join") {
      let lockToken = null;
      try {
        const body = await readBody(req, 20_000);
        const suppliedToken = String(body?.token || "");
        let room = await loadLiveDraftRoom(code);
        if (!room) return json(res, 404, { error: "Live draft room not found." });

        const existingSide = liveDraftSideForToken(room, suppliedToken);
        if (existingSide) {
          return json(res, 200, {
            token: suppliedToken,
            room: publicLiveDraftRoom(room, suppliedToken)
          });
        }

        const openSide = liveDraftSides(room).find(side => !room.players?.[side]);
        if (!openSide) {
          return json(res, 200, { token: "", room: publicLiveDraftRoom(room, "") });
        }

        lockToken = await acquireLiveDraftLock(code);
        if (!lockToken) return json(res, 409, { error: "Another player is joining. Try again." });

        room = await loadLiveDraftRoom(code);
        if (!room) return json(res, 404, { error: "Live draft room not found." });

        const availableSide = liveDraftSides(room).find(side => !room.players?.[side]);
        if (!availableSide) {
          return json(res, 200, { token: "", room: publicLiveDraftRoom(room, "") });
        }

        const playerToken = makeLiveDraftToken();
        room.players[availableSide] = playerToken;

        if (liveDraftJoinedCount(room) >= room.config.playerCount && room.status === "waiting") {
          room.status = "drafting";
          room.turn = liveDraftSideForPick(room.pickNumber || 0, room.config.order, room.config.playerCount);
        }

        await saveLiveDraftRoom(room);
        return json(res, 200, {
          token: playerToken,
          room: publicLiveDraftRoom(room, playerToken)
        });
      } catch (err) {
        console.error("Live draft join error:", err);
        return json(res, 502, { error: "Could not join the live draft." });
      } finally {
        await releaseLiveDraftLock(code, lockToken);
      }
    }

    if (req.method === "POST" && action === "pick") {
      let lockToken = null;
      try {
        const body = await readBody(req, 20_000);
        lockToken = await acquireLiveDraftLock(code);
        if (!lockToken) return json(res, 409, { error: "Another pick is being processed. Try again." });

        const room = await loadLiveDraftRoom(code);
        if (!room) return json(res, 404, { error: "Live draft room not found." });

        const token = String(body?.token || "");
        const side = liveDraftSideForToken(room, token);
        const fighterId = String(body?.fighterId || "");
        const pickError = validateLiveDraftPick(room, side, fighterId);
        if (pickError) return json(res, 400, { error: pickError });

        room.teams[side].push(fighterId);
        room.pickNumber = (room.pickNumber || 0) + 1;

        if (liveDraftComplete(room)) {
          room.status = "ready";
          room.turn = null;
        } else {
          room.turn = liveDraftSideForPick(room.pickNumber, room.config.order, room.config.playerCount);
        }

        await saveLiveDraftRoom(room);
        return json(res, 200, { room: publicLiveDraftRoom(room, token) });
      } catch (err) {
        console.error("Live draft pick error:", err);
        return json(res, 502, { error: "Could not record that draft pick." });
      } finally {
        await releaseLiveDraftLock(code, lockToken);
      }
    }

    if (req.method === "POST" && action === "fight") {
      let lockToken = null;
      let room = null;
      let token = "";
      try {
        const body = await readBody(req, 20_000);
        token = String(body?.token || "");

        lockToken = await acquireLiveDraftLock(code);
        if (!lockToken) return json(res, 409, { error: "The room is busy. Try again." });

        room = await loadLiveDraftRoom(code);
        if (!room) return json(res, 404, { error: "Live draft room not found." });
        const side = liveDraftSideForToken(room, token);
        if (!side) return json(res, 403, { error: "Only a player in this draft can start the battle." });

        if (room.status === "complete" && room.result) {
          return json(res, 200, { room: publicLiveDraftRoom(room, token) });
        }
        if (room.status === "judging") {
          return json(res, 202, { room: publicLiveDraftRoom(room, token) });
        }
        if (room.status !== "ready" || !liveDraftComplete(room)) {
          return json(res, 400, { error: "Finish the draft before starting the battle." });
        }

        const rate = consumeRateLimit(req);
        if (!rate.ok) return json(res, 429, { error: rate.message, code: "RATE_LIMITED" });

        room.status = "judging";
        room.turn = null;
        await saveLiveDraftRoom(room);
      } catch (err) {
        console.error("Live draft fight setup error:", err);
        return json(res, 502, { error: "Could not start the drafted-team battle." });
      } finally {
        await releaseLiveDraftLock(code, lockToken);
      }

      try {
        const sides = liveDraftSides(room);
        const teams = Object.fromEntries(
          sides.map(side => [side, room.teams[side].map(id => DRAFT_ROSTER.get(id)).filter(Boolean)])
        );
        const judged = await runMultiTeamJudge({ teams, settings: room.settings });

        if (judged.status !== 200) {
          const rollback = await loadLiveDraftRoom(code);
          if (rollback && rollback.status === "judging") {
            rollback.status = "ready";
            await saveLiveDraftRoom(rollback);
          }
          return json(res, judged.status, judged.body);
        }

        const finished = await loadLiveDraftRoom(code);
        if (!finished) return json(res, 404, { error: "Live draft room disappeared." });
        finished.status = "complete";
        finished.result = judged.body;
        await saveLiveDraftRoom(finished);
        return json(res, 200, { room: publicLiveDraftRoom(finished, token) });
      } catch (err) {
        console.error("Live draft judge error:", err);
        try {
          const rollback = await loadLiveDraftRoom(code);
          if (rollback && rollback.status === "judging") {
            rollback.status = "ready";
            await saveLiveDraftRoom(rollback);
          }
        } catch {}
        return json(res, 500, { error: "The AI judge could not finish the drafted-team battle." });
      }
    }
  }

  if (req.method === "POST" && url.pathname === "/api/team-judge") {
    try {
      const rate=consumeRateLimit(req); if(!rate.ok)return json(res,429,{error:rate.message,code:"RATE_LIMITED"});
      const body=await readBody(req); const result=await runTeamJudge(body); return json(res,result.status,result.body);
    } catch(err) { console.error("Team judge error:",err); return json(res,500,{error:"The AI team judge failed to complete this battle."}); }
  }

  if (req.method === "POST" && url.pathname === "/api/scenario-judge") {
    try {
      const rate=consumeRateLimit(req); if(!rate.ok)return json(res,429,{error:rate.message,code:"RATE_LIMITED"});
      const body=await readBody(req); const result=await runScenarioJudge(body); return json(res,result.status,result.body);
    } catch(err) { console.error("Scenario judge error:",err); return json(res,500,{error:"The AI scenario judge failed to complete this scenario."}); }
  }

  if (req.method === "POST" && url.pathname === "/api/judge") {
    try {
      const rate = consumeRateLimit(req);
      if (!rate.ok) return json(res, 429, { error: rate.message, code: "RATE_LIMITED" });
      const body = await readBody(req);
      const result = await runJudge(body);
      return json(res, result.status, result.body);
    } catch (err) {
      console.error("Judge error:", err);
      return json(res, 500, {
        error: "The AI judge failed to complete this battle.",
        detail: process.env.NODE_ENV === "development" ? String(err?.message || err) : undefined
      });
    }
  }

  if (req.method === "GET") {
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { pathname = "/"; }

    // Flat-project mode: only explicitly public frontend files can be served.
    // This prevents .env, server.js, and other deployment files from ever being exposed.
    const PUBLIC_FILES = new Map([
      ["/", "index.html"],
      ["/index.html", "index.html"],
      ["/app.js", "app.js"],
      ["/characters.js", "characters.js"],
      ["/styles.css", "styles.css"],
      ["/portraits.webp", "portraits.webp"]
    ]);

    const publicName = PUBLIC_FILES.get(pathname);
    if (publicName && serveFile(res, path.join(PUBLIC_DIR, publicName))) return;

    // Unknown browser routes fall back to the app shell, but arbitrary files are never served.
    if (!pathname.startsWith("/api/") && serveFile(res, path.join(PUBLIC_DIR, "index.html"))) return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiverse Battle Generator running on http://localhost:${PORT}`);
  console.log(`AI judge: ${process.env.OPENAI_API_KEY ? `enabled (judge: ${MODEL}, research: ${RESEARCH_MODEL})` : "disabled — local fallback only"}`);
});
