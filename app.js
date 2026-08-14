import { CHARACTERS } from "./characters.js?v=roster-350-v3.2";

const $ = (id) => document.getElementById(id);
const TIER_NAMES = {1:"Human",2:"Enhanced",3:"Superhuman",4:"Heavyweight",5:"Planetary+",6:"Cosmic",7:"Reality Warper"};
let currentA = CHARACTERS.find(c => c.id === "mcu_thor");
let currentB = CHARACTERS.find(c => c.id === "dceu_superman");
let currentResult = null;
let aiConfigured = false;
let gameMode = "classic";
let gauntletState = null;
let tournamentState = null;
let draftState = { A: [], B: [], budget: 12 };
let draftFlavor = "local";
let liveDraftSession = { code:null, token:"", side:null, room:null, pollTimer:null, lastRenderedAt:"" };
let rosterScope = "all";

function esc(s="") {
  return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}


function fighterImagePath(c) {
  return `/api/portrait?id=${encodeURIComponent(c.id)}`;
}

function fighterInitials(c) {
  const words = String(c.name || '').split(/[^A-Za-z0-9]+/).filter(Boolean).filter(w => !['of','the','and'].includes(w.toLowerCase()));
  return (words.slice(0,2).map(w => w[0]).join('') || '?').toUpperCase();
}

function fighterAvatarTone(c) {
  const f = (c.franchise || '').toLowerCase();
  if (f.includes('marvel')) return 'marvel';
  if (f.includes('dc')) return 'dc';
  return 'other';
}

function ensureAvatarStyles() {
  if (document.getElementById('fighter-avatar-styles')) return;
  const style = document.createElement('style');
  style.id = 'fighter-avatar-styles';
  style.textContent = `
    .fighterHeader{display:flex;gap:16px;align-items:flex-start;margin-top:8px}
    .fighterHeaderText{min-width:0;flex:1}
    .fighterAvatar{position:relative;width:84px;height:84px;flex:0 0 84px;border-radius:18px;overflow:hidden;border:1px solid #2d3750;background:linear-gradient(135deg,#161d2a,#0a0e15);box-shadow:0 10px 24px rgba(0,0,0,.25)}
    .fighterAvatar.marvel{background:linear-gradient(135deg,rgba(255,56,95,.32),rgba(125,92,255,.22)),#0b0f16}
    .fighterAvatar.dc{background:linear-gradient(135deg,rgba(66,230,213,.26),rgba(125,92,255,.22)),#0b0f16}
    .fighterAvatar.other{background:linear-gradient(135deg,rgba(255,200,87,.26),rgba(125,92,255,.18)),#0b0f16}
    .fighterAvatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .15s ease}
    .fighterAvatar.hasImage img{opacity:1}
    .fighterAvatarFallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:1000;font-size:1.55rem;letter-spacing:-.05em;color:#eef3fb}
    .fighterAvatar.hasImage .fighterAvatarFallback{display:none}
    @media(max-width:760px){.fighterAvatar{width:72px;height:72px;flex-basis:72px}}
  `;
  document.head.appendChild(style);
}

