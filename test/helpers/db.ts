import { Client } from "pg";

/**
 * Integration-test harness: a REAL Postgres connection, one transaction per
 * test, always rolled back.
 *
 * Why this exists at all. Every other test in this suite mocks Supabase, and a
 * mock always returns the rows you told it to. That structurally cannot catch:
 *
 *   • RLS — `ingredients` and `recipe_ingredients` had RLS enabled with zero
 *     policies, so the authenticated role read NOTHING and every Match Score
 *     came out 0%. The whole suite stayed green.
 *   • column types — `recipe_categories.score` is an integer; writing 25.6
 *     failed only against the real database.
 *   • RPC behaviour, constraints, and anything concurrent.
 *
 * Rollback rather than cleanup: a test that fails midway still leaves the
 * database exactly as it found it, so a broken test can never poison the next
 * one — or the branch database everyone shares.
 */

const CONNECTION = process.env.BRANCH_DB_URL ?? process.env.TEST_DB_URL;

export const hasTestDb = !!CONNECTION;

/**
 * Run `fn` inside a transaction that is ALWAYS rolled back.
 *
 * `sql` runs statements on the open transaction. `asUser` switches to the
 * `authenticated` role with a JWT claim, which is what makes RLS actually
 * apply — connecting as the owner bypasses every policy and would make these
 * tests pass no matter how the policies were written.
 */
export async function withRollback<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!CONNECTION) throw new Error("BRANCH_DB_URL is not set");

  const client = new Client({ connectionString: CONNECTION });
  await client.connect();
  await client.query("begin");

  try {
    return await fn(makeTx(client));
  } finally {
    // Rollback even on success — these tests assert behaviour, never persist.
    await client.query("rollback").catch(() => {});
    await client.end().catch(() => {});
  }
}

export interface Tx {
  /** Run SQL as the connection owner (bypasses RLS). Use for fixtures. */
  sql: <R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  /**
   * Run SQL as `authenticated` with the given user id — RLS applies.
   *
   * Restores the owner role afterwards so fixture setup can continue; a
   * `set local role` that leaked would silently disable RLS for the rest of
   * the test and turn a real failure into a pass.
   */
  asUser: <R = Record<string, unknown>>(
    userId: string,
    text: string,
    params?: unknown[],
  ) => Promise<R[]>;
  /** Run SQL as `anon` (signed-out). */
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
    // savepoint so a permission error doesn't abort the whole transaction and
    // take the rest of the test's assertions with it.
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

/** A user id that exists in auth.users, created inside the transaction. */
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
