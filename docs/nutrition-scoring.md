# Nutrition Scoring — Base & Personalized

How Nuko computes a recipe's **Base Nutrition Score** (identical for everyone) and each user's
**Personalized Nutrition Score** (base, re-weighted by their health profile), which parts match the
PRD exactly, and where the implementation deviates.

PRDs referenced:
- **Base Nutrition Score v2** (two-track Beverage/Solid Food) — the source of the base formula.
- **User Health Profile & Personalized Nutrition Score** — the source of the Modifier Table, the
  two-score display, and the safety rules.

## Where it lives
| Concern | File |
| --- | --- |
| Base scorer (LLM classify + code math), shared compute | [lib/scoring/nutrition.ts](../lib/scoring/nutrition.ts) |
| Batch base scorer (catalogue) | [scripts/score-nutrition.mjs](../scripts/score-nutrition.mjs) |
| Modifier Table (conditions/goals → factor multipliers) | [lib/health-profile/nutrition-modifiers.ts](../lib/health-profile/nutrition-modifiers.ts) |
| Lazy per-recipe scoring + points backfill | [app/api/recipes/[id]/score/route.ts](../app/api/recipes/[id]/score/route.ts) |
| Persist scores + per-factor points | [lib/scoring/persist.ts](../lib/scoring/persist.ts) |
| Personalized score + safety (deterministic, no LLM) | [app/api/recipes/[id]/personalize/route.ts](../app/api/recipes/[id]/personalize/route.ts) |
| Two-score display + disclaimer | [components/recipe/NutritionScore.tsx](../components/recipe/NutritionScore.tsx) |

Stored on `recipes`: `track`, `preparation`, `nutrition_score`, `ingredient_score`, `final_score`,
`nutrition_rating`, and the per-factor points `nutrition_positive_total`, `nutrition_added_sugar_points`,
`nutrition_sat_fat_points`, `nutrition_sodium_points`, `nutrition_fiber_points`, `nutrition_protein_points`.

---

## 1. Base Nutrition Score

Computed once per recipe, identical for every user. The **LLM classifies** (Track/Preparation + point
awards + IngredientScore); the **score arithmetic is done in code** for reliability.

### Step 0 — Track & Preparation
Keyword rules on the recipe name (`shake/smoothie/juice/tea/…` → Beverage), a Solid-Food exception override
(`bowl/oats/parfait/pudding/bar/…` wins), else a consumption-method fallback. Beverages are further
classified **Juiced** vs **Blended** from the *prep steps* (default Juiced if ambiguous).

### Step 1 — Per-100 conversion
`per100 = (amount per serving ÷ serving weight) × 100` for fiber, protein, added sugar, saturated fat,
sodium. Whole-food % and micronutrient count are per-serving. Water/ice excluded from weight.

### Step 2 — Points (two tracks)
**Solid Food** — Positive (max 14): Fiber 0–4, Protein 0–4, Whole-food % 0–3, Micronutrients ≥10% DV 0–3.
Negative (max 10): Added sugar 0–4, Sat fat 0–3, Sodium 0–3.
**Beverage** — Positive (max 12): Fiber 0–3, Protein 0–3, Fruit/Veg/Legume % 0–6. Negative (max 12):
Added sugar 0–6, Sat fat 0–3, Sodium 0–3. **Added-sugar rule by prep**: *Blended* exempts intrinsic
whole-fruit sugar (only added sweeteners count); *Juiced* counts all sugar.

### Step 3 — IngredientScore
Every ingredient (except water/ice) → a processing tier (Tier 1 = 100, Tier 2 = 75, Tier 3 = 50, Tier 4 =
25). `IngredientScore = Σ(weight × tier) ÷ Σ(weight)`.

### Final math (in code — `computeNutritionScore` / `computeNutritionFinal`)
```
negativeTotal = addedSugarPoints + satFatPoints + sodiumPoints      # derived in code, not trusted from LLM
composite     = positiveTotal − negativeTotal
offset        = 10 (Solid Food) | 12 (Beverage)
NutritionScore = clamp( ((composite + offset) / 24) × 100 )          # → 0–100
# Substance floor (Solid Food only): fiberPoints==0 AND proteinPoints==0 → NutritionScore = min(NutritionScore, 35)
FinalScore    = clamp( 0.7 × NutritionScore + 0.3 × IngredientScore ) # the headline base %
Rating: ≥70 Excellent · ≥50 Good · ≥30 Fair · else Needs Improvement
```

---

## 2. Personalized Nutrition Score

Shown beside the base score for a subscriber with a saved health profile. Computed **on demand**, cached per
(user, recipe), and regenerated only when the profile's `updated_at` is newer than the cached score.
**Fully deterministic — no LLM.**

### The key invariant (and how it's guaranteed)
The personalized score re-weights the **same stored base per-factor points** — it does **not** re-classify
the recipe. Because every multiplier is ≥ 1, negatives can only grow, so:
- **Personalized ≤ Base always.**
- **Personalized = Base exactly** when no disclosed condition/goal maps to a factor.

### Modifier Table ([nutrition-modifiers.ts](../lib/health-profile/nutrition-modifiers.ts))
| Condition / Goal | Factor | Multiplier |
| --- | --- | --- |
| Type 1 / Type 2 Diabetes, Prediabetes, PCOS | Added sugar | ×2 |
| High cholesterol | Saturated fat | ×2 |
| High blood pressure, Kidney disease | Sodium | ×2 |
| Heart disease | Sodium **and** Saturated fat | ×2 each |
| Liver disease | Added sugar **and** Saturated fat | ×2 each |
| Weight-loss goal | Calorie density | ×1.5 **(no-op — see deviations)** |

`computeMultipliers` takes the **highest** multiplier per factor across all disclosures (`Math.max`, never
stacked). Positive factors and IngredientScore are never modified.

