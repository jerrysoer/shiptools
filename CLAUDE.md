# ShipLocal

Local-first productivity suite. 38+ developer tools, file converters, privacy auditor, and AI-powered assistants — all running in your browser. No uploads, no tracking.

## Stack

- Next.js 16, React 19, Tailwind CSS 4 (`@theme` — non-inline for runtime light/dark switching)
- TypeScript strict mode
- Supabase backend (graceful null when env vars missing → 503)
- Puppeteer (`puppeteer-core` + `@sparticuz/chromium`) for privacy scanning
- wasm-vips (CDN) for image conversion, ffmpeg.wasm for audio
- pdf-lib + mammoth + papaparse for document conversion
- WebLLM (@mlc-ai/web-llm) for in-browser AI inference
- Vercel deployment (Pro plan required for >10s function duration)

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — lint

## Architecture

- `src/lib/scanner/` — Puppeteer-based privacy scanner (server-only)
- `src/lib/grading.ts` — Weighted scoring → A-F grade
- `src/lib/ai/` — WebLLM engine, Ollama detection, AI prompts
- `src/components/*Converter.tsx` — Client-side WASM converters
- `src/hooks/useConverter.ts` — Shared job queue for all converters
- `src/hooks/useLocalAI.ts` — React hook for AI state management

## Key Patterns

- **COOP/COEP scoped to `/convert/*` only** — required for SharedArrayBuffer (ffmpeg.wasm), but breaks third-party resources on other pages
- **WASM lazy-loaded** — wasm-vips and ffmpeg.wasm load only when user visits that converter tab
- **AI lazy-loaded** — WebLLM model downloads only when user clicks "Load AI Model"
- **Supabase graceful null** — all API routes work without Supabase configured
- **SSRF prevention** — DNS resolution + private IP rejection before Puppeteer launch
- **Rate limiting** — in-memory sliding window (10 scans/IP/hour)

## Supabase Tables (sl_ prefix)

- `sl_audits` — cached scan results (24h TTL)
- `sl_audit_requests` — user audit requests (hashed IP)
- `sl_analytics_events` — fire-and-forget events (service-role only)
- `sl_analytics_daily` — daily rollup from raw events

## Environment Variables

- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase features
- `IP_HASH_SALT` — salt for IP hashing (optional, has default)
