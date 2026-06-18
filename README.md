# RSVP Speed Reader

A lightweight Rapid Serial Visual Presentation speed-reading app built with vanilla HTML, CSS, and JavaScript.

## Features

- Paste text directly into the reader.
- Upload `.txt`, `.md`, and `.pdf` files.
- Parse text into a sequential word list while preserving punctuation attached to words.
- Read at 400 WPM by default, with speed controls from 100 to 1200 WPM.
- Pause, resume, reset, and keep your current position.
- Track progress as both a visual bar and word count.
- Click the progress bar to jump to any point in the text.
- Responsive layout for desktop and mobile.

## Run Locally

Because PDF parsing uses a browser module import, serve the folder over HTTP:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765
```

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
