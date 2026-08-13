# Multiverse Battle Generator — Flat Build

This version intentionally has **no public folder**. All site files live at the repository root so GitHub's browser uploader cannot flatten the project incorrectly.

## Required Render environment variables

- `OPENAI_API_KEY` = your secret OpenAI API key
- `OPENAI_MODEL` = `gpt-5.6-terra`

The web-research model defaults to `gpt-5.4-mini`.

## Render

Keep the Render Root Directory pointed at the folder/repository containing these files. Dockerfile Path should be `./Dockerfile`.

## Files

- `server.js` — secure server + AI judge
- `index.html`, `app.js`, `characters.js`, `styles.css` — website
- `Dockerfile`, `package.json`, `render.yaml` — deployment

## Portraits

The app currently shows clean initials placeholders. The next portrait update can use one single `portraits.webp` sprite sheet at the root instead of an images folder.
