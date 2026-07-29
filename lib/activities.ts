// lib/activities.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVITIES_PAGE_SIZE = 5;

export interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  /** Free-text target for activities with no recipe (e.g. a search term). */
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

/** The actor's display name. No name set → "You". */
export function actorLabel(fullName?: string | null): string {
  const name = fullName?.trim();
  return name ? name : "You";
}

/**
 * Row copy for an activity. Unknown verbs fall through to "{action} {target}" so
 * a future activity type never renders blank.
 */
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

/** What the activity refers to: a recipe title, or the free-text label. */
export function activityTarget(item: ActivityItem): string {
  return item.recipe?.title ?? item.label ?? "";
}

// `created_at` then `id` is a total order. Without the `id` tiebreaker,
// activities sharing a timestamp have an undefined position, and range
// pagination slices by position, so pages could overlap or skip rows.
export async function fetchActivitiesPage(
  supabase: SupabaseClient,
  pageNum: number,
  userId: string,
  signal?: AbortSignal,
): Promise<ActivityItem[]> {
  const start = pageNum * ACTIVITIES_PAGE_SIZE;
  const end = start + ACTIVITIES_PAGE_SIZE - 1;

  // Own rows only. The profiles join is gone: in a self-only feed the actor is
  // constant, so the name is resolved once by the page. It also carried
  // `.not("profiles.username","is",null)` with an inner join, which silently
  // dropped every row belonging to a user who hadn't set a name.
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
