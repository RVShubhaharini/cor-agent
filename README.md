# Scanline — AI Landing Page CRO Agent

Scanline is a premium, developer-grade Conversion Rate Optimization (CRO) audit platform. It automatically crawls any product or landing page URL, extracts visual and textual content, runs automated design heuristic checks, generates structural benefit-led copywriting alternatives, and utilizes a state-of-the-art LLM to build a comprehensive, scored audit report.

---

## Complete Tech Stack by Stage

### 1. User Interface (Frontend Layer)
* **Framework**: `React 18` + `Vite` — provides lightning-fast hot module reloading (HMR) and a modular, component-based workspace.
* **Styling System**: `Vanilla CSS3` — a custom design system utilizing CSS variables for consistent design tokens, sleek glassmorphism effects, flexbox/grid alignments, and responsive layout wrapping.
* **Layouts**: Responsive views optimized for standard Desktop, Laptop, Tablet, and Mobile devices (verified across iOS and Android aspect ratios in Chrome DevTools).
* **Native PDF Engine**: Custom CSS `@media print` rules that hide active tabs, inputs, and action buttons, transforming the dashboard into a formatted, multi-page PDF document when printing natively (`Ctrl + P` / `window.print()`).

### 2. API Gateway & Server (Backend Layer)
* **Runtime**: `Node.js` + `Express` — a lightweight REST API that handles scan pipelines, history queries, and side-by-side audits.
* **Utility Libraries**:
  * `nanoid`: Generates compact, url-friendly 10-character unique IDs for every audit record.
  * `cors`: Manages origin validation and secure request access.
  * `dotenv`: Securely loads credentials (Groq keys, database URLs) from a local `.env` environment file.

### 3. Crawl & Extraction (Scraper Stage)
* **Core Browser Engine**: `Puppeteer` (Headless Chrome) — runs a virtual browser session in the background to handle JavaScript rendering, CSS styling, and client-side layouts.
* **Configuration**:
  * Realistic desktop User-Agent string to prevent scraping blocks.
  * Explicit 1280x800 desktop viewport.
  * Custom `waitUntil: "domcontentloaded"` trigger for quick document acquisition.
  * A **1.5-second stabilization timeout** to allow slow client-side Javascript frameworks (React, Vue, Shopify Apps) to complete hydration.
* **Screenshot Engine**: Captures a compressed `JPEG` screenshot (50% quality) of the active crawled viewport, converting it into a base64 string for immediate dashboard rendering and database persistence.
* **Signal Extractor**: A custom parser that extracts key structural markers:
  * Product Title (H1 tags)
  * Price (OpenGraph tags or regex matches)
  * Primary Call-to-Action (CTA button labels)
  * Reviews / Social Proof (Star ratings out of 5, rating count)
  * Image Attributes (Total image counts vs. missing image alt tags)
  * Form Complexity (Number of form inputs and form fields)
  * Link Density (Total internal navigation links)

### 4. AI Inference Layer (Auditing Stage)
* **Model**: `Llama-3.3-70b-versatile` via the **Groq API** — delivers sub-second, highly detailed structured analysis.
* **Determinism**: Set to **`temperature: 0`** to enforce deterministic completions, ensuring identical crawled site data always generates the same score.
* **Constraints**: Uses `response_format: { type: "json_object" }` paired with custom prompting rules that force the model to write copywriting alternatives benefit-centric to the *specific* product (rather than generic site slogans).

### 5. Persistent Storage (Database Stage)
* **Cloud Database**: **Supabase** (PostgreSQL) — saves full scan history (metadata, scores, full JSON summaries, base64 screenshots) via direct API queries.
* **Resilient Adapters**: Wrote a database adapter (`db.js`) that dynamically attempts inserts across three schema layouts (snake_case, prompt-style `score/summary`, or camelCase) to support any custom table columns.
* **Safety Nets**:
  * Bypasses `.single()` constraints to prevent schema RLS errors from crashing backend routines.
  * Runs JavaScript-side list sorting as a fallback if the database table lacks `created_at` or `createdAt` fields.
  * **Local File Fallback**: Automatically redirects data read/writes to a local JSON file (`backend/data/audits.json`) if Supabase env variables are missing or disconnected.

---

## Key Features

1. **Interactive Stepped Loader**: Shows an active checklist indicating the status of the scraper, heuristics parser, and Llama 3.3 audit.
2. **Page Screenshots**: Displays a thumbnail image of the scanned website next to the score breakdown.
3. **Automated Heuristic Cards**: Runs rule-based evaluations for Viewport Meta, Missing Alt Tags, Navigation Complexity, and Form friction with expressive micro-icons (📱, 🖼️, 🔗, 🛒, 📝).
4. **Before/After Copy Comparisons**: Directly compares current headings/CTAs with AI-generated alternative options.
5. **Prioritized Recommendations**: Lists specific, prioritized actionable recommendations accompanied by clear diagnostic reasons.
6. **Side-by-Side Comparisons**: Compares two URLs sequentially to avoid CPU spikes.
7. **Diagnostic Error Messages**: Gives actionable resolution tips (bot blocker, login page, timeout) if a scrape fails.

---

## Database Schema Setup

To store your audits in the cloud, create a new table inside your **Supabase SQL Editor** using this query (disable **Row Level Security (RLS)** in settings to allow anonymous write access):

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

---

## Local Setup

### 1. Run Backend Server
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and enter your GROQ_API_KEY and SUPABASE settings
npm run dev
```
*Backend listens on:* `http://localhost:5000`

### 2. Run Frontend Dashboard
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
*Frontend listens on:* `http://localhost:5173` (or `http://localhost:5174`)
