# Multiverse Battle Generator — Automatic Web Portraits

This is the flat, no-folder build.

## What changed
- Real-character identification thumbnails load automatically through `/api/portrait`.
- Most portraits come from curated version-specific Wikipedia/Wikimedia pages.
- A few screen versions that do not have a useful Wikipedia portrait use a curated direct web image.
- If an exact-enough image cannot be resolved, the card intentionally keeps the initials placeholder instead of showing the wrong version.
- Portrait lookups are cached by the server for 7 days.
- Fan-made/noncommercial/IP disclaimer added to the footer.

## Render variables
- `OPENAI_API_KEY` = your secret OpenAI key
- `OPENAI_MODEL` = `gpt-5.6-terra`

The research model defaults to `gpt-5.4-mini`.

## GitHub
Upload/replace these top-level files. There is no `public` folder.
