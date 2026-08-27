/**
 * The homepage promo card's content.
 *
 * Shared shape between the reader (homepage), the writer (admin action), and
 * the form. Deliberately free of `server-only` and of any I/O — the admin form
 * is a client component and imports MAX_PROMO_BODY from here; pulling in the
 * server reader would break the build.
 *
 * The reader lives in lib/home-promo-server.ts.
 */
export interface HomePromo {
  body: string;
  recipeId: string | null;
  updatedAt: string | null;
}

/**
 * Roughly two lines in the card at its design width. Long enough for the copy
 * that was previously hardcoded, short enough that the layout cannot be broken
 * from the admin form.
 */
export const MAX_PROMO_BODY = 220;
