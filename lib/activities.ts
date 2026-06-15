// lib/activities.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVITIES_PAGE_SIZE = 5;

export interface ActivityItem {
  id: string;
  action: string;
  created_at: string;
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  recipe: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;
}

function mapRow(item: any): ActivityItem {
  return {
    id: item.id,
    action: item.action,
    created_at: item.created_at,
    profile: item.profiles
      ? {
          id: item.profiles.id,
          username: item.profiles.username,
          avatar_url: item.profiles.avatar_url,
        }
      : null,
    recipe: item.recipes
      ? {
          id: item.recipes.id,
          title: item.recipes.title,
          image_url: item.recipes.image_url,
        }
      : null,
  };
}

// `created_at` then `id` is a total order. Without the `id` tiebreaker,
// activities sharing a timestamp have an undefined position, and range
// pagination slices by position, so pages could overlap or skip rows.
export async function fetchActivitiesPage(
  supabase: SupabaseClient,
  pageNum: number,
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
      profiles ( id, username, avatar_url ),
      recipes ( id, title, image_url )
    `,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, end);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;

  if (error) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}