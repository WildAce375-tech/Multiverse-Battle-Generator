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
