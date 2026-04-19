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

import { getIngredient, NutrientRange } from './constants';

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

/**
 * Compute all nutrient totals for a given formula on DM basis.
 * Verified against the Google Sheet reference calculator.
 */
export function calculateNutrients(formula: FormulaItem[]): NutrientCalculation {
  // Running sums in absolute kg (nutrients) / Mcal (energy) / Rs (cost)
  let totalAsFed = 0;
  let totalDM = 0;
  let cpKg = 0;
  let meMcal = 0;
  let tdnKg = 0;
  let adfKg = 0;
  let ndfKg = 0;
  let fatKg = 0;
  let starchKg = 0;
  let caKg = 0;
  let pKg = 0;
  let ashKg = 0;
  let cost = 0;

  for (const item of formula) {
    const data = getIngredient(item.key);
    if (!data) continue;                       // skip unknown keys (e.g. placeholders)

    const qty = item.kg;                       // as-fed kg
    if (qty <= 0) continue;

    const dmKg = qty * (data.dm / 100);        // kg of dry matter

    totalAsFed += qty;
    totalDM   += dmKg;

    // Per-ingredient nutrient kg (all composition values are DM basis)
    cpKg     += dmKg * (data.cp     / 100);
    meMcal   += dmKg * data.me;                // ME is Mcal per kg DM (no /100)
    tdnKg    += dmKg * (data.tdn    / 100);
    adfKg    += dmKg * (data.adf    / 100);
    ndfKg    += dmKg * (data.ndf    / 100);
    fatKg    += dmKg * (data.fat    / 100);
    starchKg += dmKg * (data.starch / 100);
    caKg     += dmKg * (data.ca     / 100);
    pKg      += dmKg * (data.p      / 100);
    ashKg    += dmKg * (data.ash    / 100);

    // Cost is as-fed (what the farmer pays). Override price wins over registry.
    const unitPrice = item.price ?? data.price ?? 0;
    cost += qty * unitPrice;
  }

  if (totalDM === 0) return EMPTY;

  // Concentrations = absolute kg / Total DM × 100 (on DM basis)
  return {
    protein:    round((cpKg     / totalDM) * 100, 2),
    energy:     round( meMcal   / totalDM,        3),
    tdn:        round((tdnKg    / totalDM) * 100, 2),
    adf:        round((adfKg    / totalDM) * 100, 2),
    fiber:      round((ndfKg    / totalDM) * 100, 2),
    fat:        round((fatKg    / totalDM) * 100, 2),
    starch:     round((starchKg / totalDM) * 100, 2),
    calcium:    round((caKg     / totalDM) * 100, 3),
    phosphorus: round((pKg      / totalDM) * 100, 3),
    ash:        round((ashKg    / totalDM) * 100, 2),
    dm:         round((totalDM  / totalAsFed) * 100, 2),
    totalAsFed: round(totalAsFed, 2),
    totalDM:    round(totalDM,    2),
    cost:       Math.round(cost),
    perKgPrice: round(cost / totalAsFed, 2),
  };
}

/**
 * Build an initial formula by evenly distributing 100 kg across selected ingredients.
 * Users can then adjust individual quantities in Step 3.
 */
export function buildFormula(
  selectedIngredients: Record<string, string[]>
): FormulaItem[] {
  const items = [
    ...(selectedIngredients.energy  || []),
    ...(selectedIngredients.protein || []),
    ...(selectedIngredients.fiber   || []),
    ...(selectedIngredients.fat     || []),
  ];

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
