# Nutrition Calculator — Project Context

A bilingual (English / Urdu) web app that builds **least-cost concentrate feed formulas** for Pakistani livestock — dairy cows, buffaloes, heifers, fattening bulls, dairy goats, and fattening goats. The calculator uses real Linear Programming to find the cheapest mix that meets NRC-grade nutrient targets.

> **This document is the project's source of truth.** Paste it into any new chat and the assistant should understand the full app. No conversation history needed.

---

## 1. What it does (5-step wizard)

| Step | Screen | Purpose |
|---|---|---|
| 1 | [Step1Animal.tsx](components/nutrition-calculator/Step1Animal.tsx) | Pick animal (6 species) + stage. Shows target nutrient ranges live. |
| 2 | [Step2Ingredients.tsx](components/nutrition-calculator/Step2Ingredients.tsx) | Multi-select ingredients across 4 categories: Energy, Protein, Bran & Fiber, Supplements & Minerals. |
| 3 | [Step3Formula.tsx](components/nutrition-calculator/Step3Formula.tsx) | **The core editor.** Adjust kg/price per item. Auto-Formulate button runs LP solver. Editable total weight scales everything proportionally. Per-row lock button + edit-nutrition pencil icon. |
| 4 | [Step4Status.tsx](components/nutrition-calculator/Step4Status.tsx) | Nutrient grid vs targets (color-coded). Daily Feeding Guide card (body weight + milk yield → daily concentrate/forage amounts). |
| 5 | [Step5Actions.tsx](components/nutrition-calculator/Step5Actions.tsx) | Save / WhatsApp share / text export / reset. |

Bookmark icon in the header opens [SavedFormulasModal.tsx](components/nutrition-calculator/SavedFormulasModal.tsx) — load / delete saved formulas. Loading checks for nutrition-value conflicts (Phase 4).

**IMPORTANT — this is a CONCENTRATE calculator, not a Total Mixed Ration (TMR).**
- The concentrate mix is fed alongside fresh forage, hay, or silage.
- NDF targets are therefore LOW (15-35%) — forage supplies the rest of fiber separately.
- CP / ME / Ca / P targets are HIGHER than whole-diet TMR values.
- TMR tab is v2 (not built yet).

---

## 2. Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript 5.7** (strict)
- **Tailwind CSS 4** + `tailwind-merge` + `clsx` / `class-variance-authority`
- **framer-motion 11** for all animations
- **lucide-react** for icons
- **javascript-lp-solver 1.0** — the LP engine powering Auto-Formulate
- **localStorage** for persistence (saved formulas, ingredient nutrition overrides)
- No backend / database — everything client-side

Pages route to `app/page.tsx` → `<NutritionCalculator />`.

---

## 3. Directory map

```
d:/test/nutrition-calc/
├── app/
│   ├── layout.tsx              root layout
│   └── page.tsx                renders <NutritionCalculator />
├── components/
│   ├── nutrition-calculator/   all app-specific components
│   │   ├── NutritionCalculator.tsx        orchestrator, 5-step wizard state
│   │   ├── Stepper.tsx                     5-step progress indicator
│   │   ├── LanguageSwitch.tsx              EN / UR toggle
│   │   ├── Step1Animal.tsx                 animal + stage picker
│   │   ├── Step2Ingredients.tsx            ingredient multi-select
│   │   ├── Step3Formula.tsx                formula editor + Auto-Formulate
│   │   ├── Step4Status.tsx                 nutrient review + feeding guide
│   │   ├── Step5Actions.tsx                save / share / export / reset
│   │   ├── IngredientDetailModal.tsx       (i) modal; shows cap reason + edit nutrition
│   │   ├── IngredientNutritionEditor.tsx   reusable editor for ingredient nutrition
│   │   ├── IngredientTooltip.tsx           hover tooltip on ingredient cards
│   │   ├── SavedFormulasModal.tsx          bookmark icon → saved formulas list
│   │   ├── NutritionConflictModal.tsx      shown on load when saved vs current nutrition differ
│   │   ├── WhyThisFormula.tsx              Phase 4 diagnostics card
│   │   ├── DailyFeedingGuide.tsx           daily intake calculator (Step 4)
│   │   └── Step2IngredientsPro.tsx         (unused experimental variant — ignore)
│   └── ui/                     shadcn/ui primitives (button, input, etc.)
├── lib/
│   ├── constants.ts            INGREDIENTS[], NUTRITION_RANGES, STAGES, ANIMALS, getIngredient()
│   ├── calculations.ts         calculateNutrients(), buildFormula(), FormulaItem type
│   ├── autoFormulate.ts        LP solver wrapper (Phase 1-4) + diagnostics
│   ├── savedFormulas.ts        localStorage persistence for saved formulas
│   ├── ingredientOverrides.ts  localStorage persistence for nutrition edits
│   ├── feedingGuide.ts         daily intake rules per species/stage
│   └── utils.ts                cn() helper for Tailwind
├── scripts/
│   ├── verify-calculator.mjs   validates DM-basis math + scale invariance
│   └── verify-autoformulate.mjs validates LP with 8 scenarios (modes + locks + diagnostics)
└── public/
    └── animals/                animal card background images
```