function renderFighter(cardId, c, side) {
  const el = $(cardId);
  el.className = `fighterCard ${side === "B" ? "b" : ""}`;
  const initials = fighterInitials(c);
  const tone = fighterAvatarTone(c);
  const imagePath = fighterImagePath(c);
  el.innerHTML = `
    <div class="fighterSide">FIGHTER ${side}</div>
    <div class="fighterHeader">
      <div class="fighterAvatar ${tone}" aria-hidden="true">
        ${imagePath ? `<img src="${esc(imagePath)}" alt="" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <div class="fighterAvatarFallback">${esc(initials)}</div>
      </div>
      <div class="fighterHeaderText">
        <div class="fighterName">${esc(c.name)}</div>
        <div class="fighterVersion">${esc(c.version)}</div>
        <div class="tags">
          <span class="tag">${esc(c.franchise)}</span>
          <span class="tag">${esc(c.medium)}</span>
          <span class="tag">Tier ${c.tier}: ${esc(c.tierName)}</span>
        </div>
      </div>
    </div>`;
  const avatar = el.querySelector('.fighterAvatar');
  const img = el.querySelector('img');
  if (img) {
    img.addEventListener('load', () => avatar?.classList.add('hasImage'), { once: true });
    img.addEventListener('error', () => { avatar?.classList.remove('hasImage'); img.remove(); }, { once: true });
    if (img.complete && img.naturalWidth > 0) avatar?.classList.add('hasImage');
  }
}

function renderArena() {
  renderFighter("cardA", currentA, "A");
  renderFighter("cardB", currentB, "B");
}

function matchesRosterScope(c, scope=rosterScope) {
  if (scope === "comics") return c.medium === "Comics";
  if (scope === "screen") return c.medium === "Movie/TV";
  if (scope === "games") return c.medium === "Games";
  return true;
}

function eligibleCharacters(scope=rosterScope) {
  return CHARACTERS.filter(c => matchesRosterScope(c, scope));
}

function rosterScopeLabel(scope=rosterScope) {
  if (scope === "comics") return "Comics only";
  if (scope === "screen") return "Movies / TV only";
  if (scope === "games") return "Video Games only";
  return "Everything";
}

function optionLabel(c) {
  return `${c.name} — ${c.version}`;
}

function sortedCharacters(scope=rosterScope) {
  return [...eligibleCharacters(scope)].sort((a,b) =>
    a.name.localeCompare(b.name) ||
    a.version.localeCompare(b.version) ||
    a.franchise.localeCompare(b.franchise)
  );
}

function populateSelectors() {
  const sorted = sortedCharacters();
  if (!sorted.length) return;

  const opts = sorted.map(c => `<option value="${c.id}">${esc(optionLabel(c))}</option>`).join("");
  const ids = [
    "fighterA","fighterB","gauntletChampion","teamA1","teamA2","teamA3","teamB1","teamB2","teamB3",
    "draftPick","survivalFighter"
  ];

  const previous = Object.fromEntries(ids.filter(id => $(id)).map(id => [id, $(id).value]));
  for (const id of ids) {
    if (!$(id)) continue;
    $(id).innerHTML = opts;
    if (previous[id] && sorted.some(c => c.id === previous[id])) $(id).value = previous[id];
  }

  const eligibleIds = new Set(sorted.map(c => c.id));
  const safeValue = (preferred, fallbackIndex=0) =>
    preferred && eligibleIds.has(preferred) ? preferred : sorted[Math.min(fallbackIndex, sorted.length-1)].id;

  $("fighterA").value = safeValue(previous.fighterA || currentA?.id, 0);
  $("fighterB").value = safeValue(previous.fighterB || currentB?.id, sorted.length > 1 ? 1 : 0);
  $("gauntletChampion").value = safeValue(previous.gauntletChampion || currentA?.id, 0);
  $("survivalFighter").value = safeValue(previous.survivalFighter || currentA?.id, 0);

  const defaults = ["mcu_captain_america","mcu_iron_man","mcu_thor","dceu_superman","dceu_batman","dceu_wonder_woman"];
  ["teamA1","teamA2","teamA3","teamB1","teamB2","teamB3"].forEach((id,i) => {
    if (!$(id)) return;
    if (previous[id] && eligibleIds.has(previous[id])) $(id).value = previous[id];
    else $(id).value = safeValue(defaults[i], i % sorted.length);
  });

  if ($("draftPick") && previous.draftPick && eligibleIds.has(previous.draftPick)) {
    $("draftPick").value = previous.draftPick;
  }
}

function settings() {
  return {
    mode: $("mode").value,
    prep: $("prep").value,
    battlefield: $("battlefield").value,
    distance: $("distance").value,
    rosterScope
  };
}

function applySettings(s={}) {
  for (const k of ["mode","prep","battlefield","distance"]) {
    if (s[k] && $(`${k}`)) $(`${k}`).value = s[k];
  }
  if (["all","comics","screen","games"].includes(s.rosterScope)) {
    rosterScope = s.rosterScope;
    if ($("rosterScope")) $("rosterScope").value = rosterScope;
    populateSelectors();
  }
}

function poolByValue(pool="all", scope=rosterScope) {
  return eligibleCharacters(scope).filter(c => {
    if (pool === "all") return true;
    if (pool === "marvel") return c.franchise === "Marvel";
    if (pool === "dc") return c.franchise === "DC";
    if (pool === "other") return !["Marvel","DC"].includes(c.franchise);
    return true;
  });
}

function poolList() {
  return poolByValue($("randomPool").value);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPair() {
  const list = poolList();
  if (list.length < 2) {
    const fallback = eligibleCharacters();
    return [fallback[0], fallback[Math.min(1, fallback.length-1)]];
  }
  const chaos = $("chaosMode").checked;
  const a = pickRandom(list);
  let candidates = list.filter(c => c.id !== a.id);
  if (!chaos) {
    const tierClose = candidates.filter(c => Math.abs(c.tier - a.tier) <= 1);
    if (tierClose.length) candidates = tierClose;
  }
  return [a, pickRandom(candidates)];
}

function localJudge(a, b) {
  // Secondary fallback only. It intentionally uses coarse tiers rather than pretending
  // we can assign scientifically meaningful comic-book "power scores".
  const traitBonus = (x, y) => {
    const xt = x.traits.toLowerCase(), yt = y.traits.toLowerCase();
    let z = 0;
    if (xt.includes("extreme speed") && !yt.includes("extreme speed")) z += .35;
    if ((xt.includes("reality") || xt.includes("time") || xt.includes("mind") || xt.includes("telepathy") || xt.includes("phasing")) && x.tier >= y.tier) z += .25;
    if (xt.includes("regeneration") && !yt.includes("regeneration")) z += .12;
    if (xt.includes("elite combat") && x.tier === y.tier) z += .10;
    return z;
  };
  let delta = (a.tier - b.tier) * 1.35 + traitBonus(a,b) - traitBonus(b,a);
  const prep = settings().prep;
  if (prep !== "none") {
    if (/genius|tactics|engineering|occult|deception/.test(a.traits.toLowerCase())) delta += .18;
    if (/genius|tactics|engineering|occult|deception/.test(b.traits.toLowerCase())) delta -= .18;
  }
  const pa = 1 / (1 + Math.exp(-delta));
  const winner = pa >= .5 ? a : b;
  const loser = winner.id === a.id ? b : a;
  const p = Math.max(50, Math.round((winner.id === a.id ? pa : 1-pa) * 100));
  const difficulty = p >= 95 ? "Stomp" : p >= 90 ? "No Difficulty" : p >= 80 ? "Low Difficulty" : p >= 65 ? "Mid Difficulty" : p >= 55 ? "High Difficulty" : "Extreme Difficulty";
  return {
    verdict: {
      winnerId: winner.id, loserId: loser.id, winnerProbability: p, difficulty,
      headline: `${winner.name} has the more reliable path to victory under the selected rules.`,
      analysis: `The live AI research judge is not configured, so this is the site's deliberately coarse local fallback. It uses broad power tiers and a few matchup traits, not fake precision. ${winner.name} is favored because the overall tier and capability profile gives them more repeatable win conditions than ${loser.name}.`,
      decidingFactors: [
        `${winner.name}: ${winner.traits}.`,
        `${loser.name}: ${loser.traits}.`,
        `Relative tier: ${winner.name} is Tier ${winner.tier} (${winner.tierName}); ${loser.name} is Tier ${loser.tier} (${loser.tierName}).`
      ],
      caseForA: [`${a.name}'s relevant kit: ${a.traits}.`, `Selected rules can change how much those tools matter.`],
      caseForB: [`${b.name}'s relevant kit: ${b.traits}.`, `Selected rules can change how much those tools matter.`],
      swingFactor: "Specific canonical feats and interactions that the local fallback cannot research.",
      assumptions: "Fallback estimate only; use the live AI judge for version-specific web research."
    },
    sources: [],
    model: "local-fallback",
    researched: false,
    generatedAt: new Date().toISOString()
  };
}

async function callJudgeResult(a, b, {forceFallback=false}={}) {
  if (forceFallback || !aiConfigured) return localJudge(a,b);
  try {
    const r = await fetch("/api/judge", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({fighterA:a, fighterB:b, settings:settings()})
    });
    if (!r.ok) {
      const e = await r.json().catch(()=>({}));
      throw new Error(e.error || `Judge failed (${r.status})`);
    }
    return await r.json();
  } catch (err) {
    console.error(err);
    const fallback = localJudge(a,b);
    fallback.fallbackReason = err.message;
    return fallback;
  }
}

async function judge(a, b, {forceFallback=false}={}) {
  setLoading(true, "Researching the matchup…", "Checking version-specific feats, then sending the evidence to the judge.");
  $("verdictPanel").classList.add("hidden");
  try {
    currentResult = await callJudgeResult(a,b,{forceFallback});
    renderVerdict(currentResult);
  } finally {
    setLoading(false);
  }
}

function setLoading(on, title="Researching the matchup…", text="Checking version-specific feats, then sending the evidence to the judge.") {
  $("loading").classList.toggle("hidden", !on);
  $("loadingTitle").textContent = title;
  $("loadingText").textContent = text;
  document.querySelectorAll("button").forEach(btn => {
    if (btn.classList.contains("modeTab")) return;
    btn.disabled = on;
  });
}

function fighterById(id) {
  return CHARACTERS.find(c => c.id === id);
}

function linkifyCitations(text, sources) {
  let html = esc(text);
  if (!sources?.length) return html;
  html = html.replace(/\[(\d+)\]/g, (m, n) => {
    const i = Number(n) - 1;
    if (!sources[i]) return m;
    return `<a class="cite" href="${esc(sources[i].url)}" target="_blank" rel="noopener noreferrer">[${n}]</a>`;
  });
  return html;
}

function fillList(id, items) {
  $(id).innerHTML = (items || []).map(x => `<li>${esc(x)}</li>`).join("");
}