### Final math
```
newNegative   = addedSugarPoints·mSugar + satFatPoints·mFat + sodiumPoints·mSodium
                # Beverage Juiced/Blended sugar rule already baked into the stored addedSugarPoints
composite     = positiveTotal − newNegative
Personalized NutritionScore = clamp(((composite + offset)/24)×100), same substance floor
FinalPersonalizedScore = clamp(0.7 × PersonalizedNutritionScore + 0.3 × IngredientScore)
```
Base shown = the recipe's stored `final_score`; when no modifier applies the two are equal by construction.

### Safety is a separate system (never touches the score)
- **Allergy / Celiac** — deterministic keyword match ([lib/interactions/allergens.ts](../lib/interactions/allergens.ts)); celiac ⇒ gluten.
- **Medication** — deterministic ingredient→mechanism→drug-class match via RxClass
  ([lib/interactions/*](../lib/interactions/)); alerts name the drug(s).
- Both render as a "safety alerts" banner and never adjust either score.

### Display ([NutritionScore.tsx](../components/recipe/NutritionScore.tsx))
Two columns — **Base "Same for everyone"** and **Personalized "Adjusted for your preferences"** — plus the
required disclaimer: *"Personalized based on your preferences — not a substitute for guidance from your
doctor or dietitian."*

---

## 3. PRD compliance — exact matches

**Base (v2 PRD):**
- ✅ Two-track (Beverage/Solid Food) point tables, thresholds, and offsets (10/12, ÷24).
- ✅ Beverage Juiced/Blended added-sugar exemption.
- ✅ Substance floor (Solid, no fiber & no protein → cap 35).
- ✅ `Final = 0.7·NutritionScore + 0.3·IngredientScore`; rating bands 70/50/30.
- ✅ Score math in code; only classification is model-driven.

**Personalized (Health-Profile PRD §5):**
- ✅ Modifier Table reproduced **exactly** (factors + ×2 / ×1.5).
- ✅ Highest multiplier per factor, **never stacked**.
- ✅ Only **negative** factors re-weighted; positives/IngredientScore untouched.
- ✅ `PersonalizedNutritionScore = ((composite + [10|12]) ÷ 24) × 100`, `Final = 0.7·PNS + 0.3·IngredientScore`.
- ✅ **Personalized = Base when no modifier**, and (stronger than the PRD spells out) **Personalized ≤ Base always**.
- ✅ Two scores side by side; base never overwritten.
- ✅ Never names the diagnosed condition next to the score ("adjusted for your preferences").
- ✅ Required disclaimer shown wherever the personalized score appears.
- ✅ Safety (allergies/medications/celiac) kept functionally separate — never a score adjustment.
- ✅ Non-modifier conditions (thyroid, menopause, IBS, IBD, gout, GERD, osteoporosis, anemia) do **not** touch the score.
- ✅ Celiac handled as a safety warning, not a score modifier.

---

## 4. Deviations from the PRD (intentional, with rationale)

1. **Weight-loss goal is a no-op on the score.** The base score has no "calorie density" negative factor, so
   the PRD's `Calorie density ×1.5 (if tracked)` does nothing — a weight-loss goal alone leaves personalized
   = base. Faithful to the PRD's "if tracked" caveat (we don't track it). Kept in the table for documentation.

2. **Allergy on the recipe detail page is a non-blocking WARNING, not an EXCLUSION.** The PRD prompt (Step
   1.1) says an allergy match EXCLUDES the recipe (hide, no score). Per the approved mockups, the detail page
   the user navigated to shows the recipe + both scores with a warning banner. (Hard exclusion is intended
   for search/recommendation lists, not this page.)

3. **PRD Step 3 not implemented** — condition-specific bioactivity surfacing + informational ingredient flags
   (goitrogen/FODMAP/purine/etc. for thyroid, IBS, gout, GERD…). The "This recipe supports" card is the
   generic top-5 bioactivity, not condition-tailored. Deferred; non-modifier conditions currently have no
   personalized effect.

4. **Medication interactions use a deterministic RxClass mechanism system**, not the PRD's assumed
   "existing safety flag data." Ingredients are tagged with a mechanism bucket and matched against each
   drug's own EPC/PE/ATC classes from RxClass (plus a curated CYP3A4-substrate list). This is an enhancement
   over the PRD's stated mechanism, and more auditable.

5. **Safety + the personalized score are deterministic code, not the PRD's single LLM prompt.** The PRD
   appendix supplies one prompt that outputs everything (status, scores, alerts, flags). We implemented the
   score and all safety matching in code (the model is used **only** to classify the recipe's base points),
   for reliability and zero per-view model cost. The numeric spec is matched; the delivery mechanism differs.

6. **Base score is richer than this PRD's illustrative example.** The Personalized PRD's worked example uses
   a simplified `Base = positive − negative` (e.g. 7−3=4 → Fair). The real base is the Base-Nutrition-Score-v2
   formula (offset/÷24 normalization, IngredientScore 30%, substance floor, 0–100). Not a contradiction — the
   v2 formula is the actual base spec; the Personalized PRD's example is a simplified stand-in.

7. **Gating:** the two-score view shows for a subscriber **with a saved profile** (always two columns, even
   when equal). The PRD phrases it as "every user who completed Section 2.3 (Existing Conditions)." Broader,
   and aligned with the approved "always two columns" decision.

---

## 5. Rollout note
Adding per-factor point storage requires a one-time backfill: run `score-nutrition.mjs --force` (recomputes
`final_score` from the stored points so `base == computeNutritionFinal(points, identity)` holds). New/
generated recipes populate via the lazy score endpoint; a recipe missing its points shows base-only until
backfilled. This change also removed the last LLM call from the personalized path.
