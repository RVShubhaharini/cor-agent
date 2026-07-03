# Scanline — AI Landing Page CRO Agent

Scanline is a full-stack agent that audits any product/landing page URL for Conversion
Rate Optimization (CRO). It crawls the live page with a headless browser, extracts
structural and copy signals, sends those signals to an LLM (Llama 3.3 70B via the Groq
API) for a scored, structured audit, and renders the result as an interactive report —
with history, a compare mode, and print-to-PDF export.

Repo: https://github.com/RVShubhaharini/cor-agent

---

## 1. Architecture Overview

```
┌────────────────┐      POST /api/analyze       ┌───────────────────┐
│   React + Vite  │ ───────────────────────────▶ │  Express REST API │
│   (frontend/)   │ ◀─────────────────────────── │   (backend/)      │
└────────────────┘        JSON audit result       └─────────┬─────────┘
                                                              │
                        ┌─────────────────────────────────────┼─────────────────────────┐
                        │                                     │                         │
                        ▼                                     ▼                         ▼
                ┌───────────────┐                   ┌──────────────────┐     ┌────────────────────┐
                │  Puppeteer     │                   │   Groq API        │     │  Supabase (Postgres)│
                │  scraper.js    │──extracted signals▶│  llmService.js    │     │  or local audits.json│
                │ (headless      │   + prompt         │  (Llama-3.3-70B)  │     │       db.js          │
                │  Chrome)       │                    │  temperature: 0   │     │                      │
                └───────────────┘                   └──────────────────┘     └────────────────────┘
```

**Request flow for a scan:**
1. The frontend (`ScanBar.jsx`) sends a URL (or pasted raw HTML) to `POST /api/analyze`.
2. `backend/src/routes/analyze.js` validates the input and calls either:
   - `scrapePage(url)` — launches headless Chrome via Puppeteer, waits for the DOM plus a
     1.5s hydration buffer, captures a JPEG screenshot (base64), and grabs the rendered
     HTML; or
   - `extractSignals(html, url)` directly, if raw HTML was pasted instead of a URL.
3. `scraper.js` parses the HTML with Cheerio and extracts structured signals: title, meta
   description, H1/H2s, CTA button text, image alt-tag coverage, trust-signal keywords
   (reviews, guarantees, secure checkout, social proof, etc.), price/urgency/discount
   language, form/input counts, nav link count, word count, and a set of "detected
   elements" (product title, price, primary CTA, rating, description) using targeted CSS
   selectors and regex.
4. `llmService.js` builds a single structured prompt from those signals and calls the
   **Groq API** (`llama-3.3-70b-versatile`, `temperature: 0`, `response_format:
   json_object`) asking for a JSON object containing: an overall CRO score (0–100) broken
   down across 6 weighted categories (hero section, CTA quality, trust signals, mobile UX,
   copy clarity, product page issues), per-category analysis + severity, a list of friction
   points, prioritized recommendations with reasons, and AI-rewritten hero headlines/CTA
   copy tailored to the specific product.
5. The route assembles a `record` (id, url, score, timestamp, raw page data, audit JSON)
   and, if `save: true` was requested, persists it via `db.js`.
6. `db.js` tries **Supabase** (Postgres) first, attempting three different column-naming
   schemas in sequence (snake_case, `score`/`summary`, camelCase) so it tolerates whatever
   table layout exists; if Supabase isn't configured or every insert attempt fails, it
   transparently falls back to a local JSON file (`backend/data/audits.json`).
7. The frontend renders the result in `AuditReport.jsx` (score gauge, heuristic cards,
   before/after copy, recommendations) and the browser's native print stylesheet turns the
   dashboard into a clean PDF via `Ctrl+P`.

A second endpoint, `POST /api/compare`, runs the scrape + audit pipeline sequentially for
two URLs and returns both results for side-by-side comparison (`CompareView.jsx`).

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Component-based SPA, hand-rolled CSS design system (`index.css`) with CSS variables, no UI framework |
| Backend | Node.js + Express | REST API (`server.js`, `src/routes/*`) |
| Scraping | Puppeteer (headless Chrome) + Cheerio | Renders JS-heavy pages, then parses static HTML for signals |
| AI inference | Groq API — `llama-3.3-70b-versatile` | Deterministic (`temperature: 0`), forced JSON output |
| Storage | Supabase (Postgres) with local-file fallback | `backend/data/audits.json` used automatically if Supabase env vars are absent |
| IDs | `nanoid` | 10-char unique audit IDs |
| Deployment | `render.yaml` | Two Render services: Node web service (backend) + static site (frontend) |

## 3. Project Structure

