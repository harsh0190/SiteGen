import {
  embedText,
  embedTexts,
  similarity,
  EMBEDDING_MODEL,
} from "./embeddings.js";

export const TOP_K = Number(process.env.RAG_TOP_K) || 3;

// How many files to retrieve by similarity (App.js and files named in the prompt are added on top)
const ALWAYS_INCLUDE = ["/App.js"];

// Embedding models only read a limited number of tokens (512 for the free model),
// so files are split into small chunks and each chunk gets its own vector.
const CHUNK_CHARS = Number(process.env.RAG_CHUNK_CHARS) || 800;
const MAX_CHUNKS_PER_FILE = 8;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Splits text into chunks of at most CHUNK_CHARS, breaking on line boundaries
export function chunkText(text) {
  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    if (current && current.length + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";

    // A single very long line (minified code) is split by length
    while (current.length > CHUNK_CHARS) {
      chunks.push(current.slice(0, CHUNK_CHARS));
      current = current.slice(CHUNK_CHARS);
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks.slice(0, MAX_CHUNKS_PER_FILE);
}

// A stored set of vectors is only usable if it was made from the current content by the current model
const isFresh = (entry) =>
  Array.isArray(entry.vectors) &&
  entry.embeddedHash === entry.hash &&
  entry.embeddingModel === EMBEDDING_MODEL;

// Gives every file up-to-date chunk vectors. Only new or edited files are embedded
// (all their chunks in one batched call). Never throws: if embedding fails, files are returned unchanged.
export async function ensureFileEmbeddings(files) {
  const stale = Object.entries(files).filter(([, entry]) => !isFresh(entry));
  if (stale.length === 0) return { files, changed: false };

  // Flatten every chunk of every stale file into one list, remembering whose chunk it is
  const texts = [];
  const owners = [];
  for (const [path, entry] of stale) {
    const chunks = chunkText(entry.content);
    for (const chunk of chunks.length ? chunks : [""]) {
      texts.push(`${path}\n${chunk}`);
      owners.push(path);
    }
  }

  const vectors = await embedTexts(texts);
  if (!vectors) return { files, changed: false };

  const byPath = {};
  owners.forEach((path, i) => {
    (byPath[path] ||= []).push(vectors[i]);
  });

  const updated = { ...files };
  for (const [path, entry] of stale) {
    updated[path] = {
      ...entry,
      vectors: byPath[path],
      embeddedHash: entry.hash,
      embeddingModel: EMBEDDING_MODEL,
    };
  }
  return { files: updated, changed: true };
}

// A file is as relevant as its best-matching chunk
const fileScore = (queryVector, entry) =>
  Math.max(...entry.vectors.map((v) => similarity(queryVector, v)));

export function rankFiles(queryVector, files) {
  return Object.keys(files)
    .map((path) => ({ path, score: fileScore(queryVector, files[path]) }))
    .sort((a, b) => b.score - a.score);
}
// Picks the files the model needs to see for this request.
// Falls back to sending everything whenever retrieval is not possible or not worthwhile.
export async function selectRelevantFiles(prompt, files) {
  const paths = Object.keys(files);
  const all = Object.fromEntries(paths.map((p) => [p, files[p].content]));
  const charsTotal = paths.reduce((sum, p) => sum + files[p].content.length, 0);

  const sendAll = (method) => ({
    selected: all,
    stats: {
      method,
      used: paths.length,
      total: paths.length,
      charsSent: charsTotal,
      charsTotal,
    },
  });

  // Small projects: retrieval would only risk hiding a file the edit needs
  if (paths.length <= TOP_K + 1) return sendAll("all-small-project");

  if (paths.some((p) => !isFresh(files[p]))) return sendAll("all-no-vectors");

  const queryVector = await embedText(prompt);
  if (!queryVector) return sendAll("all-embedding-failed");

  const chosen = new Set(
    rankFiles(queryVector, files)
      .slice(0, TOP_K)
      .map((m) => m.path),
  );

  for (const p of ALWAYS_INCLUDE) {
    if (files[p]) chosen.add(p);
  }

  // A file named in the request ("make the Navbar sticky") is always needed
  for (const p of paths) {
    const base = p
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "");
    if (
      base.length >= 4 &&
      new RegExp(`\\b${escapeRegex(base)}\\b`, "i").test(prompt)
    ) {
      chosen.add(p);
    }
  }

  const selected = {};
  let charsSent = 0;
  for (const p of paths) {
    if (chosen.has(p)) {
      selected[p] = files[p].content;
      charsSent += files[p].content.length;
    }
  }

  return {
    selected,
    stats: {
      method: "retrieval",
      used: chosen.size,
      total: paths.length,
      charsSent,
      charsTotal,
    },
  };
}
