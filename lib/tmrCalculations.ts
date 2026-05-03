// ================================================================================
// TMR FORMULA CALCULATIONS
// ================================================================================
// Mirrors lib/calculations.ts but resolves ingredients through `getAnyIngredient`
// (forages + concentrates) instead of `getIngredient` (concentrates only).
//
// Same DM-basis math — verified against the same Google Sheet reference.
// Adds two TMR-specific fields:
//   • forageDmShare      — fraction of total DM that came from forages (0-1)
//   • concentrateDmShare — fraction of total DM that came from concentrates (0-1)
//
// Math reference (per ingredient i, as-fed kg = qty_i):
//     DM_kg_i       = qty_i × DM_i / 100
//     Nutrient_kg_i = DM_kg_i × Nut_i / 100
//     Energy_Mcal_i = DM_kg_i × ME_i           (ME is per-kg-DM)
//
// Totals identical to the concentrate calc.
// ================================================================================

import type { NutrientRange } from './constants';
import { getAnyIngredient, isForage } from './forages';

export interface TmrFormulaItem {
  name: string;
  key: string;
  kg: number;             // as-fed quantity
  price?: number;         // Rs per kg as-fed (override of registry)
  /** Mirror of FormulaItem.locked — Auto-Formulate keeps this kg fixed. */
  locked?: boolean;
}

export interface TmrNutrientCalculation {
  // --- Concentrations on DM basis (whole-diet values) ---
  protein: number;     // % CP
  energy: number;      // Mcal/kg DM
  tdn: number;         // % TDN
  adf: number;         // % ADF
  fiber: number;       // % NDF
  fat: number;         // % Fat
  starch: number;      // % Starch
  calcium: number;     // % Ca
  phosphorus: number;  // % P
  ash: number;         // % Ash
  dm: number;          // % of as-fed that is DM

  // --- Absolute totals (kg) ---
  totalAsFed: number;
  totalDM: number;
  forageDmKg: number;       // kg DM that came from forages
  concentrateDmKg: number;  // kg DM that came from concentrates

  // --- Splits (fraction of totalDM) ---
  forageDmShare: number;       // 0–1
  concentrateDmShare: number;  // 0–1

  // --- Cost ---
  cost: number;
  perKgPrice: number;
}

const EMPTY: TmrNutrientCalculation = {
  protein: 0, energy: 0, tdn: 0, adf: 0, fiber: 0, fat: 0,
  starch: 0, calcium: 0, phosphorus: 0, ash: 0, dm: 0,
  totalAsFed: 0, totalDM: 0,
  forageDmKg: 0, concentrateDmKg: 0,
  forageDmShare: 0, concentrateDmShare: 0,
  cost: 0, perKgPrice: 0,
};

const round = (v: number, d: number): number => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/**
 * Compute all whole-diet nutrient totals + DM split for a TMR formula.
 * Identical math to the concentrate calculator's `calculateNutrients`, just
 * resolves ingredients through the unified getter.
 */
export function calculateTmrNutrients(formula: TmrFormulaItem[]): TmrNutrientCalculation {
  let totalAsFed = 0;
  let totalDM = 0;
  let forageDM = 0;
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
    const data = getAnyIngredient(item.key);
    if (!data) continue;
    const qty = item.kg;
    if (qty <= 0) continue;

    const dmKg = qty * (data.dm / 100);
    totalAsFed += qty;
    totalDM   += dmKg;
    if (isForage(item.key)) forageDM += dmKg;

    cpKg     += dmKg * (data.cp     / 100);
    meMcal   += dmKg * data.me;
    tdnKg    += dmKg * (data.tdn    / 100);
    adfKg    += dmKg * (data.adf    / 100);
    ndfKg    += dmKg * (data.ndf    / 100);
    fatKg    += dmKg * (data.fat    / 100);
    starchKg += dmKg * (data.starch / 100);
    caKg     += dmKg * (data.ca     / 100);
    pKg      += dmKg * (data.p      / 100);
    ashKg    += dmKg * (data.ash    / 100);

    const unitPrice = item.price ?? data.price ?? 0;
    cost += qty * unitPrice;
  }

  if (totalDM === 0) return EMPTY;

  const concentrateDM = totalDM - forageDM;

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
    forageDmKg:      round(forageDM,      2),
    concentrateDmKg: round(concentrateDM, 2),
    forageDmShare:        round(forageDM      / totalDM, 4),
    concentrateDmShare:   round(concentrateDM / totalDM, 4),
    cost:       Math.round(cost),
    perKgPrice: round(cost / totalAsFed, 2),
  };
}

