export const RECIPE_IMAGE_GENERATION_ENABLED = false;

export interface RecipeChrome {
  showHeroImage: boolean;
  showShareAndSave: boolean;
  showBioactivity: boolean;
  showBioactivitySupports: boolean;
}

/** Decides which hero, share and save chrome a recipe renders. */
export function recipeChrome(input: {
  status: string | null;
  imageUrl: string | null;
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
