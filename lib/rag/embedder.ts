import { embed, embedMany, type EmbeddingModel } from "ai";
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
