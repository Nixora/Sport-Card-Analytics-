const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DOC_RELATIVE_PATH = path.join("client", "public", "user-documentation.md");
const DOC_LOCALE_FALLBACK = "/user-documentation.md";

function getOpenAiKey() {
  return String(process.env.OPENAI_API_KEY || "").trim();
}

function getGeminiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function normalizeLocale(locale) {
  const c = String(locale || "").toLowerCase().trim();
  return c || "en";
}

function localeToLanguageName(locale) {
  const c = normalizeLocale(locale);
  if (c === "de") return "German";
  if (c === "fr") return "French";
  if (c === "es") return "Spanish";
  if (c === "it") return "Italian";
  if (c === "pl") return "Polish";
  if (c === "nl") return "Dutch";
  return "English";
}

function notFoundPhrase(locale) {
  const c = normalizeLocale(locale);
  if (c === "de") return "Ich kann das in der Dokumentation nicht finden.";
  if (c === "fr") return "Je ne trouve pas cela dans la documentation.";
  if (c === "es") return "No puedo encontrar eso en la documentación.";
  if (c === "it") return "Non riesco a trovare questo nella documentazione.";
  if (c === "pl") return "Nie mogę tego znaleźć w dokumentacji.";
  if (c === "nl") return "Ik kan dit niet vinden in de documentatie.";
  return "I can’t find that in the documentation.";
}

function sha256(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

function readDocText() {
  const abs = path.resolve(__dirname, "..", "..", "..", DOC_RELATIVE_PATH);
  return fs.readFileSync(abs, "utf8");
}

function splitByParagraphs(text, maxChars, overlapChars) {
  const paras = String(text || "")
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return [];

  const segs = [];
  let buf = [];
  let bufLen = 0;

  for (const p of paras) {
    const pLen = p.length;
    // Start new segment if adding would exceed.
    if (bufLen + pLen > maxChars && buf.length) {
      segs.push(buf.join("\n\n"));
      // overlap: keep last chunks of previous segment by char count
      if (overlapChars > 0) {
        const keep = [];
        let keptLen = 0;
        for (let i = buf.length - 1; i >= 0; i--) {
          const part = buf[i];
          if (keptLen + part.length > overlapChars) break;
          keep.unshift(part);
          keptLen += part.length;
        }
        buf = keep;
        bufLen = buf.reduce((sum, x) => sum + x.length, 0);
      } else {
        buf = [];
        bufLen = 0;
      }
    }
    buf.push(p);
    bufLen += pLen;
  }

  if (buf.length) segs.push(buf.join("\n\n"));
  return segs;
}

function chunkMarkdown(md) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");

  let h2 = null;
  let h3 = null;
  let buf = [];

  const flush = () => {
    const raw = buf.join("\n").trim();
    if (!raw) return;
    const title = h3 ? `${h2} / ${h3}` : h2;
    if (!title) return;

    const parts = splitByParagraphs(raw, 6000, 600);
    if (!parts.length) return;

    parts.forEach((part, idx) => {
      segs.push({
        title: parts.length === 1 ? title : `${title} (part ${idx + 1})`,
        text: part,
      });
    });
  };

  const segs = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const m2 = line.match(/^##\s+(.+)$/);
    if (m2) {
      // new h2: flush previous buffer (h3 or h2 chunk)
      flush();
      h2 = m2[1].trim();
      h3 = null;
      buf = [rawLine];
      continue;
    }

    const m3 = line.match(/^###\s+(.+)$/);
    if (m3) {
      // new h3: flush previous buffer (previous h3)
      flush();
      h3 = m3[1].trim();
      buf = [rawLine];
      continue;
    }

    if (!h2 && !h3) {
      // Skip intro before first ## to reduce irrelevant embeddings.
      continue;
    }
    buf.push(rawLine);
  }

  flush();
  return segs;
}

function cosineSim(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
}

async function openAiEmbeddings(inputTexts) {
  const key = getOpenAiKey();
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, input: inputTexts }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Embeddings request failed (${resp.status})`);
  }
  if (!data?.data?.length) throw new Error("Embeddings: no data");
  return data.data.map((x) => x.embedding);
}

function isSmallTalkGreeting(message) {
  const s = String(message || "")
    .trim()
    .toLowerCase()
    .replace(/[!?.]+/g, "");
  return (
    s === "hi" ||
    s === "hello" ||
    s === "hey" ||
    s === "hi there" ||
    s === "hello there" ||
    s === "yo"
  );
}

function greetingReply(locale) {
  const c = normalizeLocale(locale);
  if (c === "de") return "Wie kann ich dir helfen?";
  if (c === "fr") return "Comment puis-je vous aider ?";
  if (c === "es") return "¿En qué puedo ayudarte?";
  if (c === "it") return "Come posso aiutarti?";
  if (c === "pl") return "W czym mogę pomóc?";
  if (c === "nl") return "Waarmee kan ik je helpen?";
  return "How can I help you?";
}

async function openAiChat({ locale, question, context }) {
  const key = getOpenAiKey();
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const langName = localeToLanguageName(locale);
  const notFound = notFoundPhrase(locale);

  const system = [
    "You are a strict documentation assistant for Nixsora.",
    "Rules:",
    "1) Answer ONLY using the CONTEXT provided by the user.",
    "2) If the answer is not present in the context, respond with exactly the NOT_FOUND text (no extra words).",
    `3) Respond in ${langName}.`,
  ].join("\n");

  const user = [
    `Question: ${question}`,
    "",
    "CONTEXT:",
    context,
    "",
    `NOT_FOUND: ${notFound}`,
  ].join("\n");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: chatModel,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Chat request failed (${resp.status})`);
  }

  const content = data?.choices?.[0]?.message?.content;
  return String(content || "").trim();
}

