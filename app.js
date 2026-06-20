import * as pdfjs from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const DEFAULT_WPM = 400;
const WPM_STEP = 50;
const MIN_WPM = 100;
const MAX_WPM = 1200;
const STANDARD_ACCEPT = ".txt,.md,.pdf,text/plain,text/markdown,application/pdf";
const AI_ACCEPT = [
  ".txt",
  ".md",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".tsv",
  ".rtf",
  ".html",
  ".htm",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  "text/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");
const MAX_AI_FILE_BYTES = 3_500_000;
const LENGTH_PRESETS = new Set(["10", "20", "30", "50"]);
const INLINE_MARKERS = [
  { marker: "**", style: "bold" },
  { marker: "__", style: "bold" },
  { marker: "~~", style: "strike" },
  { marker: "`", style: "code" },
  { marker: "*", style: "italic" },
  { marker: "_", style: "italic" },
];

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

class LLMService {
  static async processText({ text, simplify, targetWords }) {
    return this.request({
      text,
      simplify,
      targetWords,
    });
  }

  static async processFile({ file }) {
    if (file.size > MAX_AI_FILE_BYTES) {
      throw new Error(
        `File is too large for AI extraction. Limit is ${MAX_AI_FILE_BYTES.toLocaleString()} bytes.`,
      );
    }

    const fileData = await this.fileToDataUrl(file);
    return this.request({
      fileData,
      filename: file.name || "upload",
      simplify: false,
    });
  }

  static async request(body) {
    const response = await fetch("./api/process-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error || `AI request failed with status ${response.status}.`;
      throw new Error(message);
    }

    const output = payload?.text || "";

    if (!output.trim()) {
      throw new Error("AI response did not contain readable text.");
    }

    return output;
  }

  static fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(new Error("Could not read the uploaded file.")));
      reader.readAsDataURL(file);
    });
  }
}

class RSVPReader {
  constructor({ id, root, onRemove }) {
    this.id = id;
    this.root = root;
    this.onRemove = onRemove;
    this.words = [];
    this.currentIndex = 0;
    this.wpm = DEFAULT_WPM;
    this.timerId = null;
    this.isPlaying = false;
    this.elements = this.collectElements();

    this.elements.title.textContent = `Reader ${id}`;
    this.bindEvents();
    this.setWpm(DEFAULT_WPM);
    this.updateProgress();
    this.updateControls();
  }

  collectElements() {
    const byRole = (role) => this.root.querySelector(`[data-role="${role}"]`);

    return {
      title: byRole("reader-title"),
      removeReader: byRole("remove-reader"),
      wordDisplay: byRole("word-display"),
      progressTrack: byRole("progress-track"),
      progressFill: byRole("progress-fill"),
      progressText: byRole("progress-text"),
      percentText: byRole("percent-text"),
      startButton: byRole("start-button"),
      pauseButton: byRole("pause-button"),
      resetButton: byRole("reset-button"),
      decreaseSpeed: byRole("decrease-speed"),
      increaseSpeed: byRole("increase-speed"),
      wpmOutput: byRole("wpm-output"),
      textInput: byRole("text-input"),
      fileInput: byRole("file-input"),
      fileName: byRole("file-name"),
      aiToggle: byRole("ai-toggle"),
      simplifyLength: byRole("simplify-length"),
      customLength: byRole("custom-length"),
      simplifyText: byRole("simplify-text"),
      statusMessage: byRole("status-message"),
    };
  }

  bindEvents() {
    this.elements.startButton.addEventListener("click", () => this.togglePlayback());
    this.elements.pauseButton.addEventListener("click", () => {
      this.pause();
      this.setStatus("Paused.");
    });
    this.elements.resetButton.addEventListener("click", () => this.reset());
    this.elements.decreaseSpeed.addEventListener("click", () => this.setWpm(this.wpm - WPM_STEP));
    this.elements.increaseSpeed.addEventListener("click", () => this.setWpm(this.wpm + WPM_STEP));
    this.elements.removeReader.addEventListener("click", () => this.remove());
    this.elements.progressTrack.addEventListener("click", (event) => this.seekToClientX(event.clientX));
    this.elements.progressTrack.addEventListener("keydown", (event) => this.seekWithKeyboard(event));
    this.elements.textInput.addEventListener("input", () => {
      if (!this.isPlaying) {
        this.updateControls();
      }
    });
    this.elements.textInput.addEventListener("change", () => {
      this.loadText(this.elements.textInput.value, "Text loaded");
    });
    this.elements.fileInput.addEventListener("change", () => this.handleFileUpload());
    this.elements.aiToggle.addEventListener("change", () => this.updateAiControls());
    this.elements.simplifyLength.addEventListener("change", () => this.updateSimplifyControls());
    this.elements.simplifyText.addEventListener("click", () => this.handleSimplifyText());
  }

  parseWords(text) {
    return text
      .split(/\r?\n/)
      .flatMap((line) => this.parseMarkdownLine(line))
      .filter((token) => token.text);
  }

