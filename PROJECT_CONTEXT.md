# Nutrition Calculator — Project Context

A bilingual (English / Urdu) web app that builds **least-cost livestock feed formulas** for Pakistani farms — dairy cows, buffaloes, heifers, fattening bulls, dairy goats, and fattening goats. Real Linear Programming finds the cheapest mix that meets NRC-grade nutrient targets.

The app ships **two independent calculators**:

| Route | Module | What it formulates |
|---|---|---|
| `/` | [components/nutrition-calculator/](components/nutrition-calculator/) | **Concentrate mix** — fed alongside forage the farmer already has |
| `/tmr` | [components/tmr-calculator/](components/tmr-calculator/) | **Total Mixed Ration** — forage + concentrate as one combined diet, with a hard forage:concentrate DM-split constraint |

> **This document is the project's source of truth.** Paste it into any new chat and the assistant should understand the full app. No conversation history needed.

---

## 1. What it does

### Concentrate calculator (`/`) — 5-step wizard

| Step | Screen | Purpose |
|---|---|---|
| 1 | [Step1Animal.tsx](components/nutrition-calculator/Step1Animal.tsx) | Pick animal (6 species) + stage. Shows target nutrient ranges live. Quick-Start template gallery appears above the grid until an animal is picked. |
| 2 | [Step2Ingredients.tsx](components/nutrition-calculator/Step2Ingredients.tsx) | Multi-select across 5 categories (Energy, Protein, Bran & Fiber, Fats & Oils, Supplements & Minerals). **Runs a live LP feasibility check on every toggle** and renders a bilingual "what's off / quick fix" guide. `+ Add Ingredient` opens the custom-ingredient form. |
| 3 | [Step3Formula.tsx](components/nutrition-calculator/Step3Formula.tsx) | **The core editor.** Nutrient grid split into *targets* (7, with status) and *other values* (4, informational) plus an "N/7 on target" counter. 4 Auto-Formulate mode buttons; the active one is filled + check-badged and named in the panel text. Adjust kg/price per row, per-row lock + edit-nutrition pencil. Editable Total Weight + batch chips scale proportionally. |
| 4 | [Step4Status.tsx](components/nutrition-calculator/Step4Status.tsx) | Verdict pill ("All targets met" / "N/7 on target"), the **same** nutrient grid as Step 3, a "What to fix" list of **only** the off-target nutrients, and the Daily Feeding Guide. |
| 5 | [Step5Actions.tsx](components/nutrition-calculator/Step5Actions.tsx) | Slim "Formula ready" header, summary with batch / cost-per-kg / total / targets-met, then tiered actions: **Save** (primary, becomes a sticky "Saved"), a row of WhatsApp / Print-PDF / Text-file, and a separated reset. Fits one phone screen. |

Header icons: **Help** → [GlossaryModal.tsx](components/nutrition-calculator/GlossaryModal.tsx) (9 bilingual nutrient explainers), **TMR** → `/tmr`, **Bookmark** → [SavedFormulasModal.tsx](components/nutrition-calculator/SavedFormulasModal.tsx), **EN/UR** toggle. A first-run [OnboardingModal.tsx](components/nutrition-calculator/OnboardingModal.tsx) — one welcome screen with 4 feature cards — auto-shows once, gated on a localStorage flag.

**IMPORTANT — the concentrate calculator is NOT a TMR.**
- The mix is fed alongside fresh forage, hay, or silage.
- NDF targets are therefore LOW (12–35%) — forage supplies the rest of the fiber separately.
- CP / ME / Ca / P targets are HIGHER than whole-diet TMR values.
- For whole-diet formulation, use `/tmr` instead.

### TMR calculator (`/tmr`) — same 5-step shape

| Step | Screen | Purpose |
|---|---|---|
| 1 | [TmrStep1AnimalSplit.tsx](components/tmr-calculator/TmrStep1AnimalSplit.tsx) | Animal + stage **plus the DM-split slider** (forage % of DM, 0–100, step 5, with preset chips). Pre-fills from `getDefaultForagePct()`. Shows whole-diet target card. |
| 2 | [TmrStep2Ingredients.tsx](components/tmr-calculator/TmrStep2Ingredients.tsx) | Tabbed picker: **Forage** tab (Fresh Greens / Silages / Hay & Straw) and **Concentrate** tab (all 5 concentrate categories, via `CATEGORY_KEYS`). Live TMR-LP feasibility check per toggle. |
| 3 | [TmrStep3Formula.tsx](components/tmr-calculator/TmrStep3Formula.tsx) | Editor split into 🌿 Forages and ⚙️ Concentrates blocks. Live **achieved vs target DM split** readout (green when within 0.5 pp). Same 4 LP modes, locks, and weight scaling. |
| 4 | [TmrStep4Status.tsx](components/tmr-calculator/TmrStep4Status.tsx) | Whole-diet nutrient review + DM-split status + [TmrDailyFeedingGuide.tsx](components/tmr-calculator/TmrDailyFeedingGuide.tsx). |
| 5 | [TmrStep5Actions.tsx](components/tmr-calculator/TmrStep5Actions.tsx) | Save (separate store) / WhatsApp / text export / reset. No print sheet yet. |

The two calculators share `Stepper`, `LanguageSwitch`, `GlossaryModal`, and `IngredientDetailModal`, but keep **separate state, separate ranges, and separate localStorage keys**.

---

## 2. Tech stack

- **Next.js 16.1** (App Router) + **React 19.2**
- **TypeScript 5.7** — but note [next.config.mjs](next.config.mjs) sets `typescript.ignoreBuildErrors: true`, so `next build` does **not** gate on types. `npx tsc --noEmit` is the real check.
- **Tailwind CSS 4** + `tailwind-merge` / `clsx` / `class-variance-authority`
- **framer-motion 11** for all animations
- **lucide-react** for icons, **sonner** for toasts
- **javascript-lp-solver 1.0** — the LP engine behind both Auto-Formulate implementations
- **localStorage** for all persistence — no backend, no database, entirely client-side
- `@vercel/analytics` in the root layout

---

## 3. Directory map

