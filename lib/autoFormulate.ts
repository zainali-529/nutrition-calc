// ================================================================================
// AUTO-FORMULATE — least-cost feed formulation via Linear Programming
// ================================================================================
//
// Given a list of selected ingredients and target nutrient ranges on DM basis,
// compute the cheapest batch that satisfies every constraint. This is the
// textbook "least-cost formulation" problem used by every commercial feed
// software (Brill, Feedsoft, WinFeed, etc.).
//
// ── Math ────────────────────────────────────────────────────────────────────
// Decision variables: xᵢ = as-fed kg of ingredient i
//
// Objective:  minimise  SUM(xᵢ × priceᵢ)
//
// Subject to:
//   SUM(xᵢ) = batchSize                              (total weight)
//
//   For each nutrient percentage n (CP, TDN, NDF, Fat, Ca, P) on DM basis:
//     SUM(xᵢ × dmᵢ × (nutrient_n,ᵢ − minₙ)) ≥ 0     (meets minimum)
//     SUM(xᵢ × dmᵢ × (nutrient_n,ᵢ − maxₙ)) ≤ 0     (meets maximum)
//
//   For ME (Mcal/kg DM, not a percentage), same form:
//     SUM(xᵢ × dmᵢ × (meᵢ − minME)) ≥ 0
//     SUM(xᵢ × dmᵢ × (meᵢ − maxME)) ≤ 0
//
//   Per-ingredient practical caps (prevent unrealistic recipes):
//     xᵢ ≤ (maxInclusionᵢ / 100) × batchSize
//
//   Non-negativity: xᵢ ≥ 0
//
// This is a pure linear program — the solver finds the global optimum in ms.
// ================================================================================

import solver from 'javascript-lp-solver';
import { getIngredient, type Ingredient, type NutrientRange } from './constants';

/**
 * What the LP solver should optimise for. All modes still respect every
 * nutrient range + per-ingredient caps + lock constraints — only the
 * objective function changes.
 *
 *   'min_cost'    — cheapest mix that meets every target (default)
 *   'max_protein' — richest in CP (kg) within the allowed range — for high
 *                   producing dairy animals
 *   'max_energy'  — most energy-dense (Mcal ME) within the allowed range —
 *                   for fattening bulls / finishing phase
 */
export type OptimisationMode = 'min_cost' | 'max_protein' | 'max_energy';

export interface AutoFormulateInput {
  /** Ingredient keys the user selected in Step 2. */
  ingredientKeys: string[];
  /** Target nutrient ranges for the selected animal+stage. */
  ranges: NutrientRange;
  /** Desired total batch size (kg as-fed). Default 100. */
  batchSize?: number;
  /**
   * Ingredients locked at fixed kg values. The LP treats each as an equality
   * constraint (xᵢ = lockedKg) — they stay exactly at the given quantity while
   * the remaining unlocked ingredients are optimised around them.
   */
  lockedQuantities?: Record<string, number>;
  /** Which objective to optimise. Default is 'min_cost'. */
  mode?: OptimisationMode;
  /** @internal — skip the diagnostic relax-and-solve recursion when this is
   *  a secondary probe from within diagnoseBottleneck(). Prevents infinite loops. */
  _skipDiagnosis?: boolean;
}

/**
 * A nutrient that's pinned at the edge of its target range. Tells the user
 * the solver went as far as it could in that direction.
 */
export interface BindingNutrient {
  /** The app's range key: 'protein' | 'energy' | 'tdn' | 'fiber' | 'fat' | 'calcium' | 'phosphorus' */
  nutrient: string;
  /** 'min' = pressed against lower bound; 'max' = pressed against upper bound */
  bound: 'min' | 'max';
  /** The actual achieved concentration (%, or Mcal/kg DM for energy) */
  value: number;
  /** The target value that's being touched */
  target: number;
}

/**
 * An ingredient that's at its maxInclusion cap — the solver would have used
 * more of it if the cap allowed.
 */
export interface BindingCap {
  ingredientKey: string;
  capPercent: number;  // cap as % of batch (e.g. 10 for molasses)
  actualKg: number;    // what the solver used (== cap * batchSize / 100)
}

