# Multiverse Battle Generator — Clean Build

This is the consolidated working project.

## Included
- Random and manual battles
- Tier-aware matchmaking + Chaos Mode
- Battle rules, prep, battlefield, and starting distance
- OpenAI web research using `gpt-5.4-mini`
- Final battle judge using `gpt-5.6-terra`
- Frozen shareable battle links
- Research citations
- Portrait-ready fighter cards
- Clean initials fallback when a portrait is missing
- Basic hourly API throttling

## Render environment variables
Keep these in Render:

- `OPENAI_API_KEY` = your secret API key
- `OPENAI_MODEL` = `gpt-5.6-terra`

Optional:
- `OPENAI_RESEARCH_MODEL` = `gpt-5.4-mini`
- `AI_BATTLES_PER_IP_PER_HOUR` = `12`
- `AI_GLOBAL_BATTLES_PER_HOUR` = `120`

## Portraits
Put `.webp` files in:

`public/images/characters/`

The filename must exactly match the fighter ID in `public/characters.js`.

Example:

`mcu_thor.webp`

No code change is required when you add a portrait.
