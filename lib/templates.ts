// ================================================================================
// QUICK-START TEMPLATES
// ================================================================================
// Curated starter recipes — the user picks one and lands on Step 3 with the
// animal/stage/ingredients pre-set. The Balanced LP then runs automatically
// (via the existing autoBalanceOnMount flag), giving the user a fully-formed
// recipe without having to choose ingredients themselves.
//
// Templates are tuned to be FEASIBLE on the LP: every selection includes at
// least one strong CP source, one energy source, a fibre source, and the basic
// minerals. The ingredient mix is picked to match Pakistani availability and
// the typical regional price range.
//
// Verified by `npx tsx scripts/verify-templates.ts`, which solves every
// template and fails if any becomes infeasible.
// ================================================================================

/**
 * Same shape as the orchestrator's `chosenIngredients` state — a map from
 * the 5 concentrate categories to the selected ingredient keys.
 *
 * `fat` = true fat/oil sources (bypass fats, vegetable oils).
 * `supplement` = minerals and buffers (limestone, DCP, salt, soda).
 * Before those two were split apart, the minerals below lived under `fat`.
 */
type ChosenIngredients = {
  energy:     string[];
  protein:    string[];
  fiber:      string[];
  fat:        string[];
  supplement: string[];
};

export interface QuickStartTemplate {
  /** Unique id for React keys + analytics. */
  id: string;
  /** Human title in EN & UR (kept short — fits on a card). */
  nameEn: string;
  nameUr: string;
  /** One-line description shown beneath the title. */
  descEn: string;
  descUr: string;
  /** Big emoji for the card icon. */
  icon: string;
  /** Pre-selected animal id from lib/constants.ts ANIMALS[]. */
  animalId: string;
  /** Pre-selected stage index (matches STAGES[animalId][lang][index]). */
  stageIndex: number;
  /** Pre-selected ingredient keys, by category — used to populate Step 2. */
  chosenIngredients: ChosenIngredients;
  /** Optional badge text — e.g. "Most popular", "Beginner-friendly". */
  badgeEn?: string;
  badgeUr?: string;
}

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  // ─────── DAIRY COW ───────
  {
    id: 'dairy_cow_mid_15l',
    icon: '🐄',
    nameEn: 'Dairy Cow — 15 L milk',
    nameUr: 'گائے — ۱۵ لیٹر دودھ (روزانہ)',
    descEn: 'Mid-lactation cow producing about 15 L/day. The most common Pakistani setup.',
    descUr: 'پاکستان میں عام گائے کے لیے متوازن اور سستا ونڈہ فارمولا',
    animalId: 'dairy_cow',
    stageIndex: 1,
    badgeEn: 'Most popular', badgeUr: 'سب سے مقبول',
    chosenIngredients: {
      energy:     ['corn', 'wheat_bran', 'molasses'],
      protein:    ['sbm', 'csm'],
      fiber:      ['chickpea_husk'],
      fat:        ['rice_bran_oil'],
      supplement: ['limestone', 'salt'],
    },
  },
  {
    id: 'dairy_cow_early_20l',
    icon: '🥛',
    nameEn: 'Dairy Cow — Early lactation 20 L',
    nameUr: 'گائے — ۲۰ لیٹر دودھ (پہلے ۱۰۰ دن)',
    descEn: 'High-yielding cow in the first 100 days — needs dense protein + energy.',
    descUr: 'زیادہ دودھ دینے والی گائے کا طاقتور اور متوازن فارمولا',
    animalId: 'dairy_cow',
    stageIndex: 0,
    chosenIngredients: {
      energy:     ['corn', 'wheat_bran', 'molasses'],
      protein:    ['sbm', 'canola_meal', 'csm'],
      fiber:      [],
      fat:        ['bypassFat'],
      supplement: ['limestone', 'salt', 'sodium_bicarb'],
    },
  },
  {
    id: 'dairy_cow_dry',
    icon: '🌙',
    nameEn: 'Dry Cow (last 60 days)',
    nameUr: 'خشک گائے (سوئنے سے ۶۰ دن پہلے)',
    descEn: 'Pregnancy-only cow before next calving — lower protein, more fibre.',
    descUr: 'بچے کی پیدائش اور آئندہ دودھ کی تیاری کا فارمولا',
    animalId: 'dairy_cow',
    stageIndex: 3,
    chosenIngredients: {
      energy:     ['corn', 'molasses'],
      protein:    ['canola_meal'],
      fiber:      ['wheat_bran', 'chickpea_husk', 'soybean_hulls'],
      fat:        [],
      supplement: ['limestone', 'sodium_bicarb'],
    },
  },

  // ─────── DAIRY BUFFALO ───────
  {
    id: 'dairy_buffalo_10l',
    icon: '🐃',
    nameEn: 'Dairy Buffalo — 10 L milk',
    nameUr: 'بھینس — ۱۰ لیٹر گاڑھا دودھ',
    descEn: 'Mid-lactation Nili-Ravi giving 10 L/day. Higher energy needed for richer milk.',
    descUr: 'نیلی راوی بھینس کا زیادہ دودھ اور بالائی (فیٹ) کا فارمولا',
    animalId: 'dairy_buffalo',
    stageIndex: 1,
    chosenIngredients: {
      energy:     ['corn', 'wheat_bran', 'molasses'],
      protein:    ['sbm', 'csm', 'canola_meal'],
      fiber:      ['chickpea_husk'],
      fat:        ['rice_bran_oil'],
      supplement: ['limestone', 'salt'],
    },
  },

  // ─────── HEIFER ───────
  {
    id: 'heifer_growing',
    icon: '🐮',
    nameEn: 'Growing Heifer (6–15 months)',
    nameUr: 'بچھڑی / کٹڑی (۶ تا ۱۵ ماہ)',
    descEn: 'Frame-building heifer — moderate protein, good calcium for bones.',
    descUr: 'بچھڑی کے قد کاٹھ اور مضبوط ہڈیوں کے لیے نشوونما کا فارمولا',
    animalId: 'heifer',
    stageIndex: 1,
    chosenIngredients: {
      energy:     ['corn', 'wheat_bran', 'molasses'],
      protein:    ['sbm', 'csm'],
      fiber:      ['chickpea_husk'],
      fat:        [],
      supplement: ['limestone', 'dcp', 'salt'],
    },
  },

  // ─────── FATTENING BULL ───────
  {
    id: 'fattening_bull_grower',
    icon: '🐂',
    nameEn: 'Fattening Bull — Grower (200–300 kg)',
    nameUr: 'کٹڑا / وچھڑا — وزن بڑھوتری (۲۰۰-۳۰۰ کلو)',
    descEn: 'Fast-gain phase. High energy + moderate protein for daily weight gain.',
    descUr: 'گوشت اور تیزی سے وزن بڑھانے کے لیے طاقتور فارمولا',
    animalId: 'fattening_bull',
    stageIndex: 1,
    chosenIngredients: {
      energy:     ['corn', 'wheat_grain', 'molasses', 'wheat_bran'],
      protein:    ['csm', 'sbm'],
      fiber:      [],
      fat:        [],
      supplement: ['limestone', 'salt'],
    },
  },
  {
    id: 'fattening_bull_finisher',
    icon: '💪',
    nameEn: 'Fattening Bull — Finisher (>300 kg)',
    nameUr: 'کٹڑا / وچھڑا — فائنل تیاری (۳۰۰+ کلو)',
    descEn: 'Maximum-energy finishing diet for market weight. Lower protein, more grain.',
    descUr: 'مارکیٹ سیل اور قربانی کے لیے چمک اور زیادہ وزن کا فارمولا',
    animalId: 'fattening_bull',
    stageIndex: 2,
    chosenIngredients: {
      energy:     ['corn', 'wheat_grain', 'broken_rice', 'molasses'],
      protein:    ['csm', 'rsm'],
      fiber:      [],
      fat:        [],
      supplement: ['limestone', 'salt', 'sodium_bicarb'],
    },
  },

  // ─────── DAIRY GOAT ───────
  {
    id: 'dairy_goat_lactating',
    icon: '🐐',
    nameEn: 'Dairy Goat — Lactating',
    nameUr: 'دودھ والی بکری (بیتل / مقامی)',
    descEn: 'Beetal or local goat in milk — small batch, balanced for daily yield.',
    descUr: 'بکری کے دودھ کی پیدائش اور صحت کے لیے متوازن فارمولا',
    animalId: 'dairy_goat',
    stageIndex: 1,
    chosenIngredients: {
      energy:     ['corn', 'wheat_bran'],
      protein:    ['sbm', 'csm'],
      // Chickpea husk is the key to this template being solvable at all.
      // Reaching NDF >=20% on wheat bran + CSM alone drags phosphorus (1.1%
      // and 1.0% P respectively) past its 0.55% ceiling. Channa chilka brings
      // 55% NDF at only 0.25% P, so fibre and phosphorus stop fighting.
      fiber:      ['chickpea_husk'],
      fat:        ['rice_bran_oil'],
      supplement: ['limestone', 'salt'],
    },
  },

  // ─────── FATTENING GOAT ───────
  {
    id: 'fattening_goat_finisher',
    icon: '🐐',
    nameEn: 'Fattening Goat — Finisher',
    nameUr: 'موٹا کرنے والی بکری — تیاری',
    descEn: 'Market-weight push for Eid / sale. High energy, moderate protein.',
    descUr: 'مارکیٹ یا عید کے لیے۔ زیادہ توانائی، معتدل پروٹین۔',
    animalId: 'fattening_goat',
    stageIndex: 1,
    chosenIngredients: {
      energy:     ['corn', 'wheat_grain', 'molasses'],
      protein:    ['csm', 'sbm'],
      fiber:      [],
      // Without a fat source this template maxed out at exactly 3.00% fat
      // against a >=3.0% floor — infeasible on a knife edge. A little oil
      // gives the solver the headroom it needs.
      fat:        ['rice_bran_oil'],
      supplement: ['limestone', 'salt'],
    },
  },
];

/** Get a template by id (or undefined if not found). */
export function getTemplate(id: string): QuickStartTemplate | undefined {
  return QUICK_START_TEMPLATES.find((t) => t.id === id);
}
