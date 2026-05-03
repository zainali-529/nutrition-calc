// ================================================================================
// TMR (TOTAL MIXED RATION) WHOLE-DIET NUTRIENT TARGETS
// ================================================================================
// These are the targets for the COMPLETE diet that the animal eats — forage +
// concentrate combined, on Dry Matter (DM) basis. They are different from the
// concentrate-only targets in lib/constants.ts because:
//
//   • CP min is LOWER (forage dilutes the concentrate's protein density)
//   • NDF target is HIGHER (forage IS the fibre source, so the diet must
//     contain at least 25-35% NDF — concentrate alone targets 15-25%)
//   • ME / TDN are LOWER (forage is energy-poor)
//   • Ca / P are LOWER (concentrate's mineral premix is now diluted by forage)
//
// References:
//   • NRC Dairy 2001 / 2021 — whole-diet DM-basis recommendations
//   • NRC Beef 2016        — feedlot finishing diets
//   • NRC Small Ruminants 2007 — goat whole-diet recommendations
//   • INRA 2018 — European fibre & energy benchmarks
//
// Stage indices MUST match STAGES in lib/constants.ts so the same Step 1
// stage selector can drive both calculators.
// ================================================================================

import type { NutrientRange } from './constants';

export const TMR_NUTRITION_RANGES: Record<string, NutrientRange[]> = {
  // ─────── 🐄 DAIRY COW (whole diet) ───────
  // High-yield Holsteins do well at the upper end of CP/ME and the lower end
  // of NDF. Sahiwal/crossbred at lower yield can sit in the middle.
  dairy_cow: [
    // Early Lactation — peak demand, dense diet, but ≥28% NDF for rumen health
    { protein: { min: 17, max: 19 }, energy: { min: 2.55, max: 2.85 }, tdn: { min: 70, max: 75 }, fiber: { min: 28, max: 34 }, fat: { min: 3.0, max: 6.0 }, calcium: { min: 0.70, max: 1.00 }, phosphorus: { min: 0.40, max: 0.50 } },
    // Mid Lactation — slight back-off on density, more fibre
    { protein: { min: 16, max: 18 }, energy: { min: 2.45, max: 2.70 }, tdn: { min: 67, max: 72 }, fiber: { min: 30, max: 36 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.60, max: 0.85 }, phosphorus: { min: 0.35, max: 0.45 } },
    // Late Lactation — body-condition recovery, more forage
    { protein: { min: 14, max: 16 }, energy: { min: 2.35, max: 2.55 }, tdn: { min: 63, max: 68 }, fiber: { min: 32, max: 40 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.55, max: 0.75 }, phosphorus: { min: 0.30, max: 0.40 } },
    // Dry Period — far-off cow, highest fibre, lowest energy density
    { protein: { min: 12, max: 14 }, energy: { min: 2.15, max: 2.40 }, tdn: { min: 58, max: 65 }, fiber: { min: 38, max: 50 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.45, max: 0.65 }, phosphorus: { min: 0.25, max: 0.35 } },
  ],

  // ─────── 🐃 DAIRY BUFFALO (whole diet) ───────
  // Buffalo milk is 6-8% fat (vs cow's 3.5-4%) — needs ~5% more energy density
  // than cow at comparable yield. NDF tolerated slightly higher (efficient
  // fibre digesters) but Ca demand similar.
  dairy_buffalo: [
    { protein: { min: 16, max: 19 }, energy: { min: 2.55, max: 2.85 }, tdn: { min: 70, max: 75 }, fiber: { min: 28, max: 36 }, fat: { min: 3.0, max: 6.0 }, calcium: { min: 0.65, max: 0.95 }, phosphorus: { min: 0.40, max: 0.50 } },
    { protein: { min: 15, max: 17 }, energy: { min: 2.45, max: 2.70 }, tdn: { min: 67, max: 72 }, fiber: { min: 30, max: 38 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.55, max: 0.85 }, phosphorus: { min: 0.35, max: 0.45 } },
    { protein: { min: 13, max: 15 }, energy: { min: 2.35, max: 2.55 }, tdn: { min: 63, max: 68 }, fiber: { min: 32, max: 42 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.50, max: 0.75 }, phosphorus: { min: 0.30, max: 0.40 } },
    { protein: { min: 11, max: 13 }, energy: { min: 2.15, max: 2.40 }, tdn: { min: 58, max: 65 }, fiber: { min: 38, max: 50 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.40, max: 0.60 }, phosphorus: { min: 0.25, max: 0.35 } },
  ],

  // ─────── 🐄 HEIFER (Cow/Buffalo, growth diet) ───────
  // Skeletal growth + frame development. CP higher than mature dairy because
  // each kg of growth needs 0.18-0.20 kg CP.
  heifer: [
    // Calf 3-6 months — still drinking some milk, transitioning to solid
    { protein: { min: 16, max: 20 }, energy: { min: 2.55, max: 2.85 }, tdn: { min: 70, max: 76 }, fiber: { min: 22, max: 30 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.70, max: 1.00 }, phosphorus: { min: 0.40, max: 0.55 } },
    // Growing 6-15 months — frame growth, Ca:P ratio matters
    { protein: { min: 13, max: 16 }, energy: { min: 2.30, max: 2.55 }, tdn: { min: 63, max: 68 }, fiber: { min: 30, max: 42 }, fat: { min: 2.5, max: 4.0 }, calcium: { min: 0.50, max: 0.75 }, phosphorus: { min: 0.30, max: 0.40 } },
    // Pregnant Heifer 15+ months — maintenance + foetal growth
    { protein: { min: 12, max: 14 }, energy: { min: 2.25, max: 2.50 }, tdn: { min: 60, max: 65 }, fiber: { min: 35, max: 48 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.50, max: 0.70 }, phosphorus: { min: 0.30, max: 0.40 } },
  ],

  // ─────── 🐂 FATTENING BULL (whole diet) ───────
  // Maximize ADG. NDF must stay ≥ 20-25% for rumen function but otherwise
  // diet is very dense. Concentrate share rises through the cycle.
  fattening_bull: [
    // Starter 100-200 kg — frame still building
    { protein: { min: 13, max: 16 }, energy: { min: 2.45, max: 2.75 }, tdn: { min: 67, max: 73 }, fiber: { min: 25, max: 32 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.55, max: 0.80 }, phosphorus: { min: 0.30, max: 0.45 } },
    // Grower 200-300 kg — fastest gain phase
    { protein: { min: 12, max: 14 }, energy: { min: 2.55, max: 2.85 }, tdn: { min: 70, max: 76 }, fiber: { min: 22, max: 28 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.45, max: 0.65 }, phosphorus: { min: 0.28, max: 0.40 } },
    // Finisher >300 kg — maximum energy, just enough fibre to keep rumen working
    { protein: { min: 11, max: 13 }, energy: { min: 2.65, max: 2.95 }, tdn: { min: 73, max: 80 }, fiber: { min: 18, max: 25 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.40, max: 0.60 }, phosphorus: { min: 0.25, max: 0.35 } },
  ],

  // ─────── 🐐 DAIRY GOAT (whole diet) ───────
  // Goats eat 4-5% of BW vs cattle's 2.5-3.5%, so per kg of feed they're
  // less demanding on density. NDF tolerated higher (browsing physiology).
  dairy_goat: [
    { protein: { min: 16, max: 18 }, energy: { min: 2.50, max: 2.75 }, tdn: { min: 67, max: 73 }, fiber: { min: 28, max: 35 }, fat: { min: 3.0, max: 5.5 }, calcium: { min: 0.70, max: 0.95 }, phosphorus: { min: 0.35, max: 0.45 } },
    { protein: { min: 14, max: 16 }, energy: { min: 2.35, max: 2.60 }, tdn: { min: 63, max: 70 }, fiber: { min: 30, max: 38 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.55, max: 0.75 }, phosphorus: { min: 0.30, max: 0.40 } },
    { protein: { min: 13, max: 15 }, energy: { min: 2.40, max: 2.65 }, tdn: { min: 65, max: 70 }, fiber: { min: 30, max: 38 }, fat: { min: 2.5, max: 4.0 }, calcium: { min: 0.55, max: 0.75 }, phosphorus: { min: 0.30, max: 0.40 } },
    { protein: { min: 11, max: 13 }, energy: { min: 2.15, max: 2.40 }, tdn: { min: 58, max: 65 }, fiber: { min: 38, max: 48 }, fat: { min: 2.0, max: 3.5 }, calcium: { min: 0.40, max: 0.60 }, phosphorus: { min: 0.25, max: 0.35 } },
  ],

  // ─────── 🐐 FATTENING GOAT (whole diet) ───────
  fattening_goat: [
    // Grower 15-25 kg
    { protein: { min: 14, max: 16 }, energy: { min: 2.45, max: 2.75 }, tdn: { min: 67, max: 73 }, fiber: { min: 25, max: 32 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.55, max: 0.75 }, phosphorus: { min: 0.30, max: 0.45 } },
    // Finisher 25-40 kg
    { protein: { min: 12, max: 14 }, energy: { min: 2.55, max: 2.85 }, tdn: { min: 70, max: 76 }, fiber: { min: 22, max: 30 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.50, max: 0.70 }, phosphorus: { min: 0.25, max: 0.40 } },
  ],
};

