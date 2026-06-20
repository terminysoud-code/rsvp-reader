import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const FIXTURE_DIR = path.resolve("tests/fixtures");
const samples = [
  {
    id: "alice-chapter-1",
    filename: "alice-chapter-1.txt",
    source: "https://www.gutenberg.org/files/11/11-0.txt",
    title: "Alice's Adventures in Wonderland",
    sliceStart: "CHAPTER I.",
    sliceEnd: "CHAPTER II.",
  },
];

function usage() {
  console.log("Usage: node tests/manage-samples.mjs <download|list|clean> [--force]");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractSlice(text, sample) {
  const start = text.lastIndexOf(sample.sliceStart);
  const end = text.indexOf(sample.sliceEnd, start + sample.sliceStart.length);

  if (start === -1 || end === -1 || end <= start) {
    return text.trim();
  }

  return text.slice(start, end).trim();
}

async function download({ force = false } = {}) {
  await mkdir(FIXTURE_DIR, { recursive: true });

  for (const sample of samples) {
    const outputPath = path.join(FIXTURE_DIR, sample.filename);

    if (!force && (await exists(outputPath))) {
      console.log(`${sample.id}: exists ${outputPath}`);
      continue;
    }

    const response = await fetch(sample.source);

    if (!response.ok) {
      throw new Error(`${sample.id}: download failed with HTTP ${response.status}`);
    }

    const text = extractSlice(await response.text(), sample);
    await writeFile(outputPath, `${text}\n`, "utf8");
    console.log(`${sample.id}: downloaded ${outputPath}`);
  }
}

async function list() {
  for (const sample of samples) {
    const outputPath = path.join(FIXTURE_DIR, sample.filename);
    const present = await exists(outputPath);
    console.log(`${present ? "ready" : "missing"} ${sample.id} ${outputPath}`);
  }
}

async function clean() {
  await rm(FIXTURE_DIR, { force: true, recursive: true });
  await mkdir(FIXTURE_DIR, { recursive: true });
  await writeFile(path.join(FIXTURE_DIR, ".gitignore"), "*\n!.gitignore\n", "utf8");
  console.log(`cleaned ${FIXTURE_DIR}`);
}

const [command, ...args] = process.argv.slice(2);

try {
  if (command === "download") {
    await download({ force: args.includes("--force") });
  } else if (command === "list") {
    await list();
  } else if (command === "clean") {
    await clean();
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