function renderVerdict(result) {
  const v = result.verdict;
  const winner = fighterById(v.winnerId);
  const loser = fighterById(v.loserId);
  if (!winner || !loser) return;

  $("winnerText").textContent = `${winner.name} WINS`;
  $("difficulty").textContent = v.difficulty;
  $("winnerPct").textContent = `${v.winnerProbability}%`;
  $("oddsFill").style.width = `${v.winnerProbability}%`;
  $("headline").textContent = v.headline;
  $("analysis").innerHTML = linkifyCitations(v.analysis, result.sources || []);
  $("caseATitle").textContent = `Case for ${currentA.name}`;
  $("caseBTitle").textContent = `Case for ${currentB.name}`;
  fillList("caseA", v.caseForA);
  fillList("caseB", v.caseForB);
  fillList("factors", v.decidingFactors);
  $("swing").textContent = v.swingFactor;
  $("assumptions").textContent = v.assumptions;

  const sources = result.sources || [];
  $("sourcesWrap").classList.toggle("hidden", !sources.length);
  $("sources").innerHTML = sources.map((s,i) =>
    `<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">[${i+1}] ${esc(s.title)}</a>`
  ).join("");

  const when = result.generatedAt ? new Date(result.generatedAt).toLocaleString() : "";
  $("judgeMeta").textContent = result.researched
    ? `Web-researched AI verdict • ${result.model} • frozen ${when}`
    : `Local fallback verdict • ${result.fallbackReason ? "AI error: " + result.fallbackReason + " • " : ""}frozen ${when}`;

  const fullAnalysis = $("fullAnalysis");
  if (fullAnalysis) fullAnalysis.open = false;

  $("verdictPanel").classList.remove("hidden");
}

function battlePayload() {
  return {
    v: 1,
    a: currentA.id,
    b: currentB.id,
    s: settings(),
    r: currentResult
  };
}

