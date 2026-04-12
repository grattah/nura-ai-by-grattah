import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  // Verify cron secret header
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find users created via checkout who have no subscription
  const { data: ghosts } = await supabase.auth.admin.listUsers();
  const toDelete = ghosts.users.filter(
    (u) =>
      u.created_at < cutoff &&
      u.user_metadata?.onboarding_source === "checkout" &&
      !u.email_confirmed_at,
  );

  for (const ghost of toDelete) {
    await supabase.auth.admin.deleteUser(ghost.id);
  }

  return Response.json({ deleted: toDelete.length });
}
