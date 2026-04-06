// lib/rag/index.ts
// Composes embedder + vectorDB into the two operations the routes need.
// Neither route imports Pinecone, Supabase, OpenAI, or Google directly.

import { embedder } from "./embedder";
import { vectorDB, type RetrievedChunk } from "./vector-db";

export type { RetrievedChunk };

export interface RetrieveResult {
  chunks: RetrievedChunk[];
  hasGoodResults: boolean;
}

export async function retrieve(
  query: string,
  contextId: string,
  topK = 6,
  minScore = 0.72,
): Promise<RetrieveResult> {
  const vector = await embedder.embed(query);
  const chunks = await (
    await vectorDB
  ).query({ vector, contextId, topK, minScore });
  return { chunks, hasGoodResults: chunks.length > 0 };
}

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[Source ${i + 1}] (${c.sourceUrl})\n${c.text}`)
    .join("\n\n---\n\n");
}

// Re-exported for use in the vectorise script
export const embedBatch = embedder.embedBatch.bind(embedder);
