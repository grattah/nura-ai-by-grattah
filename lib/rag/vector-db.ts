import { createServiceRoleClient } from "../supabase/server";

export interface RetrievedChunk {
  text: string;
  sourceUrl: string;
  score: number;
}

export interface UpsertVector {
  id: string;
  values: number[];
  metadata: {
    context_id: string;
    context_type: "recipe" | "guide";
    title: string;
    text: string;
    source_url: string;
  };
}

export interface QueryParams {
  vector: number[];
  contextId: string;
  topK?: number;
  minScore?: number;
}

export interface VectorDB {
  upsert(vectors: UpsertVector[]): Promise<void>;
  query(params: QueryParams): Promise<RetrievedChunk[]>;
}

// ─── Pinecone implementation ──────────────────────────────────────────────────

// export function createPineconeDB(): VectorDB {
//   const { Pinecone } = require("@pinecone-database/pinecone");
//   const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
//   const index = client.index(process.env.PINECONE_INDEX_NAME!);

//   return {
//     async upsert(vectors) {
//       const BATCH = 100;
//       for (let i = 0; i < vectors.length; i += BATCH) {
//         await index.upsert(vectors.slice(i, i + BATCH));
//       }
//     },

//     async query({ vector, contextId, topK = 6, minScore = 0.72 }) {
//       const result = await index.query({
//         vector,
//         topK,
//         includeMetadata: true,
//         filter: { context_id: { $eq: contextId } },
//       });

//       return (result.matches ?? [])
//         .filter((m: { score?: number }) => (m.score ?? 0) >= minScore)
//         .map((m: { score?: number; metadata?: Record<string, unknown> }) => ({
//           text: String(m.metadata?.text ?? ""),
//           sourceUrl: String(m.metadata?.source_url ?? ""),
//           score: m.score ?? 0,
//         }));
//     },
//   };
// }

export function createSupabaseVectorDB(): VectorDB {
  const supabase = createServiceRoleClient();

  return {
    async upsert(vectors) {
      const rows = vectors.map((v) => ({
        id: v.id,
        context_id: v.metadata.context_id,
        context_type: v.metadata.context_type,
        title: v.metadata.title,
        source_url: v.metadata.source_url,
        content: v.metadata.text,
        embedding: v.values,
      }));

      const { error } = await supabase
        .from("nura_embeddings")
        .upsert(rows, { onConflict: "id" });

      if (error) throw error;
    },

    async query({ vector, contextId, topK = 6, minScore = 0.72 }) {
      const { data, error } = await supabase.rpc("match_embeddings", {
        query_embedding: vector,
        match_context_id: contextId,
        match_count: topK,
        min_score: minScore,
      });

      if (error) throw error;

      return (data ?? []).map(
        (row: { content: string; source_url: string; similarity: number }) => ({
          text: row.content,
          sourceUrl: row.source_url,
          score: row.similarity,
        }),
      );
    },
  };
}

// ─── Active instance — change one line to switch DB ──────────────────────────
// export const vectorDB: VectorDB = createPineconeDB();
export const vectorDB: VectorDB = createSupabaseVectorDB();