  parseMarkdownLine(line) {
    let source = line.trim();
    const blockStyles = [];

    if (!source) {
      return [];
    }

    const headingMatch = /^(#{1,6})\s+/.exec(source);

    if (headingMatch) {
      blockStyles.push("heading");
      source = source.slice(headingMatch[0].length).trim();
    }

    if (source.startsWith(">")) {
      blockStyles.push("quote");
      source = source.replace(/^>\s*/, "");
    }

    if (/^([-*+]|\d+\.)\s+/.test(source)) {
      blockStyles.push("list");
      source = source.replace(/^([-*+]|\d+\.)\s+/, "");
    }

    return this.parseInlineMarkdown(source, blockStyles);
  }

  parseInlineMarkdown(source, blockStyles) {
    const activeStyles = new Set();

    return source
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .split(/\s+/)
      .map((rawWord) => {
        let text = rawWord;
        const wordStyles = new Set(blockStyles);

        for (const { marker, style } of INLINE_MARKERS) {
          if (text.startsWith(marker) && text.length > marker.length) {
            activeStyles.add(style);
            text = text.slice(marker.length);
          }
        }

        for (const style of activeStyles) {
          wordStyles.add(style);
        }

        for (const { marker, style } of INLINE_MARKERS) {
          const punctuationMatch = /[.,;:!?)]*$/.exec(text);
          const punctuation = punctuationMatch?.[0] || "";
          const coreEnd = text.length - punctuation.length;

          if (coreEnd > marker.length && text.slice(0, coreEnd).endsWith(marker)) {
            text = `${text.slice(0, coreEnd - marker.length)}${punctuation}`;
            wordStyles.add(style);
            activeStyles.delete(style);
          }
        }

        return {
          text: text.replace(/^[([]+|[\])]+$/g, ""),
          styles: [...wordStyles],
        };
      });
  }

  loadText(text, sourceLabel = "Text loaded") {
    this.pause();
    this.words = this.parseWords(text);
    this.currentIndex = 0;

    if (!this.words.length) {
      this.renderWordDisplay("Paste or upload text");
      this.setStatus("No readable words found.", true);
    } else {
      this.renderWordDisplay(this.words[0]);
      this.setStatus(`${sourceLabel}: ${this.words.length.toLocaleString()} words.`);
    }

    this.updateProgress();
    this.updateControls();
  }

  async handleFileUpload() {
    const [file] = this.elements.fileInput.files;

    if (!file) {
      return;
    }

    this.elements.fileName.textContent = file.name;
    this.setStatus(this.elements.aiToggle.checked ? "Extracting with AI..." : "Parsing file...");

    try {
      const text = this.elements.aiToggle.checked
        ? await LLMService.processFile({ file })
        : await this.parseStandardFile(file);

      this.elements.textInput.value = text;
      this.loadText(text, file.name);
    } catch (error) {
      this.pause();
      this.setStatus(error.message, true);
      this.elements.fileInput.value = "";
      this.elements.fileName.textContent = "No file selected";
    }
  }

  async parseStandardFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (extension === "txt" || extension === "md") {
      return file.text();
    }

    if (extension === "pdf") {
      return this.parsePdf(file);
    }

