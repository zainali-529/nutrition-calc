// ================================================================================
// TMR AUTO-FORMULATE — least-cost Total Mixed Ration via Linear Programming
// ================================================================================
//
// Same LP shape as the concentrate-only solver (lib/autoFormulate.ts) PLUS one
// extra equality constraint that pins the forage : concentrate split on a DM
// basis to whatever the user chose.
//
// ── DM-split constraint derivation ──────────────────────────────────────────
//
//   Let f = forage_pct / 100  (so f ∈ [0, 1])
//
//   We want:   forage_DM  =  f × total_DM
//                         =  f × (forage_DM + concentrate_DM)
//
//   Rearranging:
//     (1 - f) × forage_DM  −  f × concentrate_DM  =  0
//
//   In LP form, for each ingredient i:
//     coef_i × x_i, summed across all ingredients, must equal 0
//
//   Where:
//     coef_i  =  +(1 - f) × (dm_i / 100)   if i is a forage
//     coef_i  =  −f       × (dm_i / 100)   if i is a concentrate
//
//   This linearises cleanly because dm_i is a constant per ingredient.
//
// ── Other constraints (same as concentrate solver) ──────────────────────────
//   • SUM(x_i) = batchSize                     (total weight)
//   • per-nutrient min / max on DM-weighted concentration
//   • per-ingredient maxInclusion caps
//   • per-ingredient locks (equality constraints)
//   • objective: min cost / max protein / max energy
// ================================================================================

import solver from 'javascript-lp-solver';
import type { NutrientRange } from './constants';
import { getAnyIngredient, isForage, type AnyIngredient } from './forages';
import type { OptimisationMode } from './autoFormulate';

export interface TmrFormulateInput {
  /** All ingredient keys (forages AND concentrates, mixed). */
  ingredientKeys: string[];
  /** Whole-diet target ranges from lib/tmrRanges.ts. */
  ranges: NutrientRange;
  /** Total batch size, kg as-fed. Default 100. */
  batchSize?: number;
  /** Forage share of DM as a percentage (0-100). Hard equality constraint. */
  forageDmPct: number;
  /** Locked ingredients — kg quantities the LP must preserve exactly. */
  lockedQuantities?: Record<string, number>;
  /** Objective: 'min_cost' | 'max_protein' | 'max_energy'. Default min_cost. */
  mode?: OptimisationMode;
  /** @internal — recursion guard for diagnostic relax-and-solve */
  _skipDiagnosis?: boolean;
}

export interface TmrSuccess {
  success: true;
  /** kg as-fed per ingredient. Keys match input.ingredientKeys. */
  quantities: Record<string, number>;
  cost: number;
  perKgPrice: number;
  /** Achieved forage share of DM (should match input.forageDmPct within rounding). */
  achievedForagePct: number;
  /** Achieved concentrate share of DM. */
  achievedConcentratePct: number;
}

export interface TmrFailure {
  success: false;
  reason: 'infeasible' | 'missing_data' | 'no_ingredients' | 'no_forage' | 'no_concentrate';
  bottleneck?: string;
}

export type TmrResult = TmrSuccess | TmrFailure;

// Same nutrient-constraint set as the concentrate solver.
const CONSTRAINED = [
  { key: 'protein',    field: 'cp'  as const, rangeKey: 'protein'    as const },
  { key: 'energy',     field: 'me'  as const, rangeKey: 'energy'     as const },
  { key: 'tdn',        field: 'tdn' as const, rangeKey: 'tdn'        as const },
  { key: 'fiber',      field: 'ndf' as const, rangeKey: 'fiber'      as const },
  { key: 'fat',        field: 'fat' as const, rangeKey: 'fat'        as const },
  { key: 'calcium',    field: 'ca'  as const, rangeKey: 'calcium'    as const },
  { key: 'phosphorus', field: 'p'   as const, rangeKey: 'phosphorus' as const },
];

