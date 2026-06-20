# RSVP Reader Project Status

Last updated: 2026-06-20 18:07 UTC

## Project Location

- Local workspace: `/home/michael/.openclaw/workspace/rsvp-reader`
- GitHub repo: `https://github.com/terminysoud-code/rsvp-reader`
- Active branch: `main`
- Repo state at update time: feature commit pushed to `origin/main`; deployment verified live

## Latest Known Commit State

Recent commits, newest first:

```text
a486257 Harden Vercel deployment security
393417d Add Gemini AI provider support
61b9e93 Add live AI fixture tooling
bfef738 Add simplification length controls
c9acbf0 Add AI extraction and simplify action
a6d1c39 Refine one-screen reader layout
41db617 Polish reader interface
911902d Move AI processing behind Vercel API
a55c1b3 Add multi-reader AI processing pipeline
a6ca6f8 Toggle primary button while reading
```

Current latest feature commits:

- `5dc9138 Preserve source language in AI rewrites`
- `c5f5707 Add tabbed readers and DOCX extraction`

## Current App Architecture

The app is still a lightweight vanilla HTML/CSS/JavaScript RSVP speed reader, now prepared for Vercel full-stack hosting.

Main files:

- `index.html` - app shell and reader template
- `styles.css` - polished one-screen split workspace layout
- `app.js` - frontend reader logic, multi-reader state, file parsing, AI controls
- `api/process-text.js` - Vercel serverless API route for OpenAI or Gemini-backed processing
- `vercel.json` - production security headers
- `tests/browser-check.mjs` - local browser smoke test
- `tests/api-check.mjs` - backend regression test for DOCX extraction and Caveman prompt behavior
- `tests/manage-samples.mjs` - sample text fixture downloader/manager
- `tests/live-ai-check.mjs` - live deployed AI integration checker

The frontend no longer contains or requests AI provider keys. The browser calls same-origin backend route `./api/process-text`, and the backend reads provider keys from Vercel environment variables.

## Current Features

- Multiple independent RSVP reader instances presented as browser-style tabs.
- Start button switches to inverted Stop state while reading.
- Add/remove readers through a top tab bar with a plus button and per-tab close x.
- One active reader is visible at a time.
- Independent text, file, WPM, progress, seek, and playback state per reader.
- Word-number seek input lets the user jump directly to a specific word position.
- Markdown-aware flashing word display:
  - strips common Markdown markers from displayed words
  - skips structural Markdown/table particles such as horizontal rules, table divider rows, and standalone pipes
  - turns Markdown table rows into readable cell text instead of flashing pipe characters
  - styles headings, bold, italic, inline code, blockquotes, lists, and strikethrough
  - renders with DOM nodes and `textContent`, not `innerHTML`
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
- `.docx` uploads are extracted server-side with `mammoth` before Gemini sees the content.
- AI simplify button is always visible next to the text editor.
- AI simplify transforms text already in the editor.
- Caveman mode is a separate button beside AI simplify and rewrites text into primitive, very simple phrasing while preserving the source language where possible.
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
- Production security headers:
  - Content Security Policy
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - restrictive Permissions Policy

## Vercel Environment Variables

Required for OpenAI:

```text
AI_PROVIDER=openai
OPENAI_API_KEY
```

Required for Gemini:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY
```

Optional:

```text
OPENAI_MODEL=gpt-4.1-mini
GEMINI_MODEL=gemini-2.5-flash
MAX_TEXT_CHARS=120000
MAX_FILE_BYTES=3500000
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

Important: do not commit provider keys such as `OPENAI_API_KEY` or `GEMINI_API_KEY` to GitHub, `.env.example`, frontend code, docs, or chat.

## Deployment State

Latest GitHub/Vercel production deployment record observed:

```text
Deployment id: dpl_FrwJX2WonxM9zYfPCqmPHPbd53W8
Environment: Production
State: READY
Created: 2026-06-20
URL: https://fastreader-c23zh99je-jaroska-developers.vercel.app
Alias: https://fastreader-omega.vercel.app
```

Historical deployment/access issue:

- The commit-specific Vercel deployment URLs tested from this machine still returned Vercel Authentication.
- Public aliases checked earlier, including `https://fastreader.vercel.app`, were reachable but did not appear to serve the current RSVP app/API.
- Because of that, the live OpenAI-backed integration has not been fully verified end-to-end from this environment.

Current public test URL from Boss:

```text
https://fastreader-omega.vercel.app/
```

This URL serves the RSVP app and reaches `/api/process-text`. Production is currently configured for Gemini with:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=<sensitive Vercel secret>
GEMINI_MODEL=gemini-2.5-flash
```

The older Vercel `OPENAI_API_KEY` remains present but is no longer the active provider while `AI_PROVIDER=gemini`.

Google access check on 2026-06-20:

- `gcloud` is not installed.
- No Google Cloud environment credential is configured locally.
- `gog` has Google Workspace OAuth for `terminysoud@gmail.com`, but that is not enough to create an AI Studio/Gemini API key non-interactively.
- Boss provided a Gemini key and it was stored as a sensitive Vercel Production env var.

Recommended later:

- Optionally rotate the Gemini key later because it was shared through chat; do not record the key value in files.

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

Earlier OpenAI live AI check against `https://fastreader-omega.vercel.app/` failed before any successful AI output:

