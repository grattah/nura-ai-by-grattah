import { createServiceRoleClient } from "@/lib/supabase/server";
import { secureCompare } from "@/lib/secure-compare";

export const maxDuration = 60;

/**
 * Refund reservations abandoned by a request that never finished (spec §6).
 *
 * Units leave the balance at RESERVE time — that is what stops ten concurrent
 * requests all passing the same affordability check. The cost is that a
 * process which dies between reserving and settling leaves those units in
 * limbo: the user has been charged for work they never received, and nothing
 * in the request path is still alive to refund them.
 *
 * This is the only thing that returns them. Without it, every crashed
 * generation permanently costs a user 3 units.
 *
 * 15 minutes is comfortably longer than any request can run (the longest route
 * caps at maxDuration 60s), so a reservation still open at that age cannot
 * belong to work in flight.
 */
export async function GET(req: Request) {
  if (
    !secureCompare(
      req.headers.get("authorization"),
      `Bearer ${process.env.CRON_SECRET}`,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc(
    "release_stale_reservations" as never,
    { p_older_than: "15 minutes" } as never,
  );

  if (error) {
    console.error("[release-stale-reservations]", error.message);
    return new Response("Failed", { status: 500 });
  }

  const released = (data as number | null) ?? 0;
  if (released > 0) {
    console.log(`[release-stale-reservations] refunded ${released}`);
  }
  return Response.json({ released });
}
