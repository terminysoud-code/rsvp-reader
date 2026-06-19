# RSVP Speed Reader

A lightweight Rapid Serial Visual Presentation speed-reading app built with vanilla HTML, CSS, and JavaScript.

## Features

- Paste text directly into the reader.
- Upload `.txt`, `.md`, and `.pdf` files.
- Spawn multiple independent readers on one dashboard.
- Parse text into a sequential word list while preserving punctuation attached to words.
- Read at 400 WPM by default, with speed controls from 100 to 1200 WPM.
- Pause, resume, reset, and keep your current position.
- Track progress as both a visual bar and word count.
- Click the progress bar to jump to any point in the text.
- Turn on AI cleanup to process extracted text through a Vercel API route.
- Turn on AI simplify to request simplified Markdown with an explanatory paragraph prepended.
- Responsive layout for desktop and mobile.

## AI Processing

AI processing runs through a server-side Vercel function at `/api/process-text`.
The browser never receives the OpenAI API key.

Each reader has its own AI cleanup and simplify toggles. The frontend extracts
plain text from `.txt`, `.md`, and `.pdf` files, posts that text to the backend,
then feeds the returned Markdown into the same RSVP word parser.

Configure these environment variables in Vercel:

```text
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-4.1-mini
MAX_TEXT_CHARS=120000
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

The backend treats uploaded content as untrusted text, separates instructions
from document data, applies size limits, returns `Cache-Control: no-store`, and
uses a lightweight per-instance rate limit.

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
`OPENAI_API_KEY` set. Static `python3 -m http.server` mode only covers the
non-AI reader UI.

## Deploy On Vercel

1. Import this GitHub repo into Vercel.
2. Add `OPENAI_API_KEY` in Project Settings -> Environment Variables.
3. Optionally set `OPENAI_MODEL`, `MAX_TEXT_CHARS`, `RATE_LIMIT_REQUESTS`, and
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