function bytesToB64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i=0;i<bytes.length;i+=chunk) binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64ToBytes(s) {
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function encodePayload(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if ("CompressionStream" in window) {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return "g." + bytesToB64(compressed);
  }
  return "j." + bytesToB64(raw);
}
async function decodePayload(s) {
  const [kind, data] = s.split(".",2);
  let bytes = b64ToBytes(data);
  if (kind === "g") {
    if (!("DecompressionStream" in window)) throw new Error("This browser cannot decompress the shared battle link.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function buildFrozenUrl() {
  // Legacy compatibility only. New shares use short stored battle IDs.
  if (!currentResult) return location.href;
  const encoded = await encodePayload(battlePayload());
  const u = new URL(location.origin + "/");
  u.searchParams.set("battle", encoded);
  return u.toString();
}

let lastStoredBattleKey = "";
let lastStoredBattleUrl = "";

async function getShortBattleUrl() {
  if (!currentResult) throw new Error("Generate a battle first.");

  const payload = battlePayload();
  const cacheKey = JSON.stringify([
    payload.a,
    payload.b,
    payload.s,
    payload.r?.generatedAt,
    payload.r?.verdict?.winnerId,
    payload.r?.verdict?.winnerProbability
  ]);

  if (cacheKey === lastStoredBattleKey && lastStoredBattleUrl) {
    return lastStoredBattleUrl;
  }

  const r = await fetch("/api/battles", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({battle: payload})
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Could not save battle (${r.status})`);
  }

  if (!data.url) throw new Error("Battle storage returned no share URL.");

  lastStoredBattleKey = cacheKey;
  lastStoredBattleUrl = data.url;
  return data.url;
}

async function loadShortBattle() {
  const match = location.pathname.match(/^\/b\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8})\/?$/);
  if (!match) return false;

  try {
    const r = await fetch(`/api/battles/${encodeURIComponent(match[1])}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.battle) {
      throw new Error(data.error || "Battle not found.");
    }

    const p = data.battle;
    const a = fighterById(p.a), b = fighterById(p.b);
    if (!a || !b || !p.r?.verdict) throw new Error("Invalid stored battle.");

    currentA = a;
    currentB = b;
    currentResult = p.r;
    applySettings(p.s);
    renderArena();
    populateSelectors();
    renderVerdict(currentResult);
    return true;
  } catch (e) {
    console.error("Could not load short battle:", e);
    alert("That shared battle could not be loaded.");
    history.replaceState(null, "", "/");
    return false;
  }
}

async function loadFrozenBattle() {
  const encoded = new URLSearchParams(location.search).get("battle");
  if (!encoded) return false;
  try {
    const p = await decodePayload(encoded);
    const a = fighterById(p.a), b = fighterById(p.b);
    if (!a || !b || !p.r?.verdict) throw new Error("Invalid battle payload");
    currentA=a;currentB=b;currentResult=p.r;
    applySettings(p.s);
    renderArena();
    populateSelectors();
    renderVerdict(currentResult);
    return true;
  } catch (e) {
    console.warn("Could not load shared battle:",e);
    return false;
  }
}


function miniFighter(c, {cost=false,image=true}={}) {
  if (!c) return "";
  return `<div class="miniFighter">
    ${image ? `<img src="${esc(fighterImagePath(c))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ""}
    <div><strong>${esc(c.name)}</strong><small>${esc(c.version)}</small></div>
    <span class="miniTier">${cost ? `${c.tier} pt${c.tier===1?'':'s'}` : `T${c.tier}`}</span>
  </div>`;
}

function sourceHtml(sources=[]) {
  if (!sources.length) return "";
  return `<div class="sourcesWrap"><h3>Research sources</h3><div class="sources">${sources.map((s,i)=>
    `<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">[${i+1}] ${esc(s.title)}</a>`
  ).join("")}</div></div>`;
}

function genericDetails(title, analysis, lists=[], extra="", sources=[]) {
  return `<details class="analysisDetails modeAnalysis"><summary><span>${esc(title)}</span><span class="analysisChevron">⌄</span></summary><div class="analysisBody">
    <p class="analysis">${linkifyCitations(analysis || "", sources)}</p>
    ${lists.map(x=>`<div class="factorBox"><h3>${esc(x.title)}</h3><ul>${(x.items||[]).map(i=>`<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}
    ${extra}${sourceHtml(sources)}
  </div></details>`;
}

function setGameMode(mode) {
  gameMode = mode;
  document.querySelectorAll(".modeTab").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  for (const name of ["classic","gauntlet","tournament","team","draft","survival"]) {
    $(`${name}Mode`)?.classList.toggle("hidden", name !== mode);
  }
  const classic = mode === "classic";
  $("arena").classList.toggle("hidden", !classic);
  $("verdictPanel").classList.toggle("hidden", !classic || !currentResult);
  $("modeWorkspace").classList.toggle("hidden", classic);
  if (!classic) {
    if (mode === "draft") {
      renderDraft();
      if (draftFlavor === "live" && liveDraftSession.code) startLiveDraftPolling();
    }
    else if (mode === "gauntlet" && gauntletState) renderGauntlet();
    else if (mode === "tournament" && tournamentState) renderTournament();
    else if (!["team","survival"].includes(mode)) $("modeWorkspace").innerHTML = "";
    else $("modeWorkspace").innerHTML = `<div class="emptyState">Set your options above and start the mode.</div>`;
  }
}

function pickUnique(list, count) {
  const copy = [...list];
  for (let i=copy.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
  return copy.slice(0,count);
}

function buildGauntletOpponents(champion, length, pool) {
  let available = poolByValue(pool).filter(c => c.id !== champion.id);
  if (available.length < length) available = eligibleCharacters().filter(c => c.id !== champion.id);
  const offsets = length === 3 ? [-1,0,1] : [-1,0,0,1,2];
  const chosen = [];
  for (const off of offsets) {
    if (!available.length) break;
    const target = Math.max(1, Math.min(7, champion.tier + off));
    const ranked = [...available].sort((a,b) => Math.abs(a.tier-target)-Math.abs(b.tier-target) || Math.random()-.5);
    const top = ranked.filter(c => Math.abs(c.tier-target) === Math.abs(ranked[0].tier-target));
    const pick = pickRandom(top);
    chosen.push(pick);
    available = available.filter(c => c.id !== pick.id);
  }
  return chosen;
}

function startGauntlet() {
  const champion = fighterById($("gauntletChampion").value);
  const length = Number($("gauntletLength").value);
  if (!champion) return;
  gauntletState = { champion, opponents: buildGauntletOpponents(champion,length,$("gauntletPool").value), results:[], index:0, ended:false };
  renderGauntlet();
}

function renderGauntlet() {
  const s = gauntletState;
  if (!s) return;
  const rows = s.opponents.map((opp,i) => {
    const result = s.results[i];
    const winner = result ? fighterById(result.verdict.winnerId) : null;
    const state = result ? (winner?.id === s.champion.id ? "cleared" : "lost") : i === s.index && !s.ended ? "current" : "pending";
    return `<div class="ladderRow ${state}"><div class="roundNum">${i+1}</div>${miniFighter(opp)}<div class="ladderOutcome">${result ? `${esc(winner?.name || 'Winner')} • ${result.verdict.winnerProbability}%` : state === 'current' ? 'NEXT' : '—'}</div></div>`;
  }).join("");
  const completed = s.index >= s.opponents.length && !s.ended;
  const finalText = completed ? `${s.champion.name} CLEARS THE GAUNTLET` : s.ended ? `${s.champion.name} FALLS IN ROUND ${s.index+1}` : "";
  $("modeWorkspace").innerHTML = `<div class="modeResultCard">
    <div class="modeResultHeader"><div><div class="eyebrow">GAUNTLET CHAMPION</div>${miniFighter(s.champion)}</div><div class="modeScore">${s.results.filter(r=>r.verdict.winnerId===s.champion.id).length}/${s.opponents.length}</div></div>
    <div class="ladder">${rows}</div>
    ${finalText ? `<div class="modeFinal">${esc(finalText)}</div>` : `<button class="primary big" data-action="gauntlet-next">⚔ FIGHT NEXT OPPONENT</button>`}
    <p class="modeNote">Each gauntlet matchup uses the same AI battle judge. Fighters start each round fresh in this baseline version.</p>
  </div>`;
}

async function runGauntletNext() {
  const s = gauntletState;
  if (!s || s.ended || s.index >= s.opponents.length) return;
  const opp = s.opponents[s.index];
  setLoading(true, `Gauntlet round ${s.index+1}…`, `${s.champion.name} vs ${opp.name}`);
  const result = await callJudgeResult(s.champion, opp);
  setLoading(false);
  s.results[s.index] = result;
  if (result.verdict.winnerId !== s.champion.id) s.ended = true;
  else s.index += 1;
  renderGauntlet();
}

function roundLabel(totalEntrants, roundIndex, matches) {
  if (matches === 1) return "FINAL";
  if (matches === 2) return "SEMIFINALS";
  if (matches === 4) return "QUARTERFINALS";
  return `ROUND ${roundIndex+1}`;
}

function startTournament() {
  const size = Number($("tournamentSize").value);
  let list = poolByValue($("tournamentPool").value);
  if (list.length < size) list = eligibleCharacters();
  const entrants = pickUnique(list,size);
  tournamentState = { size, rounds:[{participants:entrants, matches:[], cursor:0}], currentRound:0, champion:null };
  tournamentState.rounds[0].matches = pairParticipants(entrants);
  renderTournament();
}

function pairParticipants(arr) {
  const matches=[];
  for (let i=0;i<arr.length;i+=2) matches.push({a:arr[i],b:arr[i+1],result:null,winner:null});
  return matches;
}

function currentTournamentMatch() {
  const s=tournamentState;if(!s||s.champion)return null;
  const round=s.rounds[s.currentRound];
  return round.matches.find(m=>!m.result) || null;
}

function renderTournament() {
  const s=tournamentState;if(!s)return;
  const rounds=s.rounds.map((round,ri)=>`<div class="bracketRound"><h3>${roundLabel(s.size,ri,round.matches.length)}</h3>${round.matches.map(m=>`<div class="bracketMatch ${m.result?'resolved':''}"><div>${miniFighter(m.a)}</div><div class="bracketVs">VS</div><div>${miniFighter(m.b)}</div>${m.result?`<div class="matchWinner">✓ ${esc(m.winner.name)} • ${m.result.verdict.winnerProbability}%</div>`:""}</div>`).join("")}</div>`).join("");
  $("modeWorkspace").innerHTML=`<div class="modeResultCard"><div class="modeResultHeader"><div><div class="eyebrow">TOURNAMENT</div><h2>${s.champion?`${esc(s.champion.name)} IS CHAMPION`:`${s.size}-FIGHTER BRACKET`}</h2></div>${s.champion?`<div class="championBadge">🏆</div>`:""}</div><div class="bracket">${rounds}</div>${!s.champion?`<button class="primary big" data-action="tournament-next">⚔ RESOLVE NEXT MATCH</button>`:""}<p class="modeNote">Baseline tournament resolves one matchup at a time so you can watch the bracket develop and avoid a long all-at-once wait.</p></div>`;
}

async function runTournamentNext() {
  const s=tournamentState; const match=currentTournamentMatch(); if(!s||!match)return;
  setLoading(true,"Resolving tournament match…",`${match.a.name} vs ${match.b.name}`);
  const result=await callJudgeResult(match.a,match.b); setLoading(false);
  match.result=result; match.winner=fighterById(result.verdict.winnerId);
  const round=s.rounds[s.currentRound];
  if (round.matches.every(m=>m.result)) {
    const winners=round.matches.map(m=>m.winner);
    if (winners.length===1) s.champion=winners[0];
    else { s.currentRound+=1; s.rounds.push({participants:winners,matches:pairParticipants(winners),cursor:0}); }
  }
  renderTournament();
}

function selectedTeam(prefix) {
  const size=Number($("teamSize").value);
  return Array.from({length:size},(_,i)=>fighterById($(`${prefix}${i+1}`).value)).filter(Boolean);
}

function validateTeams(a,b) {
  const all=[...a,...b];
  if (!a.length || !b.length) return "Both teams need fighters.";
  if (new Set(all.map(c=>c.id)).size !== all.length) return "A fighter can only appear once in a team battle.";
  return "";
}

async function callTeamJudge(teamA,teamB) {
  const r=await fetch("/api/team-judge",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({teamA,teamB,settings:settings()})});
  const data=await r.json().catch(()=>({})); if(!r.ok) throw new Error(data.error||`Team judge failed (${r.status})`); return data;
}

function teamResultCardHtml(result,teamA,teamB,title="TEAM BATTLE") {
  const v=result.verdict; const win=v.winnerTeam==="A"?teamA:teamB;
  return `<div class="modeResultCard"><div class="verdictTop"><div><div class="eyebrow">${esc(title)}</div><h2>TEAM ${v.winnerTeam} WINS</h2><div class="pill">${esc(v.difficulty)}</div></div><div class="oddsBox"><div class="pct">${v.winnerProbability}%</div><div class="oddsLabel">estimated win rate</div></div></div><div class="oddsTrack"><div style="width:${v.winnerProbability}%"></div></div><p class="headline">${esc(v.headline)}</p><div class="winningTeam">${win.map(c=>miniFighter(c)).join("")}</div>${genericDetails("Full Team Analysis",v.analysis,[{title:"Case for Team A",items:v.caseForA},{title:"Case for Team B",items:v.caseForB},{title:"Deciding factors",items:v.decidingFactors}],`<div class="factorBox"><p><strong>Swing factor:</strong> ${esc(v.swingFactor)}</p><p class="small"><strong>Assumptions:</strong> ${esc(v.assumptions)}</p></div>`,result.sources||[])}</div>`;
}

function renderTeamResult(result,teamA,teamB,title="TEAM BATTLE") {
  $("modeWorkspace").innerHTML=teamResultCardHtml(result,teamA,teamB,title);
}

async function runTeamBattle(teamA=null,teamB=null,title="TEAM BATTLE") {
  teamA=teamA||selectedTeam("teamA"); teamB=teamB||selectedTeam("teamB");
  const error=validateTeams(teamA,teamB); if(error){alert(error);return;}
  setLoading(true,"Researching the team battle…","Checking every fighter plus team synergy and counters.");
  try { const result=await callTeamJudge(teamA,teamB); renderTeamResult(result,teamA,teamB,title); }
  catch(err){ console.error(err); alert(`Team battle failed: ${err.message}`); }
  finally { setLoading(false); }
}

function draftCost(c){return Math.max(1,Number(c.tier)||1);}
function draftSpent(side){return draftState[side].reduce((s,c)=>s+draftCost(c),0);}
function draftAvailable(side,c){return draftState[side].length<3 && draftSpent(side)+draftCost(c)<=draftState.budget && ![...draftState.A,...draftState.B].some(x=>x.id===c.id);}
function addDraft(side){const c=fighterById($("draftPick").value);if(!c)return;if(!draftAvailable(side,c)){alert("That pick is unavailable, over budget, already drafted, or the team already has 3 fighters.");return;}draftState[side].push(c);renderDraft();}
function resetDraft(){draftState={A:[],B:[],budget:12};renderDraft();}
function renderDraft(){
  const block=side=>`<div class="draftTeam"><h3>Team ${side} <span>${draftState.budget-draftSpent(side)} pts left</span></h3>${draftState[side].length?draftState[side].map(c=>miniFighter(c,{cost:true})).join(""):`<div class="draftEmpty">No picks yet</div>`}</div>`;
  const canFight=draftState.A.length&&draftState.B.length;
  $("modeWorkspace").innerHTML=`<div class="modeResultCard"><div class="draftBoard">${block('A')}${block('B')}</div>${canFight?`<button class="primary big" data-action="draft-fight">👥 FIGHT DRAFTED TEAMS</button>`:""}<p class="modeNote">Cost = power tier. Budget 12 each. Maximum 3 fighters per side. One character cannot be drafted twice.</p></div>`;
}

function liveDraftTokenKey(code){ return `mbg-live-draft:${code}`; }

function storedLiveDraftToken(code){
  try { return localStorage.getItem(liveDraftTokenKey(code)) || ""; } catch { return ""; }
}

function saveLiveDraftToken(code,token){
  if(!token) return;
  try { localStorage.setItem(liveDraftTokenKey(code),token); } catch {}
}

function liveSides(room){
  return ["A","B","C","D"].slice(0,Number(room?.config?.playerCount)||2);
}

function stopLiveDraftPolling(){
  if(liveDraftSession.pollTimer){
    clearInterval(liveDraftSession.pollTimer);
    liveDraftSession.pollTimer=null;
  }
}

function startLiveDraftPolling(){
  if(!liveDraftSession.code || liveDraftSession.pollTimer) return;
  liveDraftSession.pollTimer=setInterval(()=>{
    if(document.hidden || gameMode!=="draft" || draftFlavor!=="live") return;
    refreshLiveDraft().catch(err=>console.warn("Live draft sync failed:",err));
  },1500);
}

function setDraftFlavor(flavor){
  draftFlavor=flavor==="live"?"live":"local";
  $("draftLocalTab").classList.toggle("active",draftFlavor==="local");
  $("draftLiveTab").classList.toggle("active",draftFlavor==="live");
  $("localDraftControls").classList.toggle("hidden",draftFlavor!=="local");
  $("liveDraftControls").classList.toggle("hidden",draftFlavor!=="live");

  if(draftFlavor==="local"){
    stopLiveDraftPolling();
    renderDraft();
  }else if(liveDraftSession.code && liveDraftSession.room){
    $("liveDraftSetup").classList.add("hidden");
    $("liveDraftActive").classList.remove("hidden");
    renderLiveDraftRoom(liveDraftSession.room);
    startLiveDraftPolling();
  }else{
    $("liveDraftSetup").classList.remove("hidden");
    $("liveDraftActive").classList.add("hidden");
    $("modeWorkspace").innerHTML=`<div class="emptyState">Create a 2–4 player room or enter a 6-character room code to join one.</div>`;
  }
}

function liveDraftTeam(room,side){
  return (room.teams?.[side]||[]).map(fighterById).filter(Boolean);
}

function liveDraftSpentRoom(room,side){
  return liveDraftTeam(room,side).reduce((sum,c)=>sum+draftCost(c),0);
}

function liveDraftPickAllowed(room,c){
  const side=liveDraftSession.side;
  if(!side || room.status!=="drafting" || room.turn!==side) return false;
  const drafted=new Set(liveSides(room).flatMap(s=>room.teams?.[s]||[]));
  if(drafted.has(c.id)) return false;
  const mine=liveDraftTeam(room,side);
  if(mine.length>=room.config.teamSize) return false;
  const spentAfter=liveDraftSpentRoom(room,side)+draftCost(c);
  if(spentAfter>room.config.budget) return false;
  const slotsAfter=room.config.teamSize-(mine.length+1);
  return room.config.budget-spentAfter>=slotsAfter;
}

function liveDraftStatusText(room){
  if(room.status==="waiting"){
    return {cls:"waiting",text:`WAITING FOR PLAYERS — ${room.joinedCount}/${room.config.playerCount} JOINED`};
  }
  if(room.status==="drafting"){
    if(!liveDraftSession.side) return {cls:"opponentTurn",text:`TEAM ${room.turn}'S PICK`};
    return room.turn===liveDraftSession.side
      ? {cls:"yourTurn",text:"YOUR PICK"}
      : {cls:"opponentTurn",text:`TEAM ${room.turn}'S PICK`};
  }
  if(room.status==="ready") return {cls:"complete",text:"DRAFT COMPLETE — READY FOR THE FREE-FOR-ALL"};
  if(room.status==="judging") return {cls:"waiting",text:"AI JUDGE IS RESEARCHING THE MULTIPLAYER BATTLE…"};
  if(room.status==="complete") return {cls:"complete",text:"BATTLE COMPLETE"};
  return {cls:"waiting",text:String(room.status||"").toUpperCase()};
}

function liveDraftOrderLabel(order){
  return order==="snake" ? "Snake draft" : "Round-robin";
}

function liveDraftTeamHtml(room,side){
  const team=liveDraftTeam(room,side);
  const left=room.config.budget-liveDraftSpentRoom(room,side);
  const isYou=liveDraftSession.side===side;
  const turn=room.status==="drafting" && room.turn===side;
  const joined=(room.joinedSides||[]).includes(side);

  return `<div class="liveDraftTeam ${isYou?"you":""} ${turn?"turn":""}">
    <h3>TEAM ${side}
      ${isYou?`<span class="youBadge">YOU</span>`:""}
      ${turn?`<span class="turnBadge">PICKING</span>`:""}
      <span class="budgetLeft">${left} pts left</span>
    </h3>
    ${!joined?`<div class="playerWaiting">Waiting for Player ${liveSides(room).indexOf(side)+1}…</div>`:
      team.length?team.map(c=>miniFighter(c,{cost:true})).join(""):`<div class="draftEmpty">No picks yet</div>`}
  </div>`;
}

function liveDraftRosterHtml(room){
  if(room.status!=="drafting") return "";
  const drafted=new Set(liveSides(room).flatMap(s=>room.teams?.[s]||[]));
  const rows=sortedCharacters(room.config.mediumScope || "all").map(c=>{
    const picked=drafted.has(c.id);
    const allowed=liveDraftPickAllowed(room,c);
    let label="PICK";
    if(picked) label="DRAFTED";
    else if(!liveDraftSession.side) label="WATCH";
    else if(room.turn!==liveDraftSession.side) label="WAIT";
    else if(!allowed) label="UNAVAILABLE";
    const search=`${c.name} ${c.version} ${c.franchise}`.toLowerCase();
    return `<div class="liveRosterRow ${picked?"drafted":""}" data-search="${esc(search)}">
      ${miniFighter(c,{cost:true,image:false})}
      <button class="${allowed?"primary":"secondary"} livePickBtn" data-action="live-draft-pick" data-fighter-id="${esc(c.id)}" ${allowed?"":"disabled"}>${label}</button>
    </div>`;
  }).join("");

  return `<div class="liveRosterPanel">
    <h3>Available roster</h3>
    <input id="liveRosterSearch" type="text" placeholder="Search fighters…">
    <div class="liveRoster">${rows}</div>
  </div>`;
}

function multiplayerResultCardHtml(result,room,title="MULTIPLAYER SHOWDOWN"){
  const v=result.verdict;
  const sides=liveSides(room);
  const teams=Object.fromEntries(sides.map(side=>[side,liveDraftTeam(room,side)]));
  const winningTeam=teams[v.winnerTeam]||[];
  const probs=(v.teamProbabilities||[]).slice().sort((a,b)=>b.probability-a.probability);
  const probHtml=probs.map(p=>`<div class="multiOddsRow"><span>TEAM ${esc(p.team)}</span><div class="multiOddsTrack"><div style="width:${Math.max(0,Math.min(100,p.probability))}%"></div></div><strong>${p.probability}%</strong></div>`).join("");
  const cases=(v.teamCases||[]).map(c=>({title:`Case for Team ${c.team}`,items:c.points||[]}));

  return `<div class="modeResultCard">
    <div class="verdictTop">
      <div><div class="eyebrow">${esc(title)}</div><h2>TEAM ${esc(v.winnerTeam)} WINS</h2><div class="pill">${esc(v.difficulty)}</div></div>
      <div class="oddsBox"><div class="pct">${v.winnerProbability}%</div><div class="oddsLabel">winner chance</div></div>
    </div>
    <p class="headline">${esc(v.headline)}</p>
    <div class="winningTeam">${winningTeam.map(c=>miniFighter(c)).join("")}</div>
    <div class="multiOdds">${probHtml}</div>
    ${genericDetails("Full Multiplayer Analysis",v.analysis,[...cases,{title:"Deciding factors",items:v.decidingFactors||[]}],`<div class="factorBox"><p><strong>Swing factor:</strong> ${esc(v.swingFactor)}</p><p class="small"><strong>Assumptions:</strong> ${esc(v.assumptions)}</p></div>`,result.sources||[])}
  </div>`;
}

function renderLiveDraftRoom(room){
  liveDraftSession.room=room;
  liveDraftSession.side=room.yourSide||null;

  const status=liveDraftStatusText(room);
  const invite=`${location.origin}/draft/${room.code}`;
  const sides=liveSides(room);
  const canFight=room.status==="ready" && Boolean(liveDraftSession.side);
  const spectator=Boolean(room.spectator);

  const shell=`<div class="liveRoomShell">
    <div class="liveRoomTop">
      <div>
        <div class="eyebrow">LIVE MULTIPLAYER DRAFT</div>
        <div class="liveRoomCode">${esc(room.code)}</div>
        <div class="liveRoomMeta">${room.config.playerCount} players • ${room.config.teamSize} fighter${room.config.teamSize===1?"":"s"} each • ${room.config.budget} points each • ${esc(room.config.mediumScope==="comics"?"Comics only":room.config.mediumScope==="screen"?"Movies / TV only":room.config.mediumScope==="games"?"Video Games only":"All media")} • ${esc(liveDraftOrderLabel(room.config.order))}</div>
      </div>
      <div class="liveRoomActions">
        <button class="secondary" data-action="live-copy-invite">🔗 COPY INVITE</button>
        <button class="secondary" data-action="live-new-room">＋ NEW ROOM</button>
      </div>
    </div>
    <div class="liveStatusBanner ${status.cls}">${esc(status.text)}</div>
    ${spectator?`<p class="liveSpectatorNote">All ${room.config.playerCount} player seats are claimed. You are viewing this room as a spectator.</p>`:""}
    <div class="liveDraftBoard players${room.config.playerCount}">${sides.map(side=>liveDraftTeamHtml(room,side)).join("")}</div>
    ${canFight?`<button class="primary big" data-action="live-draft-fight">⚔ START ${room.config.playerCount}-PLAYER BATTLE</button>`:""}
    ${room.status==="judging"?`<div class="loading"><div class="spinner"></div><div><strong>Judging multiplayer battle…</strong><p>Every player will receive the same result when it finishes.</p></div></div>`:""}
    ${liveDraftRosterHtml(room)}
    <div class="liveSyncLine">Live sync • ${room.joinedCount}/${room.config.playerCount} players • room code ${esc(room.code)}</div>
  </div>`;

  $("liveDraftSetup").classList.add("hidden");
  $("liveDraftActive").classList.remove("hidden");
  $("liveDraftActive").innerHTML=shell;

  if(room.status==="complete" && room.result){
    $("modeWorkspace").innerHTML=multiplayerResultCardHtml(room.result,room,`${room.config.playerCount}-PLAYER DRAFT SHOWDOWN`);
  }else{
    $("modeWorkspace").innerHTML="";
  }
}

async function createLiveDraft(){
  const btn=$("createLiveDraftBtn");
  const old=btn.textContent;
  btn.disabled=true;btn.textContent="CREATING ROOM…";
  try{
    const r=await fetch("/api/live-drafts",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        config:{
          playerCount:Number($("liveDraftPlayers").value),
          teamSize:Number($("liveDraftTeamSize").value),
          budget:Number($("liveDraftBudget").value),
          order:$("liveDraftOrder").value,
          mediumScope:rosterScope
        },
        settings:settings()
      })
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||`Could not create room (${r.status})`);
    liveDraftSession={code:data.room.code,token:data.token||"",side:data.room.yourSide||"A",room:data.room,pollTimer:null,lastRenderedAt:data.room.updatedAt||""};
    saveLiveDraftToken(data.room.code,data.token);
    history.replaceState(null,"",`/draft/${data.room.code}`);
    renderLiveDraftRoom(data.room);
    startLiveDraftPolling();
  }catch(err){
    console.error(err);alert(`Live draft could not be created: ${err.message}`);
  }finally{
    btn.disabled=false;btn.textContent=old;
  }
}

