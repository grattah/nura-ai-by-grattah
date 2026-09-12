import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type UsageProvider = "anthropic" | "google";
export type UsageSource = "runtime" | "cron" | "script";

export interface RecordUsageInput {
  provider: UsageProvider;
  model: string;
  surface: string;
  source?: UsageSource;
  userId?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  images?: number;
  units?: number | null;
  billed?: boolean;
  meta?: Record<string, unknown> | null;
}

export function usageTokens(usage?: {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}): { inputTokens: number; outputTokens: number; totalTokens: number } {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

export async function recordUsage(u: RecordUsageInput): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const inputTokens = u.inputTokens ?? 0;
    const outputTokens = u.outputTokens ?? 0;
    await admin.from("token_usage" as never).insert({
      provider: u.provider,
      model: u.model,
      surface: u.surface,
      source: u.source ?? "runtime",
      user_id: u.userId ?? null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: u.totalTokens ?? inputTokens + outputTokens,
      images: u.images ?? 0,
      units: u.units ?? null,
      billed: u.billed ?? false,
      meta: u.meta ?? null,
    } as never);
  } catch (err) {
    console.error("[usage] recordUsage failed", err);
  }
}
