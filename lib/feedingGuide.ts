// ================================================================================
// DAILY FEEDING GUIDE
// ================================================================================
// Given the animal's species/stage + body weight (+ milk yield for dairy),
// estimate daily feed intake and how it should be split between concentrate
// (this app's formula) and forage (hay/silage/green fodder fed separately).
//
// Rules are drawn from:
//   • NRC Dairy 2001/2021 (intake models for dairy cattle)
//   • NRC Beef 2016 (fattening intake models)
//   • NRC Small Ruminants 2007 + INRA (goat intake)
//   • Punjab Dairy Development Board extension guidelines (Pakistan)
//   • NDRI Karnal (buffalo adjustments)
//
// All figures are approximations — real intake varies with body condition,
// temperature, forage quality, and individual animal. Use as a starting point
// and adjust based on milk yield / body condition changes.
// ================================================================================

export interface FeedingInputs {
  animalId: string | null;
  stageIndex: number;
  bodyWeightKg: number;
  milkYieldL?: number; // only meaningful for lactating stages
}

export interface FeedingGuide {
  totalDmiKg: number;        // total dry-matter intake per day (kg DM)
  concentrateAsFedKg: number;// concentrate (this formula) per day, as-fed
  forageAsFedKg: number;     // green fodder (≈25% DM) per day, as-fed
  hayAsFedKg: number;        // alternative: dry hay (≈88% DM) per day
  concentratePct: number;    // % of DMI that is concentrate
  foragePct: number;         // % of DMI that is forage
  notes: string[];           // practical guidance
}

// ---------------------------------------------------------------------------
// Rule tables (concentrate : forage ratios on DM basis, and DMI % body weight)
// ---------------------------------------------------------------------------
//
// Format: [stageIndex] → { dmiPct, concPct, foragePct }
//
// dmiPct: Dry-matter intake as % of body weight
// concPct / foragePct: split of DMI between concentrate and forage (on DM basis)
// ---------------------------------------------------------------------------

interface StageRule {
  dmiPct: number;
  concPct: number;
  foragePct: number;
}

const RULES: Record<string, StageRule[]> = {
  // 🐄 Dairy Cow — 4 stages: Early, Mid, Late, Dry
  dairy_cow: [
    { dmiPct: 3.8, concPct: 50, foragePct: 50 },   // Early Lactation — dense, 50:50
    { dmiPct: 3.5, concPct: 40, foragePct: 60 },   // Mid Lactation
    { dmiPct: 3.0, concPct: 30, foragePct: 70 },   // Late Lactation
    { dmiPct: 2.0, concPct: 15, foragePct: 85 },   // Dry Period — mostly forage
  ],

  // 🐃 Dairy Buffalo — similar to cow, slightly higher energy needs
  dairy_buffalo: [
    { dmiPct: 3.8, concPct: 50, foragePct: 50 },
    { dmiPct: 3.5, concPct: 40, foragePct: 60 },
    { dmiPct: 3.0, concPct: 30, foragePct: 70 },
    { dmiPct: 2.0, concPct: 15, foragePct: 85 },
  ],

  // 🐄 Heifer — 3 stages: Calf, Growing, Pregnant
  heifer: [
    { dmiPct: 3.5, concPct: 55, foragePct: 45 },   // Calf 3-6mo — still growing fast
    { dmiPct: 2.8, concPct: 35, foragePct: 65 },   // Growing 6-15mo
    { dmiPct: 2.2, concPct: 25, foragePct: 75 },   // Pregnant Heifer
  ],

  // 🐂 Fattening Bull — 3 stages: Starter, Grower, Finisher
  fattening_bull: [
    { dmiPct: 3.0, concPct: 60, foragePct: 40 },   // Starter
    { dmiPct: 2.7, concPct: 70, foragePct: 30 },   // Grower
    { dmiPct: 2.5, concPct: 80, foragePct: 20 },   // Finisher — max energy
  ],

  // 🐐 Dairy Goat — 4 stages: Early, Mid/Late, Late Preg, Dry
  dairy_goat: [
    { dmiPct: 4.5, concPct: 50, foragePct: 50 },   // Early Lactation
    { dmiPct: 4.0, concPct: 40, foragePct: 60 },   // Mid/Late Lactation
    { dmiPct: 3.5, concPct: 30, foragePct: 70 },   // Late Pregnancy
    { dmiPct: 2.5, concPct: 15, foragePct: 85 },   // Dry
  ],

  // 🐐 Fattening Goat — 2 stages: Grower, Finisher
  fattening_goat: [
    { dmiPct: 4.0, concPct: 55, foragePct: 45 },   // Grower
    { dmiPct: 3.5, concPct: 70, foragePct: 30 },   // Finisher
  ],
};