/** Safe getter for the TMR range set at a given animal + stage. */
export function getTmrNutritionRange(
  animalId: string | null,
  stageIndex: number,
): NutrientRange | null {
  if (!animalId) return null;
  const stages = TMR_NUTRITION_RANGES[animalId];
  if (!stages) return null;
  return stages[stageIndex] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// DM-SPLIT DEFAULTS (forage % on DM basis) per animal × stage.
//
// These are the typical commercial-mixer defaults. The user can override via
// the slider in TMR Step 1 — these just pre-fill it.
//
// Higher forage:concentrate (more roughage) → cheaper, healthier rumen,
// lower milk yield. Lower forage → higher production, more acidosis risk.
// ────────────────────────────────────────────────────────────────────────────
export const DEFAULT_FORAGE_PCT: Record<string, number[]> = {
  dairy_cow:      [50, 55, 60, 70],   // early/mid/late/dry
  dairy_buffalo:  [50, 55, 60, 70],
  heifer:         [50, 65, 70],       // calf/growing/pregnant
  fattening_bull: [50, 40, 30],       // starter/grower/finisher
  dairy_goat:     [50, 55, 60, 70],
  fattening_goat: [50, 40],           // grower/finisher
};

/** Get the recommended forage % (DM basis) for an animal/stage, defaults to 60. */
export function getDefaultForagePct(animalId: string | null, stageIndex: number): number {
  if (!animalId) return 60;
  return DEFAULT_FORAGE_PCT[animalId]?.[stageIndex] ?? 60;
}