```
d:/test/nutrition-calc/
├── app/
│   ├── layout.tsx              root layout (metadata, icons, Toaster, Analytics)
│   ├── globals.css             the live stylesheet — includes the @media print rules
│   ├── page.tsx                → <NutritionCalculator />
│   └── tmr/page.tsx            → <TmrCalculator />
├── components/
│   ├── nutrition-calculator/   concentrate calculator
│   │   ├── NutritionCalculator.tsx        orchestrator, 5-step wizard state
│   │   ├── Stepper.tsx                     5-step progress indicator (shared with TMR)
│   │   ├── LanguageSwitch.tsx              EN / UR toggle (shared)
│   │   ├── Step1Animal.tsx … Step5Actions.tsx
│   │   ├── QuickStartTemplates.tsx         template gallery shown on Step 1
│   │   ├── AddIngredientModal.tsx          create a custom ingredient (validated form)
│   │   ├── IngredientDetailModal.tsx       (i) modal — composition, cap reason, edit nutrition
│   │   ├── IngredientNutritionEditor.tsx   12-field editor (compact + modal variants)
│   │   ├── IngredientTooltip.tsx           hover tooltip on ingredient cards
│   │   ├── SavedFormulasModal.tsx          saved concentrate formulas: load / delete
│   │   ├── NutritionConflictModal.tsx      saved-vs-current nutrition mismatch resolver
│   │   ├── NutrientGrid.tsx               SHARED nutrient cards + grid (Steps 3 & 4)
│   │   ├── WhyThisFormula.tsx              post-solve LP diagnostics card
│   │   ├── DailyFeedingGuide.tsx           daily concentrate intake (Step 4)
│   │   ├── PrintableRecipe.tsx             print-only recipe sheet (screen-hidden)
│   │   ├── OnboardingModal.tsx             first-run welcome screen (4 feature cards)
│   │   ├── GlossaryModal.tsx               9 bilingual nutrient explainers
│   │   ├── Header.tsx                      ⚠️ UNUSED — headers are inline in the orchestrators
│   │   ├── ProgressIndicator.tsx           ⚠️ UNUSED
│   │   └── Step2IngredientsPro.tsx         ⚠️ UNUSED experimental variant — ignore
│   ├── tmr-calculator/         TMR calculator (mirrors the above)
│   │   ├── TmrCalculator.tsx               orchestrator
│   │   ├── TmrStep1AnimalSplit.tsx … TmrStep5Actions.tsx
│   │   ├── TmrDailyFeedingGuide.tsx        daily whole-diet intake (DMI-driven)
│   │   └── TmrSavedFormulasModal.tsx       saved TMR formulas
│   ├── ui/                     shadcn/ui primitives
│   └── theme-provider.tsx      ⚠️ UNUSED (no dark mode wired up)
├── hooks/                      ⚠️ UNUSED (use-mobile, use-toast)
├── lib/
│   ├── constants.ts            INGREDIENTS[], NUTRITION_RANGES, STAGES, ANIMALS, getIngredient()
│   ├── calculations.ts         calculateNutrients(), buildFormula(), FormulaItem
│   ├── autoFormulate.ts        concentrate LP + diagnostics
│   ├── customIngredients.ts    user-added ingredients (localStorage)
│   ├── ingredientOverrides.ts  per-field nutrition overrides (localStorage)
│   ├── savedFormulas.ts        saved concentrate formulas (localStorage)
│   ├── templates.ts            9 curated Quick-Start recipes
│   ├── feedingGuide.ts         daily CONCENTRATE allowance rules
│   ├── forages.ts              12 forages + getAnyIngredient() unified lookup
│   ├── tmrRanges.ts            whole-diet targets + DEFAULT_FORAGE_PCT
│   ├── tmrCalculations.ts      TMR DM-basis math + forage/concentrate DM shares
│   ├── tmrFormulate.ts         TMR LP (adds the DM-split equality constraint)
│   ├── tmrSavedFormulas.ts     saved TMR formulas (localStorage)
│   └── utils.ts                cn() helper
├── scripts/                    6 standalone verification scripts (see §10)
├── styles/globals.css          ⚠️ ORPHAN — nothing imports it; edit app/globals.css instead
└── public/animals/             animal card background images
```

### localStorage keys (all five)

| Key | Owner | Contents |
|---|---|---|
| `saved_formulas` | [savedFormulas.ts](lib/savedFormulas.ts) | saved concentrate formulas |
| `saved_tmr_formulas` | [tmrSavedFormulas.ts](lib/tmrSavedFormulas.ts) | saved TMR formulas |
| `ingredient_overrides` | [ingredientOverrides.ts](lib/ingredientOverrides.ts) | sparse per-field nutrition edits |
| `custom_ingredients` | [customIngredients.ts](lib/customIngredients.ts) | user-created ingredients |
| `has_seen_onboarding_v1` | [OnboardingModal.tsx](components/nutrition-calculator/OnboardingModal.tsx) | first-run flag |

---

## 4. Core data models

### Ingredient — [lib/constants.ts](lib/constants.ts)

```ts
interface Ingredient {
  key: string;                    // 'corn', 'sbm', ...
  category: 'energy' | 'protein' | 'fiber' | 'fat' | 'supplement';
  icon: string;                   // emoji
  nameEn: string; nameUr: string;
  energyLevel: 'high' | 'med' | 'low';
  proteinLevel: 'high' | 'med' | 'low';
  // Composition — ALL on DM basis except dm itself
  dm: number;      // % of as-fed that is dry matter
  cp: number;      // % Crude Protein (DM)
  me: number;      // Mcal ME / kg DM
  tdn: number;     // % Total Digestible Nutrients (DM)
  adf: number;     // % (DM)
  ndf: number;     // % (DM)
  fat: number;     // % (DM)
  starch: number;  // % (DM)
  ca: number;      // % (DM)
  p: number;       // % (DM)
  ash: number;     // % (DM)
  price: number;   // Rs per kg as-fed
  maxInclusion: number;  // % cap used by both LP solvers (science-based)
  capReasonEn: string;   // Why the cap exists — shown in detail modal
  capReasonUr: string;
  notesEn?: string; notesUr?: string;
}
```

**40 built-in concentrate ingredients**: 9 energy, 15 protein, 4 bran/fiber, **8 fats & oils**, 4 supplements. Adding one: append to `INGREDIENTS` — category lists, icon lookups, and LP constraints are all auto-derived.

### The five categories

`fat` and `supplement` used to be a single `fat` bucket that mixed bypass fat in with limestone, DCP, salt and soda. They are now separate, so "fat" means fat:

