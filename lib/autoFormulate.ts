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
import {
  getAllIngredients,
  getIngredient,
  type Ingredient,
  type NutrientRange,
} from './constants';

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
 *   'balanced'    — sits as close to the MIDDLE of every nutrient range as
 *                   possible, so nothing is pinned at a constraint boundary
 *                   and the recipe tolerates real-world ingredient variation.
 *                   Implemented by shrinking every target range toward its
 *                   midpoint as far as it will still solve — see
 *                   `solveBalancedByTightening()` for why it works this way.
 */
export type OptimisationMode = 'min_cost' | 'max_protein' | 'max_energy' | 'balanced';

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

/**
 * A single nutrient that the selected ingredients cannot satisfy.
 * `direction` says which side of the target window is unreachable, and
 * `achievable` is the greedy best-case (for too_low) or worst-case (for too_high).
 */
export interface NutrientGap {
  /** App's range key: 'protein' | 'energy' | 'tdn' | 'fiber' | 'fat' | 'calcium' | 'phosphorus' */
  nutrient: string;
  /** 'too_low' = even greedy max can't reach min; 'too_high' = even greedy min stays above max */
  direction: 'too_low' | 'too_high';
  /** The greedy extreme value (best for too_low, worst for too_high) on DM basis */
  achievable: number;
  /** The violated bound (range.min for too_low, range.max for too_high) */
  required: number;
}

/**
 * A concrete, farmer-facing next step: one ingredient to add.
 *
 * `kind` says how strong the recommendation is:
 *   'exact_fix' — VERIFIED. We re-solved the LP with this ingredient added and
 *                 it became feasible. Adding this one thing is guaranteed to work.
 *   'helps'     — this ingredient pushes the blocking nutrient the right way,
 *                 but on its own it isn't enough (2+ additions needed).
 */
export interface IngredientFix {
  /** Ingredient key to add. */
  key: string;
  /** Which Step 2 section the user will find it in. */
  category: string;
  kind: 'exact_fix' | 'helps';
  /** Resulting per-kg price if added (only for 'exact_fix'). Lets the UI rank by cost. */
  perKgPrice?: number;
  /** For 'helps': which nutrient this addresses, and which way it moves it. */
  nutrient?: string;
  direction?: 'too_low' | 'too_high';
}

/**
 * Structured form of the infeasibility diagnostic — designed for friendly UIs.
 *
 *   hardBlockers         — nutrients individually unreachable (Pass 1 of the diagnostic)
 *   conflictingNutrients — nutrients that ARE individually reachable but can't all be hit
 *                          together (Pass 2 — relax-and-solve)
 *   suggestedAdditions   — ingredient keys that would help close the gaps (legacy flat list)
 *   fixes                — the same advice in structured, direction-aware form. This is
 *                          what UIs should render: it is never empty for an infeasible
 *                          solve, and 'exact_fix' entries are verified by re-solving.
 *
 * NOTE ON REMOVAL: dropping an ingredient can never restore feasibility. Every
 * ingredient's lower bound is 0, so the solver could already have chosen not to
 * use it — removing one only shrinks the feasible set. All advice is therefore
 * additive. Do not tell users to "remove the ingredient that's overloading".
 */
export interface InfeasibilityAnalysis {
  hardBlockers: NutrientGap[];
  conflictingNutrients: string[];
  suggestedAdditions: string[];
  fixes: IngredientFix[];
}

export interface AutoFormulateFailure {
  success: false;
  /** User-friendly reason (bilingual-safe; caller translates). */
  reason: 'infeasible' | 'missing_data' | 'no_ingredients';
  /** Diagnostic hint — which nutrient(s) or sources are the bottleneck (legacy string form). */
  bottleneck?: string;
  /** Same diagnosis in structured form, for richer UIs that want to render bullets/labels. */
  analysis?: InfeasibilityAnalysis;
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

  // Locks are needed by both the balanced path and the normal model build.
  const locks = input.lockedQuantities ?? {};

