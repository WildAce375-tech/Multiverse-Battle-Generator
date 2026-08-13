import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

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
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

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
    model: MODEL,
    reasoning: { effort: "low" },
    tools: [{ type: "web_search", search_context_size: "low" }],
    input: [
      { role: "system", content: RESEARCH_SYSTEM },
      { role: "user", content: researchPrompt }
    ],
    max_output_tokens: 900
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
      researched: true,
      generatedAt: new Date().toISOString()
    }
  };
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
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      model: MODEL
    });
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
    if (pathname === "/") pathname = "/index.html";
    const requested = path.resolve(PUBLIC_DIR, "." + pathname);
    if (requested.startsWith(PUBLIC_DIR) && serveFile(res, requested)) return;

    // SPA-style fallback so shared URLs still render the app.
    if (serveFile(res, path.join(PUBLIC_DIR, "index.html"))) return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Multiverse Battle Generator running on http://localhost:${PORT}`);
  console.log(`AI judge: ${process.env.OPENAI_API_KEY ? `enabled (${MODEL})` : "disabled — local fallback only"}`);
});
