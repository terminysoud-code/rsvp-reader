# RSVP Speed Reader

A lightweight Rapid Serial Visual Presentation speed-reading app built with vanilla HTML, CSS, and JavaScript.

## Features

- Paste text directly into the reader.
- Upload `.txt`, `.md`, and `.pdf` files locally.
- Turn on AI extraction to process broader text-bearing file types, including Office documents.
- Spawn multiple independent readers on one dashboard.
- Parse text into a sequential word list while preserving punctuation attached to words.
- Read at 400 WPM by default, with speed controls from 100 to 1200 WPM.
- Pause, resume, reset, and keep your current position.
- Track progress as both a visual bar and word count.
- Click the progress bar to jump to any point in the text.
- Use AI simplify on text already in the editor, with length presets of 10%,
  20%, 30%, 50%, or a custom rounded word target.
- Responsive layout for desktop and mobile.

## AI Processing

AI processing runs through a server-side Vercel function at `/api/process-text`.
The browser never receives provider API keys.

Each reader has an AI extraction toggle for uploads and an AI simplify button
for text already in the editor. Simplification requests include a target length
rounded to the nearest 100 words. When AI extraction is off, the browser handles
local `.txt`, `.md`, and `.pdf` parsing. When AI extraction is on, supported
text-bearing files are sent to the backend as data URLs. Text-like files are
decoded server-side for extraction, and non-text files are sent to the configured
AI provider.

Configure these environment variables in Vercel:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash

# Alternative provider:
AI_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-4.1-mini

MAX_TEXT_CHARS=120000
MAX_FILE_BYTES=3500000
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

The backend treats uploaded content as untrusted text, separates instructions
from document data, applies size limits, returns `Cache-Control: no-store`, and
uses a lightweight per-instance rate limit. Vercel security headers are defined
in `vercel.json`, including CSP, `nosniff`, referrer policy, and a restrictive
permissions policy.

## Run Locally

Because PDF parsing uses a browser module import, serve the folder over HTTP:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765
```

Local AI processing requires a server that can run `api/process-text.js` with
provider env vars set. Static `python3 -m http.server` mode only covers the
non-AI reader UI.

## Deploy On Vercel

1. Import this GitHub repo into Vercel.
2. Add either Gemini or OpenAI provider env vars in Project Settings ->
   Environment Variables.
3. Optionally set `MAX_TEXT_CHARS`, `MAX_FILE_BYTES`, `RATE_LIMIT_REQUESTS`, and
   `RATE_LIMIT_WINDOW_MS`.
4. Deploy.

Vercel serves `index.html`, `app.js`, and `styles.css` as static assets, and
deploys `api/process-text.js` as the server-side function.

## Verify

Install dev dependencies and run the browser smoke test:

```bash
npm install
npm run test:browser
```

If Chromium system dependencies are missing on Linux, run:

```bash
npx playwright install-deps chromium
```

## Live AI Test Fixtures

Download and manage sample text fixtures:

```bash
npm run fixtures:download
npm run fixtures:list
npm run fixtures:clean
```

Run the live AI integration check against a deployed app:

```bash
APP_URL=https://your-vercel-app.example npm run test:ai-live
```

The live check fills the editor with sample text, runs AI simplify, enables AI
extraction, uploads the same fixture file, and verifies the text window updates.