---

## 4. Core data models

### Ingredient — [lib/constants.ts](lib/constants.ts)

```ts
interface Ingredient {
  key: string;                    // 'corn', 'sbm', ...
  category: 'energy' | 'protein' | 'fiber' | 'fat';
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
  maxInclusion: number;  // % cap used by LP solver (science-based)
  capReasonEn: string;   // Why the cap exists — shown in modal
  capReasonUr: string;
  notesEn?: string; notesUr?: string;
}
```

**26 ingredients** registered (8 energy, 11 protein, 2 bran/fiber, 5 supplements). Adding a new one: append to `INGREDIENTS` array — category lists, icon lookups, and LP constraints are all auto-derived.

### Nutrition Range (target per animal/stage) — [lib/constants.ts](lib/constants.ts)

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

`NUTRITION_RANGES` = `Record<animalId, NutrientRange[]>`. Each animal has multiple stages indexed by number (0 = first stage).

**Animals**: `dairy_cow`, `dairy_buffalo`, `heifer`, `fattening_bull`, `dairy_goat`, `fattening_goat`.

### FormulaItem — [lib/calculations.ts](lib/calculations.ts)

```ts
interface FormulaItem {
  name: string;
  key: string;             // ingredient key
  kg: number;              // as-fed quantity
  price?: number;          // per-formula price override
  quality?: 'excellent' | 'average' | 'poor';
  locked?: boolean;        // Phase 2: if true, Auto-Formulate keeps kg fixed
}
```

### SavedFormula — [lib/savedFormulas.ts](lib/savedFormulas.ts)

```ts
interface SavedFormula {
  id: number; timestamp: number; date: string;
  animalId: string | null;
  animalLabel: string;
  stageIndex: number;
  stageLabel: string;
  chosenIngredients: Record<string, string[]>;
  formula: FormulaItem[];
  totals: { weight, perKgPrice, protein, energy };
  ingredientOverrides: Record<string, Record<string, number>>;
}
```

Stored under localStorage key `saved_formulas`. `ingredientOverrides` is a snapshot for conflict detection on load.

### IngredientOverride — [lib/ingredientOverrides.ts](lib/ingredientOverrides.ts)

Sparse per-field overrides stored under localStorage key `ingredient_overrides`:

```ts
type IngredientOverride = Partial<Pick<Ingredient,
  'dm'|'cp'|'me'|'tdn'|'adf'|'ndf'|'fat'|'starch'|'ca'|'p'|'ash'|'price'>>;
```

**`getIngredient(key)` is the ONLY lookup function to use in production code** — it transparently merges overrides on top of hardcoded defaults. `getDefaultIngredient(key)` returns unmodified hardcoded values (used only by the editor for reset-to-default comparisons).

---

## 5. The calculation engine

### DM-basis math — `calculateNutrients(formula)` in [lib/calculations.ts](lib/calculations.ts)

Everything is on **Dry Matter (DM) basis** — the international convention (NRC, INRA, Feedipedia). For each ingredient `i` with as-fed quantity `qtyᵢ`:

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

