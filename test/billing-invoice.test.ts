import { describe, it, expect } from "vitest";
import { toInvoiceView } from "@/lib/billing";
import type Stripe from "stripe";

// toInvoiceView is pure — no Stripe network calls needed.
const invoice = (over: Partial<Stripe.Invoice> = {}) =>
  ({
    id: "in_123",
    amount_paid: 7900,
    amount_due: 7900,
    currency: "gbp",
    status: "paid",
    created: 1779580800, // 2026-05-24T00:00:00Z
    invoice_pdf: "https://stripe.test/in_123.pdf",
    hosted_invoice_url: "https://stripe.test/in_123",
    ...over,
  }) as Stripe.Invoice;

describe("toInvoiceView", () => {
  it("converts minor units and formats in the invoice's own currency", () => {
    // The mock UI hardcoded "$79" while the app bills in GBP — the symbol must
    // come from the invoice, not a constant.
    expect(toInvoiceView(invoice()).amount).toBe("£79.00");
    expect(
      toInvoiceView(invoice({ currency: "usd", amount_paid: 2000 })).amount,
    ).toBe("$20.00");
  });

  it("capitalises the Stripe status so non-paid invoices aren't mislabelled", () => {
    expect(toInvoiceView(invoice()).status).toBe("Paid");
    expect(toInvoiceView(invoice({ status: "open" })).status).toBe("Open");
  });

  it("formats the date from the unix timestamp", () => {
    expect(toInvoiceView(invoice()).date).toMatch(/^May \d{1,2}, 2026$/);
  });

  it("prefers the PDF but falls back to the hosted invoice page", () => {
    expect(toInvoiceView(invoice()).downloadUrl).toBe(
      "https://stripe.test/in_123.pdf",
    );
    expect(
      toInvoiceView(invoice({ invoice_pdf: null })).downloadUrl,
    ).toBe("https://stripe.test/in_123");
    expect(
      toInvoiceView(invoice({ invoice_pdf: null, hosted_invoice_url: null }))
        .downloadUrl,
    ).toBeNull();
  });

  it("falls back to amount_due when nothing has been paid yet", () => {
    expect(
      toInvoiceView(invoice({ amount_paid: 0, amount_due: 2000, status: "open" }))
        .amount,
    ).toBe("£20.00");
  });
});