export interface Diagnostics {
  /** Nutrients pinned at their min/max bound. */
  bindingNutrients: BindingNutrient[];
  /** Ingredients at their maxInclusion cap. */
  bindingCaps: BindingCap[];
  /** Ingredients the solver chose NOT to use (kg == 0) despite being selected. */
  unused: string[];
}

export interface AutoFormulateSuccess {
  success: true;
  /** Per-ingredient kg (as-fed). Keys match ingredientKeys. */
  quantities: Record<string, number>;
  /** Total cost of the optimised batch (Rs). */
  cost: number;
  /** Per-kg cost (Rs/kg as-fed). */
  perKgPrice: number;
  /** Post-solve diagnostics — tells the farmer WHY the formula looks this way. */
  diagnostics: Diagnostics;
}

export interface AutoFormulateFailure {
  success: false;
  /** User-friendly reason (bilingual-safe; caller translates). */
  reason: 'infeasible' | 'missing_data' | 'no_ingredients';
  /** Diagnostic hint — which nutrient(s) or sources are the bottleneck. */
  bottleneck?: string;
}

export type AutoFormulateResult = AutoFormulateSuccess | AutoFormulateFailure;

// ---------------------------------------------------------------------------
// Nutrient fields we constrain. ME has a unit multiplier since it's Mcal/kg DM
// (the others are %, so dividing/multiplying by 100 matters for numerical scale).
// ---------------------------------------------------------------------------
const CONSTRAINED = [
  { key: 'protein', field: 'cp'  as const, rangeKey: 'protein' as const },
  { key: 'energy',  field: 'me'  as const, rangeKey: 'energy'  as const },
  { key: 'tdn',     field: 'tdn' as const, rangeKey: 'tdn'     as const },
  { key: 'fiber',   field: 'ndf' as const, rangeKey: 'fiber'   as const },
  { key: 'fat',     field: 'fat' as const, rangeKey: 'fat'     as const },
  { key: 'calcium', field: 'ca'  as const, rangeKey: 'calcium' as const },
  { key: 'phosphorus', field: 'p' as const, rangeKey: 'phosphorus' as const },
];

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function autoFormulate(input: AutoFormulateInput): AutoFormulateResult {
  const batchSize = input.batchSize && input.batchSize > 0 ? input.batchSize : 100;
  const keys = [...new Set(input.ingredientKeys)];
  if (keys.length === 0) {
    return { success: false, reason: 'no_ingredients' };
  }

  // Resolve each ingredient (respecting any user overrides)
  const ingredients: Ingredient[] = [];
  for (const k of keys) {
    const ing = getIngredient(k);
    if (!ing) return { success: false, reason: 'missing_data', bottleneck: k };
    ingredients.push(ing);
  }

  // Build the LP model in the shape javascript-lp-solver expects
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {
    total: { equal: batchSize },
  };

  // Set up constraint bounds (we use ≥ 0 or ≤ 0 on the linearised form)
  for (const c of CONSTRAINED) {
    constraints[`${c.key}_min`] = { min: 0 };
    constraints[`${c.key}_max`] = { max: 0 };
  }

  // Per-ingredient max-inclusion caps
  for (const ing of ingredients) {
    const capKg = (ing.maxInclusion / 100) * batchSize;
    constraints[`cap_${ing.key}`] = { max: capKg };
  }

  // Lock constraints: add an equality constraint `xᵢ = lockedKg` for each
  // locked ingredient. The LP will still find the least-cost mix for the rest.
  const locks = input.lockedQuantities ?? {};
  for (const [key, lockedKg] of Object.entries(locks)) {
    if (keys.includes(key) && Number.isFinite(lockedKg) && lockedKg >= 0) {
      constraints[`lock_${key}`] = { equal: lockedKg };
    }
  }

  // Build each variable's coefficient row. We always track `cost`, `cp_total`,
  // and `me_total` as named objectives so the solver can optimise any one of
  // them based on the selected mode.
  for (const ing of ingredients) {
    const dm = ing.dm / 100;
    const coef: Record<string, number> = {
      total:     1,                           // total-weight constraint
      cost:      ing.price ?? 0,              // Rs — for min_cost mode
      cp_total:  dm * (ing.cp ?? 0),          // kg CP contribution — for max_protein mode
      me_total:  dm * (ing.me ?? 0),          // Mcal ME contribution — for max_energy mode
    };

    // For every nutrient constraint, the coefficient is dm × (value − bound).
    // dm is a percent, so we divide by 100 to keep numerical scale sane.
    for (const c of CONSTRAINED) {
      const value = ing[c.field];
      const bound = input.ranges[c.rangeKey];
      coef[`${c.key}_min`] = dm * (value - bound.min);
      coef[`${c.key}_max`] = dm * (value - bound.max);
    }

    // Map this ingredient's own cap-constraint: coefficient 1
    coef[`cap_${ing.key}`] = 1;

    // If this ingredient is locked, give it a coefficient of 1 on its own
    // lock constraint so the solver sees `xᵢ = lockedKg` exactly.
    if (locks[ing.key] !== undefined) {
      coef[`lock_${ing.key}`] = 1;
    }

    variables[ing.key] = coef;
  }

  // Pick the objective based on the mode
  const mode = input.mode ?? 'min_cost';
  const [optimizeField, opType] =
    mode === 'max_protein' ? ['cp_total', 'max'] as const
  : mode === 'max_energy'  ? ['me_total', 'max'] as const
  :                          ['cost',     'min'] as const;

  const model = {
    optimize: optimizeField,
    opType,
    constraints,
    variables,
  };

  let result: Record<string, number | boolean | undefined>;
  try {
    // The library's type for Solve is broad; cast the model shape loosely.
    result = solver.Solve(model as Parameters<typeof solver.Solve>[0]) as any;
  } catch {
    return { success: false, reason: 'infeasible' };
  }

  if (!result || result.feasible === false) {
    return {
      success: false,
      reason: 'infeasible',
      // Skip diagnosis if we're already inside a diagnostic probe call
      bottleneck: input._skipDiagnosis ? undefined : diagnoseBottleneck(input, ingredients),
    };
  }

  // Extract per-ingredient quantities. Solver omits zero-valued variables, so
  // default anything missing to 0.
  const quantities: Record<string, number> = {};
  let totalCost = 0;
  for (const ing of ingredients) {
    const q = typeof result[ing.key] === 'number' ? (result[ing.key] as number) : 0;
    quantities[ing.key] = Math.max(0, round(q, 2));
    totalCost += quantities[ing.key] * (ing.price ?? 0);
  }

  // Build post-solve diagnostics — tells the farmer WHY this formula.
  const diagnostics = buildDiagnostics(ingredients, quantities, input.ranges, batchSize, locks);

  return {
    success: true,
    quantities,
    cost: Math.round(totalCost),
    perKgPrice: round(totalCost / batchSize, 2),
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Post-solve diagnostics — "Why this formula?"
// ---------------------------------------------------------------------------
//
// After a feasible solve, we inspect the solution to identify:
//   1. Binding nutrients — pressed against their min/max target bound.
//      Means the solver couldn't go lower/higher; this nutrient drove the mix.
//   2. Binding caps — ingredients at their maxInclusion limit.
//      Means the solver wanted more of this ingredient but hit the cap.
//   3. Unused ingredients — selected but solver gave 0 kg (not cost-effective).
//
// The user sees these as hints like:
//   "Molasses is at its cap (10%) — raising the cap could reduce cost"
//   "Protein is at its minimum (18%) — you're at the cheapest feasible level"
// ---------------------------------------------------------------------------

function buildDiagnostics(
  ingredients: Ingredient[],
  quantities: Record<string, number>,
  ranges: NutrientRange,
  batchSize: number,
  locks: Record<string, number>,
): Diagnostics {
  // 1) Binding nutrients — compute concentration, compare to min/max
  let totalDM = 0;
  for (const ing of ingredients) {
    totalDM += (quantities[ing.key] ?? 0) * (ing.dm / 100);
  }

  const bindingNutrients: BindingNutrient[] = [];
  const EPS = 0.05; // tolerance % (or Mcal for energy)

  for (const c of CONSTRAINED) {
    let nutKg = 0;
    for (const ing of ingredients) {
      const q = quantities[ing.key] ?? 0;
      const dmKg = q * (ing.dm / 100);
      nutKg += dmKg * ing[c.field];
    }
    const value = totalDM > 0 ? nutKg / totalDM : 0;
    const bound = ranges[c.rangeKey];

    // Use a tighter tolerance for ME (Mcal, not %)
    const tol = c.field === 'me' ? 0.02 : EPS;

    if (Math.abs(value - bound.min) < tol) {
      bindingNutrients.push({ nutrient: c.key, bound: 'min', value: round(value, 2), target: bound.min });
    } else if (Math.abs(value - bound.max) < tol) {
      bindingNutrients.push({ nutrient: c.key, bound: 'max', value: round(value, 2), target: bound.max });
    }
  }

  // 2) Binding caps — ingredients at their maxInclusion limit (skip locked ones,
  //    they're "at their value" by definition, not because of an optimisation cap)
  const bindingCaps: BindingCap[] = [];
  for (const ing of ingredients) {
    if (locks[ing.key] !== undefined) continue; // locked ingredient, skip
    const capKg = (ing.maxInclusion / 100) * batchSize;
    const actual = quantities[ing.key] ?? 0;
    if (capKg > 0 && actual > 0 && actual >= capKg - 0.05) {
      bindingCaps.push({
        ingredientKey: ing.key,
        capPercent: ing.maxInclusion,
        actualKg: round(actual, 2),
      });
    }
  }

  // 3) Unused ingredients — selected but solver gave essentially 0 kg
  const unused: string[] = [];
  for (const ing of ingredients) {
    if (locks[ing.key] !== undefined) continue; // user locked it, don't flag
    if ((quantities[ing.key] ?? 0) < 0.05) unused.push(ing.key);
  }

  return { bindingNutrients, bindingCaps, unused };
}

// ---------------------------------------------------------------------------
// Infeasibility diagnosis
// ---------------------------------------------------------------------------
//
// When the LP is infeasible we try to identify which nutrient range can't
// be met with the user's ingredient selection + caps. We do this by
// computing, for each nutrient, the BEST-CASE value (maxing the richest
// ingredient to its cap, filling remainder with second-best, etc.) and the
// WORST-CASE value. If the achievable range doesn't overlap the target range,
// we know that nutrient is the blocker.
//
// Keep this fast & approximate — it's a hint for the user, not exact.
// ---------------------------------------------------------------------------

function diagnoseBottleneck(input: AutoFormulateInput, ings: Ingredient[]): string {
  const batchSize = input.batchSize ?? 100;

  // -------------------------------------------------------------------------
  // Pass 1 — individual-nutrient greedy check
  //   If ANY nutrient is impossible on its own (best/worst case greedy fill
  //   can't reach the target range), that's the clear blocker.
  // -------------------------------------------------------------------------
  const individualBlockers: string[] = [];
  for (const c of CONSTRAINED) {
    const sortedDesc = [...ings].sort(
      (a, b) => b[c.field] * (b.dm / 100) - a[c.field] * (a.dm / 100)
    );
    const sortedAsc = [...sortedDesc].reverse();

    const maxVal = greedyConcentration(sortedDesc, c.field, batchSize);
    const minVal = greedyConcentration(sortedAsc,  c.field, batchSize);
    const { min: targetMin, max: targetMax } = input.ranges[c.rangeKey];

    if (maxVal < targetMin) individualBlockers.push(`${c.key} too low (max achievable ≈ ${maxVal.toFixed(2)}, need ≥ ${targetMin})`);
    if (minVal > targetMax) individualBlockers.push(`${c.key} too high (min achievable ≈ ${minVal.toFixed(2)}, need ≤ ${targetMax})`);
  }
  if (individualBlockers.length > 0) {
    return individualBlockers.join('; ');
  }

  // -------------------------------------------------------------------------
  // Pass 2 — pairwise relax-and-solve
  //   Each nutrient individually CAN be met, but combined constraints are
  //   infeasible. Relax ONE nutrient constraint at a time and see which
  //   relaxation unlocks feasibility → that's the binding pair.
  // -------------------------------------------------------------------------
  const relaxBlockers: string[] = [];
  for (const c of CONSTRAINED) {
    const { min: tMin, max: tMax } = input.ranges[c.rangeKey];
    // Widen the range to ±50% of its width to test if it's the bottleneck
    const width = tMax - tMin;
    const relaxed: NutrientRange = {
      ...input.ranges,
      [c.rangeKey]: { min: Math.max(0, tMin - width * 0.5), max: tMax + width * 0.5 },
    };
    const testResult = autoFormulate({
      ...input,
      ranges: relaxed,
      _skipDiagnosis: true,   // prevent recursion
    });
    if (testResult.success) {
      relaxBlockers.push(c.key);
    }
  }

  // -------------------------------------------------------------------------
  // Pass 3 — ingredient-gap suggestions
  //   Based on which nutrients seem binding, suggest concrete ingredients.
  // -------------------------------------------------------------------------
  const suggestions = suggestMissingIngredients(ings, relaxBlockers);

  const parts: string[] = [];
  if (relaxBlockers.length > 0) {
    parts.push(`conflicting: ${relaxBlockers.join(' + ')}`);
  }
  if (suggestions.length > 0) {
    parts.push(`try adding: ${suggestions.join(' or ')}`);
  }
  return parts.length > 0
    ? parts.join(' · ')
    : 'constraints cannot all be satisfied simultaneously';
}

/**
 * Suggest concrete ingredient additions based on which nutrient constraints
 * are binding. Matches against a curated list of "high-impact" Pakistani
 * ingredients the user likely hasn't selected yet.
 */
function suggestMissingIngredients(
  selected: Ingredient[],
  binding: string[],
): string[] {
  const selectedKeys = new Set(selected.map((i) => i.key));
  const tips: string[] = [];

  const hasKey = (k: string) => selectedKeys.has(k);
  const needsMoreProtein = binding.includes('protein') || binding.includes('tdn');
  const needsLessFibre   = binding.includes('fiber');
  const needsMoreEnergy  = binding.includes('energy');

  // High-protein + low-fibre picks (SBM, CGM 60, canola)
  if (needsMoreProtein || needsLessFibre) {
    if (!hasKey('sbm')) tips.push('Soybean Meal (SBM) — 46% CP, low fibre');
    else if (!hasKey('corn_gluten_meal')) tips.push('Corn Gluten Meal 60% — premium protein, very low fibre');
    else if (!hasKey('canola_meal')) tips.push('Canola Meal — 36% CP');
  }

  // High-energy picks
  if (needsMoreEnergy) {
    if (!hasKey('wheat_grain')) tips.push('Wheat Grain — 3.28 Mcal/kg DM');
    if (!hasKey('bypassFat')) tips.push('Bypass Fat — 4.78 Mcal/kg DM');
  }

  // Fibre too high → alternative low-fibre options
  if (needsLessFibre) {
    if (!hasKey('broken_rice')) tips.push('Broken Rice (Tukri) — very low fibre, high starch');
  }

  return tips.slice(0, 3); // cap to top 3 to keep message short
}

/**
 * Greedy fill to estimate an extreme-case weighted concentration on DM basis.
 * `sorted` should be ordered so the first item is the most-preferred contributor.
 */
function greedyConcentration(
  sorted: Ingredient[],
  field: keyof Pick<Ingredient, 'cp' | 'me' | 'tdn' | 'ndf' | 'fat' | 'ca' | 'p'>,
  batchSize: number
): number {
  let remainder = batchSize;
  let dmAcc = 0;
  let nutrientAcc = 0;

  for (const ing of sorted) {
    if (remainder <= 0) break;
    const take = Math.min(remainder, (ing.maxInclusion / 100) * batchSize);
    const dmKg = take * (ing.dm / 100);
    dmAcc += dmKg;
    nutrientAcc += dmKg * ing[field];
    remainder -= take;
  }

  return dmAcc > 0 ? nutrientAcc / dmAcc : 0;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
