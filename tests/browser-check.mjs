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
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#addReaderButton");
  await page.click("#addReaderButton");

  const readers = page.locator(".reader-instance");
  const first = readers.nth(0);
  const second = readers.nth(1);
  const tabs = page.locator(".reader-tab");

  await first.locator('[data-role="text-input"]').fill("One two three four five six seven eight");
  await tabs.nth(1).click();
  await second.locator('[data-role="text-input"]').fill("Alpha beta gamma delta epsilon zeta eta theta");
  await tabs.nth(0).click();

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
  const cavemanEnabled = await first.locator('[data-role="caveman-text"]').isEnabled();
  const extractionLabel = await first.locator(".toggle-control").textContent();
  await first.locator('[data-role="simplify-length"]').selectOption("custom");
  const customLengthVisible = await first.locator('[data-role="custom-length"]').isVisible();
  await first.locator('[data-role="ai-toggle"]').uncheck();
  const acceptWithoutAi = await first.locator('[data-role="file-input"]').getAttribute("accept");

  const firstProgressAfter = await first.locator('[data-role="progress-text"]').textContent();
  const secondProgressAfter = await second.locator('[data-role="progress-text"]').textContent();
  const wpm = await first.locator('[data-role="wpm-output"]').textContent();
  const displayedWord = await first.locator('[data-role="word-display"]').textContent();
  const wordSeekMax = await first.locator('[data-role="word-seek"]').getAttribute("max");
  await first.locator('[data-role="word-seek"]').fill("3");
  await first.locator('[data-role="word-seek"]').press("Enter");
  const wordSeekDisplay = await first.locator('[data-role="word-display"]').textContent();
  const wordSeekProgress = await first.locator('[data-role="progress-text"]').textContent();
  const activeTabsBeforeClose = await page.locator(".reader-tab.is-active").count();
  const firstHidden = await first.getAttribute("hidden");
  const secondHidden = await second.getAttribute("hidden");

  await first
    .locator('[data-role="text-input"]')
    .fill("# Heading\n---\n| Term | Value |\n| --- | --- |\n| Speed | Fast |\nPlain **bold** `code` *italic*");
  await first.locator('[data-role="text-input"]').evaluate((element) => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const markdownWord = await first.locator('[data-role="word-display"]').textContent();
  const markdownClass = await first.locator('[data-role="word-display"] span').getAttribute("class");
  const markdownProgress = await first.locator('[data-role="progress-text"]').textContent();
  await first.locator('[data-role="word-seek"]').fill("2");
  await first.locator('[data-role="word-seek"]').press("Enter");
  const markdownTableWord = await first.locator('[data-role="word-display"]').textContent();
  await first.locator('[data-role="word-seek"]').fill("4");
  await first.locator('[data-role="word-seek"]').press("Enter");
  const markdownTableValue = await first.locator('[data-role="word-display"]').textContent();

  await tabs.nth(1).locator(".reader-tab-close").click();
  const tabCountAfterClose = await page.locator(".reader-tab").count();

  if (firstButtonText !== "Stop" || !firstButtonClass?.includes("is-stop")) {
    throw new Error("Start button did not switch to inverted Stop state.");
  }

  if (!firstProgressAfter || firstProgressAfter === "Word 0 of 0") {
    throw new Error("First reader progress did not update.");
  }

  if (secondProgressBefore !== secondProgressAfter) {
    throw new Error("Second reader state changed while first reader played.");
  }

  if (activeTabsBeforeClose !== 1 || firstHidden !== null || secondHidden !== "") {
    throw new Error("Reader tabs did not keep exactly one visible active reader.");
  }

  if (tabCountAfterClose !== 1) {
    throw new Error("Reader tab close button did not remove the inactive reader.");
  }

  if (!simplifyEnabled) {
    throw new Error("AI simplify button was not available for existing text.");
  }

  if (!cavemanEnabled) {
    throw new Error("Caveman mode button was not available for existing text.");
  }

  if (!extractionLabel?.includes("AI text extraction from document")) {
    throw new Error(`AI extraction label was not updated. Saw: ${extractionLabel}`);
  }

  if (!customLengthVisible) {
    throw new Error("Custom simplification length input was not shown.");
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

  if (wordSeekMax !== "8" || wordSeekDisplay !== "three" || wordSeekProgress !== "Word 3 of 8") {
    throw new Error(
      `Word number seek failed. Max/progress/display: ${wordSeekMax} / ${wordSeekProgress} / ${wordSeekDisplay}`,
    );
  }

  if (markdownWord !== "Heading" || !markdownClass?.includes("markdown-heading")) {
    throw new Error(`Markdown word rendering failed. Saw: ${markdownWord} / ${markdownClass}`);
  }

  if (
    markdownProgress !== "Word 1 of 9" ||
    markdownTableWord !== "Term" ||
    markdownTableValue !== "Speed"
  ) {
    throw new Error(
      `Markdown structure filtering failed. Saw: ${markdownProgress} / ${markdownTableWord} / ${markdownTableValue}`,
    );
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
      wordSeekDisplay,
      markdownWord,
      tabCountAfterClose,
    }),
  );
} finally {
  await browser.close();
}
