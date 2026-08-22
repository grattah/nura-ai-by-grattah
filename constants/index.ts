export const COMMON_CONCERNS = ["Bloating", "Indigestion", "Heartburn"];

/**
 * The currency everything new is priced and charged in.
 *
 * Existing Stripe subscriptions keep the currency they were created with — a
 * subscription cannot change currency — so historic GBP subscriptions continue
 * to bill in GBP until the customer resubscribes. Anything that renders a
 * Stripe amount reads that object's own `currency`; this constant is only the
 * default for new charges and for amounts that arrive without one.
 */
export const APP_CURRENCY = "usd";
export const APP_LOCALE = "en-US";

export type Plan = "annual" | "monthly" | "weekly";

// Annual saves $39.89 against paying monthly for a year ($9.99 x 12 = $119.88).
export const PLAN_LABELS: Record<
  Plan,
  { name: string; price: string; description: string }
> = {
  annual: {
    name: "Nuko+ (Annual)",
    price: "$79.99",
    description: "Save $39.89, billed yearly.",
  },
  monthly: {
    name: "Nuko+ (Monthly)",
    price: "$9.99",
    description: "Billed monthly.",
  },
  weekly: {
    name: "Nuko+ (Weekly)",
    price: "$4.99",
    description: "Billed weekly.",
  },
};

export const PLANS: {
  id: Plan;
  label: string;
  price: string;
  description: string;
  badge: string | null;
  per: string;
}[] = [
  // Order matters — it is the order the plan cards render in, and the AUG 21
  // design lists them cheapest-first with Annual last carrying BEST VALUE.
  // Nothing selects a default by position (callers name "annual"), so this is
  // presentation only.
  {
    id: "weekly",
    label: "Weekly",
    price: "$4.99",
    description: "Billed weekly.",
    badge: null,
    per: "/ week",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$9.99",
    description: "Billed monthly.",
    badge: null,
    per: "/ month",
  },
  {
    id: "annual",
    label: "Annual",
    // Annual saves $39.89 against paying monthly for a year ($9.99 x 12 =
    // $119.88). If the monthly price changes, this figure must change with it.
    price: "$79.99",
    description: "Save $39.89, billed yearly.",
    badge: "BEST VALUE",
    per: "/ year",
  },
];
