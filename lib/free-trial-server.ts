import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  FREE_SURFACES,
  FREE_USES_PER_SURFACE,
  freeTrialTokens,
  type FreeSurface,
  type FreeTrialTokens,
} from "@/lib/credits";

/** Per-surface free-trial usage via SECURITY DEFINER RPCs. */
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

export async function getFreeTrialTokens(
  userId: string,
): Promise<FreeTrialTokens> {
  const counts = await Promise.all(
    Object.values(FREE_SURFACES).map((s) => freeUseCount(userId, s)),
  );
  return freeTrialTokens(counts);
}

export async function hasFreeUse(
  userId: string,
  surface: FreeSurface,
): Promise<boolean> {
  return (await freeUseCount(userId, surface)) < FREE_USES_PER_SURFACE;
}

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

/** Atomically allows a content view if already seen or under the cap. */
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
