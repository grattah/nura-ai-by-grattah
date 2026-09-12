import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ACTION_UNITS,
  walletView,
  type Balances,
  type TokenAction,
  type WalletView,
} from "./spec";

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

/** Reserves an action's cost before the work runs. */
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

/** Consumes reserved units after success. */
export async function settle(reservation: Reservation): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc("settle_reservation" as never, {
    p_id: reservation.id,
  } as never);
  if (error) {
    console.error("[tokens] settle failed:", error.message);
  }
}

/** Refunds reserved units after failure. */
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

/** Runs work with its cost reserved: settles on success, releases on failure. */
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

export async function canAfford(
  userId: string,
  action: TokenAction,
): Promise<boolean> {
  const b = await getBalances(userId);
  const spendable =
    b.subscriptionUnits + (b.purchasedFrozen ? 0 : b.purchasedUnits);
  return spendable >= ACTION_UNITS[action];
}