export function tmrFormulate(input: TmrFormulateInput): TmrResult {
  const batchSize = input.batchSize && input.batchSize > 0 ? input.batchSize : 100;
  const keys = [...new Set(input.ingredientKeys)];
  if (keys.length === 0) return { success: false, reason: 'no_ingredients' };

  // Validate forage % bounds
  if (input.forageDmPct < 0 || input.forageDmPct > 100) {
    return { success: false, reason: 'infeasible', bottleneck: 'forageDmPct must be between 0 and 100' };
  }

  // Resolve all ingredients (forage + concentrate) through the unified getter.
  const ingredients: AnyIngredient[] = [];
  for (const k of keys) {
    const ing = getAnyIngredient(k);
    if (!ing) return { success: false, reason: 'missing_data', bottleneck: k };
    ingredients.push(ing);
  }

  // Sanity-check the ingredient mix against the requested split
  const hasForage      = ingredients.some((i) => isForage(i.key));
  const hasConcentrate = ingredients.some((i) => !isForage(i.key));
  if (input.forageDmPct > 0   && !hasForage)      return { success: false, reason: 'no_forage' };
  if (input.forageDmPct < 100 && !hasConcentrate) return { success: false, reason: 'no_concentrate' };

  // ── Build the LP model ──────────────────────────────────────────────────
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {
    total: { equal: batchSize },
    // Hard DM-split equality constraint — see header comment for derivation
    dm_split: { equal: 0 },
  };

  // Per-nutrient bounds (linearised: SUM(x_i × dm_i × (val − bound)) ≷ 0)
  for (const c of CONSTRAINED) {
    constraints[`${c.key}_min`] = { min: 0 };
    constraints[`${c.key}_max`] = { max: 0 };
  }

  // Per-ingredient maxInclusion caps
  for (const ing of ingredients) {
    constraints[`cap_${ing.key}`] = { max: (ing.maxInclusion / 100) * batchSize };
  }

  // Lock constraints
  const locks = input.lockedQuantities ?? {};
  for (const [k, lockedKg] of Object.entries(locks)) {
    if (keys.includes(k) && Number.isFinite(lockedKg) && lockedKg >= 0) {
      constraints[`lock_${k}`] = { equal: lockedKg };
    }
  }

  // Balanced-mode constraints (one ≤-pair per nutrient — slack absorbs deviation
  // from the range midpoint). See lib/autoFormulate.ts for the derivation.
  const mode = input.mode ?? 'min_cost';
  if (mode === 'balanced') {
    for (const c of CONSTRAINED) {
      constraints[`bal_${c.key}_pos`] = { max: 0 };
      constraints[`bal_${c.key}_neg`] = { max: 0 };
    }
  }

  // Build per-ingredient coefficient rows
  const f = input.forageDmPct / 100;
  for (const ing of ingredients) {
    const dmFrac = ing.dm / 100;
    const coef: Record<string, number> = {
      total:    1,
      cost:     ing.price ?? 0,
      cp_total: dmFrac * (ing.cp ?? 0),
      me_total: dmFrac * (ing.me ?? 0),
      bal_obj:  0,                     // ingredients don't contribute directly to bal_obj
    };

    // Nutrient constraints (same form as concentrate LP)
    for (const c of CONSTRAINED) {
      const value = ing[c.field];
      const bound = input.ranges[c.rangeKey];
      coef[`${c.key}_min`] = dmFrac * (value - bound.min);
      coef[`${c.key}_max`] = dmFrac * (value - bound.max);

      // Balanced-mode deviation coefficient (range-width-weighted)
      if (mode === 'balanced') {
        const mid   = (bound.min + bound.max) / 2;
        const width = bound.max - bound.min || 1;
        const devCoef = dmFrac * (value - mid) / width;
        coef[`bal_${c.key}_pos`] =  devCoef;
        coef[`bal_${c.key}_neg`] = -devCoef;
      }
    }

    // DM-split coefficient: + (1-f) × dmFrac for forages, − f × dmFrac for concentrates.
    coef.dm_split = isForage(ing.key)
      ? (1 - f) * dmFrac
      : -f * dmFrac;

    // Cap constraint (one per ingredient)
    coef[`cap_${ing.key}`] = 1;

    // Lock constraint (only if locked)
    if (locks[ing.key] !== undefined) coef[`lock_${ing.key}`] = 1;

    variables[ing.key] = coef;
  }

  // Add balanced-mode slack variables (one per constrained nutrient)
  if (mode === 'balanced') {
    for (const c of CONSTRAINED) {
      variables[`bal_abs_${c.key}`] = {
        bal_obj:                1,
        [`bal_${c.key}_pos`]:  -1,
        [`bal_${c.key}_neg`]:  -1,
      };
    }
  }

  // Choose objective
  const [optimizeField, opType] =
    mode === 'max_protein' ? ['cp_total', 'max'] as const :
    mode === 'max_energy'  ? ['me_total', 'max'] as const :
    mode === 'balanced'    ? ['bal_obj',  'min'] as const :
                              ['cost',     'min'] as const;

  const model = { optimize: optimizeField, opType, constraints, variables };

  let result: Record<string, number | boolean | undefined>;
  try {
    result = solver.Solve(model as Parameters<typeof solver.Solve>[0]) as never;
  } catch {
    return { success: false, reason: 'infeasible' };
  }

  if (!result || result.feasible === false) {
    return {
      success: false,
      reason: 'infeasible',
      bottleneck: input._skipDiagnosis ? undefined : diagnoseTmr(input, ingredients),
    };
  }

  // Extract per-ingredient kg
  const quantities: Record<string, number> = {};
  let totalCost   = 0;
  let totalDM     = 0;
  let forageDM    = 0;
  for (const ing of ingredients) {
    const q = typeof result[ing.key] === 'number' ? (result[ing.key] as number) : 0;
    const safe = Math.max(0, round(q, 2));
    quantities[ing.key] = safe;
    totalCost += safe * (ing.price ?? 0);
    const dmKg = safe * (ing.dm / 100);
    totalDM   += dmKg;
    if (isForage(ing.key)) forageDM += dmKg;
  }

  const achievedForagePct      = totalDM > 0 ? round((forageDM / totalDM) * 100, 1) : 0;
  const achievedConcentratePct = round(100 - achievedForagePct, 1);

  return {
    success: true,
    quantities,
    cost:                   Math.round(totalCost),
    perKgPrice:             round(totalCost / batchSize, 2),
    achievedForagePct,
    achievedConcentratePct,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Infeasibility diagnosis — small TMR-aware version.
//
// We try (in order):
//   1. The most common cause: the user-set DM split is unachievable with the
//      selected ingredients (e.g. asked for 80% forage but selected only 1
//      forage with maxInclusion 50%, etc.).
//   2. Per-nutrient greedy max/min check, similar to the concentrate LP.
// ────────────────────────────────────────────────────────────────────────────

function diagnoseTmr(input: TmrFormulateInput, ings: AnyIngredient[]): string {
  const batchSize = input.batchSize ?? 100;
  const f = input.forageDmPct / 100;

  // Maximum forage DM achievable: sum of (cap × dm) across all forage ingredients
  let maxForageDm = 0;
  let maxConcDm   = 0;
  for (const ing of ings) {
    const capKg = (ing.maxInclusion / 100) * batchSize;
    const dmKg  = capKg * (ing.dm / 100);
    if (isForage(ing.key)) maxForageDm += dmKg;
    else                   maxConcDm   += dmKg;
  }

  // If we maxed all forages and STILL can't reach forage_pct of total DM,
  // the split itself is infeasible.
  // Required forage DM at the chosen split, given total DM = forage_DM + conc_DM:
  //   forage_DM ≥ f × (forage_DM + conc_DM)  ⇒  forage_DM × (1-f) ≥ f × conc_DM
  if (f > 0 && f < 1) {
    const needForage = (f / (1 - f)) * maxConcDm;
    if (maxForageDm < needForage * 0.99) {
      return `selected forages can't supply ${input.forageDmPct}% of DM — add more forage or lower the forage share`;
    }
    const needConc = ((1 - f) / f) * maxForageDm;
    if (maxConcDm < needConc * 0.99) {
      return `selected concentrates can't supply ${100 - input.forageDmPct}% of DM — add more concentrate or raise the forage share`;
    }
  }

  // Nutrient gap check (greedy)
  const blockers: string[] = [];
  for (const c of CONSTRAINED) {
    const sortedDesc = [...ings].sort((a, b) => b[c.field] * (b.dm / 100) - a[c.field] * (a.dm / 100));
    const sortedAsc  = [...sortedDesc].reverse();
    const maxVal = greedyConcentration(sortedDesc, c.field, batchSize);
    const minVal = greedyConcentration(sortedAsc,  c.field, batchSize);
    const { min: tMin, max: tMax } = input.ranges[c.rangeKey];
    if (maxVal < tMin) blockers.push(`${c.key} too low (max achievable ≈ ${maxVal.toFixed(2)}, need ≥ ${tMin})`);
    if (minVal > tMax) blockers.push(`${c.key} too high (min achievable ≈ ${minVal.toFixed(2)}, need ≤ ${tMax})`);
  }
  if (blockers.length > 0) return blockers.join('; ');

  return 'constraints cannot all be satisfied with this DM split — try widening the split or adding more variety';
}

function greedyConcentration(
  sorted: AnyIngredient[],
  field: keyof Pick<AnyIngredient, 'cp' | 'me' | 'tdn' | 'ndf' | 'fat' | 'ca' | 'p'>,
  batchSize: number,
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
