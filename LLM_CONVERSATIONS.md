# LLM Usage Log

## Tools / LLMs used

- **Claude (Anthropic)** — used as the coding assistant to design and generate the full
  application (backend scraper/API, Gemini prompt design, frontend React app, styling,
  README/docs) inside this repo.
- **Google Gemini (`gemini-2.0-flash`, free tier)** — the LLM the *shipped application* itself
  calls at runtime via `@google/generative-ai` to generate each CRO audit from the scraped
  page signals. Chosen because it's free, fast, and returns reliable structured JSON via
  `responseMimeType: "application/json"`, per the assignment's "any LLM (free), except
  ChatGPT" constraint.

## Key prompts / decisions during development (with Claude)

1. **Framing the brief** — asked Claude to read the assignment PDF and scaffold a full-stack
   project: React + Vite frontend, Node/Express backend, a scraper, and a free non-OpenAI LLM
   for analysis, packaged as a downloadable project with README, architecture notes, and this
   conversation log.

2. **Scraper approach** — decided against a headless browser (Puppeteer/Playwright) to avoid
   heavy native binary dependencies and flaky installs in constrained environments. Chose
   `axios` + `cheerio` for a static HTML fetch/parse instead, extracting: title, meta
   description, H1/H2s, first paragraphs (hero copy proxy), button/CTA text, image alt-text
   coverage, a keyword scan for trust signals (reviews, free shipping, guarantees, secure
   checkout, social proof, payment badges), price/urgency/discount language, form/input
   counts, responsive viewport meta, word count, and nav link count.

3. **LLM audit design** — designed a single Gemini prompt (see `backend/src/llmService.js`)
   that:
   - Frames Gemini as a senior CRO auditor reviewing structured page signals (not raw HTML,
     to keep the prompt small and reduce noise/cost).
   - Requests **only** a JSON object matching an exact schema covering every section the
     assignment requires (hero, CTA, trust signals, product page issues, mobile UX, copy
     clarity, friction points, recommendations, CRO score) plus two bonus fields (priority
     levels, and AI-generated hero headline / CTA copy alternatives).
   - Instructs the model to reason conservatively from evidence rather than fabricate specifics
     when a signal is absent (e.g. "no return-policy keyword found" → "not visibly
     communicated" rather than inventing claims).
   - Uses `generationConfig.responseMimeType: "application/json"` plus a defensive
     `safeParseJson()` fallback (strips markdown fences if the model adds them anyway) so the
     API never crashes on a malformed response.

4. **Frontend design direction** — asked Claude to design a distinctive visual identity rather
   than a generic dashboard template. Landed on "Scanline": a dark diagnostic/scan-report
   theme (deep charcoal background, teal accent, mono/display type pairing) with a signature
   radial CRO-score gauge (animated SVG arc) and severity-color-coded finding cards, friction
   points, and recommendations — because color-coded severity is functional content in a CRO
   audit tool, not decoration.

5. **Bonus feature selection** — given the 24h scope, chose to implement: save previous audits
   (flat JSON file store, no DB setup required), priority levels per recommendation/friction
   point, AI-generated improved hero copy + CTA options, and a two-page compare view. Explicitly
   skipped PDF export and screenshot-based analysis to avoid adding a headless-browser
   dependency, and documented that tradeoff in the README.

6. **Verification** — had Claude install both `backend` and `frontend` dependencies, boot the
   Express server and confirm `/api/health` responds, and run `npm run build` on the frontend
   to confirm the React app compiles cleanly with no errors, before packaging the project.
