// lib/recipe-visibility.ts — what chrome a recipe is allowed to render.
//
// LLM-generated recipes are inserted `status: "pending"` with no image and no
// admin review. Until an admin approves one (and uploads an image through the
// admin recipe form) it must not carry the trappings of a vetted catalogue
// recipe — on first view OR any later revisit.

/**
 * Recipe hero-image generation (Gemini, via POST /api/recipes/[id]/image) is
 * SUSPENDED. Flip this back to `true` to reinstate it; nothing else needs to
 * change. Enforced both client-side (RecipeHeroImage skips the request) and in
 * the route itself, so no spend is possible while it's off.
 */
export const RECIPE_IMAGE_GENERATION_ENABLED = false;

export interface RecipeChrome {
  showHeroImage: boolean;
  showShareAndSave: boolean;
  showBioactivity: boolean;
  showBioactivitySupports: boolean;
}

/**
 * Note the hero image keys off the IMAGE, not the status: recipes generated
 * before the suspension keep the image they already have, while newly generated
 * ones hold `image_url = null` forever unless an admin uploads one — so they show
 * no image anywhere, without retroactively blanking existing content.
 *
 * Share/save and the score cards key off APPROVAL: sharing an unvetted recipe
 * publishes it, and its bioactivity tags are unverified until review. The
 * nutrition score is deliberately not gated here — it comes from the recipe's own
 * nutrition figures rather than from tags.
 *
 * `showBioactivitySupports` gates the "This recipe supports" list, which is the
 * fallback for anyone the personalized match can't serve. It additionally hides
 * once a real match score exists — that user gets the percentage instead, and two
 * readings of the same tags side by side is noise. Note it is NOT gated on
 * authentication: bioactivities are public recipe information, so guests see the
 * same list.
 */
export function recipeChrome(input: {
  status: string | null;
  imageUrl: string | null;
  /** True when the Recipe insights card is showing a real match percentage. */
  hasMatchScore?: boolean;
}): RecipeChrome {
  const approved = input.status === "approved";
  return {
    showHeroImage: !!input.imageUrl,
    showShareAndSave: approved,
    showBioactivity: approved,
    showBioactivitySupports: approved && !input.hasMatchScore,
  };
}
