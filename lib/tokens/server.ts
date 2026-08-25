import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ACTION_UNITS,
  walletView,
  type Balances,
  type TokenAction,
  type WalletView,
} from "./spec";

// Server side of the token system (spec 21 Aug 2026 §5/§6).
//
// The contract every metered surface follows:
//
//   const res = await reserve(userId, "generate");
//   if (!res) return insufficient();          // §5 step 4 — show purchase sheet
//   try   { ...do the work...; await settle(res); }
//   catch { await release(res); throw; }
//
// Units leave the balance at RESERVE time, so ten concurrent requests cannot
// all pass the same affordability check. A request that dies between reserve
// and settle is swept by release_stale_reservations().

export interface Reservation {
  id: string;
  action: TokenAction;
  costUnits: number;
  fromSubscription: number;
  fromPurchased: number;
}

interface ReservationRow {
  id: string;
  action: TokenAction;
  cost_units: number;
  from_subscription: number;
  from_purchased: number;
}

/**
 * Reserve the cost of an action.
 *
 * Returns null when the user cannot afford it — the caller must block and
 * offer the purchase sheet rather than doing the work for free.
 */
export async function reserve(
  userId: string,
  action: TokenAction,
): Promise<Reservation | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("reserve_units" as never, {
    p_user: userId,
    p_action: action,
  } as never);

  if (error) {
    console.error(`[tokens] reserve failed for ${action}:`, error.message);
    return null;
  }

  // The RPC returns the reservation row, or null when the balance is short.
  const row = (Array.isArray(data) ? data[0] : data) as ReservationRow | null;
  if (!row?.id) return null;

  return {
    id: row.id,
    action: row.action,
    costUnits: row.cost_units,
    fromSubscription: row.from_subscription,
    fromPurchased: row.from_purchased,
  };
}

/** §6 — the work succeeded; the units are consumed. */
export async function settle(reservation: Reservation): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("settle_reservation" as never, {
    p_id: reservation.id,
  } as never);
  if (error) {
    // Settling is bookkeeping — the units already left the balance at reserve
    // time, so a failure here does not over-charge. Left for the sweeper.
    console.error("[tokens] settle failed:", error.message);
  }
}

/**
 * §6 — the work failed, timed out, or was cancelled; refund in full.
 *
 * Never throws: it runs on the error path, and masking the original failure
 * with a refund error would lose the reason the request failed.
 */
export async function release(reservation: Reservation): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.rpc("release_reservation" as never, {
      p_id: reservation.id,
    } as never);
    if (error) console.error("[tokens] release failed:", error.message);
  } catch (e) {
    console.error("[tokens] release threw:", e);
  }
}

/**
 * Run `work` with the cost reserved, settling on success and releasing on any
 * failure. Returns null if the user cannot afford the action.
 *
 * Preferred over calling reserve/settle/release by hand: the release path is
 * easy to forget, and forgetting it charges users for work that never ran.
 */
export async function withReservation<T>(
  userId: string,
  action: TokenAction,
  work: (reservation: Reservation) => Promise<T>,
): Promise<{ ok: true; result: T } | { ok: false }> {
  const reservation = await reserve(userId, action);
  if (!reservation) return { ok: false };

  try {
    const result = await work(reservation);
    await settle(reservation);
    return { ok: true, result };
  } catch (err) {
    await release(reservation);
    throw err;
  }
}

// ── Reading the wallet ──────────────────────────────────────────────────────

interface CreditsRow {
  subscription_units: number | null;
  purchased_units: number | null;
  purchased_frozen: boolean | null;
}

export async function getBalances(userId: string): Promise<Balances> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("credits")
    .select("subscription_units, purchased_units, purchased_frozen")
    .eq("user_id", userId)
    .maybeSingle<CreditsRow>();

  return {
    subscriptionUnits: data?.subscription_units ?? 0,
    purchasedUnits: data?.purchased_units ?? 0,
    purchasedFrozen: data?.purchased_frozen ?? false,
  };
}

export async function getWallet(userId: string): Promise<WalletView> {
  return walletView(await getBalances(userId));
}

/** Whether the user could afford `action` right now (no reservation taken). */
export async function canAfford(
  userId: string,
  action: TokenAction,
): Promise<boolean> {
  const b = await getBalances(userId);
  const spendable =
    b.subscriptionUnits + (b.purchasedFrozen ? 0 : b.purchasedUnits);
  return spendable >= ACTION_UNITS[action];
}
