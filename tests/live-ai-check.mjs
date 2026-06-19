import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL;
const SAMPLE_PATH = process.env.SAMPLE_PATH || "tests/fixtures/alice-chapter-1.txt";
const TIMEOUT_MS = Number(process.env.AI_TEST_TIMEOUT_MS || 120000);

if (!APP_URL) {
  throw new Error("Set APP_URL to the deployed app URL before running test:ai-live.");
}

const samplePath = path.resolve(SAMPLE_PATH);
const sampleText = await readFile(samplePath, "utf8");
const excerpt = sampleText.split(/\s+/).slice(0, 420).join(" ");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});

try {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
  const bodyText = await page.locator("body").textContent().catch(() => "");

  if (page.url().includes("vercel.com/login") || bodyText?.includes("Authentication Required")) {
    throw new Error("The supplied APP_URL is protected by Vercel Authentication.");
  }

  if (bodyText?.includes("NOT_FOUND") || bodyText?.includes("The page could not be found")) {
    throw new Error("The supplied APP_URL did not serve the RSVP app.");
  }

  await page.waitForSelector("#addReaderButton", { timeout: 15000 });

  const reader = page.locator(".reader-instance").first();
  const textInput = reader.locator('[data-role="text-input"]');

  await textInput.fill(excerpt);
  await reader.locator('[data-role="simplify-length"]').selectOption("10");
  await reader.locator('[data-role="simplify-text"]').click();
  await page.waitForFunction(
    () => {
      const textarea = document.querySelector('[data-role="text-input"]');
      return textarea && textarea.value.length > 0 && !textarea.value.includes("Alice was beginning");
    },
    null,
    { timeout: TIMEOUT_MS },
  );

  const simplifiedText = await textInput.inputValue();

  await reader.locator('[data-role="ai-toggle"]').check();
  await reader.locator('[data-role="file-input"]').setInputFiles(samplePath);
  await page.waitForFunction(
    () => {
      const status = document.querySelector('[data-role="status-message"]')?.textContent || "";
      return /words\./.test(status);
    },
    null,
    { timeout: TIMEOUT_MS },
  );

  const extractedText = await textInput.inputValue();
  const status = await reader.locator('[data-role="status-message"]').textContent();

  if (errors.length) {
    throw new Error(`Browser errors: ${errors.join(" | ")}`);
  }

  if (simplifiedText.length < 20) {
    throw new Error("AI simplify returned too little text.");
  }

  if (!extractedText.includes("Alice") || !status?.includes("words")) {
    throw new Error("AI extraction did not load expected sample text.");
  }

  console.log(
    JSON.stringify({
      ok: true,
      appUrl: APP_URL,
      simplifiedChars: simplifiedText.length,
      extractedWords: extractedText.split(/\s+/).filter(Boolean).length,
      status,
    }),
  );
} finally {
  await browser.close();
}
