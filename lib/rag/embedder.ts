import "server-only";
import { embed, embedMany, type EmbeddingModel } from "ai";
import { google } from "@ai-sdk/google";
import { recordUsage } from "@/lib/usage-server";

const EMBED_MODEL_ID = "gemini-embedding-2";

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
      if (!text?.trim()) throw new Error("Cannot embed empty string");
      const { embedding, usage } = await embed({
        model,
        value: text,
        providerOptions: {
          google: {
            outputDimensionality: dimensions,
            taskType: "RETRIEVAL_QUERY",
          },
        },
      });
      void recordUsage({
        provider: "google",
        model: EMBED_MODEL_ID,
        surface: "rag-embed",
        inputTokens: usage?.tokens ?? 0,
        totalTokens: usage?.tokens ?? 0,
      });
      return embedding;
    },
    async embedBatch(texts) {
      const { embeddings, usage } = await embedMany({
        model,
        values: texts,
        providerOptions: {
          google: {
            outputDimensionality: dimensions,
            taskType: "RETRIEVAL_DOCUMENT",
          },
        },
      });
      void recordUsage({
        provider: "google",
        model: EMBED_MODEL_ID,
        surface: "rag-embed",
        inputTokens: usage?.tokens ?? 0,
        totalTokens: usage?.tokens ?? 0,
      });
      return embeddings;
    },
  };
}

const geminiEmbedder = createEmbedder(
  google.textEmbeddingModel("gemini-embedding-2"),
  768,
);

export const embedder: Embedder = geminiEmbedder;
