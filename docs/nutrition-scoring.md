# Nutrition Scoring — current system (July 2026)

> The previous LLM-scored 0–100 system this doc used to describe is retired and
> archived under `archive/old-scoring/` (do not run it — see that folder's README).
> This page describes the deterministic replacement.

## Pipeline (no LLM in the score math)

```
USDA FoodData Central (per ingredient, cached forever in `ingredients`)
  └─ lib/usda/resolve.ts      parse label → grams → nutrients + NOVA/FVL/sweetener flags
      └─ lib/usda/rollup.ts   per-recipe totals, per-100g/ml, FVL%, water %, IngredientScore
          └─ lib/scoring/base-nutrition.ts   Nutri-Score points → A–E grade → 1–10
              └─ lib/scoring/match-score.ts  per-user Recipe Match % (computed inline)
```

- **Base Nutrition Score (1–10)** — real Nutri-Score thresholds (energy kJ,
  sugar, sat-fat, salt vs protein, fiber, FVL%), Solid Food vs Beverage tracks
  (`lib/scoring/track.ts`), the Beverage Juiced/Blended sugar exemption, the
  Solid-Food N≥11 protein exclusion, grade→score midpoints (A 9.5 … E 1.5),
  blended 70/30 with the NOVA-weighted IngredientScore. Stored on `recipes`:
  `final_score_10`, `bns_grade`, `nutrition_score_10`, `ingredient_score_10`,
  the PRD point fields (`sugar_points`, `salt_points`, `sat_fat_points`,
  `energy_points`, `fiber_points`, `protein_points`, `fvl_points`), and the
  scorer input blob `nutrition_scoring`. Golden tests pin the PRD worked
  examples (5.9, 6.6): `test/base-nutrition.test.ts`.
- **Recipe Match Score (%)** — deterministic credits for the user's disclosed
  conditions + selected goals over the 23 bioactivities (`recipe_tags`) and the
  stored nutrient points (`lib/scoring/match-metrics.ts`). Computed fresh on
  every recipe-page render — never cached, so re-scores show instantly. Golden
  test (PRD example, ≈46.5%): `test/match-score.test.ts`. Safety alerts
  (allergy/medication) are the only cached piece
  (`app/api/recipes/[id]/personalize/route.ts` → `recipe_personalized_scores`).
- **Bioactivities** — still LLM-scored (`scripts/score-supports.mjs`, stored in
  `recipe_tags`). The only other LLM use is the one-time-per-ingredient
  classification fallback in `lib/usda/resolve.ts` when the free heuristic tier
  can't classify (`test/usda-classify.test.ts`).

## How recipes get scored
- **Catalogue (batch):** `npm run usda:build` — idempotent; resolved ingredients
  are cached in the `ingredients` table and never re-fetched.
- **Freshly generated recipes:** scored lazily on the owner's first view via
  `/api/recipes/[id]/score` → `lib/scoring/nutrition-deterministic.ts`, which
  resolves USDA ingredients on demand.
- Unparseable/unmatched ingredients are flagged `needs_review` and excluded from
  the roll-up until curated.

## Display contract
- `NutritionScore` card: base = `final_score_10` (rendered “x/10”), “Your match”
  = the inline Match % (rendered “x%”).
- `DetoxCard` (non-subscriber): `final_score_10 × 10` as a % ring.

## PRDs
- *Nuko — Base Nutrition Score Formula (Updated)*
- *Nuko — Recipe Match Score*
- *Nuko — USDA Nutrient Data Integration*
