# Multiverse Battle Generator

A shareable fan-made versus-battle web app for Marvel, DC, mainstream movies and TV.

## What this build already does

- Random battles with **tier-aware matchmaking** by default.
- **Chaos Mode** for intentionally ridiculous mismatches.
- Manual character selection.
- Separate versions (for example MCU Thor and Marvel Comics Thor are different entries).
- Battle options: standard/bloodlusted, prep time, battlefield, starting distance.
- Live **OpenAI Responses API** adjudication.
- First AI pass can use **web search** to research matchup-specific feats.
- Second AI pass makes a structured verdict from the research.
- Clickable research sources.
- Probability + standardized difficulty rating.
- "Case for A / Case for B" debate mode.
- Rematches.
- A **frozen verdict encoded into the share URL**, so friends see the exact same ruling without a database.
- Local coarse fallback if the API key is missing or the AI call fails.

## 1. Run it on your computer

You need Node.js 20 or newer.

There are **no npm dependencies** in this build. Open a terminal in this folder.

Copy `.env.example` to `.env`, then put your API key in `.env`:

```env
OPENAI_API_KEY=your_real_key_here
OPENAI_MODEL=gpt-5.6
PORT=3000
```

Then:

```bash
npm run dev
```

(`npm run dev` only launches Node here; there is nothing to install.)

Open:

```text
http://localhost:3000
```

### Important API-key rule

Never put the OpenAI API key in `public/app.js`, HTML, GitHub, or any browser-side code.
This project keeps the key server-side in an environment variable.

## 2. Put it on GitHub

Create a new repository, then upload the contents of this folder. Do **not** upload your `.env` file.
`.gitignore` already excludes it.

Typical command-line flow:

```bash
git init
git add .
git commit -m "Initial Multiverse Battle Generator"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 3. Deploy it

This is a zero-dependency Node web app and can run on hosts such as Render, Railway, Fly.io, or a container host.

### Render

A `render.yaml` file is included.

1. Connect the GitHub repository to Render.
2. Create a Web Service (or use the Blueprint from `render.yaml`).
3. Add the secret environment variable:
   - `OPENAI_API_KEY` = your key
4. `OPENAI_MODEL` is already set to `gpt-5.6` in the blueprint; change it if desired.
5. Deploy.

The server automatically uses the host's `PORT`.

## How frozen links work

After a verdict, the app compresses these into the `?battle=...` URL:

- Fighter IDs
- Battle settings
- Exact verdict
- Sources
- Model metadata
- Generation timestamp

That means opening a shared URL does **not** rerun the battle. A rematch creates a new verdict and a new frozen URL.

This avoids needing a database for v1. If you later want short links like `/b/7FG2K`, add a database and store the frozen payload server-side.

## Character roster

Edit:

```text
public/characters.js
```

Each character has:

- `id`
- `name`
- `version`
- `franchise`
- `medium`
- `tier`
- `tierName`
- `traits`

The tiers are only used for sane random matchmaking and the emergency local fallback. They are **not** sent to the AI as fake numerical proof of who wins.

## Difficulty scale

- 95–100%: Stomp
- 90–94%: No Difficulty
- 80–89%: Low Difficulty
- 65–79%: Mid Difficulty
- 55–64%: High Difficulty
- 50–54%: Extreme Difficulty

## Recommended next upgrades

1. Short battle IDs with a small database.
2. Character portraits using licensed/user-provided art or a safe custom art strategy.
3. Community vote under each AI verdict.
4. "Best of 3 judges" mode.
5. Custom character/version entry.
6. User accounts and battle history.
7. More granular universes (Arrowverse, Sony Spider-Man universe, animated DC, etc.).
8. Admin roster editor instead of editing JSON.

## Public-site cost protection

Because the public site calls the API on your account, the server includes a simple in-memory hourly throttle.

Defaults:

```env
AI_BATTLES_PER_IP_PER_HOUR=12
AI_GLOBAL_BATTLES_PER_HOUR=120
```

Lower these while testing if you want. The counters reset when the server restarts, so this is basic protection rather than enterprise-grade abuse prevention.

Also set a small API project spend limit while you test the site.

## Cost control

Every live AI battle currently makes two model calls:
1. web-research pass
2. structured judging pass

That is intentional for better consistency and citations. If cost becomes important, you can cache identical matchup/settings combinations or use a cheaper research/judging configuration.

## Disclaimer

Fan-made discussion tool. Not affiliated with Marvel, DC, Disney, Warner Bros., or other rights holders.
Fictional-versus outcomes are subjective estimates, not canon.
