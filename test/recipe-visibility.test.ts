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
      showBioactivitySupports: true,
    });
  });

  it("hides everything on a freshly generated recipe", () => {
    expect(recipeChrome({ status: "pending", imageUrl: null })).toEqual({
      showHeroImage: false,
      showShareAndSave: false,
      showBioactivity: false,
      showBioactivitySupports: false,
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

// The "This recipe supports" list is the fallback for anyone the personalized
// match can't serve, so it yields to a real match percentage — and, since
// bioactivities are public recipe information, it ignores authentication.
describe("recipeChrome — bioactivity supports fallback", () => {
  const approved = { status: "approved", imageUrl: "https://x/i.webp" };

  it("shows on an approved recipe with no match score", () => {
    expect(
      recipeChrome({ ...approved, hasMatchScore: false })
        .showBioactivitySupports,
    ).toBe(true);
  });

  it("shows when hasMatchScore is omitted entirely (guests, no profile)", () => {
    expect(recipeChrome(approved).showBioactivitySupports).toBe(true);
  });

  it("hides once a real match score resolved", () => {
    expect(
      recipeChrome({ ...approved, hasMatchScore: true }).showBioactivitySupports,
    ).toBe(false);
  });

  it("hides on an LLM-generated recipe even without a match score", () => {
    expect(
      recipeChrome({ status: "pending", imageUrl: null, hasMatchScore: false })
        .showBioactivitySupports,
    ).toBe(false);
  });

  it("leaves the insights-card gate keyed on approval alone", () => {
    // showBioactivity still drives the Recipe insights fallback branch, which
    // renders alongside the supports list — a match score must not hide it.
    const c = recipeChrome({ ...approved, hasMatchScore: true });
    expect(c.showBioactivity).toBe(true);
    expect(c.showBioactivitySupports).toBe(false);
  });
});
