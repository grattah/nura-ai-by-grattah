// lib/rag/vector-db.ts
// VectorDB interface — swap implementations without touching any calling code.
// Toggle the active export at the bottom of this file.

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

export function createPineconeDB(): VectorDB {
  const { Pinecone } = require("@pinecone-database/pinecone");
  const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = client.index(process.env.PINECONE_INDEX_NAME!);

  return {
    async upsert(vectors) {
      const BATCH = 100;
      for (let i = 0; i < vectors.length; i += BATCH) {
        await index.upsert(vectors.slice(i, i + BATCH));
      }
    },

    async query({ vector, contextId, topK = 6, minScore = 0.72 }) {
      const result = await index.query({
        vector,
        topK,
        includeMetadata: true,
        filter: { context_id: { $eq: contextId } },
      });

      return (result.matches ?? [])
        .filter((m: { score?: number }) => (m.score ?? 0) >= minScore)
        .map((m: { score?: number; metadata?: Record<string, unknown> }) => ({
          text: String(m.metadata?.text ?? ""),
          sourceUrl: String(m.metadata?.source_url ?? ""),
          score: m.score ?? 0,
        }));
    },
  };
}

// ─── Supabase pgvector implementation ─────────────────────────────────────────
// Run these SQL statements in Supabase once before switching to this provider:
//
//   create extension if not exists vector;
//
//   create table nura_embeddings (
//     id           text primary key,
//     context_id   text not null,
//     context_type text not null,
//     title        text not null,
//     source_url   text not null default '',
//     content      text not null,
//     embedding    vector(1536)  -- change to vector(768) for Gemini embeddings
//   );
//
//   create index on nura_embeddings
//     using ivfflat (embedding vector_cosine_ops) with (lists = 100);
//
//   create or replace function match_embeddings(
//     query_embedding  vector(1536),
//     match_context_id text,
//     match_count      int   default 6,
//     min_score        float default 0.72
//   )
//   returns table (id text, content text, source_url text, similarity float)
//   language sql stable as $$
//     select id, content, source_url,
//            1 - (embedding <=> query_embedding) as similarity
//     from   nura_embeddings
//     where  context_id = match_context_id
//       and  1 - (embedding <=> query_embedding) >= min_score
//     order  by embedding <=> query_embedding
//     limit  match_count;
//   $$;

export function createSupabaseVectorDB(): VectorDB {
  // const { createClient } = require("@supabase/supabase-js");
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
