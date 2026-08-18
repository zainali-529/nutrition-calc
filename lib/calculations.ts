// ================================================================================
// FEED FORMULATION CALCULATIONS
// ================================================================================
// All nutrient totals (except DM) are reported on DRY MATTER (DM) BASIS —
// matching the verified Google Sheet logic and international standards
// (NRC / INRA / Feedipedia).
//
// Core formula (per ingredient, where Qty is in kg as-fed):
//     DM_kg       = Qty      × DM%     / 100
//     Nutrient_kg = DM_kg    × Nut%    / 100
//     Energy_Mcal = DM_kg    × ME_Mcal_per_kg_DM
//
// Totals (aggregated across all ingredients):
//     Total DM     (kg)     = SUM(DM_kg)
//     Total Nut%   (DM)     = SUM(Nut_kg) / Total_DM × 100
//     Total Energy (Mcal/kg DM) = SUM(Energy_Mcal) / Total_DM
//     Per-kg Price (Rs/kg)  = SUM(Qty × Price) / SUM(Qty)   ← as-fed basis
//
// This is the same math that passed verification in the sheet at
// Total Qty = 156 kg (CP 24.377%, ME 2.980 Mcal/kg DM, TDN 79.281%, etc.)
// ================================================================================

import { CATEGORY_KEYS, getIngredient, type Ingredient, NutrientRange } from './constants';

export interface FormulaItem {
  name: string;
  key: string;
  kg: number;             // as-fed quantity
  price?: number;         // Rs per kg as-fed (override of registry price)
  quality?: 'excellent' | 'average' | 'poor';
  /** When true, Auto-Formulate treats this ingredient's kg as a fixed
   *  equality constraint and only optimises the rest. */
  locked?: boolean;
}

/**
 * Nutritional summary of a formula.
 *
 * All % values are on DM basis. `dm` is the fraction of the as-fed mix that
 * is dry matter. `energy` is Mcal per kg of DM.
 */
export interface NutrientCalculation {
  // --- Concentrations (what the animal actually eats, per kg of DM) ---
  protein: number;     // % CP   on DM basis
  energy: number;      // Mcal/kg DM  (ME)
  tdn: number;         // % TDN  on DM basis
  adf: number;         // % ADF  on DM basis
  fiber: number;       // % NDF  on DM basis
  fat: number;         // % Fat  on DM basis
  starch: number;      // % Starch on DM basis
  calcium: number;     // % Ca   on DM basis
  phosphorus: number;  // % P    on DM basis
  ash: number;         // % Ash  on DM basis
  dm: number;          // % of as-fed that is DM

  // --- Absolute totals (kg) — useful for display and audits ---
  totalAsFed: number;  // kg of as-fed mix
  totalDM: number;     // kg of dry matter

  // --- Cost ---
  cost: number;        // total Rs for entire batch
  perKgPrice: number;  // Rs per kg of as-fed mix
}

/**
 * How many decimals each result field is DISPLAYED with, everywhere.
 *
 * One definition, because two of them caused a visible contradiction: the Step
 * 3/4 nutrient cards printed CP as "23.7%" while the background-calculation
 * sheet printed the same number as "23.71%". Nothing was actually wrong — the
 * card rounded to 1 dp and the sheet to 2 — but a user comparing the two screens
 * reasonably reads that as the calculator disagreeing with itself, which is
 * fatal for a feature whose whole job is to be trusted and checked by hand.
 *
 * These match the precision `calculateNutrients` itself rounds to below, so the
 * displayed digits are the app's canonical value with nothing hidden.
 */
export const NUTRIENT_DP: Record<keyof NutrientCalculation, number> = {
  protein: 2, energy: 3, tdn: 2, adf: 2, fiber: 2, fat: 2, starch: 2,
  calcium: 3, phosphorus: 3, ash: 2, dm: 2,
  totalAsFed: 2, totalDM: 2, cost: 0, perKgPrice: 2,
};

const EMPTY: NutrientCalculation = {
  protein: 0, energy: 0, tdn: 0, adf: 0, fiber: 0, fat: 0,
  starch: 0, calcium: 0, phosphorus: 0, ash: 0, dm: 0,
  totalAsFed: 0, totalDM: 0, cost: 0, perKgPrice: 0,
};

/**
 * Round helper — returns `value` rounded to `decimals` decimal places.
 */
const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// ================================================================================
// CALCULATION TRACE — the working shown to the user
// ================================================================================
// The "See background calculation" sheet in Step 5 must show the SAME arithmetic
// the app actually performed. Re-deriving it in the UI would risk an audit sheet
// that quietly disagrees with the result it claims to explain — teaching users
// something false, which is worse than showing nothing.
//
// So the trace is the single implementation: `buildCalculationTrace` does the
// per-ingredient work, and `calculateNutrients` is a thin wrapper that rounds its
// totals. Any change to the maths necessarily changes both together.
// ================================================================================

