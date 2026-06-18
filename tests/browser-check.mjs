import { chromium } from "playwright";

const APP_URL = process.env.APP_URL || "http://127.0.0.1:8765";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});

try {
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.fill(
    "#textInput",
    "One two three four five six seven eight nine ten eleven twelve",
  );
  await page.click("#startButton");
  await page.waitForTimeout(250);
  const activeButtonText = await page.textContent("#startButton");
  const activeButtonClass = await page.getAttribute("#startButton", "class");
  await page.click("#increaseSpeed");
  await page.click("#pauseButton");

  const beforeSeek = await page.textContent("#progressText");
  const progressBox = await page.locator("#progressTrack").boundingBox();

  if (!progressBox) {
    throw new Error("Progress bar was not visible.");
  }

  await page.mouse.click(
    progressBox.x + progressBox.width * 0.75,
    progressBox.y + progressBox.height / 2,
  );

  const afterSeek = await page.textContent("#progressText");
  const wpm = await page.textContent("#wpmOutput");
  const displayedWord = await page.textContent("#wordDisplay");

  if (!beforeSeek || !afterSeek || beforeSeek === afterSeek) {
    throw new Error("Progress did not change after seeking.");
  }

  if (activeButtonText !== "Stop" || !activeButtonClass?.includes("is-stop")) {
    throw new Error("Start button did not switch to inverted Stop state.");
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
      beforeSeek,
      afterSeek,
      wpm,
      displayedWord,
    }),
  );
} finally {
  await browser.close();
}
