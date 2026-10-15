import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany, cosineSimilarity } from "ai";

export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "liquid/lfm-2.5-embedding-350m:free";

// Long inputs are cut so one huge prompt or file cannot blow up the request
const MAX_CHARS = Number(process.env.EMBEDDING_MAX_CHARS) || 1500;

let cachedModel = null;

function getModel() {
  if (!cachedModel) {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    cachedModel = openrouter.embedding(EMBEDDING_MODEL);
  }
  return cachedModel;
}

const clean = (text) =>
  String(text ?? "")
    .trim()
    .slice(0, MAX_CHARS);

// Returns a vector (array of numbers), or null if embedding fails.
// Callers must handle null so a provider outage never breaks the app.
export async function embedText(text) {
  const value = clean(text);
  if (!value) return null;

  try {
    const { embedding } = await embed({
      model: getModel(),
      value,
      maxRetries: 1,
    });
    return embedding;
  } catch (err) {
    console.warn(`[Embeddings] embedText failed: ${err.message}`);
    return null;
  }
}

// Returns an array of vectors in the same order as the input, or null on failure
export async function embedTexts(texts) {
  const values = texts.map(clean);
  if (values.length === 0 || values.some((v) => !v)) return null;

  try {
    const { embeddings } = await embedMany({
      model: getModel(),
      values,
      maxRetries: 1,
    });
    return embeddings;
  } catch (err) {
    console.warn(`[Embeddings] embedTexts failed: ${err.message}`);
    return null;
  }
}

// Cosine similarity: 1 = same meaning, 0 = unrelated
export function similarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return cosineSimilarity(a, b);
}

// Ranks items by similarity to a query vector.
// getVector(item) returns the item's stored vector.
export function topMatches(
  queryVector,
  items,
  getVector,
  topK = 5,
  minScore = 0,
) {
  return items
    .map((item) => ({ item, score: similarity(queryVector, getVector(item)) }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