async function joinLiveDraft(code,{fromUrl=false}={}){
  code=String(code||"").trim().toUpperCase();
  if(!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code)){
    if(!fromUrl) alert("Enter the 6-character room code.");
    return false;
  }

  const existingToken=storedLiveDraftToken(code);
  let r,data;
  for(let attempt=0;attempt<4;attempt++){
    r=await fetch(`/api/live-drafts/${code}/join`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({token:existingToken})
    });
    data=await r.json().catch(()=>({}));
    if(r.status!==409)break;
    await new Promise(resolve=>setTimeout(resolve,180));
  }
  if(!r.ok){
    if(!fromUrl) alert(data.error||"Could not join that live draft.");
    return false;
  }

  const token=data.token||existingToken||"";
  liveDraftSession={code,token,side:data.room.yourSide||null,room:data.room,pollTimer:null,lastRenderedAt:data.room.updatedAt||""};
  if (["all","comics","screen","games"].includes(data.room.config?.mediumScope)) {
    rosterScope = data.room.config.mediumScope;
    $("rosterScope").value = rosterScope;
    populateSelectors();
  }
  if(token) saveLiveDraftToken(code,token);
  history.replaceState(null,"",`/draft/${code}`);
  setGameMode("draft");
  setDraftFlavor("live");
  renderLiveDraftRoom(data.room);
  startLiveDraftPolling();
  return true;
}

