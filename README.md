# Multiverse Battle Generator — Flat Repository v3.1

This version intentionally has **NO project subfolder**.

Your GitHub repository root should contain these files directly:

- `Dockerfile`
- `README.md`
- `app.js`
- `characters.js`
- `index.html`
- `package.json`
- `render.yaml`
- `server.js`
- `styles.css`

## Render settings

Change **Root Directory** to blank / unset.

Keep:
- Dockerfile Path: `./Dockerfile`
- Existing OpenAI environment variables
- Existing Upstash environment variables

Do not create or use a `multiverse-battle-generator/` subfolder anymore.

---

# Multiverse Battle Generator — Short Battle IDs v1.5

This is the flat, no-folder build.

## Main change

Share links are now real short battle URLs:

`https://YOUR-SITE.onrender.com/b/Ab3K7xQm`

The AI verdict is stored in Upstash Redis instead of being embedded in the URL.

Old `?battle=...` links still load for backward compatibility, but new shares use short IDs.

## Render environment variables

Already used:
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-terra`

Add these two for short links:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Get them from the REST API section of your Upstash Redis database.

## Why this is better

- Discord-friendly links
- Exact frozen verdict is preserved
- Refreshing `/b/XXXXXXXX` does not rerun the AI
- No third-party URL shortener
- Short link remains tied to your own domain
- Old giant links still work

## Other features retained

- GPT-5.4 mini web research
- GPT-5.6 Terra final judge
- Automatic character portraits
- Version-specific roster
- Random/manual battles
- Battle settings
- Fan-made/noncommercial disclaimer


## v1.6 battle-view cleanup

Finished fights no longer jump straight to the verdict and hide the fighters.
New fights and shared `/b/XXXXXXXX` links land on Fighter A vs Fighter B, with the verdict directly below.


## v1.7 compact results

The page no longer auto-scrolls after a fight. The result always shows the winner, percentage, difficulty, and one-sentence headline. Full reasoning, fighter cases, deciding factors, assumptions, sources, and judge metadata are collapsed under **Full Battle Analysis** until the user opens it.


## v1.8 compact header

The MULTIVERSE BATTLE GENERATOR masthead is substantially smaller and uses less vertical spacing.
The battle controls now appear much higher on desktop and mobile screens.


## v2.0 baseline game modes

Added six top-level modes:
- Versus (existing classic mode, including short frozen links)
- Gauntlet (3 or 5 progressively harder opponents; one match at a time)
- Tournament (4 or 8 fighter random bracket; one match at a time)
- Team Battle (2v2 or 3v3 with a dedicated AI team judge)
- Draft (12-point hot-seat draft, max 3 fighters per team, then team battle)
- Can They Survive? (five presets plus custom survival scenarios with dedicated AI judge)

This is intentionally the baseline functionality. Short-link sharing for non-classic modes, endurance damage in gauntlets, automatic full-bracket resolution, and deeper draft rules can be added after the core flow is tested.


## v2.1 — Live PvP Draft

Draft Mode now has two choices:

- **Local / Hot-Seat** — the existing one-screen draft.
- **Live PvP** — Player 1 creates a room, sends a short `/draft/ABC123` invite, and Player 2 joins from another phone/computer.

Live PvP features:
- 2v2 or 3v3
- configurable point budget
- alternating or snake draft order
- synced picks
- duplicate fighters blocked
- budget validation on the server
- reconnect tokens stored only in each player's browser
- spectators after both seats are claimed
- one shared AI team-battle result for both players
- completed live rooms remain viewable for 7 days

No new service is required. It reuses:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

already configured for short battle links.


## v2.2 — 2 to 4 Player Live Battles

Live Draft now supports:
- 2, 3, or 4 human players
- 1, 2, or 3 fighters per player
- independent point budgets
- round-robin or generalized snake drafting
- Teams A, B, C, and D
- live synced picks and reconnect support
- spectators once all seats are filled
- a true multi-team AI free-for-all judge
- probability estimates for every participating team

Example 4-player snake order with two picks each:
`A → B → C → D → D → C → B → A`

No new Render settings are required. It reuses the existing Upstash storage and OpenAI setup.


## v2.3 — Global Roster Source Filter

The roster already contains explicit `medium` tags.

Current roster:
- Everything: 89
- Comics: 34
- Movies / TV: 55

A new global **Roster Source** selector appears under the game-mode navigation:
- Everything
- Comics only
- Movies / TV only

The filter applies to new:
- Versus battles
- Manual fighter selectors
- Random battles
- Gauntlets
- Tournaments
- Team Battles
- Survival scenarios
- Local drafts
- Live multiplayer drafts

Franchise pools stack with the global source filter. Example:
`Comics only + Marvel` gives Marvel Comics characters only.

Live rooms freeze the selected roster source when the room is created, and the server rejects picks outside that room's source.


## v2.4 — 200-character expansion

Roster expanded from **89 to 289 version-specific fighters**.

New fighters:
- 35 Marvel Comics
- 35 DC Comics
- 15 Star Wars
- 40 anime/animated-TV fighters
- 40 video-game fighters
- 35 additional fantasy, sci-fi, action, and TV/film fighters

Current source totals:
- Everything: 289
- Comics: 104
- Movies / TV: 145
- Video Games: 40

The global Roster Source filter now includes **Video Games only** in addition to the existing Everything / Comics / Movies & TV options.

Live Draft freezes and server-enforces all four roster-source choices.

Portrait lookup was also generalized: any fighter without a hand-curated portrait source now automatically searches Wikipedia using the fighter name + franchise, while preserving initials as the safe fallback if no suitable image is found.


## v2.5 — Alphabetical character selectors

All character lists now sort globally by character name A–Z.
If multiple versions of the same character exist, they are sorted by version after the name.

Applies to Versus, Team Battle, Gauntlet, Survival, Local Draft, and Live Draft.


## v2.6 — Comic counterparts for screen-only comic properties

Added 19 comic versions for characters that previously existed only as movie/TV entries in comic-derived franchises.

New comic counterparts added for:
- Marvel: Black Panther, Captain Marvel, Deadpool, Hela, Loki, Professor X, Quicksilver, Venom, Vision
- DC: Black Adam
- Invincible: Invincible, Omni-Man
- The Boys: Homelander, Soldier Boy
- TMNT: Leonardo, Donatello, Michelangelo, Raphael, Shredder

New totals:
- Everything: 308
- Comics: 123
- Movies / TV: 145
- Video Games: 40


## v2.7 — Anime removed

Removed all 40 Japanese-anime fighters from:
- Dragon Ball
- Naruto
- One Piece
- Bleach
- Jujutsu Kaisen
- Demon Slayer
- My Hero Academia
- Attack on Titan
- One-Punch Man
- Hunter x Hunter

Western animation remains in the roster, including properties such as Invincible and TMNT.

Current totals:
- Everything: 268
- Comics: 123
- Movies / TV: 105
- Video Games: 40


## v2.8 — Movie Shazam

Added:
- **Shazam — DCEU / Shazam! films**
- Billy Batson in standard adult champion form
- Movie/TV roster
- Tier 4 / Heavyweight

Current totals:
- Everything: 269
- Comics: 123
- Movies / TV: 106
- Video Games: 40


## v2.9 — Portrait rate-limit fix

Fixes repeated `Wikipedia API 429` errors.

Changes:
- The full Live Draft roster no longer requests hundreds of portraits at once.
- Selected fighters and battle cards still display portraits.
- Wikipedia requests are serialized and throttled.
- HTTP 429 responses automatically retry with backoff.
- Duplicate simultaneous requests for the same fighter are deduplicated.
- Successful portrait URLs are cached for 30 days in Upstash when configured.
- Failed lookups are temporarily cached so the site does not repeatedly hammer Wikipedia.

Battle judging is unchanged.


## v3.2 — 350-fighter roster

Added exactly **81 fighters**, bringing the roster from 269 to **350**.

### Invincible — 21 additions
Comic + animated versions of:
- Atom Eve
- Allen the Alien
- Battle Beast
- Robot
- Monster Girl
- Rex Splode
- Dupli-Kate
- The Immortal
- Angstrom Levy
- Conquest

Plus:
- Thragg — Comics

### Marvel — 30 additions
Comic + MCU versions of:
- Ultron
- Red Skull
- Nick Fury
- Star-Lord
- Gamora
- Drax
- Rocket Raccoon
- Groot
- Nebula
- Shang-Chi
- Ms. Marvel
- Namor
- Adam Warlock
- Killmonger
- Kang the Conqueror

### DC — 30 additions
Comic + movie/TV versions of:
- Peacemaker
- King Shark
- Hawkman
- Doctor Sivana
- Enchantress
- Amanda Waller
- Rick Flag
- Vigilante
- The Atom
- Firestorm
- Hawkgirl
- Black Lightning
- Superboy
- Metamorpho
- Captain Cold

### New totals
- Everything: 350
- Comics: 164
- Movies / TV: 146
- Video Games: 40

All existing modes, alphabetical selectors, source filters, live drafts, short links, and portrait rate-limit protections are preserved.


## v3.3 — Three-stage roster filtering

The old single Source filter is now:

1. **Source** — Everything / Comics / Movies & TV / Video Games
2. **Universe / Franchise** — generated dynamically from the selected source
3. **Search Characters** — instant text filter for character pick lists

Examples:
- `Comics → Marvel → Venom`
- `Movies / TV → DC → Shazam`
- `Everything → Invincible → Atom Eve`
- `Video Games → Mortal Kombat → Scorpion`

Important behavior:
- Source + Franchise define the actual eligible battle pool.
- Search is only a finder for character selectors; it does not accidentally turn a random tournament into a one-character pool.
- Existing selections are preserved while searching, which makes Team Battle easier to build.
- Random Battle, Gauntlet, and Tournament now use the global Source + Franchise filters instead of separate duplicate pool menus.
- Live Draft freezes both Source and Franchise when the room is created and enforces them server-side.
- Live Draft still has its own local fighter-search field so each remote player can search independently.


## v3.4 — Compact UI

- Main masthead is now **MULTIVERSE BATTLE** on one line
- Removed **GENERATOR**
- Removed the numbered 1 / 2 / 3 filter badges
- Shortened filter labels to Source / Franchise / Search
- Reduced vertical padding and spacing around the filter controls
- Shortened helper text
- All three-stage filtering behavior remains unchanged


## v3.5 — One-line filter bar

- Source → Franchise → Search are on one horizontal row on desktop
- Filter labels are larger and easier to read
- Match count moved directly beneath Search
- Search result text shortened to `X matching`
- Removed the redundant count from `All franchises`
- MULTIVERSE now uses a cyan / blue / purple / teal gradient
- BATTLE remains clean white


## v3.6 — Character Quick Cards

Selected fighters now display a compact quick profile containing:

- Powers / abilities
- Strength — 1 to 10
- Speed — 1 to 10
- Durability — 1 to 10
- Combat Skill — 1 to 10
- Versatility — 1 to 10
- Magic — 1 to 10
- Cosmic — 1 to 10

Each score includes a visual power bar.

The profile scores are display-only and are derived consistently from the fighter's
existing version-specific tier and traits. They do not change or override the AI battle judge.


## v3.7 — Video Game HUD Quick Cards

Character quick cards now use a proper game-style presentation:

- Powers are rendered as separated pill tags
- All seven attributes use a 10-segment HUD bar
- Filled segments visually represent the 1–10 rating
- Numeric score remains visible beside each attribute
- Magic uses a purple bar treatment
- Cosmic uses a gold/orange bar treatment
- Other combat attributes use blue/cyan bars
- Two-column desktop layout, one-column mobile layout
- Quick-card styles are injected by the app as a fallback in addition to styles.css
  so browser/static CSS caching cannot strip the visual HUD formatting

The ratings remain display-only and do not alter the battle judge.


## v3.8 — HUD profiles in every game mode

The Powers + 10-segment attribute HUD is now available throughout the site.

- Versus: remains fully visible on both fighter cards
- Gauntlet: champion and every opponent have Powers & Stats expanders
- Tournament: every bracket fighter has a Powers & Stats expander
- Team Battle: setup previews and post-battle profiles for both teams
- Local Draft: available-fighter preview and profiles for every drafted fighter
- Live Draft: every drafted team member has an expandable profile
- Multiplayer result: all teams can be inspected, not only the winning team
- Survival: selected character profile is visible during setup and open in the result

To keep large brackets and drafts readable, multi-fighter modes use collapsed
`POWERS & STATS` panels. Opening one reveals the same powers and seven HUD bars
used in Versus.

The 350-row Live Draft *available roster* intentionally remains lightweight for
performance; once a fighter is drafted, their full expandable HUD is available.
