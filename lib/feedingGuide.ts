// ================================================================================
// DAILY CONCENTRATE-FEEDING GUIDE
// ================================================================================
// Given the animal's species/stage + body weight (+ milk yield for dairy),
// estimate HOW MUCH OF THIS CONCENTRATE TO FEED per day.
//
// This calculator only designs the CONCENTRATE portion of the ration.  We do
// NOT compute forage / hay quantities — that belongs to a TMR (Total Mixed
// Ration) tool, which is a v2 feature.  Forage is assumed to be available
// ad-libitum or per the farmer's existing practice.
//
// The driver varies by animal type:
//
//   ┌────────────────────────┬──────────────────────────────────────────────┐
//   │ Animal / Stage         │ Concentrate driver                           │
//   ├────────────────────────┼──────────────────────────────────────────────┤
//   │ Dairy cow / buffalo    │ Maintenance (% BW) + milk-yield ratio (kg/L) │
//   │ Dairy goat (lactation) │ Maintenance (% BW) + milk-yield ratio (kg/L) │
//   │ Dry / late pregnancy   │ Body weight only (% BW)                      │
//   │ Heifer (growth)        │ Body weight only (% BW)                      │
//   │ Fattening bull / goat  │ Body weight only (% BW)                      │
//   └────────────────────────┴──────────────────────────────────────────────┘
//
// References
//   • NRC Dairy 2001 / 2021 — lactation concentrate allowance
//   • NRC Beef 2016         — fattening bulls (% BW concentrate)
//   • NRC Small Ruminants 2007 + INRA — goats
//   • Punjab Dairy Development Board, NDRI Karnal — Pakistani extension rules
//   • ICAR India — buffalo concentrate allowance (richer milk)
// ================================================================================

export type FeedingMode = 'lactation' | 'fattening' | 'maintenance' | 'growth';

export interface FeedingInputs {
  animalId: string | null;
  stageIndex: number;
  bodyWeightKg: number;
  /** Only meaningful for stages with mode === 'lactation' */
  milkYieldL?: number;
}

/**
 * Per-stage rule: how to compute the daily concentrate quantity.
 * The `mode` decides which fields below are used.
 *
 *   mode === 'lactation'
 *     → kg/day = (BW × bwMaintenancePct/100) + (milkYieldL × milkRatio)
 *
 *   mode === 'fattening' | 'growth' | 'maintenance'
 *     → kg/day = BW × bwTotalPct/100
 */
interface StageRule {
  mode: FeedingMode;
  /** Used when mode === 'lactation'. % of body weight for the maintenance allowance. */
  bwMaintenancePct?: number;
  /** Used when mode === 'lactation'. kg concentrate per litre of milk. */
  milkRatio?: number;
  /** Used when mode !== 'lactation'. % of body weight for the total allowance. */
  bwTotalPct?: number;
  /** Plain-language explanation shown to the user. */
  rationaleEn: string;
  rationaleUr: string;
}

// ---------------------------------------------------------------------------
// Rules per animal × stage. Stage indices MUST line up with STAGES in
// lib/constants.ts.
//
// Numeric calibration:
//   • dairy cow milkRatio: 0.40 early → 0.35 mid → 0.30 late
//     A 500 kg cow giving 15 L mid-lactation gets:
//       (500 × 0.4%) + (15 × 0.35) = 2.0 + 5.25 = 7.25 kg concentrate/day  ✓
//     This matches Punjab Dairy Board guidance ("1 kg concentrate per ~3 L milk
//     plus 2 kg maintenance for a 500 kg cow").
//
//   • buffalo milkRatio is higher (richer milk fat ⇒ more energy per L):
//       0.50 early, 0.45 mid, 0.40 late.
//
//   • Fattening bulls follow NRC Beef 2016: starter 1.5% BW concentrate,
//     grower 2.0%, finisher 2.5%. Forage (≈1% BW DM) is fed separately.
// ---------------------------------------------------------------------------

