// Shared types only; no server-only, since the client admin form imports this.
export interface HomePromo {
  body: string;
  recipeId: string | null;
  updatedAt: string | null;
}

export const MAX_PROMO_BODY = 220;
