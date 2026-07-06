export const COMMON_CONCERNS = ["Bloating", "Indigestion", "Heartburn"];

export type Plan = "annual" | "monthly";

export const PLAN_LABELS: Record<
  Plan,
  { name: string; price: string; description: string }
> = {
  annual: {
    name: "Nuko+ (Annual)",
    price: "£79",
    description: "Save £16.9, billed yearly.",
  },
  monthly: {
    name: "Nuko+ (Monthly)",
    price: "£7.99",
    description: "Billed monthly.",
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
  {
    id: "annual",
    label: "Annual",
    price: "£79",
    description: "Save £16.9, billed yearly.",
    badge: "BEST VALUE",
    per: "/ year",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "£7.99",
    description: "Billed monthly.",
    badge: null,
    per: "/ month",
  },
];