const RULES: Record<string, StageRule[]> = {
  // 🐄 Dairy Cow — Early / Mid / Late / Dry
  dairy_cow: [
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.40,
      rationaleEn: '0.4% BW for maintenance + 0.40 kg per litre of milk (early lactation — high demand)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.40 کلو (شروع کا دودھ — زیادہ ضرورت)' },
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.35,
      rationaleEn: '0.4% BW for maintenance + 0.35 kg per litre of milk (mid lactation)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.35 کلو (درمیانی دودھ)' },
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.30,
      rationaleEn: '0.4% BW for maintenance + 0.30 kg per litre of milk (late lactation — recovering body condition)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.30 کلو (آخری دودھ)' },
    { mode: 'maintenance', bwTotalPct: 0.5,
      rationaleEn: '0.5% BW for steaming-up; bump to 1% in the last 3 weeks before calving',
      rationaleUr: 'بچہ پیدا ہونے سے پہلے بحالی — 0.5% جسمانی وزن (آخری 3 ہفتوں میں 1% تک بڑھائیں)' },
  ],

  // 🐃 Dairy Buffalo — slightly higher concentrate than cow because buffalo milk
  // averages 6-8% fat (vs cow's 3.5-4%) which costs more energy to synthesise.
  dairy_buffalo: [
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.50,
      rationaleEn: '0.4% BW for maintenance + 0.50 kg per litre of milk (buffalo milk is richer — needs more concentrate)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.50 کلو (بھینس کا دودھ گاڑھا)' },
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.45,
      rationaleEn: '0.4% BW for maintenance + 0.45 kg per litre of milk (mid lactation)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.45 کلو' },
    { mode: 'lactation', bwMaintenancePct: 0.4, milkRatio: 0.40,
      rationaleEn: '0.4% BW for maintenance + 0.40 kg per litre of milk (late lactation)',
      rationaleUr: 'بحالی کے لیے 0.4% جسمانی وزن + ہر لیٹر دودھ پر 0.40 کلو' },
    { mode: 'maintenance', bwTotalPct: 0.5,
      rationaleEn: '0.5% BW for the dry period; bump in the final 3 weeks for steaming-up',
      rationaleUr: 'خشک دور میں 0.5% جسمانی وزن (آخری 3 ہفتوں میں بڑھائیں)' },
  ],

  // 🐄 Heifer — Calf / Growing / Pregnant. Growth-driven, not lactation.
  heifer: [
    { mode: 'growth', bwTotalPct: 1.5,
      rationaleEn: 'Calf 3–6 months: 1.5% BW as starter concentrate (rest from milk + green forage)',
      rationaleUr: 'بچہ (3-6 ماہ): 1.5% جسمانی وزن (باقی دودھ اور سبز چارے سے)' },
    { mode: 'growth', bwTotalPct: 1.0,
      rationaleEn: 'Growing heifer (6–15 months): 1.0% BW concentrate; rely on forage for fibre',
      rationaleUr: 'بڑھتی بچھڑی (6-15 ماہ): 1.0% جسمانی وزن کانسنٹریٹ' },
    { mode: 'growth', bwTotalPct: 1.0,
      rationaleEn: 'Pregnant heifer (15+ months): 1.0% BW; bump in the last trimester for foetal growth',
      rationaleUr: 'گابھن بچھڑی: 1.0% جسمانی وزن (آخری مہینوں میں بڑھائیں)' },
  ],

  // 🐂 Fattening Bull — concentrate IS the main feed. % BW rises through the
  // production cycle as energy density requirements increase (NRC Beef 2016).
  fattening_bull: [
    { mode: 'fattening', bwTotalPct: 1.5,
      rationaleEn: 'Starter (100–200 kg): 1.5% BW concentrate; gradual transition from forage-heavy ration',
      rationaleUr: 'ابتدائی (100-200 کلو): 1.5% جسمانی وزن (آہستہ آہستہ بڑھائیں)' },
    { mode: 'fattening', bwTotalPct: 2.0,
      rationaleEn: 'Grower (200–300 kg): 2.0% BW concentrate; fastest weight-gain phase',
      rationaleUr: 'بڑھوتری (200-300 کلو): 2.0% جسمانی وزن (تیز ترین وزن بڑھنا)' },
    { mode: 'fattening', bwTotalPct: 2.5,
      rationaleEn: 'Finisher (>300 kg): 2.5% BW concentrate for maximum energy density and finish',
      rationaleUr: 'تیاری (300+ کلو): 2.5% جسمانی وزن (زیادہ توانائی کے لیے)' },
  ],

  // 🐐 Dairy Goat — Early / Mid-Late / Late Pregnancy / Dry
  // Goats eat more per kg BW than cattle but produce less per goat — the
  // milkRatio per litre is similar to cow.
  dairy_goat: [
    { mode: 'lactation', bwMaintenancePct: 1.0, milkRatio: 0.40,
      rationaleEn: '1.0% BW maintenance + 0.40 kg per litre of milk (early lactation)',
      rationaleUr: 'بحالی کے لیے 1.0% جسمانی وزن + ہر لیٹر دودھ پر 0.40 کلو' },
    { mode: 'lactation', bwMaintenancePct: 1.0, milkRatio: 0.35,
      rationaleEn: '1.0% BW maintenance + 0.35 kg per litre of milk (mid/late lactation)',
      rationaleUr: 'بحالی کے لیے 1.0% جسمانی وزن + ہر لیٹر دودھ پر 0.35 کلو' },
    { mode: 'maintenance', bwTotalPct: 1.5,
      rationaleEn: 'Late pregnancy: 1.5% BW to support foetal growth and prevent pregnancy toxaemia',
      rationaleUr: 'آخری حمل: 1.5% جسمانی وزن (بچہ کی نشوونما اور حمل کی زہریلگی روکنے کے لیے)' },
    { mode: 'maintenance', bwTotalPct: 0.7,
      rationaleEn: 'Dry period: 0.7% BW concentrate; rely mostly on good forage',
      rationaleUr: 'خشک دور: 0.7% جسمانی وزن (زیادہ تر اچھے چارے پر)' },
  ],

  // 🐐 Fattening Goat — Grower / Finisher
  fattening_goat: [
    { mode: 'fattening', bwTotalPct: 2.5,
      rationaleEn: 'Grower (15–25 kg): 2.5% BW concentrate; rapid frame development',
      rationaleUr: 'بڑھوتری (15-25 کلو): 2.5% جسمانی وزن (تیز نشوونما)' },
    { mode: 'fattening', bwTotalPct: 3.0,
      rationaleEn: 'Finisher (25–40 kg): 3.0% BW concentrate for maximum weight gain to market',
      rationaleUr: 'تیاری (25-40 کلو): 3.0% جسمانی وزن (زیادہ سے زیادہ وزن کے لیے)' },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * One contribution to the daily concentrate total — kept structured so the UI
 * can render the breakdown ("4 kg for maintenance + 5 kg for milk = 9 kg").
 */
export interface ConcentrateBreakdownLine {
  /** What this line represents — translated by the UI. */
  kind: 'maintenance' | 'milk' | 'fattening' | 'growth' | 'pregnancy_dry';
  /** Underlying calculation as plain text, e.g. "500 kg × 0.4%". */
  formula: string;
  /** Result in kg/day for this line. */
  kg: number;
}

export interface ConcentrateGuide {
  mode: FeedingMode;
  /** Total daily concentrate to feed (kg as-fed). */
  concentrateKgPerDay: number;
  /** Pieces that summed to the total. Always at least 1 entry. */
  breakdown: ConcentrateBreakdownLine[];
  /** Daily cost at the formula's per-kg as-fed price. May be 0 if no price. */
  dailyCostRs: number;
  /** Per-kg cost used for `dailyCostRs`. */
  perKgPriceRs: number;
  /** Plain-language summary of the rule applied (en + ur). */
  rationaleEn: string;
  rationaleUr: string;
  /** Practical farmer guidance — split feedings, water etc. */
  notesEn: string[];
  notesUr: string[];
}

/**
 * Compute the daily concentrate-feeding plan. Returns null if the inputs are
 * insufficient (no animal selected, BW ≤ 0, etc.).
 *
 * @param inputs           animal/stage/BW/milk
 * @param formulaPricePerKg  this formula's as-fed price (Rs/kg) — used for
 *                            the daily cost preview. Pass 0 if unknown.
 */
export function calculateConcentrateGuide(
  inputs: FeedingInputs,
  formulaPricePerKg: number,
): ConcentrateGuide | null {
  const { animalId, stageIndex, bodyWeightKg, milkYieldL } = inputs;
  if (!animalId || bodyWeightKg <= 0) return null;
  const rule = RULES[animalId]?.[stageIndex];
  if (!rule) return null;

  const breakdown: ConcentrateBreakdownLine[] = [];
  let total = 0;

  if (rule.mode === 'lactation') {
    // Maintenance allowance from body weight
    const maint = bodyWeightKg * (rule.bwMaintenancePct! / 100);
    breakdown.push({
      kind: 'maintenance',
      formula: `${bodyWeightKg} kg × ${rule.bwMaintenancePct}%`,
      kg: round(maint, 2),
    });
    total += maint;

    // Milk-yield component (always present, even if 0 — the user can see how
    // it scales)
    const milk = (milkYieldL ?? 0) * (rule.milkRatio ?? 0);
    breakdown.push({
      kind: 'milk',
      formula: `${milkYieldL ?? 0} L × ${rule.milkRatio} kg/L`,
      kg: round(milk, 2),
    });
    total += milk;
  } else {
    const kg = bodyWeightKg * (rule.bwTotalPct! / 100);
    const kindMap: Record<Exclude<FeedingMode, 'lactation'>, ConcentrateBreakdownLine['kind']> = {
      fattening:   'fattening',
      growth:      'growth',
      maintenance: 'pregnancy_dry',
    };
    breakdown.push({
      kind: kindMap[rule.mode],
      formula: `${bodyWeightKg} kg × ${rule.bwTotalPct}%`,
      kg: round(kg, 2),
    });
    total = kg;
  }

  // Practical notes — picked based on the rule + animal
  const notesEn: string[] = [];
  const notesUr: string[] = [];

  // Fattening / high-concentrate stages — split feedings to avoid acidosis
  if (rule.mode === 'fattening' || (rule.mode === 'lactation' && total >= bodyWeightKg * 0.012)) {
    notesEn.push('High-concentrate ration — split into 2–3 feedings/day to avoid rumen acidosis');
    notesUr.push('زیادہ کانسنٹریٹ — تیزابیت سے بچنے کے لیے 2-3 وقت میں تقسیم کریں');
  }

  // High-yielding lactation — water allowance
  if (rule.mode === 'lactation' && (milkYieldL ?? 0) >= 20) {
    notesEn.push('High producer — provide ≥5 L of clean water per litre of milk');
    notesUr.push('زیادہ دودھ والی — ہر لیٹر دودھ پر کم از کم 5 لیٹر صاف پانی');
  }

  // Pregnant heifer / late-preg goat — bump near calving
  if (rule.mode === 'growth' && stageIndex === 2) {
    notesEn.push('Last trimester: gradually bump concentrate by 25–50 % to support foetal growth');
    notesUr.push('آخری مہینوں میں کانسنٹریٹ میں 25-50% اضافہ بچے کی نشوونما کے لیے');
  }

  // Fattening finisher — open access to roughage
  if (rule.mode === 'fattening' && rule.bwTotalPct! >= 2.5) {
    notesEn.push('Provide some long-stem hay or straw alongside — keeps the rumen healthy');
    notesUr.push('ساتھ ہی کچھ بھوسہ یا گھاس بھی رکھیں — رومن کی صحت کے لیے');
  }

  return {
    mode: rule.mode,
    concentrateKgPerDay: round(total, 2),
    breakdown,
    dailyCostRs: Math.round(total * formulaPricePerKg),
    perKgPriceRs: round(formulaPricePerKg, 2),
    rationaleEn: rule.rationaleEn,
    rationaleUr: rule.rationaleUr,
    notesEn,
    notesUr,
  };
}

/**
 * Suggested default body weight per animal/stage — rough regional averages
 * (Sahiwal/crossbred cow, Nili-Ravi buffalo, Beetal goat typical figures).
 * Used to pre-fill the body-weight input so farmers aren't staring at 0.
 */
export function getSuggestedBodyWeight(animalId: string | null, stageIndex: number): number {
  if (!animalId) return 0;

  const table: Record<string, number[]> = {
    dairy_cow:      [500, 500, 480, 520],   // early/mid/late/dry
    dairy_buffalo:  [550, 550, 530, 580],   // bigger than cow
    heifer:         [120, 250, 400],        // calf/growing/pregnant
    fattening_bull: [150, 250, 350],        // starter/grower/finisher
    dairy_goat:     [40,  40,  45,  40],    // local breed typical
    fattening_goat: [20,  32],              // grower/finisher
  };

  return table[animalId]?.[stageIndex] ?? 400;
}

/**
 * True if the given stage is lactating — i.e. milk yield is a meaningful input
 * for the concentrate calculation. The UI uses this to decide whether to show
 * the Milk Yield field.
 */
export function isLactatingStage(animalId: string | null, stageIndex: number): boolean {
  if (!animalId) return false;
  return RULES[animalId]?.[stageIndex]?.mode === 'lactation';
}

/** The feeding mode for a given stage — UI uses this to swap labels. */
export function getFeedingMode(animalId: string | null, stageIndex: number): FeedingMode | null {
  if (!animalId) return null;
  return RULES[animalId]?.[stageIndex]?.mode ?? null;
}

function round(val: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(val * f) / f;
}
