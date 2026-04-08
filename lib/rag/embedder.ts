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
      if (!text?.trim()) throw new Error("Cannot embed empty string");
      const { embedding } = await embed({
        model,
        value: text,
        providerOptions: {
          google: {
            outputDimensionality: dimensions,
            taskType: "RETRIEVAL_QUERY",
          },
        },
      });
      return embedding;
    },
    async embedBatch(texts) {
      const { embeddings } = await embedMany({
        model,
        values: texts,
        providerOptions: {
          google: {
            outputDimensionality: dimensions,
            taskType: "RETRIEVAL_DOCUMENT",
          },
        },
      });
      return embeddings;
    },
  };
}

const geminiEmbedder = createEmbedder(
  google.textEmbeddingModel("gemini-embedding-001"),
  768,
);

export const embedder: Embedder = geminiEmbedder;