  // ── Balanced mode is solved by a different method ────────────────────────
  // It reduces to a sequence of ordinary min/max solves — no auxiliary slack
  // variables, which is what makes it safe. See the function's own comment.
  if ((input.mode ?? 'min_cost') === 'balanced') {
    return solveBalancedByTightening(input, ingredients, batchSize, locks);
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
  for (const [key, lockedKg] of Object.entries(locks)) {
    if (keys.includes(key) && Number.isFinite(lockedKg) && lockedKg >= 0) {
      constraints[`lock_${key}`] = { equal: lockedKg };
    }
  }

  const mode = input.mode ?? 'min_cost';

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

  // Pick the objective based on the mode. 'balanced' never reaches here — it is
  // handled above by solveBalancedByTightening().
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
    // Skip diagnosis if we're already inside a diagnostic probe call (Pass 2
    // recursion would otherwise blow up).
    if (input._skipDiagnosis) {
      return { success: false, reason: 'infeasible' };
    }
    const { summary, analysis } = diagnoseBottleneck(input, ingredients);
    return { success: false, reason: 'infeasible', bottleneck: summary, analysis };
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
// Balanced mode — "centre every nutrient", solved without slack variables
// ---------------------------------------------------------------------------
//
// WHY THIS ISN'T THE TEXTBOOK FORMULATION
//
// The obvious way to express "minimise total deviation from each range's
// midpoint" is to linearise the absolute values with an auxiliary non-negative
// slack per nutrient (bal_abs_n ≥ |dev_n|) and minimise their sum. That is what
// this code used to do, and it worked — until it didn't.
//
// javascript-lp-solver implements a naive simplex with no anti-cycling rule
// (no Bland's rule, no perturbation, no iteration cap). The slack formulation
// is highly degenerate: many bases give the same objective value, which is
// exactly the condition under which such a solver can pivot in a loop forever.
// It did: several ordinary selections (e.g. a dairy-cow mix including Bypass
// Fat 85%) sent `solver.Solve` into an infinite loop. Because this is
// synchronous client-side JS on the main thread, that isn't a slow solve — it
// is a frozen browser tab, and Step 3 runs this mode automatically on mount.
//
// Rescaling the coefficients did not fix it; it only moved the hang to a
// different animal/stage. The fix that actually holds is to stop building the
// degenerate model at all.
//
// WHAT THIS DOES INSTEAD
//
// "As close to the middle as possible" can be expressed as: shrink every target
// range toward its own midpoint by a common factor t, and find the largest t
// that is still satisfiable.
//
//     min_t = mid − (mid − min) × (1 − t)
//     max_t = mid + (max − mid) × (1 − t)
//
//   t = 0 → the original range;  t = 1 → collapsed onto the midpoint exactly.
//
// Each trial is an ORDINARY min/max model — the same shape as min_cost, which
// has never been observed to cycle. We bisect on t, keeping the last feasible
// solution. The inner objective stays least-cost, so among equally well-centred
// recipes the cheapest wins, which is a useful tie-breaker and also removes the
// degeneracy that caused the hang.
//
// The result is the same thing a farmer wants from "Balanced" — every nutrient
// pulled off its constraint boundary toward the centre of its window — reached
// by a method that terminates.
// ---------------------------------------------------------------------------

/**
 * Shrink nutrient ranges toward their midpoints.
 *
 * `t` may be a single factor applied to every nutrient, or a per-nutrient map
 * (used by the refinement pass, which tightens each nutrient independently).
 * Exported so the TMR solver can reuse the identical balanced strategy.
 */
export function tightenRanges(
  ranges: NutrientRange,
  t: number | Record<string, number>,
): NutrientRange {
  const out = {} as NutrientRange;
  for (const c of CONSTRAINED) {
    const b = ranges[c.rangeKey];
    const mid = (b.min + b.max) / 2;
    const tn = typeof t === 'number' ? t : (t[c.rangeKey] ?? 0);
    out[c.rangeKey] = {
      min: mid - (mid - b.min) * (1 - tn),
      max: mid + (b.max - mid) * (1 - tn),
    };
  }
  return out;
}

/** How many bisection steps to spend locating the tightest feasible ranges. */
export const BALANCED_BISECTION_STEPS = 12;

/** Bisection steps per nutrient in the refinement pass (7 nutrients). */
export const BALANCED_REFINE_STEPS = 8;

function solveBalancedByTightening(
  input: AutoFormulateInput,
  ingredients: Ingredient[],
  batchSize: number,
  locks: Record<string, number>,
): AutoFormulateResult {
  // Step 1 — is the problem solvable at all, at the original ranges?
  const base = autoFormulate({ ...input, mode: 'min_cost', _skipDiagnosis: true });
  if (!base.success) {
    // Infeasible even wide open. Fall back to the normal failure path so the
    // caller still gets the full diagnosis (unless this is itself a probe).
    if (input._skipDiagnosis) return { success: false, reason: 'infeasible' };
    const { summary, analysis } = diagnoseBottleneck(input, ingredients);
    return { success: false, reason: 'infeasible', bottleneck: summary, analysis };
  }

  const solve = (ranges: NutrientRange) =>
    autoFormulate({ ...input, mode: 'min_cost', ranges, _skipDiagnosis: true });

  // Step 2 — find each nutrient's own tightening limit, INDEPENDENTLY.
  //
  // A single uniform factor is a trap: some nutrients simply cannot approach
  // their midpoint with the chosen ingredients (a mix that tops out at 3.1% fat
  // can never reach a 4.5% midpoint), and one such nutrient pins the uniform
  // factor near zero, leaving every OTHER nutrient uncentred too. Measuring each
  // nutrient on its own lets the reachable ones be centred properly.
  const tvec: Record<string, number> = {};
  for (const c of CONSTRAINED) {
    let lo = 0, hi = 1;
    for (let i = 0; i < BALANCED_REFINE_STEPS; i++) {
      const t = (lo + hi) / 2;
      if (solve(tightenRanges(input.ranges, { [c.rangeKey]: t })).success) lo = t;
      else hi = t;
    }
    tvec[c.rangeKey] = lo;
  }

  // Step 3 — apply all the limits together, backing off if they conflict.
  // Individually-feasible tightenings can be jointly infeasible, so bisect a
  // single scale factor on the whole vector down to something that solves.
  let best = base;
  let sLo = 0, sHi = 1;
  const scaled = (s: number) => {
    const v: Record<string, number> = {};
    for (const c of CONSTRAINED) v[c.rangeKey] = tvec[c.rangeKey] * s;
    return v;
  };
  const full = solve(tightenRanges(input.ranges, scaled(1)));
  if (full.success) {
    best = full;
  } else {
    for (let i = 0; i < BALANCED_BISECTION_STEPS; i++) {
      const s = (sLo + sHi) / 2;
      const trial = solve(tightenRanges(input.ranges, scaled(s)));
      if (trial.success) { best = trial; sLo = s; } else { sHi = s; }
    }
  }

  // Step 4 — recompute diagnostics against the ORIGINAL ranges. `best` was
  // solved against tightened ones, so its own diagnostics would report
  // "binding" against bounds the user never asked for.
  const diagnostics = buildDiagnostics(
    ingredients, best.quantities, input.ranges, batchSize, locks,
  );

  return { ...best, diagnostics };
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

function diagnoseBottleneck(
  input: AutoFormulateInput,
  ings: Ingredient[],
): { summary: string; analysis: InfeasibilityAnalysis } {
  const batchSize = input.batchSize ?? 100;

  // -------------------------------------------------------------------------
  // Pass 1 — individual-nutrient greedy check
  //   If ANY nutrient is impossible on its own (best/worst case greedy fill
  //   can't reach the target range), that's the clear blocker.
  // -------------------------------------------------------------------------
  const hardBlockers: NutrientGap[] = [];
  for (const c of CONSTRAINED) {
    const sortedDesc = [...ings].sort(
      (a, b) => b[c.field] * (b.dm / 100) - a[c.field] * (a.dm / 100)
    );
    const sortedAsc = [...sortedDesc].reverse();

    const maxVal = greedyConcentration(sortedDesc, c.field, batchSize);
    const minVal = greedyConcentration(sortedAsc,  c.field, batchSize);
    const { min: targetMin, max: targetMax } = input.ranges[c.rangeKey];

    if (maxVal < targetMin) hardBlockers.push({ nutrient: c.key, direction: 'too_low',  achievable: round(maxVal, 2), required: targetMin });
    if (minVal > targetMax) hardBlockers.push({ nutrient: c.key, direction: 'too_high', achievable: round(minVal, 2), required: targetMax });
  }

  if (hardBlockers.length > 0) {
    const gapText = hardBlockers.map((g) =>
      g.direction === 'too_low'
        ? `${g.nutrient} too low (max achievable ≈ ${g.achievable.toFixed(2)}, need ≥ ${g.required})`
        : `${g.nutrient} too high (min achievable ≈ ${g.achievable.toFixed(2)}, need ≤ ${g.required})`
    ).join('; ');
    const fixes = buildFixes(input, ings, hardBlockers, []);
    const summary = fixes.length > 0
      ? `${gapText} · try adding: ${fixes.map(describeFix).join(' or ')}`
      : gapText;
    return {
      summary,
      analysis: {
        hardBlockers,
        conflictingNutrients: [],
        suggestedAdditions: fixes.map((f) => f.key),
        fixes,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Pass 2 — pairwise relax-and-solve
  //   Each nutrient individually CAN be met, but combined constraints are
  //   infeasible. Relax ONE nutrient constraint at a time and see which
  //   relaxation unlocks feasibility → that's the binding pair.
  // -------------------------------------------------------------------------
  const conflictingNutrients: string[] = [];
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
      // min_cost for the same reason as buildFixes' probes: this asks "is the
      // relaxed problem FEASIBLE?", and the feasible set doesn't depend on the
      // objective. It also matters for safety — carrying `balanced` in here
      // built a relaxed slack model that made the solver cycle forever, so a
      // user pressing Balanced on certain selections hung the whole app.
      mode: 'min_cost',
      _skipDiagnosis: true,   // prevent recursion
    });
    if (testResult.success) {
      conflictingNutrients.push(c.key);
    }
  }

  // -------------------------------------------------------------------------
  // Pass 3 — ingredient suggestions
  //   Direction-aware, and validated by re-solving where possible.
  // -------------------------------------------------------------------------
  const fixes = buildFixes(input, ings, [], conflictingNutrients);

  const parts: string[] = [];
  if (conflictingNutrients.length > 0) {
    parts.push(`conflicting: ${conflictingNutrients.join(' + ')}`);
  }
  if (fixes.length > 0) {
    parts.push(`try adding: ${fixes.map(describeFix).join(' or ')}`);
  }
  const summary = parts.length > 0
    ? parts.join(' · ')
    : 'constraints cannot all be satisfied simultaneously';

  return {
    summary,
    analysis: {
      hardBlockers: [],
      conflictingNutrients,
      suggestedAdditions: fixes.map((f) => f.key),
      fixes,
    },
  };
}

/**
 * Ingredients the auto-suggester must never recommend, even when the maths says
 * they'd close the gap fastest.
 *
 * `urea` is the whole reason this list exists. It is non-protein nitrogen with a
 * 287% crude-protein equivalent, so the LP loves it: it's the cheapest way to
 * lift CP and it wins on cost almost every time. But it is also the only
 * ingredient here that can kill an animal outright — above ~1.5% of the
 * concentrate, or unevenly mixed so the animal hits a hot spot, it causes
 * ammonia toxicity and death within hours, and it must never be fed to calves
 * under 3 months. Putting it at the top of a "tap this to fix your formula"
 * list, for an audience that may not read the cap warning, is not acceptable.
 *
 * Expert users can still select urea manually in Step 2 — where the ingredient
 * modal shows its full cap reason — it just won't be volunteered.
 */
const NEVER_SUGGEST = new Set<string>(['urea']);

/**
 * Build concrete "add this ingredient" advice for an infeasible selection.
 *
 * Two passes, strongest first:
 *
 *   1. SINGLE-ADDITION SOLVE (verified). Try adding each unselected ingredient
 *      and re-solve. Anything that flips the LP to feasible is a guaranteed fix,
 *      so we can tell the user "tap this one thing and you're done" and be right.
 *      Ranked cheapest-first. This is ~35 tiny solves and only runs when the
 *      selection is already infeasible, so the cost is a few milliseconds.
 *
 *   2. DIRECTION-AWARE FALLBACK. When no single addition is enough, recommend
 *      ingredients that at least push each blocking nutrient the correct way:
 *      for a `too_low` nutrient the registry's richest sources, and for a
 *      `too_high` nutrient the leanest ones (a diluent). Direction matters —
 *      suggesting a high-energy grain when energy is already over its ceiling
 *      is worse than saying nothing.
 */
function buildFixes(
  input: AutoFormulateInput,
  selected: Ingredient[],
  gaps: NutrientGap[],
  conflicting: string[],
): IngredientFix[] {
  const selectedKeys = new Set(selected.map((i) => i.key));
  const candidates = getAllIngredients()
    .filter((i) => !selectedKeys.has(i.key))
    .filter((i) => !NEVER_SUGGEST.has(i.key));

  // ---- Pass 1: does adding exactly one ingredient make it solvable? ----
  const exact: IngredientFix[] = [];
  for (const cand of candidates) {
    const probe = autoFormulate({
      ...input,
      ingredientKeys: [...selectedKeys, cand.key],
      // Always probe in min_cost, whatever mode the caller asked for.
      // FEASIBILITY IS INDEPENDENT OF THE OBJECTIVE — the constraint set is
      // identical across modes, so a cheaper, smaller model answers the same
      // question. This also keeps `balanced`'s auxiliary slack variables out of
      // the probe loop (they make the model ~2x bigger and worse-conditioned),
      // and makes the reported perKgPrice a true least-cost figure.
      mode: 'min_cost',
      _skipDiagnosis: true,          // never recurse into diagnosis from a probe
    });
    if (probe.success) {
      exact.push({
        key: cand.key,
        category: cand.category,
        kind: 'exact_fix',
        perKgPrice: probe.perKgPrice,
      });
    }
  }
  if (exact.length > 0) {
    // Cheapest first — the farmer should see the most affordable fix at the top.
    exact.sort((a, b) => (a.perKgPrice ?? 0) - (b.perKgPrice ?? 0));
    return dedupeByCategory(exact, 4);
  }

  // ---- Pass 2: no single ingredient is enough — push each nutrient the right way ----
  const targets: Array<{ nutrient: string; direction: 'too_low' | 'too_high' }> = [
    ...gaps.map((g) => ({ nutrient: g.nutrient, direction: g.direction })),
    // Conflicting nutrients have no direction from Pass 2; treat as 'too_low',
    // the far more common case for a farmer who hasn't picked enough variety.
    ...conflicting
      .filter((n) => !gaps.some((g) => g.nutrient === n))
      .map((n) => ({ nutrient: n, direction: 'too_low' as const })),
  ];

  const helps: IngredientFix[] = [];
  for (const { nutrient, direction } of targets) {
    const spec = CONSTRAINED.find((c) => c.key === nutrient);
    if (!spec) continue;

    const pool = candidates.filter((i) => {
      if (direction === 'too_low') return i[spec.field] > 0;   // must actually supply it
      // Bringing a nutrient DOWN means diluting with a real feedstuff. A pure
      // mineral or neat oil technically dilutes energy too, but "add limestone
      // to lower energy" is nonsense advice to a farmer — require the candidate
      // to carry protein or fibre so the suggestion is a genuine feed swap.
      return i.cp > 0 || i.ndf > 0;
    });

    // Rank by DM-weighted contribution, scaled by how much of the ingredient may
    // legally be used — something capped at 1% cannot shift a total meaningfully.
    const ranked = pool
      .map((i) => ({
        ing: i,
        power: i[spec.field] * (i.dm / 100) * Math.min(i.maxInclusion, 50),
      }))
      .sort((a, b) => (direction === 'too_low' ? b.power - a.power : a.power - b.power));

    // One suggestion per nutrient, so a 4-item list covers 4 different problems
    // rather than four ways to add protein.
    const pick = ranked.find(({ ing }) => !helps.some((h) => h.key === ing.key));
    if (pick) {
      helps.push({ key: pick.ing.key, category: pick.ing.category, kind: 'helps', nutrient, direction });
    }
  }

  return helps.slice(0, 4);
}

/**
 * Trim a fix list so the user sees variety rather than four near-identical
 * options — at most 2 from any single category, capped at `limit` overall.
 */
function dedupeByCategory(fixes: IngredientFix[], limit: number): IngredientFix[] {
  const perCategory = new Map<string, number>();
  const out: IngredientFix[] = [];
  for (const f of fixes) {
    const n = perCategory.get(f.category) ?? 0;
    if (n >= 2) continue;
    perCategory.set(f.category, n + 1);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/** Short human-readable label for the legacy `bottleneck` string. */
function describeFix(fix: IngredientFix): string {
  const ing = getIngredient(fix.key);
  const name = ing?.nameEn ?? fix.key;
  if (fix.kind === 'exact_fix') return `${name} (${fix.category})`;
  const dir = fix.direction === 'too_low' ? 'raises' : 'lowers';
  return `${name} — ${dir} ${fix.nutrient}`;
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
