# RSVP Reader Project Status

Last updated: 2026-06-19 17:10 UTC

## Project Location

- Local workspace: `/home/michael/.openclaw/workspace/rsvp-reader`
- GitHub repo: `https://github.com/terminysoud-code/rsvp-reader`
- Active branch: `main`
- Repo state at update time: clean and pushed to `origin/main`

## Latest Known Commit State

Recent commits, newest first:

```text
61b9e93 Add live AI fixture tooling
bfef738 Add simplification length controls
c9acbf0 Add AI extraction and simplify action
a6d1c39 Refine one-screen reader layout
41db617 Polish reader interface
911902d Move AI processing behind Vercel API
a55c1b3 Add multi-reader AI processing pipeline
a6ca6f8 Toggle primary button while reading
```

Current latest pushed commit: `61b9e93 Add live AI fixture tooling`

## Current App Architecture

The app is still a lightweight vanilla HTML/CSS/JavaScript RSVP speed reader, now prepared for Vercel full-stack hosting.

Main files:

- `index.html` - app shell and reader template
- `styles.css` - polished one-screen split workspace layout
- `app.js` - frontend reader logic, multi-reader state, file parsing, AI controls
- `api/process-text.js` - Vercel serverless API route for OpenAI-backed processing
- `tests/browser-check.mjs` - local browser smoke test
- `tests/manage-samples.mjs` - sample text fixture downloader/manager
- `tests/live-ai-check.mjs` - live deployed AI integration checker

The frontend no longer contains or requests an OpenAI API key. The browser calls same-origin backend route `./api/process-text`, and the backend reads `OPENAI_API_KEY` from Vercel environment variables.

## Current Features

- Multiple independent RSVP reader instances.
- Start button switches to inverted Stop state while reading.
- Add/remove readers.
- Independent text, file, WPM, progress, seek, and playback state per reader.
- Standard local file parsing when AI extraction is off:
  - `.txt`
  - `.md`
  - `.pdf`
- AI extraction mode broadens upload accept-list to text-bearing formats:
  - `.txt`, `.md`, `.pdf`
  - `.doc`, `.docx`
  - `.ppt`, `.pptx`
  - `.xls`, `.xlsx`
  - `.csv`, `.tsv`
  - `.rtf`, `.html`, `.htm`
  - `.json`, `.xml`, `.yaml`, `.yml`
  - relevant text and Office MIME types
- AI simplify button is always visible next to the text editor.
- AI simplify transforms text already in the editor.
- Simplification length controls:
  - 10%, 20%, 30%, 50% of current document
  - custom word count
  - target rounded to nearest 100 words
  - rounded target is sent to backend prompt as an approximate length request
- Prompt-injection resistance:
  - uploaded/file text is treated as untrusted document content
  - model is explicitly told not to follow instructions inside uploaded content
  - model is told not to reveal prompts, change roles, call tools, browse, exfiltrate data, or perform actions
- Basic backend controls:
  - `Cache-Control: no-store`
  - text size limit
  - file size limit
  - lightweight per-instance rate limit

## Vercel Environment Variables

Required:

```text
OPENAI_API_KEY
```

Optional:

```text
OPENAI_MODEL=gpt-4.1-mini
MAX_TEXT_CHARS=120000
MAX_FILE_BYTES=3500000
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

Important: do not commit `OPENAI_API_KEY` to GitHub, `.env.example`, frontend code, docs, or chat.

## Deployment State

Latest GitHub/Vercel production deployment record observed:

```text
Deployment id: 5125690071
Commit: 61b9e935be596fcd754b4d30180021b7deae4510
Environment: Production
State: success
Created: 2026-06-19T16:22:54Z
URL: https://fastreader-fov7wio1e-jaroska-developers.vercel.app
```

Known deployment/access issue:

- The commit-specific Vercel deployment URLs tested from this machine still returned Vercel Authentication.
- Public aliases checked earlier, including `https://fastreader.vercel.app`, were reachable but did not appear to serve the current RSVP app/API.
- Because of that, the live OpenAI-backed integration has not been fully verified end-to-end from this environment.

Needed to complete live verification:

- A public URL that serves the current `main` deployment and exposes `/api/process-text`, or
- a Vercel protection bypass token, or
- authenticated Vercel CLI/browser access on this machine.

## Verification Completed

Local checks passed:

```bash
node --check app.js
node --check api/process-text.js
node --check tests/browser-check.mjs
node --check tests/manage-samples.mjs
node --check tests/live-ai-check.mjs
```

Backend mocked checks passed:

- text simplification route returns processed text
- file extraction route sends `input_file` to OpenAI request payload
- simplification prompt includes target length, such as `about 300 words`

Browser smoke test passed locally with Chromium:

```bash
npm run serve
npm run test:browser
```

Observed passing output:

```json
{"ok":true,"firstProgressAfter":"Word 6 of 8","secondProgressAfter":"Word 1 of 8","wpm":"450 WPM","displayedWord":"six"}
```

## Fixture And Live AI Test Tools

Fixture tools:

```bash
npm run fixtures:download
npm run fixtures:list
npm run fixtures:clean
```

The downloader currently fetches a public-domain sample from Project Gutenberg and stores a local excerpt at:

```text
tests/fixtures/alice-chapter-1.txt
```

Downloaded fixture files are intentionally ignored by git. Only `tests/fixtures/.gitignore` is tracked.

Live AI integration check:

```bash
APP_URL=https://your-current-public-vercel-url npm run test:ai-live
```

What `test:ai-live` does:

1. Opens the deployed app.
2. Fills the text editor with downloaded sample text.
3. Selects a simplification length.
4. Clicks AI simplify.
5. Waits for the textarea to update.
6. Enables AI extraction.
7. Uploads the sample fixture file.
8. Verifies the text window updates again.

Known behavior:

- If `APP_URL` is protected by Vercel Authentication, the tool fails with:

```text
The supplied APP_URL is protected by Vercel Authentication.
```

- If `APP_URL` does not serve the current RSVP app, the tool reports that the URL did not serve the RSVP app.

## Recommended Next Steps

1. Fix Vercel project alias/access so one public URL points to the current `main` deployment.
2. Confirm that `OPENAI_API_KEY` is configured for the same Vercel project/environment as that public URL.
3. Run:

```bash
npm run fixtures:download
APP_URL=https://the-current-public-vercel-url npm run test:ai-live
```

4. If live AI works, test real sample uploads:
   - `.txt`
   - `.pdf`
   - `.docx`
   - `.pptx`
   - `.xlsx`
5. If large Office files are needed, revisit `MAX_FILE_BYTES` and possibly move uploads to a larger-storage flow instead of JSON data URLs.

## Notes For Future Sessions

To resume:

```bash
cd /home/michael/.openclaw/workspace/rsvp-reader
git status --short --branch
git log --oneline -8
```

Then inspect this file and `README.md`.

The next major unresolved question is not app code; it is Vercel routing/access:

- Which Vercel URL is the real current production URL?
- Is that URL public?
- Does it have the `OPENAI_API_KEY` env var?
- Does `/api/process-text` exist on that URL?

No API key has been exposed in the repository or in chat.