```
cor-agent/
├── backend/
│   ├── server.js              # Express app entry point, CORS, health check
│   ├── src/
│   │   ├── scraper.js         # Puppeteer crawl + Cheerio signal extraction
│   │   ├── llmService.js      # Groq prompt construction + call + JSON safety-net
│   │   ├── db.js              # Supabase adapter with local-file fallback
│   │   └── routes/
│   │       ├── analyze.js     # POST /api/analyze, POST /api/compare
│   │       └── audits.js      # GET/DELETE /api/audits (history)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Tab shell: Scan / Saved Audits / Compare
│   │   ├── api.js             # fetch wrappers for the backend REST API
│   │   └── components/
│   │       ├── ScanBar.jsx        # URL / paste-HTML input
│   │       ├── Loader.jsx         # Stepped progress indicator
│   │       ├── AuditReport.jsx    # Score, breakdown, recommendations, copy
│   │       ├── ScoreGauge.jsx     # Animated SVG CRO score gauge
│   │       ├── SavedAudits.jsx    # Audit history list
│   │       └── CompareView.jsx    # Two-URL side-by-side audit
│   └── .env.example
└── render.yaml                 # Render.com deployment config (backend + frontend)
```

## 4. Setup Instructions

### Prerequisites
- Node.js ≥ 18
- A free [Groq API key](https://console.groq.com/) (for the LLM audit step)
- *(Optional)* A [Supabase](https://supabase.com/) project, if you want cloud-persisted
  audit history instead of the local JSON fallback

### 4.1 Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
CLIENT_ORIGIN=*
# Optional — omit both to use the local audits.json fallback:
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
```

```bash
npm run dev
```

Backend runs on `http://localhost:5000`. Verify with:

```bash
curl http://localhost:5000/api/health
```

### 4.2 (Optional) Supabase table

If you want cloud storage instead of the local JSON fallback, run this in the Supabase SQL
Editor (and disable Row Level Security so the anon key can write):

```sql
drop table if exists audits;

create table audits (
  id text primary key,
  url text not null,
  cro_score integer,
  score_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  full_record jsonb not null
);
```

### 4.3 Frontend

```bash
cd frontend
npm install
cp .env.example .env
# .env: VITE_API_URL=http://localhost:5000/api
npm run dev
```

Frontend runs on `http://localhost:5173` (or `5174` if `5173` is taken).

### 4.4 Deployment (Render)

`render.yaml` at the repo root defines two services — a Node web service for `backend/`
and a static site for `frontend/`. Push the repo to Render, set the real `GROQ_API_KEY`
(and Supabase values, if used) and `VITE_API_URL` in the Render dashboard, and deploy both
services.

## 5. API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check, returns the active Groq model |
| POST | `/api/analyze` | Body: `{ url }` or `{ html }`, optional `save: true`. Runs the scrape + audit pipeline and returns the full record |
| POST | `/api/compare` | Body: `{ urlA, urlB }`. Runs the pipeline for two pages and returns both results |
| GET | `/api/audits` | Lists saved audit history (id, url, score, timestamp) |
| GET | `/api/audits/:id` | Fetches a full saved audit record |
| DELETE | `/api/audits/:id` | Deletes a saved audit |

## 6. Key Features

1. **Interactive stepped loader** — shows scraper → heuristics → LLM audit progress.
2. **Page screenshots** — thumbnail of the scanned page next to the score breakdown.
3. **Automated heuristic cards** — rule-based checks for viewport meta, missing alt tags,
   nav complexity, and form friction.
4. **Before/after copy comparisons** — current headline/CTA vs. AI-generated alternatives.
5. **Prioritized recommendations** — each with a diagnostic reason and priority level.
6. **Side-by-side comparison** — audit two URLs sequentially.
7. **Diagnostic error messages** — actionable guidance (bot block, login wall, timeout) when
   a scrape fails, plus a "paste raw HTML" fallback path.
8. **Resilient persistence** — cloud storage via Supabase with automatic local-file
   fallback, so the app works with zero database setup.
9. **PDF export** — native browser print (`Ctrl+P`) using dedicated `@media print` styles.

## 7. Notes / Known Trade-offs

- The LLM call is capped by Groq's request timeout (30s) and grades **strictly from the
  extracted signals**, not the full raw HTML, to keep prompts small and outputs grounded.
- `db.js` intentionally tries three insert schemas against Supabase so the same code works
  whether the audits table uses snake_case, camelCase, or a minimal `score`/`summary`
  layout — this trades a little verbosity for zero-friction setup.
- Puppeteer requires downloading a Chromium binary on `npm install`
  (`postinstall: puppeteer browsers install chrome`), which increases install size but
  avoids the reliability issues of static-HTML-only scraping on JS-heavy storefronts.