| Category | `min` | Contents |
|---|---|---|
| `energy` | 1 | grains, cereals, energy by-products |
| `protein` | 1 | oilcakes, meals, urea (NPN) |
| `fiber` | 0 | brans and husks (concentrate-level fibre, not roughage) |
| `fat` | 0 | 2 bypass fats + 6 free vegetable oils |
| `supplement` | 0 | limestone, DCP, salt, sodium bicarbonate |

**Ingredient keys were deliberately not renamed during that split** — `limestone`, `salt`, `dcp`, `sodium_bicarb`, and `bypassFat` all keep their original keys, so saved formulas and templates keep resolving. Old saves that filed minerals under `fat` are re-bucketed on load by `migrateChosenIngredients()` in [savedFormulas.ts](lib/savedFormulas.ts).

Two helpers keep category logic in one place — use them instead of hardcoding the list:

```ts
CATEGORY_KEYS                   // readonly ['energy','protein','fiber','fat','supplement']
emptyChosenIngredients()        // a fresh map with every bucket present
categoryOfIngredient(key)       // current category, resolving customs too
```

### Fats & oils — the split that matters

Within `fat` there are two families, and the practical difference is large:

| Family | Members | Cap | Why |
|---|---|---|---|
| **Bypass (rumen-protected)** | `bypassFat` (99% prilled), `bypass_fat_85` (Ca soap) | 5–6% | Inert in the rumen; limit is the diet's 6–7% total-fat ceiling. The 85% grade also carries ~9% Ca, which the LP counts toward calcium. |
| **Free vegetable oils** | `mustard_oil`, `sesame_oil`, `taramira_oil`, `linseed_oil`, `rice_bran_oil`, `canola_oil` | 2–2.5% | Unprotected oil coats fibre and kills cellulolytic bacteria, so fibre digestion and milk fat collapse *well before* the total-fat ceiling. Pungent oils (mustard, taramira) additionally suppress intake; linseed is worst for the rumen (~55% PUFA) and oxidises fastest. |

Energy values are scaled from the long-standing `bypassFat` anchor (99% fat → ME 4.78, TDN 180) so the category stays internally consistent: `ME ≈ 4.78 × fat%/99`.

`rice_bran_oil` is the best default free oil — bland (no intake penalty), cheapest, and abundant from Pakistani rice mills. Note that several ingredients in *other* categories are also major fat sources: whole cottonseed (20%), rice bran (14%), rice polish (13%), sesame cake (10%) — usually cheaper per unit of fat than pure oil.

Note `urea` is modelled with the standard NPN convention (`cp: 287` = 46% N × 6.25) and a strict `maxInclusion: 1.5`. That cap is a **safety control**, not a preference — read its `capReasonEn` before touching it.

### Forage — [lib/forages.ts](lib/forages.ts) (TMR only)

```ts
interface Forage extends Omit<Ingredient, 'category'> {
  category: 'forage';
  subcategory: 'fresh' | 'silage' | 'dry';   // drives the TMR picker tab
}
```

**12 forages**: 6 fresh greens (berseem, alfalfa, maize, jowar, oats, bajra), 2 silages (maize, jowar), 4 dry (alfalfa hay, berseem hay, wheat straw, rice straw). Same numeric shape as `Ingredient`, so the DM math and LP consume both with no special-casing. Forages are **never** shown in the concentrate calculator.

`AnyIngredient` widens `category` to include `'forage'` so a single typed list can carry both.

### Nutrition Range — [lib/constants.ts](lib/constants.ts)

```ts
interface NutrientRange {
  protein:    { min, max };  // % CP (DM)
  energy:     { min, max };  // Mcal ME / kg DM
  tdn:        { min, max };  // % (DM)
  fiber:      { min, max };  // % NDF (DM)
  fat:        { min, max };  // % (DM)
  calcium:    { min, max };  // % (DM)
  phosphorus: { min, max };  // % (DM)
}
```

Two parallel tables, both keyed by animal id and indexed by stage:
- `NUTRITION_RANGES` in [constants.ts](lib/constants.ts) — **concentrate-only** targets
- `TMR_NUTRITION_RANGES` in [tmrRanges.ts](lib/tmrRanges.ts) — **whole-diet** targets (lower CP/ME/TDN/Ca/P, much higher NDF)

**Animals**: `dairy_cow`, `dairy_buffalo`, `heifer`, `fattening_bull`, `dairy_goat`, `fattening_goat` — 22 stage rows total in each table.

### FormulaItem / TmrFormulaItem

```ts
interface FormulaItem {          // lib/calculations.ts
  name: string;
  key: string;
  kg: number;              // as-fed quantity
  price?: number;          // per-formula price override
  quality?: 'excellent' | 'average' | 'poor';
  locked?: boolean;        // Auto-Formulate keeps kg fixed
}

interface TmrFormulaItem {      // lib/tmrCalculations.ts — same minus `quality`
  name: string; key: string; kg: number; price?: number; locked?: boolean;
}
```

### SavedFormula / SavedTmrFormula

`SavedFormula` ([savedFormulas.ts](lib/savedFormulas.ts)) carries `animalId`, `stageIndex`, `chosenIngredients`, `formula`, pre-computed `totals`, and an `ingredientOverrides` snapshot for conflict detection on load. `normalise()` back-fills old schemas (reverse-lookup of `animalId` from a display label, reconstruction of `chosenIngredients` from formula keys).

`SavedTmrFormula` ([tmrSavedFormulas.ts](lib/tmrSavedFormulas.ts)) adds `forageDmPct`, `selectedForages`, `selectedConcentrates`, and `totals.forageDmPct` (achieved). It has no `normalise()` — the store is newer, so there's no legacy schema to migrate.

### IngredientOverride — [lib/ingredientOverrides.ts](lib/ingredientOverrides.ts)

Sparse per-field overrides (only fields differing from default are stored), with an in-memory cache invalidated on write:

```ts
type IngredientOverride = Partial<Pick<Ingredient,
  'dm'|'cp'|'me'|'tdn'|'adf'|'ndf'|'fat'|'starch'|'ca'|'p'|'ash'|'price'>>;
```

### Lookup functions — which to use

| Function | Returns | Use when |
|---|---|---|
| `getIngredient(key)` | built-in **or** custom, with overrides merged | **all concentrate production code** |
| `getAnyIngredient(key)` | forage first, then falls through to `getIngredient` | **all TMR production code** |
| `getDefaultIngredient(key)` | unmodified default (ignores overrides) | only the editor's reset-to-default comparison |
| `NUTRITION_DATA[key]` | raw hardcoded record | only inside `constants.ts` |

---