async function refreshLiveDraft({force=false}={}){
  const s=liveDraftSession;
  if(!s.code) return;
  const token=s.token||storedLiveDraftToken(s.code);
  const r=await fetch(`/api/live-drafts/${s.code}?token=${encodeURIComponent(token)}`,{cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Live draft sync failed.");
  const room=data.room;
  if(force || room.updatedAt!==s.lastRenderedAt){
    s.lastRenderedAt=room.updatedAt||"";
    s.room=room;s.side=room.yourSide||null;
    renderLiveDraftRoom(room);
  }
}

async function makeLiveDraftPick(fighterId){
  const s=liveDraftSession;
  if(!s.code||!s.token) return;
  try{
    let r,data;
    for(let attempt=0;attempt<5;attempt++){
      r=await fetch(`/api/live-drafts/${s.code}/pick`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({token:s.token,fighterId})
      });
      data=await r.json().catch(()=>({}));
      if(r.status!==409)break;
      await new Promise(resolve=>setTimeout(resolve,160));
    }
    if(!r.ok) throw new Error(data.error||"Pick failed.");
    s.room=data.room;s.side=data.room.yourSide||s.side;s.lastRenderedAt=data.room.updatedAt||"";
    renderLiveDraftRoom(data.room);
  }catch(err){
    alert(err.message);
    await refreshLiveDraft({force:true}).catch(()=>{});
  }
}

async function fightLiveDraft(){
  const s=liveDraftSession;
  if(!s.code||!s.token) return;
  try{
    const r=await fetch(`/api/live-drafts/${s.code}/fight`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({token:s.token})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok && r.status!==202) throw new Error(data.error||"Could not start the battle.");
    if(data.room){
      s.room=data.room;s.lastRenderedAt=data.room.updatedAt||"";
      renderLiveDraftRoom(data.room);
    }
  }catch(err){
    console.error(err);alert(`Live draft battle failed: ${err.message}`);
    await refreshLiveDraft({force:true}).catch(()=>{});
  }
}

async function copyLiveDraftInvite(){
  const code=liveDraftSession.code;
  if(!code)return;
  const invite=`${location.origin}/draft/${code}`;
  try{await navigator.clipboard.writeText(invite);}
  catch{prompt("Copy this live draft invite:",invite);}
}

function newLiveDraftRoom(){
  stopLiveDraftPolling();
  liveDraftSession={code:null,token:"",side:null,room:null,pollTimer:null,lastRenderedAt:""};
  history.replaceState(null,"","/");
  $("liveDraftSetup").classList.remove("hidden");
  $("liveDraftActive").classList.add("hidden");
  $("liveDraftActive").innerHTML="";
  $("modeWorkspace").innerHTML=`<div class="emptyState">Create a 2–4 player room or enter a 6-character room code to join one.</div>`;
}

async function bootLiveDraftFromUrl(){
  const m=location.pathname.match(/^\/draft\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})\/?$/);
  if(!m)return false;
  setGameMode("draft");
  setDraftFlavor("live");
  return await joinLiveDraft(m[1],{fromUrl:true});
}

