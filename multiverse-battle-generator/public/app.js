import { CHARACTERS } from "./characters.js";

const $ = (id) => document.getElementById(id);
const TIER_NAMES = {1:"Human",2:"Enhanced",3:"Superhuman",4:"Heavyweight",5:"Planetary+",6:"Cosmic",7:"Reality Warper"};
let currentA = CHARACTERS.find(c => c.id === "mcu_thor");
let currentB = CHARACTERS.find(c => c.id === "dceu_superman");
let currentResult = null;
let aiConfigured = false;

function esc(s="") {
  return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}


function fighterImagePath(c) {
  return c.image || `/images/characters/${c.id}.webp`;
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
    .fighterAvatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
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
        <img src="${esc(imagePath)}" alt="${esc(c.name)} portrait" loading="lazy" />
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
    img.addEventListener('error', () => avatar?.classList.remove('hasImage'), { once: true });
    if (img.complete && img.naturalWidth > 0) avatar?.classList.add('hasImage');
  }
}

function renderArena() {
  renderFighter("cardA", currentA, "A");
  renderFighter("cardB", currentB, "B");
}

function optionLabel(c) {
  return `${c.name} — ${c.version}`;
}

function populateManual() {
  const sorted = [...CHARACTERS].sort((a,b) =>
    a.franchise.localeCompare(b.franchise) || a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
  );
  const opts = sorted.map(c => `<option value="${c.id}">${esc(optionLabel(c))}</option>`).join("");
  $("fighterA").innerHTML = opts;
  $("fighterB").innerHTML = opts;
  $("fighterA").value = currentA.id;
  $("fighterB").value = currentB.id;
}

function settings() {
  return {
    mode: $("mode").value,
    prep: $("prep").value,
    battlefield: $("battlefield").value,
    distance: $("distance").value
  };
}

function applySettings(s={}) {
  for (const k of ["mode","prep","battlefield","distance"]) {
    if (s[k] && $(`${k}`)) $(`${k}`).value = s[k];
  }
}

function poolList() {
  const pool = $("randomPool").value;
  return CHARACTERS.filter(c => {
    if (pool === "all") return true;
    if (pool === "marvel") return c.franchise === "Marvel";
    if (pool === "dc") return c.franchise === "DC";
    if (pool === "other") return !["Marvel","DC"].includes(c.franchise);
    if (pool === "comics") return c.medium === "Comics";
    if (pool === "screen") return c.medium === "Movie/TV";
    return true;
  });
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPair() {
  const list = poolList();
  if (list.length < 2) return [CHARACTERS[0], CHARACTERS[1]];
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

async function judge(a, b, {forceFallback=false}={}) {
  setLoading(true);
  $("verdictPanel").classList.add("hidden");
  try {
    if (forceFallback || !aiConfigured) {
      currentResult = localJudge(a,b);
    } else {
      const r = await fetch("/api/judge", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({fighterA:a, fighterB:b, settings:settings()})
      });
      if (!r.ok) {
        const e = await r.json().catch(()=>({}));
        throw new Error(e.error || `Judge failed (${r.status})`);
      }
      currentResult = await r.json();
    }
    renderVerdict(currentResult);
    await freezeIntoUrl();
  } catch (err) {
    console.error(err);
    currentResult = localJudge(a,b);
    currentResult.fallbackReason = err.message;
    renderVerdict(currentResult);
    await freezeIntoUrl();
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  $("loading").classList.toggle("hidden", !on);
  for (const id of ["randomizeBtn","manualFightBtn","rematchBtn","newBattleBtn"]) {
    if ($(id)) $(id).disabled = on;
  }
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

  $("verdictPanel").classList.remove("hidden");
  $("verdictPanel").scrollIntoView({behavior:"smooth", block:"start"});
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
async function freezeIntoUrl() {
  if (!currentResult) return;
  const encoded = await encodePayload(battlePayload());
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("battle", encoded);
  history.replaceState(null, "", u);
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
    populateManual();
    renderVerdict(currentResult);
    return true;
  } catch (e) {
    console.warn("Could not load shared battle:",e);
    return false;
  }
}

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

$("randomTab").onclick=()=>setTab("random");
$("manualTab").onclick=()=>setTab("manual");
$("randomizeBtn").onclick=async()=>{
  [currentA,currentB]=randomPair();
  renderArena(); populateManual();
  await judge(currentA,currentB);
};
$("manualFightBtn").onclick=async()=>{
  const a=fighterById($("fighterA").value), b=fighterById($("fighterB").value);
  if (!a || !b || a.id===b.id) { alert("Pick two different fighters."); return; }
  currentA=a;currentB=b;renderArena();
  await judge(currentA,currentB);
};
$("fighterA").onchange=()=>{const c=fighterById($("fighterA").value);if(c){currentA=c;renderArena();}};
$("fighterB").onchange=()=>{const c=fighterById($("fighterB").value);if(c){currentB=c;renderArena();}};
$("rematchBtn").onclick=()=>judge(currentA,currentB);
$("newBattleBtn").onclick=async()=>{
  setTab("random");
  [currentA,currentB]=randomPair();renderArena();populateManual();
  await judge(currentA,currentB);
};
$("shareBtn").onclick=async()=>{
  await freezeIntoUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    const old=$("shareBtn").textContent;$("shareBtn").textContent="✓ LINK COPIED";
    setTimeout(()=>$("shareBtn").textContent=old,1400);
  } catch {
    prompt("Copy this battle link:",location.href);
  }
};

ensureAvatarStyles();
$("rosterCount").textContent = `${CHARACTERS.length} version-specific fighters`;
renderArena();
populateManual();
await checkHealth();
await loadFrozenBattle();
