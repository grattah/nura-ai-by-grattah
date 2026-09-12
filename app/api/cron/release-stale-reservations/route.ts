import { createServiceRoleClient } from "@/lib/supabase/server";
import { secureCompare } from "@/lib/secure-compare";

export const maxDuration = 60;

/** Refunds reservations abandoned by requests that never finished. */
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