**Verified by [scripts/verify-calculator.mjs](scripts/verify-calculator.mjs)** against the reference Google Sheet. All 15 values (DM, CP, ME, TDN, ADF, NDF, Fat, Starch, Ca, P, Ash, cost, price/kg, etc.) match exactly. Includes a scale-invariance test proving percentages don't change when you double all quantities.

### The returned `NutrientCalculation`

```ts
{
  protein, energy, tdn, adf, fiber, fat, starch, calcium, phosphorus, ash, dm,
  totalAsFed, totalDM,    // absolute kg
  cost, perKgPrice         // Rs totals
}
```

### `buildFormula(chosenIngredients)` — Step 2 → Step 3 handoff

Evenly distributes 100 kg across the selected ingredient keys. Called only when the formula is empty. Otherwise `NutritionCalculator.mergeFormulaWithSelection()` keeps existing kg/price and only drops deselected / adds newly selected items.

---

## 6. Auto-Formulate (the LP solver) — [lib/autoFormulate.ts](lib/autoFormulate.ts)

This is the *big* feature. Shipped in 4 phases:

### Phase 1 — Least-cost LP

Standard feed formulation LP — same formulation as every commercial tool (Brill, Feedsoft, WinFeed):

```
minimise   SUM(xᵢ × priceᵢ)                                 (objective)

subject to
  SUM(xᵢ) = batchSize                                       (total weight)
  SUM(xᵢ × dmᵢ × (nutrientᵢ − minₙ)) ≥ 0                  (meets min for nutrient n)
  SUM(xᵢ × dmᵢ × (nutrientᵢ − maxₙ)) ≤ 0                  (meets max for nutrient n)
  xᵢ ≤ (maxInclusionᵢ / 100) × batchSize                    (per-ingredient cap)
  xᵢ ≥ 0
```

Applied to all 7 nutrients: CP, ME, TDN, NDF, Fat, Ca, P.

### Phase 2 — Ingredient Locks