## 5. The calculation engine

### DM-basis math

`calculateNutrients()` in [calculations.ts](lib/calculations.ts) and `calculateTmrNutrients()` in [tmrCalculations.ts](lib/tmrCalculations.ts) are the same math — the only difference is the lookup function and the two extra DM-share fields the TMR version reports.

Everything is on **Dry Matter (DM) basis** — the international convention (NRC, INRA, Feedipedia). Per ingredient `i` with as-fed quantity `qtyᵢ`:

```
DM_kgᵢ          = qtyᵢ × (dmᵢ / 100)
Nutrient_kgᵢ    = DM_kgᵢ × (nutrientᵢ / 100)
Energy_Mcalᵢ    = DM_kgᵢ × meᵢ                // ME is already per-kg-DM
```

Totals:

```
Total DM (kg)        = SUM(DM_kgᵢ)
Total Nutrient % DM  = SUM(Nutrient_kgᵢ) / Total DM × 100
Total Energy Mcal/kg = SUM(Energy_Mcalᵢ) / Total DM
Per-kg Price         = SUM(qtyᵢ × priceᵢ) / SUM(qtyᵢ)   ← as-fed basis
```

**Verified by [scripts/verify-calculator.mjs](scripts/verify-calculator.mjs)** against the reference Google Sheet — all 15 values match exactly, plus a scale-invariance test proving percentages don't change when all quantities double.

`TmrNutrientCalculation` additionally reports `forageDmKg`, `concentrateDmKg`, `forageDmShare`, and `concentrateDmShare` (fractions of total DM).

### Step 2 → Step 3 handoff

`buildFormula(chosenIngredients)` / `buildTmrFormula(forages, concentrates)` evenly distribute 100 kg across the selected keys — called only when the formula is empty. Otherwise the orchestrator's `mergeFormulaWithSelection()` / `mergeTmrFormulaWithSelection()` keeps existing kg/price, drops deselected items, and appends new ones at `kg: 0`.

---

## 6. Auto-Formulate (the LP solvers)

### Concentrate LP — [lib/autoFormulate.ts](lib/autoFormulate.ts)

```
minimise / maximise   <objective>

subject to
  SUM(xᵢ) = batchSize                                       (total weight)
  SUM(xᵢ × dmᵢ × (nutrientᵢ − minₙ)) ≥ 0                   (meets min for nutrient n)
  SUM(xᵢ × dmᵢ × (nutrientᵢ − maxₙ)) ≤ 0                   (meets max for nutrient n)
  xᵢ ≤ (maxInclusionᵢ / 100) × batchSize                    (per-ingredient cap)
  xᵢ = lockedKgᵢ                                            (for each locked ingredient)
  xᵢ ≥ 0
```

Applied to all 7 nutrients: CP, ME, TDN, NDF, Fat, Ca, P. Linearising as `dmᵢ × (valᵢ − bound)` is what makes a ratio constraint linear.

### The 4 optimisation modes

`OptimisationMode = 'min_cost' | 'balanced' | 'max_protein' | 'max_energy'`. Constraints never change — only the objective:

| Mode | UI | Objective |
|---|---|---|
| `min_cost` | 💰 Cheapest | minimise `SUM(xᵢ × priceᵢ)` |
| `balanced` | 🎯 Balanced | get every nutrient as close to its range **midpoint** as it will go (see below) |
| `max_protein` | 🥩 Max Protein | maximise `SUM(xᵢ × dmᵢ × cpᵢ)` (kg CP) |
| `max_energy` | ⚡ Max Energy | maximise `SUM(xᵢ × dmᵢ × meᵢ)` (Mcal ME) |

### `balanced` is solved by range-tightening, NOT by slack variables

`balanced` is the only mode that isn't a single LP solve, and the reason is a hard-won one. **Do not "simplify" it back into the textbook form.**

