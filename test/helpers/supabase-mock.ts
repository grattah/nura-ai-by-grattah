import { vi } from "vitest";

export interface RecordedCall {
  table: string;
  op: "insert" | "upsert" | "update" | "delete" | "select";
  value?: unknown;
}

type Result = { data: unknown; error: unknown };

/**
 * Minimal chainable Supabase client mock. Records insert/upsert/update/delete/
 * select operations per table and resolves terminal calls (`await builder`,
 * `.maybeSingle()`) with a per-table configured `{ data, error }`.
 */
export function makeSupabaseMock() {
  const calls: RecordedCall[] = [];
  const results = new Map<string, Result>();

  function resultFor(table: string): Result {
    return results.get(table) ?? { data: null, error: null };
  }

  function chain(table: string) {
    const builder: Record<string, unknown> = {
      select: (..._a: unknown[]) => {
        calls.push({ table, op: "select" });
        return builder;
      },
      insert: (value: unknown) => {
        calls.push({ table, op: "insert", value });
        return builder;
      },
      upsert: (value: unknown) => {
        calls.push({ table, op: "upsert", value });
        return builder;
      },
      update: (value: unknown) => {
        calls.push({ table, op: "update", value });
        return builder;
      },
      delete: () => {
        calls.push({ table, op: "delete" });
        return builder;
      },
      eq: (..._a: unknown[]) => builder,
      in: (..._a: unknown[]) => builder,
      not: (..._a: unknown[]) => builder,
      order: (..._a: unknown[]) => builder,
      limit: (..._a: unknown[]) => builder,
      maybeSingle: () => Promise.resolve(resultFor(table)),
      single: () => Promise.resolve(resultFor(table)),
      then: (onF: (v: Result) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resultFor(table)).then(onF, onR),
    };
    return builder;
  }

  const client = {
    from: vi.fn((table: string) => chain(table)),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      admin: { listUsers: vi.fn() },
    },
  };

  return {
    client,
    calls,
    setResult(table: string, result: Result) {
      results.set(table, result);
    },
    callsFor(table: string, op?: RecordedCall["op"]) {
      return calls.filter((c) => c.table === table && (!op || c.op === op));
    },
  };
}
