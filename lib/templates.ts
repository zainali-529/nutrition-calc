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
// ================================================================================

/**
 * Same shape as the orchestrator's `chosenIngredients` state — a map from
 * the 4 concentrate categories to the selected ingredient keys.
 */
type ChosenIngredients = {
  energy:  string[];
  protein: string[];
  fiber:   string[];
  fat:     string[];
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
    nameUr: '15 لیٹر دودھ والی گائے',
    descEn: 'Mid-lactation cow producing about 15 L/day. The most common Pakistani setup.',
    descUr: 'درمیانی دودھ کی گائے، تقریباً 15 لیٹر روزانہ۔ پاکستان میں سب سے عام۔',
    animalId: 'dairy_cow',
    stageIndex: 1,
    badgeEn: 'Most popular', badgeUr: 'سب سے مقبول',
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran', 'molasses'],
      protein: ['sbm', 'csm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
    },
  },
  {
    id: 'dairy_cow_early_20l',
    icon: '🥛',
    nameEn: 'Dairy Cow — Early lactation 20 L',
    nameUr: 'شروع کا دودھ، 20 لیٹر',
    descEn: 'High-yielding cow in the first 100 days — needs dense protein + energy.',
    descUr: 'زیادہ دودھ والی گائے، پہلے 100 دن — زیادہ پروٹین اور توانائی چاہیے۔',
    animalId: 'dairy_cow',
    stageIndex: 0,
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran', 'molasses'],
      protein: ['sbm', 'canola_meal', 'csm'],
      fiber:   [],
      fat:     ['limestone', 'salt', 'sodium_bicarb'],
    },
  },
  {
    id: 'dairy_cow_dry',
    icon: '🌙',
    nameEn: 'Dry Cow (last 60 days)',
    nameUr: 'خشک دور (آخری 60 دن)',
    descEn: 'Pregnancy-only cow before next calving — lower protein, more fibre.',
    descUr: 'بچہ پیدا ہونے سے پہلے — کم پروٹین، زیادہ فائبر۔',
    animalId: 'dairy_cow',
    stageIndex: 3,
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran'],
      protein: ['csm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
    },
  },

  // ─────── DAIRY BUFFALO ───────
  {
    id: 'dairy_buffalo_10l',
    icon: '🐃',
    nameEn: 'Dairy Buffalo — 10 L milk',
    nameUr: '10 لیٹر دودھ والی بھینس',
    descEn: 'Mid-lactation Nili-Ravi giving 10 L/day. Higher energy needed for richer milk.',
    descUr: 'درمیانی دودھ کی نیلی راوی، 10 لیٹر روزانہ۔ گاڑھے دودھ کے لیے زیادہ توانائی۔',
    animalId: 'dairy_buffalo',
    stageIndex: 1,
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran', 'molasses', 'rice_polish'],
      protein: ['sbm', 'csm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
    },
  },

  // ─────── HEIFER ───────
  {
    id: 'heifer_growing',
    icon: '🐮',
    nameEn: 'Growing Heifer (6–15 months)',
    nameUr: 'بڑھتی بچھڑی (6-15 ماہ)',
    descEn: 'Frame-building heifer — moderate protein, good calcium for bones.',
    descUr: 'ڈھانچا بنانے والی بچھڑی — معتدل پروٹین، ہڈیوں کے لیے کیلشیم۔',
    animalId: 'heifer',
    stageIndex: 1,
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran'],
      protein: ['sbm', 'csm'],
      fiber:   [],
      fat:     ['limestone', 'dcp', 'salt'],
    },
  },

  // ─────── FATTENING BULL ───────
  {
    id: 'fattening_bull_grower',
    icon: '🐂',
    nameEn: 'Fattening Bull — Grower (200–300 kg)',
    nameUr: 'موٹا کرنے والا بیل — بڑھوتری',
    descEn: 'Fast-gain phase. High energy + moderate protein for daily weight gain.',
    descUr: 'تیز وزن بڑھنے کا مرحلہ۔ زیادہ توانائی + معتدل پروٹین۔',
    animalId: 'fattening_bull',
    stageIndex: 1,
    chosenIngredients: {
      energy:  ['corn', 'wheat_grain', 'molasses', 'wheat_bran'],
      protein: ['csm', 'sbm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
    },
  },
  {
    id: 'fattening_bull_finisher',
    icon: '💪',
    nameEn: 'Fattening Bull — Finisher (>300 kg)',
    nameUr: 'موٹا کرنے والا بیل — تیاری (300+ کلو)',
    descEn: 'Maximum-energy finishing diet for market weight. Lower protein, more grain.',
    descUr: 'مارکیٹ کے وزن کے لیے زیادہ سے زیادہ توانائی۔ کم پروٹین، زیادہ دانہ۔',
    animalId: 'fattening_bull',
    stageIndex: 2,
    chosenIngredients: {
      energy:  ['corn', 'wheat_grain', 'broken_rice', 'molasses'],
      protein: ['csm', 'rsm'],
      fiber:   [],
      fat:     ['limestone', 'salt', 'sodium_bicarb'],
    },
  },

  // ─────── DAIRY GOAT ───────
  {
    id: 'dairy_goat_lactating',
    icon: '🐐',
    nameEn: 'Dairy Goat — Lactating',
    nameUr: 'دودھ والی بکری',
    descEn: 'Beetal or local goat in milk — small batch, balanced for daily yield.',
    descUr: 'بیتل یا مقامی نسل کی دودھ والی بکری۔',
    animalId: 'dairy_goat',
    stageIndex: 1,
    chosenIngredients: {
      energy:  ['corn', 'wheat_bran'],
      protein: ['sbm', 'csm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
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
      energy:  ['corn', 'wheat_grain', 'molasses'],
      protein: ['csm', 'sbm'],
      fiber:   [],
      fat:     ['limestone', 'salt'],
    },
  },
];

/** Get a template by id (or undefined if not found). */
export function getTemplate(id: string): QuickStartTemplate | undefined {
  return QUICK_START_TEMPLATES.find((t) => t.id === id);
}
