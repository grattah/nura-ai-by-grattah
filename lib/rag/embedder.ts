// lib/rag/embedder.ts
// Uses AI SDK 5's embed/embedMany so the abstraction is provider-agnostic.
// No direct calls to OpenAI or Google SDKs.
//
// Switching providers:
//   OpenAI  → openai.embedding("text-embedding-3-small")  1536 dims  (current)
//   Gemini  → google.textEmbeddingModel("text-embedding-004")  768 dims
//
// After switching: update `dimensions`, re-create the vector index with the
// new dimension, and re-run scripts/vectorise.ts from scratch.

import { embed, embedMany, type EmbeddingModel } from "ai";
// import { openai } from "@ai-sdk/openai";
// To switch to Gemini, uncomment:
import { google } from "@ai-sdk/google";

export interface Embedder {
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

function createEmbedder(
  model: EmbeddingModel<string>,
  dimensions: number,
): Embedder {
  return {
    dimensions,
    async embed(text) {
      const result = await embed({ model, value: text });
      return result.embedding;
    },
    async embedBatch(texts) {
      const result = await embedMany({ model, values: texts });
      return result.embeddings;
    },
  };
}

// const openAIEmbedder = createEmbedder(
//   openai.embedding("text-embedding-3-small"),
//   1536,
// );

// Gemini option — swap activeEmbedder below to use:
const geminiEmbedder = createEmbedder(
  google.textEmbeddingModel("gemini-embedding-001"),
  768,
);

// ─── Change this one line to switch embedding providers ───────────────────────
export const embedder: Embedder = geminiEmbedder;
