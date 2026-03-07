# ShipLocal

Local-first productivity suite — 40+ tools that run entirely in your browser. No uploads, no accounts, no tracking.

**[shiplocal.vercel.app](https://shiplocal.vercel.app)**

## What is this?

ShipLocal is a collection of developer tools, file converters, recorders, and AI assistants that process everything locally using WebAssembly and browser APIs. Your files never leave your device.

## Departments

| # | Department | Tools | Description |
|---|-----------|-------|-------------|
| 01 | **AI-Powered** | 2 | Text summarization and rewriting using in-browser AI (WebLLM) |
| 02 | **Record & Capture** | 3 | Screen recorder (WebM/MP4/GIF), audio recorder, meeting recorder with transcription |
| 03 | **Convert** | 7 | Image, document, audio, video conversion + PDF tools, document scanner, ZIP |
| 04 | **Developer Tools** | 28 | Hash, encode, format, diff, regex, JWT, QR, password gen, and more |

## Stack

- **Framework:** Next.js 16, React 19, TypeScript (strict)
- **Styling:** Tailwind CSS 4 with runtime light/dark theming
- **Processing:** WebAssembly (wasm-vips, ffmpeg.wasm), browser APIs (MediaRecorder, Canvas)
- **AI:** WebLLM (@mlc-ai/web-llm) for in-browser inference, Whisper for transcription
- **Privacy Scanner:** Puppeteer (server-side, headless Chromium)
- **Backend:** Supabase (optional — all tools work without it)
- **Deployment:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

No environment variables required — all tools work out of the box. Supabase credentials are only needed for the privacy scanner's caching and analytics.

## Architecture Highlights

- **COOP/COEP scoped to `/convert/*` only** — SharedArrayBuffer (required by ffmpeg.wasm) is isolated so it doesn't break third-party resources on other pages
- **Lazy-loaded WASM** — wasm-vips and ffmpeg.wasm download only when the user visits a converter
- **Lazy-loaded AI** — WebLLM model downloads only on explicit user action
- **Graceful degradation** — all API routes return 503 cleanly when Supabase isn't configured
- **SSRF prevention** — DNS resolution + private IP rejection before Puppeteer launch

## License

Private repository.