const SCENARIOS={
  xenomorph:"Escape an isolated spacecraft infested by multiple Xenomorphs. The character begins alone, has only their standard equipment, must reach an escape craft, and does not know the ship layout in advance.",
  zombies:"Survive 72 hours in a dense modern city during a fast-zombie outbreak, protect themself from infection, secure basic supplies, and reach a military extraction zone.",
  dinosaurs:"Cross a large dinosaur-filled island from one coast to the other and reach a functioning extraction point while dangerous prehistoric predators actively roam the route.",
  terminator:"Survive 24 hours while a T-800 Terminator relentlessly hunts the character through a modern city. No outside allies are available.",
  mordor:"Enter Mordor from outside its borders, reach Mount Doom, complete the objective at the Cracks of Doom, and escape the region alive while facing the setting's normal defenses and hazards."
};
function scenarioText(){const p=$("scenarioPreset").value;return p==="custom"?$("customScenario").value.trim():SCENARIOS[p];}
async function runSurvival(){const fighter=fighterById($("survivalFighter").value),scenario=scenarioText();if(!fighter||!scenario){alert("Choose a fighter and describe the scenario.");return;}setLoading(true,"Researching survival scenario…","Checking the character's exact version and the threats they would face.");try{const r=await fetch("/api/scenario-judge",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fighter,scenario,settings:settings()})});const result=await r.json().catch(()=>({}));if(!r.ok)throw new Error(result.error||`Scenario judge failed (${r.status})`);renderSurvivalResult(result,fighter,scenario);}catch(err){console.error(err);alert(`Survival scenario failed: ${err.message}`);}finally{setLoading(false);}}
function renderSurvivalResult(result,fighter,scenario){const v=result.verdict;$("modeWorkspace").innerHTML=`<div class="modeResultCard"><div class="modeResultHeader"><div><div class="eyebrow">CAN THEY SURVIVE?</div><h2>${esc(fighter.name)} ${v.survives?'SURVIVES':'DOES NOT SURVIVE'}</h2><div class="pill">${esc(v.difficulty)}</div></div><div class="oddsBox"><div class="pct">${v.survivalProbability}%</div><div class="oddsLabel">survival chance</div></div></div><p class="scenarioQuote">${esc(scenario)}</p><div class="oddsTrack"><div style="width:${v.survivalProbability}%"></div></div><p class="headline">${esc(v.headline)}</p>${genericDetails("Full Survival Analysis",v.analysis,[{title:"Advantages",items:v.keyAdvantages},{title:"Major threats",items:v.keyThreats},{title:"How they survive",items:v.winConditions},{title:"How they fail",items:v.failureConditions}],`<div class="factorBox"><p class="small"><strong>Assumptions:</strong> ${esc(v.assumptions)}</p></div>`,result.sources||[])}</div>`;}

