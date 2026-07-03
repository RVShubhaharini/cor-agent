# LLM Usage Log

## Tools / LLMs used

- **Claude (Anthropic)** — used as the coding assistant throughout development: designing
  the system architecture, scaffolding the backend scraper/API, writing the LLM audit
  prompt, building the React frontend and styling, resilient database layer, deployment
  config, and this documentation.
- **Groq API — `llama-3.3-70b-versatile`** — the LLM the *shipped application* calls at
  runtime (`backend/src/llmService.js`) to turn scraped page signals into a structured CRO
  audit. Chosen for its free tier, very low latency (sub-second completions), and reliable
  structured output via `response_format: { type: "json_object" }`.

> Note: an earlier draft of this project used Google Gemini and a static
> `axios + cheerio` scraper (no headless browser). During development this was replaced
> with **Groq/Llama-3.3-70B** for inference and **Puppeteer + Cheerio** for scraping, to
> correctly handle JavaScript-rendered storefronts (React/Vue/Shopify) and to capture a
> live page screenshot. This log reflects the final, shipped architecture.

## Key prompts / decisions during development (with Claude)

1. **Framing the brief** — asked Claude to scaffold a full-stack CRO-audit project: a
   React + Vite frontend, a Node/Express backend, a page scraper, and an LLM analysis step,
   packaged with a README, an architecture explanation, and this conversation log.

2. **Scraper approach** — initially considered a static `axios + cheerio` fetch to avoid a
   headless-browser dependency, but switched to **Puppeteer** (headless Chrome) once it
   became clear many target landing pages (Shopify, React/Vue storefronts) render their
   hero, price, and CTA elements client-side and would return near-empty HTML to a static
   fetch. Puppeteer now handles navigation (`waitUntil: "domcontentloaded"` + a 1.5s
   hydration buffer, a realistic desktop user agent, and a 1280×800 viewport), while
   Cheerio still does the actual HTML parsing once the page has rendered. Asked Claude to
   also capture a compressed JPEG screenshot (50% quality, base64-encoded) alongside the
   signal extraction so the dashboard can show a thumbnail of the scanned page.

3. **Signal extraction design** — worked with Claude to define exactly which structural
   signals are worth extracting for a CRO audit: title/meta/OG tags, H1/H2 headings, first
   body paragraphs (hero-copy proxy), CTA button/link text (with a noise-filter for nav
   items like "menu"/"close"), image count vs. missing alt-text, a keyword scan for trust
   signals (reviews/ratings, free shipping, money-back/returns, guarantees, secure
   checkout, social proof numbers, payment badges), price/urgency/discount language, form
   and input counts, nav link count, and word count. On top of the general signals, added a
   second, more targeted pass (`detectedElements`) that tries CSS-selector and regex
   heuristics to pull out the specific product title, price, primary CTA, star rating, and
   description — so the LLM prompt can reference concrete product data rather than only
   generic page structure.

4. **LLM audit prompt design** — designed a single Groq prompt
   (`backend/src/llmService.js`) that:
   - Frames the model as a senior CRO auditor reviewing structured signals (not raw HTML),
     to keep the prompt compact and grounded.
   - Requests **only** a single JSON object matching an exact schema: an overall
     `croScore` (0–100), a `croScoreBreakdown` across six weighted categories (hero
     section /20, CTA quality /15, trust signals /20, mobile UX /15, copy clarity /15,
     product page issues /15) that must sum to the total score, per-category analysis text
     with a severity level, a list of concrete friction points, prioritized recommendations
     that each include a diagnostic reason, and two bonus fields — AI-rewritten hero
     headlines and CTA button copy.
   - Explicitly instructs the model to score **dynamically** rather than anchoring to a
     "default" mid-range score, after early test runs kept returning very similar scores
     (~60) regardless of how good or bad the page actually was.
   - Instructs the model to reason only from the evidence provided and to say a signal is
     "not visibly communicated" rather than inventing details when something wasn't found.
   - Requires that the AI-rewritten copy stay specific to the actual product being audited
     (e.g. its real benefits/price) rather than generic store-level slogans — this was a
     direct fix after early outputs produced generic marketing taglines instead of
     product-specific copy.
   - Uses Groq's `response_format: { type: "json_object" }` and `temperature: 0` for
     deterministic, valid-JSON completions, backed by a defensive `safeParseJson()` helper
     that strips stray markdown fences and locates the outer `{ ... }` bounds in case the
     model still wraps its output.

5. **Score integrity safety-net** — asked Claude to never trust the model's own reported
   `croScore` directly; instead, `generateAudit()` recomputes the total by summing the six
   category scores server-side and clamps the result to 0–100, so a partially malformed
   breakdown can't silently produce an inconsistent or out-of-range score.

6. **Resilient persistence layer** — asked Claude to make the Supabase integration
   tolerant of different table layouts, since the exact column names weren't fixed ahead of
   time. `db.js` now attempts inserts against three schema variants in order (snake_case
   `cro_score`/`score_summary`, a minimal `score`/`summary` layout, and camelCase), and
   falls back automatically to a local JSON file (`backend/data/audits.json`) if Supabase
   env vars are missing or every insert attempt fails — so the app works with zero database
   setup and upgrades transparently once Supabase is configured. Also asked Claude to avoid
   `.single()` on Supabase reads (which throws on 0 rows under RLS) and to sort results in
   JavaScript as a fallback if the table lacks a `created_at`/`createdAt` column.

7. **Frontend design direction** — asked Claude to design a distinctive visual identity
   rather than a generic admin-dashboard template. Landed on "Scanline": a dark
   diagnostic/scan-report theme (deep charcoal background, teal accent, mono/display type
   pairing) built with a hand-written CSS design system, an animated SVG radial CRO-score
   gauge (`ScoreGauge.jsx`), and severity-color-coded finding cards — since color-coded
   severity is functional information in a CRO audit tool, not decoration.

8. **Feature set & scope decisions** — given the project's time-boxed scope, chose to
   implement: audit history with save/delete (`SavedAudits.jsx`, `/api/audits`), a
   two-page side-by-side compare mode (`CompareView.jsx`, `/api/compare`, run sequentially
   to avoid CPU spikes), a "paste raw HTML" fallback path in the scan bar for sites that
   block automated crawlers, priority levels on every recommendation/friction point, and
   AI-generated improved hero copy + CTA options. PDF export was implemented via the
   browser's native print pipeline (`@media print` CSS) rather than a server-side PDF
   library, to avoid an extra heavy dependency.

9. **Error handling & UX** — asked Claude to surface actionable diagnostics rather than raw
   stack traces when a scrape fails — the frontend's error panel explicitly lists likely
   causes (bot-blocking, login walls, invalid URLs, network timeouts) and points the user to
   the "paste HTML" fallback, and the backend distinguishes upstream HTTP failures (502)
   from internal errors (500) based on the caught error message.

10. **Verification** — had Claude install dependencies in both `backend/` and `frontend/`,
    boot the Express server and confirm `GET /api/health` responds with the active Groq
    model, run a live `/api/analyze` scan end-to-end against a real product page, and run
    `npm run build` on the frontend to confirm the React app compiles cleanly before
    treating the project as done.