/** The nutrient columns that carry a % concentration on DM basis. */
export const TRACE_NUTRIENTS = [
  { key: 'cp',     label: 'CP',     resultKey: 'protein'    },
  { key: 'tdn',    label: 'TDN',    resultKey: 'tdn'        },
  { key: 'adf',    label: 'ADF',    resultKey: 'adf'        },
  { key: 'ndf',    label: 'NDF',    resultKey: 'fiber'      },
  { key: 'fat',    label: 'Fat',    resultKey: 'fat'        },
  { key: 'starch', label: 'Starch', resultKey: 'starch'     },
  { key: 'ca',     label: 'Ca',     resultKey: 'calcium'    },
  { key: 'p',      label: 'P',      resultKey: 'phosphorus' },
  { key: 'ash',    label: 'Ash',    resultKey: 'ash'        },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<Ingredient, 'cp' | 'tdn' | 'adf' | 'ndf' | 'fat' | 'starch' | 'ca' | 'p' | 'ash'>;
  label: string;
  resultKey: keyof NutrientCalculation;
}>;

export type TraceNutrientKey = (typeof TRACE_NUTRIENTS)[number]['key'];

/** One ingredient's contribution, with every intermediate value kept. */
export interface TraceRow {
  key: string;
  name: string;
  /** As-fed kg the user entered. */
  qty: number;
  /** The ingredient's DM percentage from the registry. */
  dmPct: number;
  /** qty × dmPct / 100 — the dry matter this ingredient contributes. */
  dmKg: number;
  /** Registry percentage per nutrient, as looked up. */
  pct: Record<TraceNutrientKey, number>;
  /** dmKg × pct / 100 — absolute kg of each nutrient contributed. */
  kg: Record<TraceNutrientKey, number>;
  /** ME is Mcal per kg DM, so it multiplies dmKg directly (no /100). */
  mePerKgDm: number;
  meMcal: number;
  /** Price actually used (per-formula override wins over the registry). */
  unitPrice: number;
  cost: number;
}

export interface CalculationTrace {
  rows: TraceRow[];
  totals: {
    qty: number;
    dmKg: number;
    kg: Record<TraceNutrientKey, number>;
    meMcal: number;
    cost: number;
  };
  /** Unrounded concentrations, before `calculateNutrients` rounds them. */
  raw: {
    pct: Record<TraceNutrientKey, number>;
    mePerKgDm: number;
    dmPct: number;
    perKgPrice: number;
  };
}

const zeroed = (): Record<TraceNutrientKey, number> =>
  Object.fromEntries(TRACE_NUTRIENTS.map((n) => [n.key, 0])) as Record<TraceNutrientKey, number>;

/**
 * Walk the formula and keep every intermediate number.
 *
 * Rows with an unknown key or a non-positive quantity are skipped, exactly as
 * `calculateNutrients` skips them — the sheet must not list an ingredient that
 * contributed nothing to the result.
 */
export function buildCalculationTrace(formula: FormulaItem[]): CalculationTrace {
  const rows: TraceRow[] = [];
  const totals = { qty: 0, dmKg: 0, kg: zeroed(), meMcal: 0, cost: 0 };

  for (const item of formula) {
    const data = getIngredient(item.key);
    if (!data) continue;                       // skip unknown keys (e.g. placeholders)
    const qty = item.kg;
    if (qty <= 0) continue;

    const dmKg = qty * (data.dm / 100);
    const pct = zeroed();
    const kg = zeroed();
    for (const n of TRACE_NUTRIENTS) {
      pct[n.key] = data[n.key];
      kg[n.key] = dmKg * (data[n.key] / 100);
      totals.kg[n.key] += kg[n.key];
    }

    const meMcal = dmKg * data.me;             // ME is already per-kg-DM
    const unitPrice = item.price ?? data.price ?? 0;
    const cost = qty * unitPrice;

    totals.qty += qty;
    totals.dmKg += dmKg;
    totals.meMcal += meMcal;
    totals.cost += cost;

    rows.push({
      key: item.key,
      name: item.name || data.nameEn,
      qty, dmPct: data.dm, dmKg,
      pct, kg,
      mePerKgDm: data.me, meMcal,
      unitPrice, cost,
    });
  }

  const pctOut = zeroed();
  if (totals.dmKg > 0) {
    for (const n of TRACE_NUTRIENTS) pctOut[n.key] = (totals.kg[n.key] / totals.dmKg) * 100;
  }

  return {
    rows,
    totals,
    raw: {
      pct: pctOut,
      mePerKgDm: totals.dmKg > 0 ? totals.meMcal / totals.dmKg : 0,
      dmPct: totals.qty > 0 ? (totals.dmKg / totals.qty) * 100 : 0,
      perKgPrice: totals.qty > 0 ? totals.cost / totals.qty : 0,
    },
  };
}