async function checkHealth() {
  try {
    const r = await fetch("/api/health");
    const h = await r.json();
    aiConfigured = Boolean(h.aiConfigured);
    $("aiStatus").textContent = aiConfigured ? `● AI research judge online — ${h.model}` : "● AI key not configured — local fallback active";
    $("aiStatus").classList.add(aiConfigured ? "online" : "offline");
  } catch {
    aiConfigured = false;
    $("aiStatus").textContent = "● Server unavailable — local fallback active";
    $("aiStatus").classList.add("offline");
  }
}

function setTab(which) {
  const random = which === "random";
  $("randomTab").classList.toggle("active", random);
  $("manualTab").classList.toggle("active", !random);
  $("randomControls").classList.toggle("hidden", !random);
  $("manualControls").classList.toggle("hidden", random);
}

document.querySelectorAll(".modeTab").forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.mode!=="draft")stopLiveDraftPolling();
  setGameMode(btn.dataset.mode);
});
$("rosterScope").onchange=()=>{
  rosterScope=$("rosterScope").value;
  populateSelectors();

  // New local mode runs should obey the new source immediately.
  gauntletState=null;
  tournamentState=null;
  resetDraft();

  if(gameMode==="gauntlet" || gameMode==="tournament"){
    $("modeWorkspace").innerHTML=`<div class="emptyState">Roster source changed to <strong>${esc(rosterScopeLabel())}</strong>. Start a new ${gameMode}.</div>`;
  }else if(gameMode==="team" || gameMode==="survival"){
    $("modeWorkspace").innerHTML=`<div class="emptyState">Roster source: <strong>${esc(rosterScopeLabel())}</strong>. Choose fighters and start the mode.</div>`;
  }else if(gameMode==="draft" && draftFlavor==="local"){
    renderDraft();
  }
};
$("randomTab").onclick=()=>setTab("random");
$("manualTab").onclick=()=>setTab("manual");
$("randomizeBtn").onclick=async()=>{[currentA,currentB]=randomPair();renderArena();populateSelectors();await judge(currentA,currentB);};
$("manualFightBtn").onclick=async()=>{const a=fighterById($("fighterA").value),b=fighterById($("fighterB").value);if(!a||!b||a.id===b.id){alert("Pick two different fighters.");return;}currentA=a;currentB=b;renderArena();await judge(currentA,currentB);};
$("fighterA").onchange=()=>{const c=fighterById($("fighterA").value);if(c){currentA=c;renderArena();}};
$("fighterB").onchange=()=>{const c=fighterById($("fighterB").value);if(c){currentB=c;renderArena();}};
$("rematchBtn").onclick=()=>judge(currentA,currentB);
$("newBattleBtn").onclick=async()=>{setTab("random");[currentA,currentB]=randomPair();renderArena();populateSelectors();await judge(currentA,currentB);};
$("shareBtn").onclick=async()=>{const btn=$("shareBtn"),old=btn.textContent;btn.disabled=true;btn.textContent="SAVING BATTLE…";try{const shareUrl=await getShortBattleUrl();try{await navigator.clipboard.writeText(shareUrl);btn.textContent="✓ SHORT LINK COPIED";}catch{prompt("Copy this short battle link:",shareUrl);btn.textContent="✓ SHORT LINK READY";}}catch(err){console.error("Short battle link error:",err);alert("Could not create a short battle link. Check the battle-storage setup in Render.");btn.textContent="SHORT LINK FAILED";}finally{setTimeout(()=>{btn.textContent=old;btn.disabled=false;},2200);}};

$("startGauntletBtn").onclick=startGauntlet;
$("startTournamentBtn").onclick=startTournament;
$("teamFightBtn").onclick=()=>runTeamBattle();
$("teamSize").onchange=()=>document.querySelectorAll(".teamThird").forEach(el=>el.classList.toggle("hidden",$("teamSize").value==="2"));
$("draftToA").onclick=()=>addDraft("A");
$("draftToB").onclick=()=>addDraft("B");
$("draftReset").onclick=resetDraft;
$("draftLocalTab").onclick=()=>setDraftFlavor("local");
$("draftLiveTab").onclick=()=>setDraftFlavor("live");
$("createLiveDraftBtn").onclick=createLiveDraft;
$("joinLiveDraftBtn").onclick=()=>joinLiveDraft($("liveDraftCode").value);
$("liveDraftCode").addEventListener("input",e=>{e.target.value=e.target.value.toUpperCase().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g,"").slice(0,6);});
$("liveDraftCode").addEventListener("keydown",e=>{if(e.key==="Enter")joinLiveDraft(e.target.value);});
$("scenarioPreset").onchange=()=>$("customScenarioWrap").classList.toggle("hidden",$("scenarioPreset").value!=="custom");
$("survivalBtn").onclick=runSurvival;
$("modeWorkspace").onclick=async e=>{const action=e.target.closest("[data-action]")?.dataset.action;if(action==="gauntlet-next")await runGauntletNext();if(action==="tournament-next")await runTournamentNext();if(action==="draft-fight")await runTeamBattle(draftState.A,draftState.B,"DRAFT SHOWDOWN");};
$("liveDraftActive").onclick=async e=>{
  const target=e.target.closest("[data-action]");if(!target)return;
  const action=target.dataset.action;
  if(action==="live-copy-invite")await copyLiveDraftInvite();
  if(action==="live-new-room")newLiveDraftRoom();
  if(action==="live-draft-pick")await makeLiveDraftPick(target.dataset.fighterId);
  if(action==="live-draft-fight")await fightLiveDraft();
};
$("liveDraftActive").oninput=e=>{
  if(e.target.id!=="liveRosterSearch")return;
  const q=e.target.value.trim().toLowerCase();
  document.querySelectorAll(".liveRosterRow").forEach(row=>row.classList.toggle("hidden",q&&!row.dataset.search.includes(q)));
};

ensureAvatarStyles();
$("rosterScope").value = rosterScope;
$("rosterCount").textContent = `${CHARACTERS.length} version-specific fighters • 164 comics • 146 movie/TV • 40 games`;
renderArena();
populateSelectors();
resetDraft();
await checkHealth();
const loadedLiveDraft = await bootLiveDraftFromUrl();
if(!loadedLiveDraft){
  const loadedShortBattle = await loadShortBattle();
  if (!loadedShortBattle) await loadFrozenBattle();
  if (loadedShortBattle || currentResult) setGameMode("classic");
}