    throw new Error("Unsupported file type. Upload a .txt, .md, or .pdf file.");
  }

  async handleSimplifyText() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.setStatus("Add text before using AI simplify.", true);
      return;
    }

    this.pause();
    this.setStatus("Simplifying with AI...");

    try {
      const targetWords = this.getSimplifyTargetWords(text);
      const simplifiedText = await LLMService.processText({
        text,
        simplify: true,
        targetWords,
      });

      this.elements.textInput.value = simplifiedText;
      this.loadText(simplifiedText, "AI simplified text");
    } catch (error) {
      this.setStatus(error.message, true);
    }
  }

  countWords(text) {
    return this.parseWords(text).length;
  }

  roundToHundred(words) {
    if (words <= 0) {
      return 100;
    }

    return Math.max(100, Math.round(words / 100) * 100);
  }

  getSimplifyTargetWords(text) {
    const selection = this.elements.simplifyLength.value;

    if (selection === "custom") {
      return this.roundToHundred(Number(this.elements.customLength.value) || 100);
    }

    if (!LENGTH_PRESETS.has(selection)) {
      return null;
    }

    const sourceWords = this.countWords(text);
    return this.roundToHundred(sourceWords * (Number(selection) / 100));
  }

  async parsePdf(file) {
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

  start() {
    if (!this.words.length) {
      this.loadText(this.elements.textInput.value, "Text loaded");
    }

    if (!this.words.length) {
      this.setStatus("Add text before starting.", true);
      return;
    }

    if (this.currentIndex >= this.words.length) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    this.setStatus("Reading.");
    this.tick();
    this.updateControls();
  }

  pause() {
    this.isPlaying = false;
    window.clearTimeout(this.timerId);
    this.timerId = null;
    this.updateControls();
  }

  reset() {
    this.pause();
    this.currentIndex = 0;
    this.renderWordDisplay(this.words[0] || "Paste or upload text");
    this.updateProgress();
  }

  remove() {
    this.pause();
    this.root.remove();
    this.onRemove(this);
  }

  tick() {
    window.clearTimeout(this.timerId);

    if (!this.isPlaying || !this.words.length) {
      return;
    }

    if (this.currentIndex >= this.words.length) {
      this.pause();
      this.renderWordDisplay("Done");
      this.currentIndex = this.words.length;
      this.updateProgress();
      this.setStatus("Finished.");
      return;
    }

    this.renderWordDisplay(this.words[this.currentIndex]);
    this.currentIndex += 1;
    this.updateProgress();
    this.timerId = window.setTimeout(() => this.tick(), 60000 / this.wpm);
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.pause();
      this.setStatus("Stopped.");
      return;
    }

    this.start();
  }

  setWpm(nextWpm) {
    this.wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, nextWpm));
    this.elements.wpmOutput.textContent = `${this.wpm} WPM`;
    this.updateControls();

    if (this.isPlaying) {
      this.tick();
    }
  }

  seekToClientX(clientX) {
    if (!this.words.length) {
      this.setStatus("Load text before seeking.", true);
      return;
    }

    const rect = this.elements.progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    this.currentIndex = Math.min(this.words.length - 1, Math.floor(ratio * this.words.length));
    this.renderWordDisplay(this.words[this.currentIndex]);
    this.updateProgress();

    if (this.isPlaying) {
      this.tick();
    }
  }

  seekWithKeyboard(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();

    if (!this.words.length) {
      return;
    }

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const jump = Math.max(1, Math.round(this.words.length * 0.02));
    this.currentIndex = Math.min(
      this.words.length - 1,
      Math.max(0, this.currentIndex + direction * jump),
    );
    this.renderWordDisplay(this.words[this.currentIndex]);
    this.updateProgress();
  }

  renderWordDisplay(word) {
    this.elements.wordDisplay.replaceChildren();

    if (typeof word === "string") {
      this.elements.wordDisplay.textContent = word;
      this.elements.wordDisplay.className = "word-display";
      return;
    }

    const span = document.createElement("span");
    span.textContent = word.text;
    span.classList.add("markdown-word");

    for (const style of word.styles) {
      span.classList.add(`markdown-${style}`);
    }

    this.elements.wordDisplay.className = "word-display has-markdown";
    this.elements.wordDisplay.append(span);
  }

  updateProgress() {
    const total = this.words.length;
    const displayedIndex = total ? Math.min(this.currentIndex + (this.isPlaying ? 0 : 1), total) : 0;
    const percent = total ? Math.min(100, (this.currentIndex / total) * 100) : 0;

    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.progressText.textContent = `Word ${displayedIndex.toLocaleString()} of ${total.toLocaleString()}`;
    this.elements.percentText.textContent = `${Math.round(percent)}%`;
  }

  updateControls() {
    const hasWords = this.words.length > 0 || this.elements.textInput.value.trim().length > 0;

    this.elements.startButton.disabled = !hasWords;
    this.elements.startButton.textContent = this.isPlaying ? "Stop" : "Start";
    this.elements.startButton.classList.toggle("is-stop", this.isPlaying);
    this.elements.startButton.setAttribute("aria-pressed", String(this.isPlaying));
    this.elements.pauseButton.disabled = !this.isPlaying;
    this.elements.resetButton.disabled = !this.words.length;
    this.elements.decreaseSpeed.disabled = this.wpm <= MIN_WPM;
    this.elements.increaseSpeed.disabled = this.wpm >= MAX_WPM;
  }

  updateAiControls() {
    const aiEnabled = this.elements.aiToggle.checked;

    this.elements.fileInput.accept = aiEnabled ? AI_ACCEPT : STANDARD_ACCEPT;
  }

  updateSimplifyControls() {
    const isCustom = this.elements.simplifyLength.value === "custom";
    this.elements.customLength.hidden = !isCustom;
    this.elements.customLength.disabled = !isCustom;
  }

  setStatus(message, isError = false) {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.classList.toggle("error", isError);
  }
}

class ReaderDashboard {
  constructor() {
    this.grid = document.querySelector("#readerGrid");
    this.template = document.querySelector("#readerTemplate");
    this.addButton = document.querySelector("#addReaderButton");
    this.readerCount = document.querySelector("#readerCount");
    this.readers = new Map();
    this.nextId = 1;

    this.addButton.addEventListener("click", () => this.addReader());
    this.addReader();
  }

  addReader() {
    const fragment = this.template.content.cloneNode(true);
    const root = fragment.querySelector(".reader-instance");
    const id = this.nextId;
    const reader = new RSVPReader({
      id,
      root,
      onRemove: (removedReader) => this.removeReader(removedReader),
    });

    this.nextId += 1;
    this.readers.set(id, reader);
    this.grid.append(root);
    this.updateDashboard();
  }

  removeReader(reader) {
    this.readers.delete(reader.id);

    if (!this.readers.size) {
      this.addReader();
      return;
    }

    this.updateDashboard();
  }

  updateDashboard() {
    const count = this.readers.size;
    this.readerCount.textContent = `${count} ${count === 1 ? "reader" : "readers"}`;

    for (const reader of this.readers.values()) {
      reader.elements.removeReader.disabled = count === 1;
    }
  }
}

new ReaderDashboard();
