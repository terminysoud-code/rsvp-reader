import { chromium } from "playwright";

const APP_URL = process.env.APP_URL || "http://127.0.0.1:8765";

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
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.click("#addReaderButton");

  const readers = page.locator(".reader-instance");
  const first = readers.nth(0);
  const second = readers.nth(1);

  await first.locator('[data-role="text-input"]').fill("One two three four five six seven eight");
  await second.locator('[data-role="text-input"]').fill("Alpha beta gamma delta epsilon zeta eta theta");

  await first.locator('[data-role="start-button"]').click();
  await page.waitForTimeout(250);

  const firstButtonText = await first.locator('[data-role="start-button"]').textContent();
  const firstButtonClass = await first.locator('[data-role="start-button"]').getAttribute("class");
  const secondProgressBefore = await second.locator('[data-role="progress-text"]').textContent();

  await first.locator('[data-role="increase-speed"]').click();
  await first.locator('[data-role="pause-button"]').click();

  const progressBox = await first.locator('[data-role="progress-track"]').boundingBox();

  if (!progressBox) {
    throw new Error("Progress bar was not visible.");
  }

  await page.mouse.click(
    progressBox.x + progressBox.width * 0.75,
    progressBox.y + progressBox.height / 2,
  );

  await first.locator('[data-role="ai-toggle"]').check();
  const acceptWithAi = await first.locator('[data-role="file-input"]').getAttribute("accept");
  const simplifyEnabled = await first.locator('[data-role="simplify-text"]').isEnabled();
  await first.locator('[data-role="ai-toggle"]').uncheck();
  const acceptWithoutAi = await first.locator('[data-role="file-input"]').getAttribute("accept");

  const firstProgressAfter = await first.locator('[data-role="progress-text"]').textContent();
  const secondProgressAfter = await second.locator('[data-role="progress-text"]').textContent();
  const wpm = await first.locator('[data-role="wpm-output"]').textContent();
  const displayedWord = await first.locator('[data-role="word-display"]').textContent();

  if (firstButtonText !== "Stop" || !firstButtonClass?.includes("is-stop")) {
    throw new Error("Start button did not switch to inverted Stop state.");
  }

  if (!firstProgressAfter || firstProgressAfter === "Word 0 of 0") {
    throw new Error("First reader progress did not update.");
  }

  if (secondProgressBefore !== secondProgressAfter) {
    throw new Error("Second reader state changed while first reader played.");
  }

  if (!simplifyEnabled) {
    throw new Error("AI simplify button was not available for existing text.");
  }

  if (!acceptWithAi?.includes(".pptx") || acceptWithoutAi?.includes(".pptx")) {
    throw new Error("AI extraction did not broaden and restore accepted upload types.");
  }

  if (!wpm?.includes("450")) {
    throw new Error(`WPM increase failed. Saw: ${wpm}`);
  }

  if (!displayedWord || displayedWord.includes("Paste")) {
    throw new Error("Word display did not update.");
  }

  if (errors.length) {
    throw new Error(`Browser errors: ${errors.join(" | ")}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      firstProgressAfter,
      secondProgressAfter,
      wpm,
      displayedWord,
    }),
  );
} finally {
  await browser.close();
}
