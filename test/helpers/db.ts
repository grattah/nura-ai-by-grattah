import { Client } from "pg";

const CONNECTION = process.env.BRANCH_DB_URL ?? process.env.TEST_DB_URL;

export const hasTestDb = !!CONNECTION;

/** Runs fn in a transaction that is always rolled back. */
export async function withRollback<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!CONNECTION) throw new Error("BRANCH_DB_URL is not set");

  const client = new Client({
    connectionString: CONNECTION,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Integration tests need the database at BRANCH_DB_URL, and it is not reachable (${why}).\n` +
        `These tests exercise RLS, constraints and RPCs, which mocks cannot — so they fail rather than silently skipping.\n` +
        `Run only the unit suite with:  npx vitest run --exclude 'test/integration/**'`,
    );
  }
  await client.query("begin");

  try {
    return await fn(makeTx(client));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  }
}

export interface Tx {
  sql: <R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  asUser: <R = Record<string, unknown>>(
    userId: string,
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  asAnon: <R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
}

function makeTx(client: Client): Tx {
  const sql = async <R>(text: string, params: unknown[] = []): Promise<R[]> => {
    const res = await client.query(text, params);
    return res.rows as R[];
  };

  const asRole = async <R>(
    role: string,
    claims: string | null,
    text: string,
    params: unknown[],
  ): Promise<R[]> => {
    await client.query("savepoint role_scope");
    try {
      await client.query(`set local role ${role}`);
      if (claims) {
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          claims,
        ]);
      }
      const res = await client.query(text, params);
      return res.rows as R[];
    } finally {
      await client.query("reset role").catch(async () => {
        await client.query("rollback to savepoint role_scope").catch(() => {});
      });
      await client.query("release savepoint role_scope").catch(() => {});
    }
  };

  return {
    sql,
    asUser: (userId, text, params = []) =>
      asRole(
        "authenticated",
        JSON.stringify({ sub: userId, role: "authenticated" }),
        text,
        params,
      ),
    asAnon: (text, params = []) => asRole("anon", null, text, params),
  };
}

/** Creates an auth user inside the transaction. */
export async function makeUser(tx: Tx, email?: string): Promise<string> {
  const rows = await tx.sql<{ id: string }>(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
             'authenticated', 'authenticated', $1, '', now(), now(), now())
     returning id`,
    [email ?? `test-${Math.random().toString(36).slice(2)}@example.test`],
  );
  return rows[0].id;
}