async function geminiEmbeddings(inputTexts) {
  const key = getGeminiKey();
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const model = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:embedContent?key=${encodeURIComponent(key)}`;

  // Gemini embedContent is single-content per request, so batch sequentially.
  const vectors = [];
  for (const text of inputTexts) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: String(text || "") }] },
      }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `Gemini embeddings request failed (${resp.status})`;
      throw new Error(msg);
    }
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || !values.length) {
      throw new Error("Gemini embeddings: no values");
    }
    vectors.push(values);
  }
  return vectors;
}

async function geminiChat({ locale, question, context }) {
  const key = getGeminiKey();
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const model = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
  const langName = localeToLanguageName(locale);
  const notFound = notFoundPhrase(locale);

  const systemInstruction = [
    "You are a strict documentation assistant for Nixsora.",
    "Rules:",
    "1) Answer ONLY using the CONTEXT provided.",
    "2) If the answer is not present in the context, respond with exactly the NOT_FOUND text (no extra words).",
    `3) Respond in ${langName}.`,
  ].join("\n");

  const userText = [
    `Question: ${question}`,
    "",
    "CONTEXT:",
    context,
    "",
    `NOT_FOUND: ${notFound}`,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Gemini request failed (${resp.status})`;
    throw new Error(msg);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") ||
    "";
  return String(text || "").trim();
}

let indexState = null;
let indexPromise = null;

async function ensureIndex() {
  if (indexState) return indexState;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const docText = readDocText();
    const docHash = sha256(docText);
    const openAiKey = getOpenAiKey();
    const geminiKey = getGeminiKey();

    const cacheDir = path.resolve(__dirname, "..", "..", "..", "server", ".cache");
    const mode = geminiKey ? "gemini" : openAiKey ? "openai" : "lexical";
    const cacheFile = path.join(cacheDir, `docChatIndex.${mode}.${docHash}.json`);

    try {
      const cached = fs.readFileSync(cacheFile, "utf8");
      const parsed = JSON.parse(cached);
      // If the cache was created without OpenAI (vectors=null) but a key is now present,
      // rebuild embeddings so the chatbot switches to AI mode after configuration.
      if (!(openAiKey && parsed && parsed.vectors == null)) {
        indexState = parsed;
        return indexState;
      }
    } catch {
      // continue building
    }

    const chunks = chunkMarkdown(docText);
    if (!chunks.length) throw new Error("No documentation chunks generated");

    // If Gemini is configured, prefer Gemini embeddings for retrieval (better relevance + smaller context).
    if (geminiKey) {
      try {
        const vectors = [];
        const batchSize = 32;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const part = chunks.slice(i, i + batchSize);
          const partVectors = await geminiEmbeddings(part.map((c) => c.text));
          vectors.push(...partVectors);
        }
        const built = { docHash, chunks, vectors };
        try {
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cacheFile, JSON.stringify(built), "utf8");
        } catch {
          /* ignore */
        }
        indexState = built;
        return indexState;
      } catch {
        // If Gemini embeddings fail, fall back to lexical retrieval + Gemini chat.
        const built = { docHash, chunks, vectors: null };
        indexState = built;
        return indexState;
      }
    }

    if (!openAiKey) {
      // Fallback for local testing: no embeddings / no LLM.
      const built = { docHash, chunks, vectors: null };
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(built), "utf8");
      } catch {
        /* ignore */
      }
      indexState = built;
      return indexState;
    }

    // Embed in batches to avoid request size issues.
    const vectors = [];
    const batchSize = 64;
    try {
      for (let i = 0; i < chunks.length; i += batchSize) {
        const part = chunks.slice(i, i + batchSize);
        const partTexts = part.map((c) => c.text);
        const partVectors = await openAiEmbeddings(partTexts);
        vectors.push(...partVectors);
      }
    } catch {
      // If OpenAI is unavailable (e.g., region restricted), fall back to lexical mode.
      const built = { docHash, chunks, vectors: null };
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(built), "utf8");
      } catch {
        /* ignore */
      }
      indexState = built;
      return indexState;
    }

    const built = { docHash, chunks, vectors };

    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(built), "utf8");
    } catch {
      // ignore caching issues
    }

    indexState = built;
    return indexState;
  })();

  return indexPromise;
}

