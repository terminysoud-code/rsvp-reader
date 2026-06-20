import JSZip from "jszip";
import handler from "../api/process-text.js";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

async function callApi(body) {
  const response = createResponse();
  await handler(
    {
      method: "POST",
      headers: {},
      socket: { remoteAddress: `test-${Math.random()}` },
      body,
    },
    response,
  );

  return {
    statusCode: response.statusCode,
    payload: JSON.parse(response.body),
  };
}

async function createDocxDataUrl(text) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${buffer.toString("base64")}`;
}

process.env.AI_PROVIDER = "gemini";
process.env.GEMINI_API_KEY = "test-key";

const docxText = "DOCX extraction works before Gemini sees the upload.";
let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [
          {
            content: {
              parts: [{ text: "Caveman output" }],
            },
          },
        ],
      };
    },
  };
};

const docxResult = await callApi({
  fileData: await createDocxDataUrl(docxText),
  filename: "sample.docx",
  simplify: false,
});

if (docxResult.statusCode !== 200 || !docxResult.payload.text.includes(docxText)) {
  throw new Error(`DOCX extraction failed: ${JSON.stringify(docxResult)}`);
}

if (fetchCalls !== 0) {
  throw new Error("DOCX extraction called Gemini instead of returning server-extracted text.");
}

let capturedGeminiBody = null;
globalThis.fetch = async (_url, options) => {
  capturedGeminiBody = JSON.parse(options.body);
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [
          {
            content: {
              parts: [{ text: "Me make text simple." }],
            },
          },
        ],
      };
    },
  };
};

const cavemanResult = await callApi({
  text: "Bonjour. Ceci est un document avec des instructions importantes.",
  simplify: true,
  rewriteMode: "caveman",
  targetWords: 100,
});

const instructions = capturedGeminiBody?.systemInstruction?.parts?.[0]?.text || "";

if (cavemanResult.statusCode !== 200 || cavemanResult.payload.text !== "Me make text simple.") {
  throw new Error(`Caveman rewrite failed: ${JSON.stringify(cavemanResult)}`);
}

if (!instructions.includes("caveman mode") || !instructions.includes("same language")) {
  throw new Error(`Caveman instructions were not applied: ${instructions}`);
}

console.log(JSON.stringify({ ok: true, docxChars: docxResult.payload.text.length, caveman: true }));