`FormulaItem.locked = true` adds an equality constraint `xᵢ = lockedKg` to the LP. Lock count badge shows in the Auto-Formulate panel. Locked ingredients skip the `bindingCaps` diagnostics list (they're at their value by choice, not by optimisation).

### Phase 3 — Multi-objective modes

`OptimisationMode = 'min_cost' | 'max_protein' | 'max_energy'`. The objective function switches:

- `min_cost`  → minimise `SUM(xᵢ × priceᵢ)`  (default)
- `max_protein` → maximise `SUM(xᵢ × dmᵢ × cpᵢ)`  (kg CP)
- `max_energy` → maximise `SUM(xᵢ × dmᵢ × meᵢ)`  (Mcal ME)

All constraints stay — only the objective changes. UI: 3 mode buttons (💰 Cheapest / 🥛 Max Protein / ⚡ Max Energy) in Step 3.

When user picks max_protein/max_energy, a second baseline LP runs in `min_cost` mode to compute the "cost premium" shown in the Why-this-formula card.

### Phase 4 — Diagnostics ("Why this formula?")

After every successful solve, `buildDiagnostics()` produces:

- **`bindingNutrients`** — nutrients pinned at min or max (within ±0.05% or ±0.02 Mcal)
- **`bindingCaps`** — ingredients at their `maxInclusion` cap (within 0.05 kg)
- **`unused`** — selected ingredients with kg ≈ 0 (not cost-effective)

Plus improved infeasibility diagnosis (`diagnoseBottleneck`):
1. Per-nutrient greedy max/min check
2. Relax-and-solve: try widening each nutrient's range by ±50% — whichever unlocks feasibility is a binding constraint
3. Ingredient suggestions based on binding nutrients (e.g., "try adding SBM — 46% CP, low fibre")

UI: [WhyThisFormula.tsx](components/nutrition-calculator/WhyThisFormula.tsx) renders a collapsible amber card with 3 sections. Recursion-safe via `_skipDiagnosis` internal flag.

---

## 7. Conventions & gotchas

1. **Always use `getIngredient(key)`, never `NUTRITION_DATA[key]` directly.** The former merges user overrides; the latter bypasses them. Only `constants.ts` itself references `NUTRITION_DATA` directly.

2. **Nutrient values are DM basis.** `dm` itself is "% of as-fed that is DM". Don't confuse.

3. **`price` is as-fed.** The user pays per kg of what they physically weigh out, not per kg of DM.

4. **Total Weight input in Step 3 is a scaler, not an edit.** Changing it scales every ingredient proportionally.

5. **`AnimatePresence mode="wait"` must receive exactly one keyed child.** See [NutritionCalculator.tsx](components/nutrition-calculator/NutritionCalculator.tsx) — a single `motion.div` keyed by `currentStep`. Sibling conditionals break step navigation after a state mutation.

6. **Language is Urdu (`ur`) or English (`en`).** No i18n library — simple `language === 'en' ? ... : ...` ternaries throughout. Urdu strings should read RTL; most cards handle this implicitly via flex/grid.

7. **State flows top-down from `NutritionCalculator`.** No context, no Redux. Each Step component receives props + callbacks.

8. **`mergeFormulaWithSelection` is how Step 2 → Step 3 preserves user edits** when navigating back and forth. Don't regenerate from scratch; merge.

9. **Modals stack above sticky header.** Header is `z-40`; modals use `z-[70]` (backdrop) and `z-[71]` (content). NutritionConflictModal uses z-[60]/z-[61] — it appears over SavedFormulasModal from a lower z range on purpose.

10. **Adding a new animal / stage**: edit both `STAGES[animalId].en/ur` AND `NUTRITION_RANGES[animalId]` — stage labels and range rows must match by index.

11. **Adding a new ingredient**: append to `INGREDIENTS[]` in [lib/constants.ts](lib/constants.ts). Required fields include `maxInclusion`, `capReasonEn`, `capReasonUr` — all 4 (nutrition editor, LP, details modal, auto-formulator) then "just work".

---

## 8. Feature completeness checklist

| Feature | Status | Notes |
|---|---|---|
| 5-step wizard | ✅ | |
| Bilingual EN / UR | ✅ | |
| 26 Pakistani ingredients with NRC data | ✅ | |
| 6 livestock × 3-4 stages each = 22 range sets | ✅ | |
| DM-basis calculations | ✅ | Verified against Google Sheet |
| Scale-invariance (resize total → % stay same) | ✅ | |
| Edit ingredient nutrition + localStorage persistence | ✅ | |
| Reset per-ingredient or all to default | ✅ | |
| Save / load formulas | ✅ | |
| Conflict detection on load (overrides vs current) | ✅ | |
| WhatsApp / text export | ✅ | |
| Batch size scaling (inline in Total Weight field) | ✅ | |
| Daily Feeding Guide (body wt + milk yield → kg/day) | ✅ | |
| LP Auto-Formulate (min cost) | ✅ | Phase 1 |
| Ingredient locks | ✅ | Phase 2 |
| Multi-objective modes (cost / protein / energy) | ✅ | Phase 3 |
| Why-this-formula diagnostics | ✅ | Phase 4 |
| Max inclusion caps per ingredient | ✅ | Science-based, all 26 |
| "Why this cap?" explanations in EN + UR | ✅ | Shown in detail modal |
| PWA / offline | ❌ | Future |
| Real PDF export | ❌ | Currently text file |
| TMR mode (concentrate + forage combined) | ❌ | v2 — architecture ready |
| Cloud sync / accounts | ❌ | Future |
| Formula comparison side-by-side | ❌ | Future |
| Multi-animal batch optimisation | ❌ | Future |

---

## 9. How to verify

```bash
# Type check
npx tsc --noEmit

# Production build
npx next build

# Dev server
npm run dev

# Verify DM-basis math + scale invariance
node scripts/verify-calculator.mjs

# Verify LP solver across 8 scenarios (modes, locks, infeasibility)
node scripts/verify-autoformulate.mjs
```

Both scripts are pure-JS (`.mjs`) and mirror the TypeScript logic in `lib/`. They run fast and surface regressions quickly.

---

## 10. Common tasks

**Add a new ingredient:**
1. Append `{ key, category, icon, nameEn, nameUr, ..., maxInclusion, capReasonEn, capReasonUr }` to `INGREDIENTS` in [lib/constants.ts](lib/constants.ts).
2. It automatically appears in Step 2, the detail modal, the auto-formulator, and the nutrition editor.

**Adjust a nutrient range for a stage:**
Edit `NUTRITION_RANGES[animalId][stageIndex]` in [lib/constants.ts](lib/constants.ts). Index must match `STAGES[animalId].en[index]` label.

**Change an ingredient's max inclusion cap:**
Edit `maxInclusion` on that ingredient. Also update `capReasonEn` / `capReasonUr` with the scientific reason.

**Add a new livestock species:**
1. Add to `ANIMALS[]` with an emoji icon.
2. Add stage labels to `STAGES[newId]`.
3. Add range rows to `NUTRITION_RANGES[newId]`.
4. Add feeding rules to `RULES[newId]` in [lib/feedingGuide.ts](lib/feedingGuide.ts).
5. Add default body-weight defaults in `getSuggestedBodyWeight()`.

**Debug the LP solver:**
Add a scenario to [scripts/verify-autoformulate.mjs](scripts/verify-autoformulate.mjs) and run it. The script rebuilds the LP model manually; if output differs from the real `autoFormulate()`, the discrepancy narrows down the bug quickly.

---

## 11. User's typical flow on open

1. Opens app → sees Step 1 with animal grid.
2. Picks Dairy Cow → stage buttons appear → picks Early Lactation.
3. Target range card appears: CP 20-22, ME 2.80-3.10, etc.
4. Clicks Next → Step 2 ingredient grid (cards grouped by 4 categories).
5. Picks ~6-8 ingredients → Next.
6. Step 3: formula editor populated with even 10kg-each distribution.
7. Clicks 💰 Cheapest → LP runs in ms, kg values update, "Why this formula?" card opens below.
8. Optionally: edits a kg, locks an ingredient, changes Total Weight to 500, clicks ⚡ Max Energy.
9. Next → Step 4 nutrition review + daily feeding guide.
10. Next → Step 5: Save, share on WhatsApp, download text report, or start fresh.

Bookmark icon (top-right) → saved formulas list. Loading triggers conflict check against current ingredient overrides.

---

## 12. References used for nutrition data

- **NRC Dairy 2001 / 2021** (dairy cow / buffalo adjusted)
- **NRC Beef 2016** (fattening bull)
- **NRC Small Ruminants 2007** (goat)
- **INRA** (European reference)
- **ICAR India** + **NDRI Karnal** (buffalo & regional)
- **Feedipedia** (ingredient compositions)
- **Punjab Dairy Development Board** (Pakistani extension)
- **Pakistan Agricultural Research Council (PARC)**

Cap reasons cite these sources implicitly — oxalates (sesame), gossypol (cotton), glucosinolates (mustard/canola), phytate, lysine limitation, acidosis risk (wheat/broken rice), etc.

---

## 13. Outstanding suggestions (ranked)

1. **Formula Comparison** — side-by-side compare 2 saved formulas (cost, nutrients, ingredients).
2. **Real PDF Export** — currently exports a `.txt` file; a formatted PDF with tables would be far more useful for farm managers.
3. **PWA / Offline** — service worker + install prompt for rural areas with spotty internet.
4. **Price Update Screen** — one-screen table to update all ingredient prices at once (Pakistani feed prices change weekly).
5. **TMR Tab (v2)** — complete ration with forage side-by-side.
6. **Seasonal Constraint Presets** — "Monsoon mix" disables rice polish (mycotoxin), lowers CSM cap (aflatoxin), etc.
7. **Editable `maxInclusion`** — let expert users raise caps for their region, with a warning banner that they're above NRC recommendations.
8. **Weighted multi-objective** — slider between cost-vs-protein instead of hard switch.
9. **Multi-animal batch** — commercial farm use case: formulate for herd with shared supplement batches.

---

*End of project context. Last updated on structural changes through Phase 4 diagnostics + cap reasons.*