The obvious formulation linearises each `|deviation|` with an auxiliary slack (`bal_abs_n ≥ |devₙ|`) and minimises their sum. That is what this code used to do. But `javascript-lp-solver` implements a naive simplex with **no anti-cycling rule** (no Bland's rule, no perturbation, no iteration cap), and the slack model is highly degenerate — many bases share the same objective value, which is exactly when such a solver can pivot in a loop forever. It did. Ordinary selections (a dairy-cow mix including Bypass Fat 85%; a TMR of dairy-cow late lactation plus sesame cake) made `solver.Solve` never return. Since this is synchronous main-thread JS and Step 3 runs `balanced` automatically on mount, that is a **frozen browser tab**, not a slow solve.

Rescaling the coefficients into `[-1, 1]` was tried and only *moved* the hang to a different animal/stage. The fix that holds is to never build the degenerate model:

```
tighten(range, t):  min_t = mid − (mid − min)(1 − t)
                    max_t = mid + (max − mid)(1 − t)
                    t = 0 → original range;  t = 1 → collapsed onto the midpoint
```

1. **Per-nutrient limits, measured independently.** For each of the 7 nutrients, bisect the largest `t` that still solves *with the other six left at their original ranges*.
2. **Compose, then back off.** Apply all 7 limits together; if they conflict, bisect a single scale factor over the whole vector until it solves.
3. Recompute diagnostics against the **original** ranges — `best` was solved against tightened ones, so its own diagnostics would report "binding" against bounds the user never set.

Every trial is an ordinary min/max model — the shape that has never been observed to cycle.

**Why step 1 measures nutrients independently** rather than using one uniform factor: some nutrients simply cannot reach their midpoint with the chosen ingredients (a mix topping out at 3.1% fat can never reach a 4.5% fat midpoint). Under a uniform factor, one such nutrient pins `t` near zero and leaves *every other* nutrient uncentred as collateral damage. Measured independently, the reachable ones get centred properly. On the `verify-tmr` benchmark this took total midpoint deviation from 2.70 (uniform) to **1.48** — better than every other mode, which is what the mode promises and what `verify-tmr.ts` asserts.

Cost is ~60–70 small solves, so 10–120 ms. Fine for a button press or a mount; don't call it in a loop.

`tightenRanges()` and the step counts are exported from [autoFormulate.ts](lib/autoFormulate.ts) and reused verbatim by [tmrFormulate.ts](lib/tmrFormulate.ts), which had the identical bug.

When the user picks `max_protein` / `max_energy`, Step 3 runs a second `min_cost` baseline solve to compute the **cost premium** shown in the Why-this-formula card.

> ⚠️ **Solver fragility — the one thing to know before touching either LP.**
> `javascript-lp-solver` can enter an infinite loop on degenerate models, and it
> is called synchronously on the main thread, so a cycle freezes the tab. Two
> rules keep it safe, and both are load-bearing:
> 1. **No auxiliary-slack models.** Plain min/max constraint models have been
>    exercised across 4080 solves (every animal × stage × mode × selection, plus
>    every single-ingredient addition) without a hang. The slack formulation hung.
> 2. **Probe in `min_cost`.** Every internal feasibility probe — the relax-and-
>    solve pass, `buildFixes`, and each balanced-tightening trial — forces
>    `mode: 'min_cost'`. Feasibility is independent of the objective, so this
>    costs nothing and keeps the risky model shapes out of the hot paths.
>
> If you change the LP, re-run the sweep. A hang will not show up in
> `tsc`, `next build`, or any of the verify scripts.

### TMR LP — [lib/tmrFormulate.ts](lib/tmrFormulate.ts)

Everything above, plus **one extra equality row** pinning the forage:concentrate ratio on a DM basis. With `f = forageDmPct / 100`:

```
want:   forage_DM = f × (forage_DM + concentrate_DM)
⇒       (1 − f) × forage_DM  −  f × concentrate_DM  =  0

coefᵢ = +(1 − f) × (dmᵢ / 100)   if i is a forage
coefᵢ = −f       × (dmᵢ / 100)   if i is a concentrate
constraint:  dm_split = { equal: 0 }
```

Linear because `dmᵢ` is a per-ingredient constant. The TMR solver also pre-checks the selection and can fail with `no_forage` / `no_concentrate` before ever building the model, and reports `achievedForagePct` / `achievedConcentratePct` on success.

### Diagnostics

**Post-solve** (`buildDiagnostics()`, concentrate only) → rendered by [WhyThisFormula.tsx](components/nutrition-calculator/WhyThisFormula.tsx) as a collapsible amber card:
- **`bindingNutrients`** — nutrients pinned at min or max (±0.05%, or ±0.02 for ME)
- **`bindingCaps`** — ingredients at their `maxInclusion` (within 0.05 kg); locked items are skipped, since they're at their value by choice
- **`unused`** — selected ingredients the solver gave ≈0 kg (not cost-effective)

**Infeasibility** (`diagnoseBottleneck()`) returns both a legacy `bottleneck` string and a structured `InfeasibilityAnalysis`:
1. **Pass 1 — hard blockers.** Greedy per-nutrient max/min fill; if the achievable extreme can't reach the target, that nutrient is individually impossible (`NutrientGap` with `direction: 'too_low' | 'too_high'`).
2. **Pass 2 — conflicts.** Every nutrient is individually reachable but not jointly. Widen one range by ±50% of its width at a time; whichever relaxation restores feasibility is a binding constraint. Recursion is prevented by the internal `_skipDiagnosis` flag.
3. **Pass 3 — fixes** (`buildFixes()`), the part the UI actually renders. Returns `IngredientFix[]`, never empty for an infeasible solve:
   - **`kind: 'exact_fix'`** — *verified*. Each unselected ingredient is added and the LP re-solved; anything that flips it to feasible is a guaranteed one-tap fix. Ranked cheapest-first, max 2 per category. This is ~35 tiny probe solves, so an infeasible solve costs ~26 ms vs ~0.3 ms for a feasible one — irrelevant for a per-toggle check, but don't call it in a tight loop.
   - **`kind: 'helps'`** — when no single addition suffices, one suggestion per blocking nutrient, ranked by `value × dm × min(maxInclusion, 50)`.

**Three rules this diagnostic must keep.** They're easy to break and each produced a real bug:

1. **Direction matters.** The old suggester took a flat list of nutrient names with no direction, so for "energy too HIGH" it recommended wheat grain and bypass fat — the two most energy-dense items in the registry. Always branch on `too_low` vs `too_high`.
2. **Never advise removing an ingredient.** Every `xᵢ` has a lower bound of 0, so the solver could already have declined to use it: dropping an ingredient can only shrink the feasible set, never restore feasibility. Verified empirically. Advice is always additive.
3. **`urea` is on a `NEVER_SUGGEST` denylist.** With `cp: 287` it's the cheapest possible way to lift CP, so the LP picks it as the top "cheapest fix" almost every time — but it's the one ingredient here that can kill an animal (ammonia toxicity above ~1.5%, or from an uneven mix), and it must never reach calves. It stays manually selectable; it is never volunteered.

`diagnoseTmr()` is a smaller TMR-aware version that checks the **DM split itself** first (the most common TMR failure — "selected forages can't supply 70% of DM"), then falls back to the greedy nutrient check.

### Live feasibility in Step 2 (both calculators)

Both Step 2 screens run the full LP inside a `useMemo` on every selection change and render the result inline — so users learn their selection can't work *before* reaching Step 3.

States: `pending` (category minimums unmet) → `no_targets` (Step 1 incomplete) → `feasible` → `infeasible`. Transitions between feasible ↔ infeasible fire a 600 ms-debounced toast reusing one sonner id, so rapid toggling replaces rather than stacks.

**The guidance panel is written for a farmer who may not read a nutrient table.** The target user is often not literate in English or in feed science, which drives the whole design:

- **The headline is the action, not the problem** — "Add one more ingredient", not "Adjust your selection".
- **The fix comes first and takes the most space.** Each `IngredientFix` renders as a tappable `FixChip`: ingredient emoji, its name, the section it lives in ("Protein", "Energy", …), and a ➕ button that selects it immediately. One tap resolves the formula.
- **The numbers are demoted** into a collapsed `<details>` labelled "Why? (show numbers)" — available, never in the way.
- **Never show advice the user can't act on.** The old panel promised "here's what's off" and then printed generic filler ("pick an ingredient that is strong in the nutrient you are missing, or remove one that is overloading another"), which happened whenever `hardBlockers`, `conflictingNutrients`, and `suggestedAdditions` were all empty. `buildFixes()` is guaranteed non-empty, so that dead end is gone.

### The nutrient grid is shared — [NutrientGrid.tsx](components/nutrition-calculator/NutrientGrid.tsx)

Steps 3 and 4 render the same seven numbers, and they used to do it in two different visual languages (Step 3 with range bars, Step 4 with green tick tiles), duplicating the label strings and the ordering. One component now owns all of it: `TARGETED`, `UNTARGETED`, `countOnTarget()`, `NutrientCard`, `NutrientGrid`.

- **Two ordered groups, never interleaved.** `TARGETED` (the 7 the LP constrains) then `UNTARGETED` (ADF, Starch, Ash, DM — no min/max to compare against). Previously they were mixed, so ADF sat between TDN and Fat and the grid had no readable order. Each row carries its label, value key and range key together so a label can't drift off its value.
- **No solid fill for "in range".** A saturated green card made every *passing* nutrient the loudest thing on screen, when the ones needing attention are the failures. Status is a small dot + tinted border + coloured value; emerald / amber / rose come from `getNutrientStatus()`.
- **A mini range bar per targeted nutrient** — the target band with a marker for where the formula actually sits, clamped at the ends. "20–22%" alone doesn't say whether you're centred or clinging to the edge.
- **An `N/7 on target` counter**, so the whole grid can be judged without reading 11 cards.
- **`untargeted` prop**: `'open'` in Step 3 (the extra numbers help while tuning), `'collapsed'` in Step 4 (on a phone they'd only add scroll).

**Step 4 shows advice only where advice is needed.** `generateRecommendations()` returns a row for all seven nutrients, and for a passing one it reads "Protein (CP) is within optimal range" — which the card directly above already showed with a green dot and an "on target" label. Rendering all seven made the screen state everything twice and doubled the scrolling on a phone for zero information. Step 4 now filters to `status !== 'success'`, sorts errors before warnings, and collapses the passing case into a single line. Measured on a 390 px viewport: 2.06 screens when everything passes, 2.56 when six nutrients are off.

**The active LP mode is visible in Step 3**: filled + ringed + check badge, `aria-pressed`, and named in the panel ("Showing the **Balanced** recipe"). Hand-editing a kg calls `clearSolveState()`, which drops both the badge and the diagnostics card — labelling a hand-tuned recipe "Balanced" would be untrue.

### The "I already have my own mix" escape hatch

Two different users reach Step 2, and the validation that helps one blocks the other:

- Someone **building a ration from scratch** benefits from "you have no protein source yet".
- Someone who **already feeds a fixed mix** and only wants to know whether it hits the targets does not. For them the category minimums (`energy: 1`, `protein: 1`) were a dead end — Next stayed disabled with no way past it.

`skipValidation` unlocks Next for any non-empty selection. Behaviour when on:

| | Normal | Checks skipped |
|---|---|---|
| Next gate | LP verdict is `feasible` | at least 1 ingredient anywhere |
| Step 2 panel | LP feasibility guide + fix chips | "Checks skipped" notice + "Turn checks back on" |
| Toast on Next | warns if infeasible | silent — they already accepted the trade-off |
| Step 3 on arrival | auto-runs the Balanced LP | **no** auto-run; even split to hand-edit |
| Step 4 | full verdict | full verdict (unchanged — this is what they came for) |

Three implementation points that are easy to get wrong:

1. **One source of truth for "can the user continue?"** `canProceed` is derived from the LP verdict — `feasibility.kind === 'feasible'`, the state that renders "Looks good — you're ready". There is deliberately **no** separate "category minimums satisfied" flag. There used to be, and because the minimums only ask "at least one energy and one protein source?", picking corn + SBM unlocked Next while the panel directly above it still said the targets couldn't be met — and Auto-Formulate then failed on arrival in Step 3. The `pending` feasibility state already encodes the minimums, so the second flag was both redundant and contradictory.
2. **The flag lives in `NutritionCalculator`, not Step 2.** `AnimatePresence` unmounts each step on navigation, so as local state it would reset the moment the user went to Step 3 and came back — silently re-locking the button they had just unlocked.
3. **Step 3's auto-balance is suppressed** (`if (wasEmpty && !skipValidation)`). Their selection is deliberately their own mix, so the Balanced LP is usually infeasible and would greet them with a red error immediately after we promised they'd "only lose the automatic balancing".

The skip offer renders on `!canProceed` — the same condition that disables Next — so there is never a state with a locked button and no way past it. The disabled Next also names its own reason, differently for each blocked state.

**Ingredient card affordances** ([Step2Ingredients.tsx](components/nutrition-calculator/Step2Ingredients.tsx)):

| Signal | Source | Why |
|---|---|---|
| **ADD THIS** ribbon + emerald ring | key is in the current `fixes` list | Points at the card that resolves *this* formula. Cleared once selected or once feasible. |
| **"N suggested"** section badge | count of recommended keys in that section | Tells the user which section to look in before scrolling. |
| `usageTier()` chip — "Use freely ≤30%" / "Medium amount ≤15%" / "Small amount only ≤1.5%" | derived from `maxInclusion` | The key safety signal. Derived from the LP's own cap so it can never drift out of sync. Salt, oils and urea all land in the red tier. |
| ⚡/🥩 High-Med-Low pills | `energyLevel` / `proteinLevel` | Replaced bare "E"/"P" letters, which meant nothing to a first-time user. |

---

## 7. Daily feeding guides

Two different models, because the question differs:

**Concentrate** — [feedingGuide.ts](lib/feedingGuide.ts) → *how much of this concentrate per day*. Per-stage `RULES` keyed by animal:
- `lactation` → `BW × bwMaintenancePct% + milkYieldL × milkRatio`
- `fattening` / `growth` / `maintenance` → `BW × bwTotalPct%`

Returns a structured `breakdown` so the UI can show "2.0 kg maintenance + 5.25 kg for milk = 7.25 kg", plus daily cost and contextual notes (split feedings above a concentrate threshold, water allowance ≥20 L milk, last-trimester bump, roughage reminder for finishers). Also exports `getSuggestedBodyWeight()`, `isLactatingStage()`, and `getFeedingMode()`.

**TMR** — [TmrDailyFeedingGuide.tsx](components/tmr-calculator/TmrDailyFeedingGuide.tsx) → *how much of this complete ration per day*, driven by total **DMI** rather than a concentrate allowance:

```
DMI_kg      = BW × DMI_PCT[animal][stage]/100  (+ milkYield × MILK_DMI_KG_PER_L for lactation)
TMR_as_fed  = DMI_kg / (TMR's own DM% / 100)
forage_DM   = DMI_kg × forageDmPct/100 ;  concentrate_DM = remainder
```

`DMI_PCT` and `MILK_DMI_KG_PER_L` live locally in that component; it reuses `getSuggestedBodyWeight()` and `isLactatingStage()` from `feedingGuide.ts`.

---

## 8. Conventions & gotchas

1. **Always use `getIngredient(key)`** in concentrate code and **`getAnyIngredient(key)`** in TMR code. Never touch `NUTRITION_DATA[key]` outside `constants.ts` — it bypasses user overrides and the custom-ingredient store.

2. **Nutrient values are DM basis.** `dm` itself is "% of as-fed that is DM". Don't confuse the two.

3. **`price` is as-fed.** The farmer pays per kg of what they physically weigh out, not per kg of DM.

4. **Total Weight in Step 3 is a scaler, not an edit.** Changing it (or clicking a batch chip) scales every ingredient proportionally. It's disabled while the total is 0, since there's nothing to scale from.

5. **`AnimatePresence mode="wait"` must receive exactly one keyed child.** Both orchestrators use a single `motion.div` keyed by `currentStep`. Sibling conditionals break step navigation after a state mutation.

6. **`autoBalanceOnMount` is a one-shot flag.** The orchestrator sets it only on a *truly fresh* Step 3 entry (empty prior formula) or a template load — never when loading a saved formula. Step 3 fires the `balanced` LP once behind a `useRef` guard, then the parent clears the flag via `onAutoBalanceConsumed`. Both guards matter: the ref stops re-fires within a mount, the flag stops re-fires across navigation.

7. **Language is `'en'` or `'ur'`.** No i18n library — plain `language === 'en' ? ... : ...` ternaries throughout, with bilingual string pairs (`nameEn`/`nameUr`, `labelEn`/`labelUr`, …) in the data. Urdu reads RTL; most cards handle it implicitly via flex/grid.

8. **State flows top-down from the orchestrator.** No context, no Redux. Each Step receives props + callbacks.

9. **Step 3 removals sync back to Step 2.** `handleFormulaChange` diffs the incoming formula against the previous one and prunes removed keys from `chosenIngredients` (concentrate) or `selectedForages`/`selectedConcentrates` (TMR), so Back doesn't show inconsistent state.

10. **Deleting a custom ingredient has three side-effects**, in order: remove from localStorage → un-toggle it if selected (otherwise Step 3 carries a phantom key with no metadata) → bump `customVersion` to re-render the grid. `customVersion` is also a `useMemo` dep for the feasibility check, since localStorage can't be read during render.

11. **Modals stack above the sticky header.** Header is `z-40`; most modals use `z-[70]` (backdrop) / `z-[71]` (content). `NutritionConflictModal` deliberately uses `z-[60]`/`z-[61]` so it renders over `SavedFormulasModal` from a lower range. `OnboardingModal` sits highest at `z-[80]`/`z-[81]`, since it must cover everything on first load.

12. **Adding a new animal / stage**: edit `STAGES[animalId].en/ur`, `NUTRITION_RANGES[animalId]`, `TMR_NUTRITION_RANGES[animalId]`, `DEFAULT_FORAGE_PCT[animalId]`, `RULES[animalId]` in [feedingGuide.ts](lib/feedingGuide.ts), `DMI_PCT` in [TmrDailyFeedingGuide.tsx](components/tmr-calculator/TmrDailyFeedingGuide.tsx), and `getSuggestedBodyWeight()`. **All seven are indexed by stage and must line up.**

13. **Adding a new ingredient**: append to `INGREDIENTS[]` in [constants.ts](lib/constants.ts) with `maxInclusion`, `capReasonEn`, and `capReasonUr`. Step 2, the detail modal, the nutrition editor, and both LP solvers then "just work".

14. **Edit [app/globals.css](app/globals.css), not `styles/globals.css`** — the latter is an orphan nothing imports.

15. **Printing works by visibility inversion.** `@media print` in globals.css hides `body *` then re-shows only `.printable-recipe` and its descendants. `PrintableRecipe` is rendered permanently at the bottom of Step 5 as `hidden print:block`; `window.print()` is what surfaces it. There is no PDF library — "Save as PDF" is the browser's own print-dialog option.

16. **Adding a new *category*** is a 3-step change, not 1: extend the `IngredientCategory` union, add a block to `INGREDIENT_CATEGORIES`, and add the key to `CATEGORY_KEYS`. Everything that iterates (Step 2 sections, `buildFormula`, `emptyChosenIngredients`, TMR's concentrate tab, `verify-templates`) is driven off `CATEGORY_KEYS` and follows automatically. Also add the bucket to `ChosenIngredients` in [templates.ts](lib/templates.ts). **Never hardcode `['energy','protein','fiber','fat']`** — that's exactly how a category gets silently dropped.

---

## 9. Feature completeness checklist

| Feature | Status | Notes |
|---|---|---|
| 5-step concentrate wizard | ✅ | |
| 5-step TMR wizard (`/tmr`) | ✅ | separate ranges, split constraint, own saved store |
| Bilingual EN / UR | ✅ | throughout, including cap reasons and diagnostics |
| 40 Pakistani concentrate ingredients with NRC data | ✅ | 9 energy / 15 protein / 4 fiber / 8 fats & oils / 4 supplements |
| Fats & oils as their own category | ✅ | 2 bypass grades + mustard, sesame, taramira, linseed, rice-bran, canola oils |
| 12 forages (fresh / silage / dry) | ✅ | TMR only |
| 6 livestock × 3–4 stages = 22 range sets | ✅ | both concentrate and whole-diet tables |
| DM-basis calculations | ✅ | verified against Google Sheet |
| Scale-invariance (resize total → % stay same) | ✅ | |
| User-added custom ingredients | ✅ | validated form, upsert by key, delete from Step 2 |
| Edit ingredient nutrition + persistence | ✅ | 12 editable fields, sparse storage |
| Reset per-ingredient or all to default | ✅ | |
| Save / load formulas (both calculators) | ✅ | separate localStorage keys |
| Conflict detection on load | ✅ | concentrate only; forage values aren't editable yet |
| Quick-Start templates | ✅ | 9 curated recipes → straight to Step 3 |
| Live LP feasibility check in Step 2 | ✅ | both calculators, with bilingual quick-fix guidance |
| Skip-validation escape hatch | ✅ | concentrate Step 2 — for users who just want an existing mix checked |
| LP Auto-Formulate: min-cost | ✅ | |
| LP Auto-Formulate: balanced (midpoint-seeking) | ✅ | auto-runs on fresh Step 3 entry |
| LP Auto-Formulate: max-protein / max-energy | ✅ | with cost premium vs min-cost baseline |
| Ingredient locks | ✅ | equality constraints in both solvers |
| Why-this-formula diagnostics | ✅ | concentrate only |
| Max inclusion caps + "why this cap?" in EN + UR | ✅ | all 40 ingredients + all 12 forages |
| Daily feeding guide | ✅ | concentrate allowance + TMR DMI variant |
| Print / save-as-PDF recipe sheet | ✅ | concentrate only, via @media print |
| WhatsApp / text export | ✅ | both calculators. The concentrate Step 5 labels these honestly — "Print / PDF" is the print-dialog path, "Text file" writes `.txt`. It used to call the `.txt` button "Download PDF". |
| Onboarding welcome screen + nutrient glossary | ✅ | 4 feature cards, 9 glossary entries |
| Batch size scaling + quick presets | ✅ | 100 / 200 / 500 / 1000 / 2000 kg |
| Why-this-formula for TMR | ❌ | TMR has no post-solve diagnostics card |
| Print sheet for TMR | ❌ | text export only |
| Forage nutrition editing | ❌ | forages have no override path |
| PWA / offline | ❌ | |
| Real PDF library export | ❌ | browser print dialog covers the use case today |
| Cloud sync / accounts | ❌ | |
| Formula comparison side-by-side | ❌ | |
| Multi-animal batch optimisation | ❌ | |

---

## 10. How to verify

```bash
# Type check — the ONLY real type gate (next build ignores type errors)
npx tsc --noEmit

# Production build
npx next build

# Dev server
npm run dev
```

Six standalone verification scripts. The `.mjs` ones run on bare Node; the `.ts` ones need `tsx`, which is **not** in `devDependencies` (so `npx tsx` will fetch it):

```bash
node scripts/verify-calculator.mjs            # DM-basis math + scale invariance
node scripts/verify-autoformulate.mjs         # concentrate LP: 8 scenarios (modes, locks, infeasibility)
node scripts/verify-custom-ingredients.mjs    # custom-ingredient store + LP integration
npx tsx scripts/verify-custom-ingredients.ts  # typed twin of the above
npx tsx scripts/verify-templates.ts           # every Quick-Start template is LP-feasible
npx tsx scripts/verify-tmr.ts                 # forages, TMR ranges, DM-split LP, TMR math
```

None are wired into `package.json` scripts. Note also that `npm run lint` calls `eslint`, which isn't installed — the script is currently broken.

---

## 11. User's typical flow on open

1. Opens app → first-run onboarding modal (once) → Step 1.
2. Either **taps a Quick-Start template** (jumps to Step 3 with a balanced recipe already solved) or picks Dairy Cow → Early Lactation manually.
3. Target range card appears: CP 20–22, ME 2.80–3.10, etc.
4. Next → Step 2 ingredient grid. Picks ~6–8 ingredients while the feasibility guide updates live; if the selection can't work, it says which nutrients are off and what to add.
5. Next → Step 3. The Balanced LP has already run, so kg values are sensible from the start.
6. Optionally: taps 💰 Cheapest or ⚡ Max Energy, locks an ingredient, edits a price, scales Total Weight to 500 kg. Reads "Why this formula?" for binding nutrients and caps.
7. Next → Step 4: nutrient review + daily feeding guide (enters body weight and milk yield).
8. Next → Step 5: save, WhatsApp, print, text export, or start fresh.
9. For a complete ration instead, taps **TMR** in the header → sets the DM split → same flow against whole-diet targets.

---

## 12. References used for nutrition data

- **NRC Dairy 2001 / 2021** (dairy cow / buffalo adjusted)
- **NRC Beef 2016** (fattening bull)
- **NRC Small Ruminants 2007** (goat)
- **INRA 2018** (European fibre & energy benchmarks)
- **ICAR India** + **NDRI Karnal** (buffalo & regional)
- **Feedipedia** (ingredient and forage compositions)
- **Punjab Dairy Development Board** (Pakistani extension rules)
- **Pakistan Agricultural Research Council (PARC)** (regional averages)

Cap reasons cite these implicitly — gossypol (cottonseed), glucosinolates (mustard/canola), oxalates and phytates (sesame), aflatoxin (groundnut, CSM in monsoon), tannins (sorghum, millet, bajra), dhurrin/HCN (young jowar), linamarin (linseed), trypsin inhibitors (guar, chana), ammonia toxicity (urea), bloat (berseem, alfalfa), acidosis (wheat, broken rice, molasses), and silica-blocked digestibility (rice straw).

---

## 13. Known inconsistencies

Small things that are true of the code today and worth knowing before you touch them:

1. **Four orphan modules**: `Header.tsx`, `ProgressIndicator.tsx`, `Step2IngredientsPro.tsx`, `theme-provider.tsx`, plus the `hooks/` directory and `styles/globals.css`. Nothing imports any of them.
2. **`Step3Formula` special-cases a `'mineral_mix'` key** (hides the remove button) that no longer exists in `INGREDIENTS`.
3. **TMR has no conflict-detection path on load** even though `SavedTmrFormula` stores an `ingredientOverrides` snapshot for it.
4. **`OnboardingModal`'s docstring claims it's "re-openable from the Help icon"** — it isn't. The Help icon opens the Glossary in both orchestrators, so once `has_seen_onboarding_v1` is set there's no in-app way back to the welcome screen.

5. **Four Quick-Start templates are LP-infeasible** — `dairy_cow_mid_15l` (the "Most popular" card), `dairy_cow_dry`, `dairy_buffalo_10l`, and `heifer_growing`. Tapping one lands the user on Step 3 where Auto-Formulate fails in all 4 modes. `npx tsx scripts/verify-templates.ts` reports them (currently 20 passed / 16 failed).

   Root cause for three of them is a **phosphorus-vs-fibre conflict**: reaching the NDF floor on wheat bran + CSM (1.1% and 1.0% P) pushes phosphorus past its ceiling. Adding a low-P fibre source fixes them — verified that `chickpea_husk` (55% NDF at only 0.25% P) makes `dairy_cow_mid_15l`, `dairy_buffalo_10l`, and `heifer_growing` feasible in all 4 modes. `dairy_cow_dry` needs at least two constraints relaxed and wants a separate look.

   This predates the fat/supplement split — the same 4 fail on the commit before it.

---

*End of project context. Reflects the codebase as of the TMR calculator, custom ingredients, Quick-Start templates, balanced LP mode, and live Step-2 feasibility checks.*