/**
 * Compute all nutrient totals for a given formula on DM basis.
 * Verified against the Google Sheet reference calculator.
 *
 * Thin wrapper over `buildCalculationTrace` — see the note above on why there is
 * only one implementation.
 */
export function calculateNutrients(formula: FormulaItem[]): NutrientCalculation {
  const trace = buildCalculationTrace(formula);
  if (trace.totals.dmKg === 0) return EMPTY;
  const { raw, totals } = trace;

  return {
    protein:    round(raw.pct.cp,     2),
    energy:     round(raw.mePerKgDm,  3),
    tdn:        round(raw.pct.tdn,    2),
    adf:        round(raw.pct.adf,    2),
    fiber:      round(raw.pct.ndf,    2),
    fat:        round(raw.pct.fat,    2),
    starch:     round(raw.pct.starch, 2),
    calcium:    round(raw.pct.ca,     3),
    phosphorus: round(raw.pct.p,      3),
    ash:        round(raw.pct.ash,    2),
    dm:         round(raw.dmPct,      2),
    totalAsFed: round(totals.qty,     2),
    totalDM:    round(totals.dmKg,    2),
    cost:       Math.round(totals.cost),
    perKgPrice: round(raw.perKgPrice, 2),
  };
}

/**
 * Build an initial formula by evenly distributing 100 kg across selected ingredients.
 * Users can then adjust individual quantities in Step 3.
 */
export function buildFormula(
  selectedIngredients: Record<string, string[]>
): FormulaItem[] {
  // Flatten every category bucket in display order. Driven by CATEGORY_KEYS so
  // a new category is picked up automatically rather than silently dropped.
  const items = CATEGORY_KEYS.flatMap((cat) => selectedIngredients[cat] || []);

  if (items.length === 0) return [];

  const baseWeight    = 100;
  const eachWeight    = Math.floor((baseWeight / items.length) * 10) / 10;
  let   remaining     = baseWeight - eachWeight * items.length;

  const formula: FormulaItem[] = items.map((key) => {
    const data = getIngredient(key);
    return {
      name:    data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg:      eachWeight,
      price:   data?.price || 0,
      quality: 'average',
    };
  });

  // Spread leftover decimals across ingredients
  let idx = 0;
  while (remaining > 0.05 && formula.length > 0) {
    if (idx >= formula.length) idx = 0;
    const add = Math.min(0.1, remaining);
    formula[idx].kg = round(formula[idx].kg + add, 1);
    remaining       = round(remaining - add, 1);
    idx++;
  }

  return formula;
}

/** Sum of Qty × Price across the formula (Rs). */
export function calculateTotalCost(formula: FormulaItem[]): number {
  return formula.reduce((sum, item) => sum + item.kg * (item.price || 0), 0);
}

/** Sum of Qty (kg as-fed). */
export function calculateTotalWeight(formula: FormulaItem[]): number {
  return round(formula.reduce((sum, item) => sum + item.kg, 0), 2);
}

/**
 * Classify a single nutrient against its target range.
 * Tolerance defaults to 10% of the range width — anything outside min–max but
 * within tolerance is a 'warning'; further out is an 'error'.
 */
export function getNutrientStatus(
  value: number,
  min: number,
  max: number,
  tolerance = 0
): 'success' | 'warning' | 'error' {
  const tol = tolerance || (max - min) * 0.1;
  if (value < min - tol || value > max + tol) return 'error';
  if (value < min       || value > max       ) return 'warning';
  return 'success';
}

const DEFAULT_RANGES: NutrientRange = {
  protein:    { min: 14,  max: 18  },
  energy:     { min: 2.4, max: 2.8 },
  tdn:        { min: 70,  max: 80  },
  fiber:      { min: 25,  max: 35  },
  fat:        { min: 3,   max: 5   },
  calcium:    { min: 0.5, max: 1.0 },
  phosphorus: { min: 0.3, max: 0.5 },
};

export interface Recommendation {
  nutrient: string;
  status: 'success' | 'warning' | 'error';
  recommendation: string;
  value: number;
  range: { min: number; max: number };
}