/**
 * Build an initial TMR formula by evenly distributing 100 kg across selected
 * forages + concentrates. The DM split is intentionally NOT enforced here —
 * the user can either run Auto-Formulate (which respects their split slider)
 * or hand-edit the kg values in Step 3.
 */
export function buildTmrFormula(
  selectedForages: string[],
  selectedConcentrates: string[],
): TmrFormulaItem[] {
  const items = [...selectedForages, ...selectedConcentrates];
  if (items.length === 0) return [];

  const baseWeight = 100;
  const eachWeight = Math.floor((baseWeight / items.length) * 10) / 10;
  let remaining    = baseWeight - eachWeight * items.length;

  const formula: TmrFormulaItem[] = items.map((key) => {
    const data = getAnyIngredient(key);
    return {
      name:    data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg:      eachWeight,
      price:   data?.price || 0,
    };
  });

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

export function calculateTotalCost(formula: TmrFormulaItem[]): number {
  return formula.reduce((sum, item) => sum + item.kg * (item.price || 0), 0);
}

export function calculateTotalWeight(formula: TmrFormulaItem[]): number {
  return round(formula.reduce((sum, item) => sum + item.kg, 0), 2);
}

/** Re-uses the same status logic as the concentrate calculator. */
export function getNutrientStatus(
  value: number,
  min: number,
  max: number,
  tolerance = 0,
): 'success' | 'warning' | 'error' {
  const tol = tolerance || (max - min) * 0.1;
  if (value < min - tol || value > max + tol) return 'error';
  if (value < min       || value > max       ) return 'warning';
  return 'success';
}

/** Plain-text export for WhatsApp / clipboard sharing — TMR variant. */
export function exportTmrAsText(
  formula: TmrFormulaItem[],
  forageDmPct: number,
  language: 'en' | 'ur' = 'en',
): string {
  const header = language === 'ur'
    ? 'TMR فارمولا Report\n' + '='.repeat(40) + '\n'
    : 'TMR Formula Report\n' + '='.repeat(40) + '\n';

  const forageItems   = formula.filter((f) => isForage(f.key));
  const concItems     = formula.filter((f) => !isForage(f.key));

  const renderItem = (f: TmrFormulaItem) => `• ${f.name}: ${f.kg.toFixed(1)} kg`;
  const forageBlock = forageItems.length > 0
    ? `\n${language === 'en' ? 'FORAGES' : 'چارہ'}\n${forageItems.map(renderItem).join('\n')}`
    : '';
  const concBlock = concItems.length > 0
    ? `\n${language === 'en' ? 'CONCENTRATES' : 'کانسنٹریٹ'}\n${concItems.map(renderItem).join('\n')}`
    : '';

  const n     = calculateTmrNutrients(formula);
  const total = calculateTotalWeight(formula);
  const cost  = calculateTotalCost(formula);

  const footer =
`\n${'='.repeat(40)}
Total Weight:        ${total.toFixed(1)} kg
Total DM:            ${n.totalDM.toFixed(2)} kg  (${n.dm}% of as-fed)
DM Split (target):   ${forageDmPct.toFixed(0)}% forage / ${(100 - forageDmPct).toFixed(0)}% concentrate
DM Split (achieved): ${(n.forageDmShare * 100).toFixed(1)}% forage / ${(n.concentrateDmShare * 100).toFixed(1)}% concentrate
Total Cost:          Rs ${cost.toFixed(0)}
Per Kg Price:        Rs ${n.perKgPrice}

Whole-Diet Nutrients (on DM basis):
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

  return header + forageBlock + concBlock + footer;
}

// Re-export NutrientRange so the TMR UI can import it from a single place
export type { NutrientRange };
