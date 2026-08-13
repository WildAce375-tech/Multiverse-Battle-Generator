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