/** Generate actionable recommendations for the current formulation. */
export function generateRecommendations(
  nutrients: NutrientCalculation,
  ranges?: NutrientRange | null
): Recommendation[] {
  const r = ranges || DEFAULT_RANGES;
  const recs: Recommendation[] = [];

  const push = (
    nutrient: string,
    value: number,
    range: { min: number; max: number },
    lowFix: string,
    highFix: string,
    tol = 0
  ) => {
    const status = getNutrientStatus(value, range.min, range.max, tol);
    let recommendation: string;
    if (status === 'success') {
      recommendation = `${nutrient} is within optimal range`;
    } else if (value < range.min) {
      recommendation = lowFix;
    } else {
      recommendation = highFix;
    }
    recs.push({ nutrient, status, recommendation, value, range });
  };

  push(
    'Protein (CP)', nutrients.protein, r.protein,
    'Protein too low — add Soybean meal, Canola meal, or Til khal',
    'Protein too high — reduce oilcakes, add more energy sources like corn',
  );
  push(
    'Energy (ME)', nutrients.energy, r.energy,
    'Energy too low — add corn, molasses, or bypass fat',
    'Energy too high — reduce concentrates, add more fiber',
    0.15,
  );
  push(
    'TDN', nutrients.tdn, r.tdn,
    'Digestibility low — add corn or soybean meal',
    'TDN too high — balance with more forage (hay, straw, silage)',
  );
  push(
    'NDF (Fiber)', nutrients.fiber, r.fiber,
    'Concentrate fiber is below target — consider adding wheat bran. (Ensure animal also receives good forage.)',
    'Concentrate fiber too high — reduce wheat bran or hay; forage supplies rest of fiber separately',
  );
  push(
    'Fat', nutrients.fat, r.fat,
    'Fat too low — consider rice polish, sesame cake, or a small amount of bypass fat',
    'Fat too high — reduce bypass fat and high-fat oilcakes (may depress fiber digestion)',
    0.5,
  );
  push(
    'Calcium', nutrients.calcium, r.calcium,
    'Calcium too low — add limestone',
    'Calcium too high — reduce limestone',
    0.1,
  );
  push(
    'Phosphorus', nutrients.phosphorus, r.phosphorus,
    'Phosphorus too low — add wheat bran or rice polish',
    'Phosphorus too high — reduce wheat bran / rice polish',
    0.05,
  );

  return recs;
}

/** Plain-text export for WhatsApp / clipboard sharing. */
export function exportFormulaAsText(formula: FormulaItem[], language: 'en' | 'ur' = 'en'): string {
  const header = language === 'ur'
    ? 'فارمولا Report\n' + '='.repeat(40) + '\n'
    : 'Formula Report\n' + '='.repeat(40) + '\n';

  const items = formula.map((f) => `• ${f.name}: ${f.kg.toFixed(1)} kg`).join('\n');

  const n     = calculateNutrients(formula);
  const total = calculateTotalWeight(formula);
  const cost  = calculateTotalCost(formula);

  const footer =
`\n${'='.repeat(40)}
Total Weight: ${total.toFixed(1)} kg
Total DM:     ${n.totalDM.toFixed(2)} kg (${n.dm}% of as-fed)
Total Cost:   ₨${cost.toFixed(0)}
Per Kg Price: ₨${n.perKgPrice}

Nutrients (on DM basis):
  CP:      ${n.protein}%
  ME:      ${n.energy} Mcal/kg DM
  TDN:     ${n.tdn}%
  NDF:     ${n.fiber}%
  ADF:     ${n.adf}%
  Fat:     ${n.fat}%
  Starch:  ${n.starch}%
  Ca:      ${n.calcium}%
  P:       ${n.phosphorus}%
  Ash:     ${n.ash}%`;

  return header + items + footer;
}

/** Detailed text report used as PDF body. */
export function generatePDFContent(
  formula: FormulaItem[],
  animal: string,
  stage: string
): string {
  const n = calculateNutrients(formula);

  return `
NUTRITION CALCULATOR - FORMULA REPORT
Animal: ${animal}
Stage:  ${stage}
Date:   ${new Date().toLocaleDateString()}

FORMULA COMPOSITION
${formula
  .map((f) => `${f.name}: ${f.kg.toFixed(1)} kg (₨${((f.price || 0) * f.kg).toFixed(0)})`)
  .join('\n')}

Total Weight:  ${calculateTotalWeight(formula)} kg
Total DM:      ${n.totalDM.toFixed(2)} kg  (${n.dm}% of as-fed)
Total Cost:    ₨${calculateTotalCost(formula).toFixed(0)}
Per Kg Price:  ₨${n.perKgPrice}

NUTRITIONAL ANALYSIS (on DM basis)
Crude Protein (CP):     ${n.protein.toFixed(2)}%
Metabolizable Energy:   ${n.energy.toFixed(3)} Mcal/kg DM
TDN:                    ${n.tdn.toFixed(2)}%
NDF (Fiber):            ${n.fiber.toFixed(2)}%
ADF:                    ${n.adf.toFixed(2)}%
Fat:                    ${n.fat.toFixed(2)}%
Starch:                 ${n.starch.toFixed(2)}%
Calcium:                ${n.calcium.toFixed(3)}%
Phosphorus:             ${n.phosphorus.toFixed(3)}%
Ash:                    ${n.ash.toFixed(2)}%
`;
}
