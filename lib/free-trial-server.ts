import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  FREE_SURFACES,
  FREE_USES_PER_SURFACE,
  freeTrialTokens,
  type FreeSurface,
  type FreeTrialTokens,
} from "@/lib/credits";

// Server-side per-surface free-trial usage via the SECURITY DEFINER RPCs
// (free_trial_per_surface migration). Callers pass the authenticated user's id.
// Only relevant for brand-new (never-subscribed) users — subscribers use the
// token system and lapsed subscribers get no free uses.

/** How many free uses the user has already consumed on a surface. */
export async function freeUseCount(
  userId: string,
  surface: FreeSurface,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("free_use_count" as never, {
    p_user: userId,
    p_surface: surface,
  } as never);
  return (data as number | null) ?? 0;
}

/**
 * The user's remaining free trials, expressed as a token count for display on
 * the Free Plan card. One RPC per surface, issued in parallel.
 */
export async function getFreeTrialTokens(
  userId: string,
): Promise<FreeTrialTokens> {
  const counts = await Promise.all(
    Object.values(FREE_SURFACES).map((s) => freeUseCount(userId, s)),
  );
  return freeTrialTokens(counts);
}

/** True when the user still has at least one free use left on the surface. */
export async function hasFreeUse(
  userId: string,
  surface: FreeSurface,
): Promise<boolean> {
  return (await freeUseCount(userId, surface)) < FREE_USES_PER_SURFACE;
}

/** Record a consumed use (LLM surfaces: omit `item` → one row per generation). */
export async function recordFreeUse(
  userId: string,
  surface: FreeSurface,
  item?: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("record_free_use" as never, {
    p_user: userId,
    p_surface: surface,
    p_item: item ?? null,
  } as never);
  return (data as number | null) ?? 0;
}

/**
 * Atomic content-view gate: allow if the item was already viewed, or record it
 * while under the cap; otherwise deny. Returns whether the view is allowed.
 */
export async function tryConsumeFreeView(
  userId: string,
  surface: FreeSurface,
  itemId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin.rpc("try_free_view" as never, {
    p_user: userId,
    p_surface: surface,
    p_item: itemId,
    p_cap: FREE_USES_PER_SURFACE,
  } as never);
  return (data as boolean | null) ?? false;
}
