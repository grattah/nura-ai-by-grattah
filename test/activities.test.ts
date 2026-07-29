import { describe, it, expect } from "vitest";
import {
  actorLabel,
  activityPhrase,
  activityTarget,
  type ActivityItem,
} from "@/lib/activities";

// Activities is a personal feed: every row belongs to the signed-in user, so the
// actor is rendered once from their name — or "You" when they haven't set one.

describe("actorLabel", () => {
  it("uses the name when there is one", () => {
    expect(actorLabel("Sunny Thompson")).toBe("Sunny Thompson");
  });

  it("trims surrounding whitespace", () => {
    expect(actorLabel("  Sunny Thompson  ")).toBe("Sunny Thompson");
  });

  it('falls back to "You" when no name is set', () => {
    expect(actorLabel(undefined)).toBe("You");
    expect(actorLabel(null)).toBe("You");
    expect(actorLabel("")).toBe("You");
    expect(actorLabel("   ")).toBe("You");
  });
});

describe("activityPhrase", () => {
  it("renders each known verb", () => {
    expect(activityPhrase("searched", "carrot cake")).toBe(
      "searched carrot cake",
    );
    expect(activityPhrase("bookmarked", "Green Detox")).toBe(
      "added Green Detox to favorites",
    );
    expect(activityPhrase("liked", "Green Detox")).toBe("liked Green Detox");
    expect(activityPhrase("viewed", "Green Detox")).toBe("viewed Green Detox");
  });

  it("falls back to the raw verb so a new activity type never renders blank", () => {
    expect(activityPhrase("shared", "Green Detox")).toBe("shared Green Detox");
  });

  it("does not leave a trailing space when the target is missing", () => {
    expect(activityPhrase("shared", "")).toBe("shared");
  });
});

function item(over: Partial<ActivityItem>): ActivityItem {
  return {
    id: "1",
    action: "viewed",
    created_at: "2026-07-27T00:00:00.000Z",
    label: null,
    recipe: null,
    ...over,
  };
}

describe("activityTarget", () => {
  it("prefers the recipe title", () => {
    expect(
      activityTarget(
        item({
          recipe: { id: "r1", title: "Green Detox", image_url: null },
          label: "ignored",
        }),
      ),
    ).toBe("Green Detox");
  });

  it("uses the label for rows with no recipe, like searches", () => {
    expect(activityTarget(item({ action: "searched", label: "carrot cake" }))).toBe(
      "carrot cake",
    );
  });

  it("is empty when there is neither", () => {
    expect(activityTarget(item({}))).toBe("");
  });
});