```text
AI simplify failed: You exceeded your current quota, please check your plan and billing details.
```

Gemini switch completed:

- `api/process-text.js` maps OpenAI 401 and insufficient-quota 429 errors to clearer Vercel setup messages.
- `api/process-text.js` now supports Gemini via `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optional `GEMINI_MODEL`.
- text-like file extraction now decodes and returns uploaded text directly when not simplifying, avoiding unnecessary model calls and preserving full text.
- `tests/live-ai-check.mjs` waits for exact AI success status messages and fails immediately on UI/API errors instead of timing out.
- `tests/manage-samples.mjs` now uses the final Gutenberg chapter heading occurrence so the Alice fixture downloads the real chapter body instead of the table-of-contents line.

Latest local checks on 2026-06-20:

```bash
node --check app.js
node --check api/process-text.js
node --check tests/manage-samples.mjs
node --check tests/live-ai-check.mjs
```

Additional mocked Gemini backend invocation passed with `AI_PROVIDER=gemini` and a fake `GEMINI_API_KEY`; it verified the route calls Gemini `generateContent` and returns response text.

Latest live Gemini AI check passed:

```bash
APP_URL=https://fastreader-omega.vercel.app npm run test:ai-live
```

Observed passing output:

```json
{"ok":true,"appUrl":"https://fastreader-omega.vercel.app","simplifiedChars":1141,"extractedWords":2186,"status":"alice-chapter-1.txt: 2,186 words."}
```

Security hardening pass on 2026-06-20:

```bash
npm audit --json
node --check app.js
node --check api/process-text.js
node --check tests/browser-check.mjs
node --check tests/manage-samples.mjs
node --check tests/live-ai-check.mjs
npm run test:browser
APP_URL=https://fastreader-omega.vercel.app npm run test:ai-live
```

Results:

- `npm audit` reported 0 vulnerabilities.
- No committed provider key values were found in the repo scan.
- CSP and related headers are present on `https://fastreader-omega.vercel.app/`.
- Live AI test passes under the deployed CSP; the test no longer uses dynamic `Function(...)`.

Markdown display update on 2026-06-20:

```bash
node --check app.js
node --check api/process-text.js
node --check tests/browser-check.mjs
APP_URL=https://fastreader-omega.vercel.app npm run test:browser
APP_URL=https://fastreader-omega.vercel.app npm run test:ai-live
```

Results:

- Live UI smoke test passed, including Markdown heading rendering in the flashing word window.
- Live Gemini AI test passed after the Markdown display update.

Tabbed readers, DOCX extraction, and Caveman mode update on 2026-06-20:

```bash
node --check app.js
node --check api/process-text.js
node --check tests/api-check.mjs
node --check tests/browser-check.mjs
npm run test:api
npm run test:browser
npm audit --audit-level=moderate
```

Results:

- Local API regression passed:
  - DOCX extraction returns server-readable text without calling Gemini.
  - Caveman mode sends caveman/language-preserving backend instructions.
- Local browser smoke passed:
  - tab add/switch/close behavior
  - independent reader state
  - speed/progress controls
  - Markdown-aware display
  - Caveman toggle availability
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Production Vercel deploy completed and aliased to `https://fastreader-omega.vercel.app`.
- Live production browser smoke passed against `https://fastreader-omega.vercel.app`.
- Live production Gemini integration passed:
  - AI simplify returned 1,026 characters.
  - AI text-file extraction loaded 2,180 words by UI status and 2,186 words by extracted text split.
- Direct production API probe passed:
  - DOCX extraction returned expected text.
  - Caveman mode returned 391 characters from Gemini.

Language-preservation prompt fix on 2026-06-20:

- Simplify and Caveman mode now instruct the model to keep the document's source language and never translate during extraction/rewrite.
- Simplification explanation is constrained to one short same-language sentence, maximum 20 words.
- Local checks passed:
  - `node --check api/process-text.js`
  - `node --check tests/api-check.mjs`
  - `npm run test:api`
  - `npm run test:browser`
  - `npm audit --audit-level=moderate`
- Production checks passed:
  - German simplify stayed German; first line was `Der Text wurde vereinfacht.`
  - live browser smoke passed against `https://fastreader-omega.vercel.app`
  - security headers confirmed live

AI controls flow patch on 2026-06-20:

- Caveman mode changed from a checkbox/toggle to its own clickable button beside `AI simplify`.
- Upload toggle label changed to `AI text extraction from document`.
- Local checks passed:
  - `node --check app.js`
  - `node --check tests/browser-check.mjs`
  - `npm run test:api`
  - `npm run test:browser`
  - `npm audit --audit-level=moderate`

Word-number seek patch on 2026-06-20:

- Added a compact `Go to word` numeric input beside the progress metadata.
- Enter/change jumps directly to the requested word and clamps the value to the loaded text length.
- The input stays synced with progress while reading, clicking the progress bar, resetting, and loading new text.
- Local checks passed:
  - `node --check app.js`
  - `node --check tests/browser-check.mjs`
  - `npm run test:api`
  - `npm run test:browser`
  - `npm audit --audit-level=moderate`

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
