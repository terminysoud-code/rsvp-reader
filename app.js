import * as pdfjs from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const DEFAULT_WPM = 400;
const WPM_STEP = 50;
const MIN_WPM = 100;
const MAX_WPM = 1200;

const state = {
  words: [],
  currentIndex: 0,
  wpm: DEFAULT_WPM,
  timerId: null,
  isPlaying: false,
};

const elements = {
  wordDisplay: document.querySelector("#wordDisplay"),
  progressTrack: document.querySelector("#progressTrack"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  percentText: document.querySelector("#percentText"),
  startButton: document.querySelector("#startButton"),
  pauseButton: document.querySelector("#pauseButton"),
  resetButton: document.querySelector("#resetButton"),
  decreaseSpeed: document.querySelector("#decreaseSpeed"),
  increaseSpeed: document.querySelector("#increaseSpeed"),
  wpmOutput: document.querySelector("#wpmOutput"),
  textInput: document.querySelector("#textInput"),
  fileInput: document.querySelector("#fileInput"),
  fileName: document.querySelector("#fileName"),
  statusMessage: document.querySelector("#statusMessage"),
};

function parseWords(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function loadText(text, sourceLabel = "Text loaded") {
  pause();
  state.words = parseWords(text);
  state.currentIndex = 0;

  if (!state.words.length) {
    elements.wordDisplay.textContent = "Paste or upload text";
    setStatus("No readable words found.", true);
  } else {
    elements.wordDisplay.textContent = state.words[0];
    setStatus(`${sourceLabel}: ${state.words.length.toLocaleString()} words.`);
  }

  updateProgress();
  updateControls();
}

async function parseFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  if (extension === "txt" || extension === "md") {
    return file.text();
  }

  if (extension === "pdf") {
    return parsePdf(file);
  }

  throw new Error("Unsupported file type. Upload a .txt, .md, or .pdf file.");
}

async function parsePdf(file) {
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => item.str).join(" "));
  }

  return pageTexts.join("\n");
}

function start() {
  if (!state.words.length) {
    loadText(elements.textInput.value, "Text loaded");
  }

  if (!state.words.length) {
    setStatus("Add text before starting.", true);
    return;
  }

  if (state.currentIndex >= state.words.length) {
    state.currentIndex = 0;
  }

  state.isPlaying = true;
  setStatus("Reading.");
  tick();
  updateControls();
}

function pause() {
  state.isPlaying = false;
  window.clearTimeout(state.timerId);
  state.timerId = null;
  updateControls();
}

function reset() {
  pause();
  state.currentIndex = 0;
  elements.wordDisplay.textContent = state.words[0] || "Paste or upload text";
  updateProgress();
}

function tick() {
  window.clearTimeout(state.timerId);

  if (!state.isPlaying || !state.words.length) {
    return;
  }

  if (state.currentIndex >= state.words.length) {
    pause();
    elements.wordDisplay.textContent = "Done";
    state.currentIndex = state.words.length;
    updateProgress();
    setStatus("Finished.");
    return;
  }

  elements.wordDisplay.textContent = state.words[state.currentIndex];
  state.currentIndex += 1;
  updateProgress();

  state.timerId = window.setTimeout(tick, 60000 / state.wpm);
}

function setWpm(nextWpm) {
  state.wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, nextWpm));
  elements.wpmOutput.textContent = `${state.wpm} WPM`;
  updateControls();

  if (state.isPlaying) {
    tick();
  }
}

function seekToClientX(clientX) {
  if (!state.words.length) {
    setStatus("Load text before seeking.", true);
    return;
  }

  const rect = elements.progressTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  state.currentIndex = Math.min(state.words.length - 1, Math.floor(ratio * state.words.length));
  elements.wordDisplay.textContent = state.words[state.currentIndex];
  updateProgress();

  if (state.isPlaying) {
    tick();
  }
}

function updateProgress() {
  const total = state.words.length;
  const displayedIndex = total ? Math.min(state.currentIndex + (state.isPlaying ? 0 : 1), total) : 0;
  const percent = total ? Math.min(100, (state.currentIndex / total) * 100) : 0;

  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `Word ${displayedIndex.toLocaleString()} of ${total.toLocaleString()}`;
  elements.percentText.textContent = `${Math.round(percent)}%`;
}

function updateControls() {
  const hasWords = state.words.length > 0 || elements.textInput.value.trim().length > 0;

  elements.startButton.disabled = state.isPlaying || !hasWords;
  elements.pauseButton.disabled = !state.isPlaying;
  elements.resetButton.disabled = !state.words.length;
  elements.decreaseSpeed.disabled = state.wpm <= MIN_WPM;
  elements.increaseSpeed.disabled = state.wpm >= MAX_WPM;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("error", isError);
}

elements.startButton.addEventListener("click", start);
elements.pauseButton.addEventListener("click", () => {
  pause();
  setStatus("Paused.");
});
elements.resetButton.addEventListener("click", reset);
elements.decreaseSpeed.addEventListener("click", () => setWpm(state.wpm - WPM_STEP));
elements.increaseSpeed.addEventListener("click", () => setWpm(state.wpm + WPM_STEP));

elements.textInput.addEventListener("input", () => {
  if (!state.isPlaying) {
    updateControls();
  }
});

elements.textInput.addEventListener("change", () => {
  loadText(elements.textInput.value, "Text loaded");
});

elements.fileInput.addEventListener("change", async () => {
  const [file] = elements.fileInput.files;

  if (!file) {
    return;
  }

  elements.fileName.textContent = file.name;
  setStatus("Parsing file...");

  try {
    const text = await parseFile(file);
    elements.textInput.value = text;
    loadText(text, file.name);
  } catch (error) {
    pause();
    setStatus(error.message, true);
    elements.fileInput.value = "";
    elements.fileName.textContent = "No file selected";
  }
});

elements.progressTrack.addEventListener("click", (event) => {
  seekToClientX(event.clientX);
});

elements.progressTrack.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();

  if (!state.words.length) {
    return;
  }

  const direction = event.key === "ArrowRight" ? 1 : -1;
  const jump = Math.max(1, Math.round(state.words.length * 0.02));
  state.currentIndex = Math.min(
    state.words.length - 1,
    Math.max(0, state.currentIndex + direction * jump),
  );
  elements.wordDisplay.textContent = state.words[state.currentIndex];
  updateProgress();
});

setWpm(DEFAULT_WPM);
updateProgress();
updateControls();
