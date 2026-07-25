import { createServiceRoleClient } from "@/lib/supabase/server";
import { secureCompare } from "@/lib/secure-compare";

export async function GET(req: Request) {
  // Verify cron secret header (constant-time — audit S4).
  if (
    !secureCompare(
      req.headers.get("authorization"),
      `Bearer ${process.env.CRON_SECRET}`,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Page through ALL users — listUsers() defaults to the first page only, so
  // ghosts beyond ~50 users were never cleaned (audit finding H2).
  const perPage = 1000;
  let page = 1;
  let deleted = 0;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      console.error("[clean-up-ghosts] listUsers failed:", error.message);
      break;
    }

    const users = data.users;
    if (users.length === 0) break;

    const toDelete = users.filter(
      (u) =>
        u.created_at < cutoff &&
        u.user_metadata?.onboarding_source === "checkout" &&
        !u.email_confirmed_at,
    );

    for (const ghost of toDelete) {
      await supabase.auth.admin.deleteUser(ghost.id);
      deleted++;
    }

    if (users.length < perPage) break;
    page++;
  }

  return Response.json({ deleted });
}
