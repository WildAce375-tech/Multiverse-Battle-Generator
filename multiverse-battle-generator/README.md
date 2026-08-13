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
