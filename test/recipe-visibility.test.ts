import { describe, it, expect } from "vitest";
import {
  recipeChrome,
  RECIPE_IMAGE_GENERATION_ENABLED,
} from "@/lib/recipe-visibility";

// Generated recipes land `status: "pending"` with no image. They must not wear the
// chrome of a reviewed catalogue recipe — on first view or any revisit. The hero
// keys off the IMAGE (so recipes generated before the suspension keep theirs);
// share/save and bioactivity key off APPROVAL.

describe("recipeChrome", () => {
  it("gives an approved recipe with an image everything", () => {
    expect(recipeChrome({ status: "approved", imageUrl: "https://x/i.webp" })).toEqual({
      showHeroImage: true,
      showShareAndSave: true,
      showBioactivity: true,
    });
  });

  it("hides everything on a freshly generated recipe", () => {
    expect(recipeChrome({ status: "pending", imageUrl: null })).toEqual({
      showHeroImage: false,
      showShareAndSave: false,
      showBioactivity: false,
    });
  });

  it("keeps the image on a pending recipe that already has one", () => {
    // The 12 rows generated before the suspension aren't retroactively blanked.
    const c = recipeChrome({ status: "pending", imageUrl: "https://x/old.webp" });
    expect(c.showHeroImage).toBe(true);
    expect(c.showShareAndSave).toBe(false);
    expect(c.showBioactivity).toBe(false);
  });

  it("does not invent a hero for an approved recipe with no image", () => {
    const c = recipeChrome({ status: "approved", imageUrl: null });
    expect(c.showHeroImage).toBe(false);
    expect(c.showShareAndSave).toBe(true);
    expect(c.showBioactivity).toBe(true);
  });

  it("treats an unknown or missing status as unapproved", () => {
    for (const status of [null, "", "draft", "rejected"]) {
      const c = recipeChrome({ status, imageUrl: null });
      expect(c.showShareAndSave).toBe(false);
      expect(c.showBioactivity).toBe(false);
    }
  });

  it("has image generation suspended", () => {
    expect(RECIPE_IMAGE_GENERATION_ENABLED).toBe(false);
  });
});
