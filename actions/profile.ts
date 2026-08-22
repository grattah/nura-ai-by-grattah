"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/billing";
import { headers } from "next/headers";
import { isPasswordValid } from "@/lib/password-policy";

// ─── Update display name ───────────────────────────────────────────────────

export async function updateDisplayName(
  fullName: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName.trim() },
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

// ─── Set or update password ────────────────────────────────────────────────

export async function updatePassword(
  newPassword: string,
  confirmPassword: string,
): Promise<{ success: true } | { error: string }> {
  if (newPassword !== confirmPassword)
    return { error: "Passwords do not match." };
  if (!isPasswordValid(newPassword))
    return {
      error:
        "Password needs at least 8 characters, upper and lower case, a number, and a special character.",
    };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      has_password: true,
      password_updated_at: new Date().toISOString(),
    },
  });
  if (error) return { error: error.message };

  return { success: true };
}

// ─── Stripe customer portal ────────────────────────────────────────────────

export async function getStripePortalUrl(): Promise<
  { url: string } | { error: string }
> {
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const stripeCustomerId = await getStripeCustomerId(supabase, user.id);
  if (!stripeCustomerId) {
    return { error: "No active subscription found." };
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/profile`,
    });
    return { url: portalSession.url };
  } catch {
    return { error: "Failed to open billing portal. Please try again." };
  }
}
