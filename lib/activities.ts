import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVITIES_PAGE_SIZE = 5;

export interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  label: string | null;
  recipe: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;
}

interface ActivityRow {
  id: number | string;
  action: string | null;
  created_at: string;
  label: string | null;
  recipes: { id: string; title: string; image_url: string | null } | null;
}

function mapRow(item: ActivityRow): ActivityItem {
  return {
    id: String(item.id),
    action: item.action ?? "",
    created_at: item.created_at,
    label: item.label,
    recipe: item.recipes
      ? {
          id: item.recipes.id,
          title: item.recipes.title,
          image_url: item.recipes.image_url,
        }
      : null,
  };
}

export function actorLabel(fullName?: string | null): string {
  const name = fullName?.trim();
  return name ? name : "You";
}

export function activityPhrase(action: string, target: string): string {
  switch (action) {
    case "searched":
      return `searched ${target}`;
    case "bookmarked":
      return `added ${target} to favorites`;
    case "liked":
      return `liked ${target}`;
    case "viewed":
      return `viewed ${target}`;
    default:
      return `${action} ${target}`.trim();
  }
}

export function activityTarget(item: ActivityItem): string {
  return item.recipe?.title ?? item.label ?? "";
}

/** Paginates by created_at then id so pages never overlap. */
export async function fetchActivitiesPage(
  supabase: SupabaseClient,
  pageNum: number,
  userId: string,
  signal?: AbortSignal,
): Promise<ActivityItem[]> {
  const start = pageNum * ACTIVITIES_PAGE_SIZE;
  const end = start + ACTIVITIES_PAGE_SIZE - 1;

  let query = supabase
    .from("activities")
    .select(
      `
      id,
      action,
      created_at,
      label,
      recipes ( id, title, image_url )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;

  if (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ActivityRow[]).map(mapRow);
}