// Typical dry-matter content of common Pakistani forages (used to convert
// DM intake → as-fed weight for buying / feeding guidance).
const FORAGE_DM_PCT = 25;  // green fodder (berseem, maize fodder) ≈ 20–30% DM
const HAY_DM_PCT    = 88;  // dry hay / straw ≈ 85–90% DM

/**
 * Calculate daily feeding recommendations. Returns null if inputs are insufficient.
 */
export function calculateFeedingGuide(
  inputs: FeedingInputs,
  concentrateDmPct: number
): FeedingGuide | null {
  const { animalId, stageIndex, bodyWeightKg, milkYieldL } = inputs;
  if (!animalId || bodyWeightKg <= 0) return null;

  const stages = RULES[animalId];
  if (!stages) return null;
  const rule = stages[stageIndex];
  if (!rule) return null;

  const notes: string[] = [];

  // 1. Total dry-matter intake (base = % of body weight)
  let totalDmi = bodyWeightKg * (rule.dmiPct / 100);

  // 2. For lactating animals, bump intake with milk yield
  //    (each litre of milk needs ~0.4 kg extra DMI for cow/buffalo, 0.2 for goat)
  const isLactating = milkYieldL && milkYieldL > 0 && rule.concPct >= 30;
  if (isLactating) {
    const milkDmiBoost =
      animalId === 'dairy_goat'        ? 0.2 :   // goats eat less per L
      animalId === 'dairy_buffalo'     ? 0.45 :  // buffalo produce richer milk
      /* dairy_cow default */             0.40;
    totalDmi += (milkYieldL as number) * milkDmiBoost;
    notes.push(
      `Intake bumped by ${((milkYieldL as number) * milkDmiBoost).toFixed(1)} kg DM for ${milkYieldL} L milk/day`
    );
  }

  // 3. Split between concentrate and forage (on DM basis)
  const concDmKg   = totalDmi * (rule.concPct   / 100);
  const forageDmKg = totalDmi * (rule.foragePct / 100);

  // 4. Convert DM → as-fed for both concentrate and forage
  const concAsFed  = concentrateDmPct > 0 ? concDmKg   / (concentrateDmPct / 100) : concDmKg;
  const greenAsFed = forageDmKg / (FORAGE_DM_PCT / 100);
  const hayAsFed   = forageDmKg / (HAY_DM_PCT    / 100);

  // Practical guidance
  if (rule.concPct >= 50) {
    notes.push('High-concentrate ration — split into 2-3 feedings/day to avoid acidosis');
  }
  if (isLactating && (milkYieldL as number) >= 20) {
    notes.push('High producer — ensure fresh clean water (≥5 L per L milk) always available');
  }
  if (animalId === 'fattening_bull' && stageIndex === 2) {
    notes.push('Finisher phase — free access to roughage helps rumen health');
  }

  return {
    totalDmiKg:         round(totalDmi, 2),
    concentrateAsFedKg: round(concAsFed, 2),
    forageAsFedKg:      round(greenAsFed, 1),
    hayAsFedKg:         round(hayAsFed, 2),
    concentratePct:     rule.concPct,
    foragePct:          rule.foragePct,
    notes,
  };
}

function round(val: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}

/**
 * Suggested default body weight per animal/stage — rough regional averages
 * (Sahiwal/crossbred cow, Nili-Ravi buffalo, Beetal goat typical figures).
 * Used to pre-fill the body-weight input so farmers aren't staring at 0.
 */
export function getSuggestedBodyWeight(animalId: string | null, stageIndex: number): number {
  if (!animalId) return 0;

  const table: Record<string, number[]> = {
    dairy_cow:      [500, 500, 480, 520],            // early/mid/late/dry
    dairy_buffalo:  [550, 550, 530, 580],            // bigger than cow
    heifer:         [120, 250, 400],                 // calf/growing/pregnant
    fattening_bull: [150, 250, 350],                 // starter/grower/finisher
    dairy_goat:     [40, 40, 45, 40],                // local breed typical
    fattening_goat: [20, 32],                        // grower/finisher
  };

  return table[animalId]?.[stageIndex] ?? 400;
}

/** Whether the given stage is a lactating stage (milk yield field is meaningful). */
export function isLactatingStage(animalId: string | null, stageIndex: number): boolean {
  if (!animalId) return false;
  const rule = RULES[animalId]?.[stageIndex];
  if (!rule) return false;
  // Lactating = concentrate ≥ 30% AND it's a dairy species
  const isDairy = animalId === 'dairy_cow' || animalId === 'dairy_buffalo' || animalId === 'dairy_goat';
  return isDairy && rule.concPct >= 30;
}