function buildContext(chunks, selected, maxChars) {
  let total = 0;
  const parts = [];
  for (const idx of selected) {
    const c = chunks[idx];
    const header = `- ${c.title}`;
    const body = c.text;
    const piece = `${header}\n${body}\n`;
    if (total + piece.length > maxChars && parts.length) break;
    parts.push(piece);
    total += piece.length;
  }
  return parts.join("\n");
}

function tokenizeQuery(s) {
  const t = String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  const tokens = t.split(/\s+/g).filter((w) => w.length >= 4);
  // Tiny stopword set; we keep it small to stay deterministic.
  const stop = new Set([
    "nixsora",
    "this",
    "that",
    "with",
    "from",
    "into",
    "where",
    "which",
    "what",
  ]);
  return tokens.filter((w) => !stop.has(w));
}

function lexicalRetrieve(chunks, question, topK) {
  const tokens = tokenizeQuery(question);
  if (!tokens.length) return { selected: [], scores: [] };

  const scored = chunks.map((c, i) => {
    const hay = String(c?.text || "").toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 1;
    }
    return { i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score || 0;
  const selected = scored
    .slice(0, topK)
    .filter((x) => x.score > 0)
    .map((x) => x.i);

  return { selected, best };
}

async function askDocChat({ message, locale }) {
  const q = String(message || "").trim();
  if (!q) throw new Error("Missing message");

  if (isSmallTalkGreeting(q)) {
    return { answer: greetingReply(locale), sources: [] };
  }

  const index = await ensureIndex();

  const topK = parseInt(process.env.DOCCHAT_TOPK || process.env.OPENAI_DOCCHAT_TOPK || "6", 10);
  const sources = [];

  if (!index.vectors) {
    // Gemini mode (lexical retrieval + LLM) or lexical fallback (no LLM).
    const { selected, best } = lexicalRetrieve(index.chunks, q, topK);
    if (!selected.length || best <= 0) {
      return { answer: notFoundPhrase(locale), sources: [] };
    }
    for (const i of selected) {
      if (index.chunks[i]?.title) sources.push({ title: index.chunks[i].title });
    }
    const contextMax = parseInt(process.env.DOCCHAT_CONTEXT_MAX_CHARS || "9000", 10);
    const context = buildContext(index.chunks, selected, contextMax);

    const geminiKey = getGeminiKey();
    if (geminiKey) {
      try {
        const answer = await geminiChat({ locale, question: q, context });
        return { answer, sources };
      } catch {
        // Fall through to excerpt fallback
      }
    }

    const bestChunk = index.chunks[selected[0]];
    const firstPara = String(bestChunk?.text || "").split(/\n{2,}/g)[0] || "";
    const snippet = firstPara.trim().slice(0, 900);
    return { answer: snippet + (snippet.length < firstPara.length ? "…" : ""), sources };
  }

  let questionVector;
  try {
    if (getGeminiKey()) questionVector = (await geminiEmbeddings([q]))[0];
    else questionVector = (await openAiEmbeddings([q]))[0];
  } catch {
    // If embedding is unavailable mid-flight, degrade gracefully.
    const { selected, best } = lexicalRetrieve(index.chunks, q, topK);
    if (!selected.length || best <= 0) {
      return { answer: notFoundPhrase(locale), sources: [] };
    }
    for (const i of selected) {
      if (index.chunks[i]?.title) sources.push({ title: index.chunks[i].title });
    }
    const bestChunk = index.chunks[selected[0]];
    const firstPara = String(bestChunk?.text || "").split(/\n{2,}/g)[0] || "";
    const snippet = firstPara.trim().slice(0, 900);
    return { answer: snippet + (snippet.length < firstPara.length ? "…" : ""), sources };
  }

  const scored = index.vectors.map((v, i) => ({
    i,
    s: cosineSim(questionVector, v),
  }));
  scored.sort((a, b) => b.s - a.s);

  const selected = scored.slice(0, Math.max(1, topK)).map((x) => x.i);
  sources.push(...selected.map((i) => ({ title: index.chunks[i]?.title || "Source" })));

  const contextMax = parseInt(process.env.DOCCHAT_CONTEXT_MAX_CHARS || "9000", 10);
  const context = buildContext(index.chunks, selected, contextMax);

  let answer;
  try {
    if (getGeminiKey()) answer = await geminiChat({ locale, question: q, context });
    else answer = await openAiChat({ locale, question: q, context });
  } catch {
    // If OpenAI chat is unavailable, fall back to lexical excerpt.
    const { selected, best } = lexicalRetrieve(index.chunks, q, topK);
    if (!selected.length || best <= 0) {
      return { answer: notFoundPhrase(locale), sources: [] };
    }
    const bestChunk = index.chunks[selected[0]];
    const firstPara = String(bestChunk?.text || "").split(/\n{2,}/g)[0] || "";
    const snippet = firstPara.trim().slice(0, 900);
    answer = snippet + (snippet.length < firstPara.length ? "…" : "");
  }

  return { answer, sources };
}

module.exports = {
  askDocChat,
};

